import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  icon,
  actions,
  className = "",
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  description: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  const headerClassName = ["panel-header", "hero-panel-header", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={headerClassName}>
      <div>
        <p className="muted">{eyebrow}</p>
        <h2>{title}</h2>
        <span>{description}</span>
      </div>
      {actions ?? icon ?? null}
    </div>
  );
}
