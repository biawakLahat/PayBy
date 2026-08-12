import type { ButtonHTMLAttributes } from "react";

export function Button({
  variant = "secondary",
  compact = false,
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  compact?: boolean;
}) {
  return (
    <button
      {...props}
      className={[
        "button",
        `button-${variant}`,
        compact ? "compact-button" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      type={type}
    />
  );
}
