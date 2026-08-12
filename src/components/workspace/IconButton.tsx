import type { ButtonHTMLAttributes, ReactNode } from "react";

export function IconButton({
  label,
  icon,
  className = "",
  title,
  type = "button",
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  label: string;
  icon: ReactNode;
}) {
  return (
    <button
      {...props}
      className={["icon-button", className].filter(Boolean).join(" ")}
      type={type}
      aria-label={label}
      title={title ?? label}
    >
      {icon}
    </button>
  );
}
