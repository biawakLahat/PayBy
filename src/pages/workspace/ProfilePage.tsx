import * as React from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Image,
  Loader2,
  Pencil,
  ShieldCheck,
  User,
} from "lucide-react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { PAYBY_NETWORKS, type PaybyNetwork } from "../../config/networks";
import type { ActivityInput, CreatorProfile } from "../../domain/models";
import { waitForTransaction } from "../../services/aptos/fullnode";
import {
  getAccountAddress,
  isWalletNetworkAligned,
  requestWalletNetworkChange,
} from "../../services/aptos/wallet";
import {
  marketplaceFunction,
  readCreatorProfile,
} from "../../services/payby/marketplace";
import { shortenAddress } from "../../utils/formatters";
import type { AppRoute } from "../../app/router";
import { PageHeader } from "../../components/workspace/PageHeader";
import { FormField } from "../../components/workspace/FormField";

const AVATAR_SOURCE_LIMIT_BYTES = 6_000_000;
const AVATAR_DATA_URL_LIMIT_CHARS = 28_000;
const AVATAR_CANVAS_SIZE = 192;

function getTransactionHash(response: unknown) {
  if (
    response &&
    typeof response === "object" &&
    "hash" in response &&
    typeof response.hash === "string"
  ) {
    return response.hash;
  }

  return "";
}

function userFacingError(error: unknown, fallback: string) {
  const raw = error instanceof Error ? error.message : "";
  const message = raw || fallback;
  const lower = message.toLowerCase();

  if (lower.includes("user rejected") || lower.includes("rejected")) {
    return "Wallet approval was rejected.";
  }
  if (lower.includes("insufficient") || lower.includes("balance")) {
    return "Wallet balance is not enough for this transaction.";
  }
  if (lower.includes("simulation") || lower.includes("vmstatus")) {
    return "Aptos rejected the transaction during validation. Check network, balance, and profile state.";
  }

  return message;
}

async function prepareAvatarDataUrl(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file for the avatar.");
  }
  if (file.size > AVATAR_SOURCE_LIMIT_BYTES) {
    throw new Error("Choose an image under 6 MB.");
  }

  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = document.createElement("img");
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Avatar image could not be read."));
      element.src = sourceUrl;
    });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Avatar optimizer is not available.");

    canvas.width = AVATAR_CANVAS_SIZE;
    canvas.height = AVATAR_CANVAS_SIZE;
    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
    const sourceX = Math.max(0, (image.naturalWidth - sourceSize) / 2);
    const sourceY = Math.max(0, (image.naturalHeight - sourceSize) / 2);
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      AVATAR_CANVAS_SIZE,
      AVATAR_CANVAS_SIZE,
    );

    for (const quality of [0.82, 0.72, 0.62, 0.52]) {
      const dataUrl = canvas.toDataURL("image/webp", quality);
      if (dataUrl.length <= AVATAR_DATA_URL_LIMIT_CHARS) return dataUrl;
    }

    const jpegUrl = canvas.toDataURL("image/jpeg", 0.7);
    if (jpegUrl.length <= AVATAR_DATA_URL_LIMIT_CHARS) return jpegUrl;
    throw new Error("Avatar could not be optimized small enough for on-chain profile.");
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function ProfileDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function ProfilePage({
  profile,
  saveProfile,
  accountAddress,
  selectedNetwork,
  mediaCount,
  onNavigate,
  addActivity,
}: {
  profile: CreatorProfile;
  saveProfile: (profile: CreatorProfile) => void;
  accountAddress: string;
  selectedNetwork: PaybyNetwork;
  mediaCount: number;
  onNavigate: (route: AppRoute) => void;
  addActivity: (item: ActivityInput) => void;
}) {
  const {
    account,
    network: walletNetwork,
    changeNetwork,
    signAndSubmitTransaction,
  } = useWallet();
  const [draft, setDraft] = React.useState(profile);
  const [avatarPreview, setAvatarPreview] = React.useState(profile.avatarUrl);
  const [avatarFileName, setAvatarFileName] = React.useState("");
  const [profileMessage, setProfileMessage] = React.useState("");
  const [profileSaving, setProfileSaving] = React.useState(false);
  const [chainProfile, setChainProfile] = React.useState<CreatorProfile | null>(null);
  const avatarInputId = React.useId();
  const hasProfileIdentity = Boolean(
    profile.avatarUrl ||
      profile.website ||
      profile.xHandle ||
      profile.displayName !== "Payby Creator" ||
      profile.handle !== "payby" ||
      profile.bio !== "Premium media publishing on Shelby and Aptos.",
  );
  const [isEditingProfile, setIsEditingProfile] = React.useState(
    () => !hasProfileIdentity,
  );
  const walletNetworkAligned = isWalletNetworkAligned(
    walletNetwork,
    selectedNetwork,
  );
  const creatorUrl = accountAddress
    ? `${window.location.origin}/creator/${encodeURIComponent(accountAddress)}`
    : "";

  React.useEffect(() => {
    setDraft(profile);
    setAvatarPreview(profile.avatarUrl);
    setAvatarFileName("");
  }, [profile]);

  React.useEffect(() => {
    if (!hasProfileIdentity) setIsEditingProfile(true);
  }, [hasProfileIdentity]);

  React.useEffect(() => {
    if (!accountAddress || !PAYBY_NETWORKS[selectedNetwork].marketplaceContractAddress) {
      setChainProfile(null);
      return;
    }

    let cancelled = false;
    setChainProfile(null);
    void readCreatorProfile(selectedNetwork, accountAddress)
      .then((nextProfile) => {
        if (cancelled) return;
        setChainProfile(nextProfile);
        if (nextProfile) {
          saveProfile(nextProfile);
          setDraft(nextProfile);
          setIsEditingProfile(false);
        }
      })
      .catch(() => {
        if (!cancelled) setChainProfile(null);
      });

    return () => {
      cancelled = true;
    };
  }, [accountAddress, saveProfile, selectedNetwork]);

  async function saveProfileOnChain() {
    saveProfile({ ...draft, updatedAt: Date.now() });
    if (!account) {
      setProfileMessage(
        "Profile saved in this browser. Connect your wallet to publish it on-chain.",
      );
      setIsEditingProfile(false);
      return;
    }
    if (!walletNetworkAligned) {
      await requestWalletNetworkChange({
        changeNetwork,
        network: walletNetwork,
        selectedNetwork,
        setStatusMessage: setProfileMessage,
      });
      return;
    }
    const functionId =
      marketplaceFunction(selectedNetwork, "upsert_creator_profile_v2") ||
      marketplaceFunction(selectedNetwork, "upsert_creator_profile");
    if (!functionId) {
      setProfileMessage(
        "Profile publishing needs the Payby marketplace contract address.",
      );
      return;
    }
    if (
      draft.avatarUrl.trim().startsWith("data:image/") &&
      draft.avatarUrl.length > AVATAR_DATA_URL_LIMIT_CHARS
    ) {
      setProfileMessage(
        "Avatar is too large for the on-chain profile. Choose it again so Payby can optimize it.",
      );
      return;
    }

    setProfileSaving(true);
    setProfileMessage("Confirm profile commit in your wallet.");
    try {
      const response = await signAndSubmitTransaction({
        data: {
          function: functionId,
          typeArguments: [],
          functionArguments: functionId.includes("upsert_creator_profile_v2")
            ? [
                draft.displayName.trim() || "Payby Creator",
                draft.handle.trim() || "payby",
                draft.bio.trim(),
                draft.avatarUrl.trim(),
                draft.website.trim(),
                (draft.xHandle ?? "").trim().replace(/^@/, ""),
                false,
              ]
            : [
                draft.displayName.trim() || "Payby Creator",
                draft.handle.trim() || "payby",
                draft.bio.trim(),
                draft.avatarUrl.trim(),
                draft.website.trim(),
              ],
        },
      });
      const hash = getTransactionHash(response);
      setProfileMessage("Profile transaction submitted. Waiting for finality.");
      await waitForTransaction(selectedNetwork, hash);
      const committed = await readCreatorProfile(selectedNetwork, accountAddress);
      if (committed) {
        setChainProfile(committed);
        saveProfile(committed);
        setDraft(committed);
      }
      setIsEditingProfile(false);
      setProfileMessage("Creator profile committed on-chain.");
      addActivity({
        type: "metadata",
        label: "Committed creator profile",
        detail: draft.handle,
      });
    } catch (error) {
      setProfileMessage(userFacingError(error, "Profile publish needs attention."));
    } finally {
      setProfileSaving(false);
    }
  }

  async function copyCreatorLink() {
    if (!creatorUrl) return;
    await navigator.clipboard.writeText(creatorUrl);
    setProfileMessage("Creator profile link copied.");
  }

  return (
    <section className="workspace-layout profile-layout">
      {isEditingProfile ? (
        <div className="panel profile-panel">
          <PageHeader
            eyebrow="Edit creator profile"
            title={profile.displayName}
            description="Control the identity shown on your creator page and media listings."
            icon={<User size={24} />}
          />
          <div className="metadata-form">
            <FormField label="Display name">
              <input
                value={draft.displayName}
                onChange={(event) =>
                  setDraft({ ...draft, displayName: event.target.value })
                }
              />
            </FormField>
            <FormField label="Handle">
              <input
                value={draft.handle}
                onChange={(event) =>
                  setDraft({ ...draft, handle: event.target.value })
                }
              />
            </FormField>
            <FormField className="form-wide" label="Bio">
              <textarea
                value={draft.bio}
                onChange={(event) => setDraft({ ...draft, bio: event.target.value })}
              />
            </FormField>
            <FormField label="Avatar URL">
              <input
                value={draft.avatarUrl}
                onChange={(event) => {
                  const nextUrl = event.target.value;
                  setAvatarPreview(nextUrl);
                  setAvatarFileName("");
                  setDraft({ ...draft, avatarUrl: nextUrl });
                }}
              />
            </FormField>
            <div className="avatar-picker-field">
              <span>Avatar image</span>
              <input
                id={avatarInputId}
                className="avatar-file-input"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                aria-label="Choose creator avatar image"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setProfileMessage("Optimizing avatar for on-chain profile.");
                  void prepareAvatarDataUrl(file)
                    .then((nextUrl) => {
                      setAvatarPreview(nextUrl);
                      setAvatarFileName(file.name);
                      setDraft((current) => ({ ...current, avatarUrl: nextUrl }));
                      setProfileMessage(
                        "Avatar ready. Save profile to commit it on-chain.",
                      );
                    })
                    .catch((error) => {
                      setProfileMessage(
                        userFacingError(error, "Avatar could not be prepared."),
                      );
                      event.currentTarget.value = "";
                    });
                }}
              />
              <label className="avatar-picker-control" htmlFor={avatarInputId}>
                <i aria-hidden="true">
                  <Image size={18} />
                </i>
                <div>
                  <strong>{avatarFileName || "Choose avatar"}</strong>
                  <small>PNG, JPG, WebP, or GIF - optimized for profile</small>
                </div>
                <em>Browse</em>
              </label>
            </div>
            <FormField label="Website">
              <input
                value={draft.website}
                onChange={(event) =>
                  setDraft({ ...draft, website: event.target.value })
                }
              />
            </FormField>
            <FormField label="X handle">
              <input
                value={draft.xHandle ?? ""}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    xHandle: event.target.value.replace(/^@/, ""),
                    xVerified: false,
                  })
                }
                placeholder="username"
              />
            </FormField>
          </div>
          <div className="profile-form-actions">
            <button
              className={`button button-primary publish-button ${profileSaving ? "is-busy" : ""}`}
              type="button"
              disabled={profileSaving}
              onClick={saveProfileOnChain}
            >
              {profileSaving ? (
                <Loader2 className="button-spinner" size={17} />
              ) : (
                <Check size={17} />
              )}
              {profileSaving ? "Committing profile..." : "Save profile"}
            </button>
            {hasProfileIdentity ? (
              <button
                className="button button-secondary"
                type="button"
                disabled={profileSaving}
                onClick={() => {
                  setDraft(profile);
                  setAvatarPreview(profile.avatarUrl);
                  setAvatarFileName("");
                  setIsEditingProfile(false);
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
          {profileMessage ? <p className="inline-status">{profileMessage}</p> : null}
        </div>
      ) : (
        <div className="panel profile-card-preview profile-card-final">
          <div className="profile-preview-top">
            <div className="avatar-preview">
              {avatarPreview ? <img src={avatarPreview} alt="" /> : <User size={34} />}
            </div>
            <div className="profile-identity">
              <span>Creator profile</span>
              <strong>{draft.displayName}</strong>
              <em>@{draft.handle}</em>
              <p>{draft.bio}</p>
            </div>
          </div>
          <div
            className={`verified-pill ${draft.xVerified ? "is-verified" : "is-unverified"}`}
          >
            <div>
              <span>
                {draft.xHandle ? `@${draft.xHandle}` : "X handle not connected"}
              </span>
              <strong>
                {draft.xVerified ? "Verified creator" : "Creator verification pending"}
              </strong>
            </div>
            <ShieldCheck size={18} />
          </div>
          <div className="profile-stats">
            <ProfileDetail label="Wallet" value={shortenAddress(accountAddress)} />
            <ProfileDetail label="Media" value={`${mediaCount}`} />
            <ProfileDetail label="Profile" value={chainProfile ? "Published" : "Ready"} />
            {chainProfile?.updatedAt ? (
              <ProfileDetail
                label="Updated"
                value={new Date(chainProfile.updatedAt).toLocaleDateString()}
              />
            ) : null}
          </div>
          {profileMessage ? <p className="inline-status">{profileMessage}</p> : null}
        </div>
      )}
      <aside
        className={
          "support-panel profile-actions-panel " +
          (isEditingProfile ? "is-editing" : "is-viewing")
        }
      >
        <div>
          <p className="muted">Creator identity</p>
          <h3>{isEditingProfile ? "Live preview" : "Profile actions"}</h3>
        </div>
        {isEditingProfile ? (
          <>
            <div className="profile-card-preview profile-card-compact">
              <div className="profile-preview-top">
                <div className="avatar-preview">
                  {avatarPreview ? <img src={avatarPreview} alt="" /> : <User size={34} />}
                </div>
                <div className="profile-identity">
                  <strong>{draft.displayName}</strong>
                  <span>@{draft.handle}</span>
                  <p>{draft.bio}</p>
                </div>
              </div>
            </div>
            <div
              className={`verified-pill ${draft.xVerified ? "is-verified" : "is-unverified"}`}
            >
              <div>
                <span>
                  {draft.xHandle ? `@${draft.xHandle}` : "X handle not connected"}
                </span>
                <strong>
                  {draft.xVerified ? "Verified creator" : "Creator verification pending"}
                </strong>
              </div>
              <ShieldCheck size={18} />
            </div>
          </>
        ) : null}
        {!isEditingProfile ? (
          <button
            className="button button-primary"
            type="button"
            onClick={() => setIsEditingProfile(true)}
          >
            <Pencil size={17} />
            Edit profile
          </button>
        ) : null}
        <button
          className="button button-secondary profile-card-cta"
          type="button"
          disabled={!accountAddress}
          onClick={() => onNavigate({ name: "creator", owner: accountAddress })}
        >
          <ExternalLink size={17} />
          View public profile
        </button>
        <button
          className="button button-secondary profile-card-cta"
          type="button"
          disabled={!creatorUrl}
          onClick={copyCreatorLink}
        >
          <Copy size={17} />
          Copy creator link
        </button>
      </aside>
    </section>
  );
}
