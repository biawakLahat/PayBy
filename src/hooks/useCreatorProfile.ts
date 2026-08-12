import * as React from "react";
import type { PaybyNetwork } from "../config/networks";
import type { CreatorProfile } from "../domain/models";
import {
  readLocalJson,
  writeLocalJson,
} from "../services/storage/local";

export const PROFILE_KEY = "payby-creator-profile-v1";

const DEFAULT_PROFILE: CreatorProfile = {
  displayName: "Payby Creator",
  handle: "payby",
  bio: "Premium media publishing on Shelby and Aptos.",
  avatarUrl: "",
  website: "",
  xHandle: "",
  xVerified: false,
};

export function getCreatorProfileStorageKey(
  accountAddress: string,
  network: PaybyNetwork,
) {
  const owner = accountAddress.trim().toLowerCase() || "disconnected";
  return `${PROFILE_KEY}:${network}:${owner}`;
}

export function useCreatorProfile(
  accountAddress = "",
  network: PaybyNetwork = "shelbynet",
) {
  const storageKey = React.useMemo(
    () => getCreatorProfileStorageKey(accountAddress, network),
    [accountAddress, network],
  );
  const [profileState, setProfileState] = React.useState(() => ({
    key: storageKey,
    profile: readLocalJson(storageKey, DEFAULT_PROFILE),
  }));

  React.useEffect(() => {
    setProfileState({
      key: storageKey,
      profile: readLocalJson(storageKey, DEFAULT_PROFILE),
    });
  }, [storageKey]);

  const saveProfile = React.useCallback((next: CreatorProfile) => {
    setProfileState({ key: storageKey, profile: next });
    writeLocalJson(storageKey, next);
  }, [storageKey]);

  return {
    profile: profileState.key === storageKey ? profileState.profile : DEFAULT_PROFILE,
    saveProfile,
  };
}
