import * as React from "react";
import { flushSync } from "react-dom";
import { encodeBlobPath } from "../services/shelby/storage";

export type RouteName =
  | "landing"
  | "vault"
  | "publish"
  | "analytics"
  | "discover"
  | "library"
  | "network"
  | "detail"
  | "share"
  | "creator"
  | "profile"
  | "activity";

export type AppRoute = {
  name: RouteName;
  owner?: string;
  blobName?: string;
};

export type AppViewName = Exclude<RouteName, "landing" | "share" | "creator">;

export function parseRoute(pathname: string): AppRoute {
  if (pathname.startsWith("/media/")) {
    const [, , owner = "", ...nameParts] = pathname.split("/");
    return {
      name: "share",
      owner: decodeURIComponent(owner),
      blobName: decodeURIComponent(nameParts.join("/")),
    };
  }
  if (pathname.startsWith("/creator/")) {
    const [, , owner = ""] = pathname.split("/");
    return {
      name: "creator",
      owner: decodeURIComponent(owner),
    };
  }
  if (pathname.startsWith("/app/blob/")) {
    const [, , , owner = "", ...nameParts] = pathname.split("/");
    return {
      name: "detail",
      owner: decodeURIComponent(owner),
      blobName: decodeURIComponent(nameParts.join("/")),
    };
  }
  if (pathname.startsWith("/app/publish")) return { name: "publish" };
  if (pathname.startsWith("/app/analytics")) return { name: "analytics" };
  if (pathname.startsWith("/app/discover")) return { name: "discover" };
  if (pathname.startsWith("/app/library")) return { name: "library" };
  if (pathname.startsWith("/app/network")) return { name: "network" };
  if (pathname.startsWith("/app/profile")) return { name: "profile" };
  if (pathname.startsWith("/app/activity")) return { name: "activity" };
  if (pathname.startsWith("/app")) return { name: "vault" };
  return { name: "landing" };
}

export function routeToPath(nextRoute: AppRoute) {
  const detailPath =
    nextRoute.owner && nextRoute.blobName
      ? `/app/blob/${encodeURIComponent(nextRoute.owner)}/${encodeBlobPath(
          nextRoute.blobName,
        )}`
      : "/app/vault";
  const sharePath =
    nextRoute.owner && nextRoute.blobName
      ? `/media/${encodeURIComponent(nextRoute.owner)}/${encodeBlobPath(
          nextRoute.blobName,
        )}`
      : "/";
  const creatorPath = nextRoute.owner
    ? `/creator/${encodeURIComponent(nextRoute.owner)}`
    : "/";
  const paths: Record<RouteName, string> = {
    landing: "/",
    vault: "/app/vault",
    publish: "/app/publish",
    analytics: "/app/analytics",
    discover: "/app/discover",
    library: "/app/library",
    network: "/app/network",
    detail: detailPath,
    share: sharePath,
    creator: creatorPath,
    profile: "/app/profile",
    activity: "/app/activity",
  };
  return paths[nextRoute.name];
}

export function useRoute(): [AppRoute, (route: AppRoute) => void] {
  const getRoute = React.useCallback((): AppRoute => {
    return parseRoute(window.location.pathname);
  }, []);
  const [route, setRoute] = React.useState<AppRoute>(getRoute);

  React.useEffect(() => {
    const sync = () => setRoute(getRoute());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [getRoute]);

  const navigate = React.useCallback((nextRoute: AppRoute) => {
    const nextPath = routeToPath(nextRoute);
    const commitNavigation = () => {
      window.history.pushState({}, "", nextPath);
      flushSync(() => setRoute(nextRoute));
      window.scrollTo({ top: 0, behavior: "auto" });
    };
    const transitionDocument = document as Document & {
      startViewTransition?: (callback: () => void) => {
        finished: Promise<void>;
      };
    };
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (transitionDocument.startViewTransition && !reduceMotion) {
      const transition = transitionDocument.startViewTransition.call(
        document,
        commitNavigation,
      );
      void transition.finished.catch(() => undefined);
      return;
    }

    commitNavigation();
  }, []);

  return [route, navigate];
}
