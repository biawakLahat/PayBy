import type { ReactNode } from "react";

export function FormField({
  label,
  children,
  className = "",
  htmlFor,
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <label className={["form-field", className].filter(Boolean).join(" ")} htmlFor={htmlFor}>
      <span>{label}</span>
      {children}
    </label>
  );
}
