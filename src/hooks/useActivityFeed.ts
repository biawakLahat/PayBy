import * as React from "react";
import type { ActivityInput, ActivityItem } from "../domain/models";
import type { PaybyNetwork } from "../config/networks";
import {
  readLocalJson,
  writeLocalJson,
} from "../services/storage/local";

export const ACTIVITY_KEY = "payby-activity-v1";

export function useActivityFeed(
  accountAddress: string,
  selectedNetwork: PaybyNetwork,
) {
  const [activity, setActivity] = React.useState<ActivityItem[]>(() =>
    readLocalJson<ActivityItem[]>(ACTIVITY_KEY, []),
  );

  React.useEffect(() => {
    const handleNetworkReset = (event: Event) => {
      const detail = (event as CustomEvent<{
        wallet?: string;
        network?: PaybyNetwork;
      }>).detail;
      if (
        !detail?.wallet ||
        detail.network !== selectedNetwork ||
        detail.wallet.toLowerCase() !== accountAddress.toLowerCase()
      ) {
        return;
      }

      setActivity((current) => {
        const next = current.filter(
          (item) =>
            item.wallet?.toLowerCase() !== accountAddress.toLowerCase() ||
            item.network !== selectedNetwork,
        );
        writeLocalJson(ACTIVITY_KEY, next);
        return next;
      });
    };

    window.addEventListener("payby-network-reset", handleNetworkReset);
    return () => window.removeEventListener("payby-network-reset", handleNetworkReset);
  }, [accountAddress, selectedNetwork]);

  const walletActivity = React.useMemo(
    () =>
      activity.filter(
        (item) =>
          item.wallet?.toLowerCase() === accountAddress.toLowerCase() &&
          item.network === selectedNetwork,
      ),
    [accountAddress, activity, selectedNetwork],
  );

  const addActivity = React.useCallback(
    (item: ActivityInput) => {
      if (!accountAddress) return;
      setActivity((current) => {
        const next = [
          {
            id: crypto.randomUUID(),
            at: Date.now(),
            wallet: accountAddress,
            network: selectedNetwork,
            ...item,
          },
          ...current,
        ].slice(0, 160);
        writeLocalJson(ACTIVITY_KEY, next);
        return next;
      });
    },
    [accountAddress, selectedNetwork],
  );

  return { activity: walletActivity, addActivity };
}
