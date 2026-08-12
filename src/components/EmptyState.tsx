import * as React from "react";
import { ArrowRight, FileArchive, Loader2 } from "lucide-react";

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
  icon,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}) {
  const isLoading = /^Loading/i.test(title);

  return (
    <div className={`empty-state ${isLoading ? "is-loading" : ""}`}>
      <span className="empty-icon">
        {isLoading ? <Loader2 size={20} /> : icon ?? <FileArchive size={20} />}
      </span>
      <strong>{title}</strong>
      <p>{body}</p>
      {isLoading ? (
        <div className="skeleton-stack" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      ) : null}
      {actionLabel && onAction ? (
        <button
          className="button button-secondary compact-button"
          type="button"
          onClick={onAction}
        >
          {actionLabel}
          <ArrowRight size={15} />
        </button>
      ) : null}
    </div>
  );
}
