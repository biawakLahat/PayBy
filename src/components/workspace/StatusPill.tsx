import type { ReactNode } from "react";

export function StatusPill({
  label,
  className = "",
  tone = "neutral",
}: {
  label: ReactNode;
  className?: string;
  tone?: "neutral" | "positive" | "warning" | "danger";
}) {
  return (
    <span
      className={["status-pill", `status-pill-${tone}`, className]
        .filter(Boolean)
        .join(" ")}
    >
      <i aria-hidden="true" />
      {label}
    </span>
  );
}
