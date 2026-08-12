import * as React from "react";
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

export function useCreatorProfile() {
  const [profile, setProfile] = React.useState<CreatorProfile>(() =>
    readLocalJson(PROFILE_KEY, DEFAULT_PROFILE),
  );

  const saveProfile = React.useCallback((next: CreatorProfile) => {
    setProfile(next);
    writeLocalJson(PROFILE_KEY, next);
  }, []);

  return { profile, saveProfile };
}
