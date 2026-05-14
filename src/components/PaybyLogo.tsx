export function PaybyLogo() {
  return (
    <span className="payby-logo">
      <span className="payby-logo-mark" aria-hidden="true">
        <svg viewBox="0 0 44 44" role="img">
          <path
            className="logo-frame"
            d="M12.2 5.8h19.6c3.5 0 6.4 2.9 6.4 6.4v19.6c0 3.5-2.9 6.4-6.4 6.4H12.2c-3.5 0-6.4-2.9-6.4-6.4V12.2c0-3.5 2.9-6.4 6.4-6.4Z"
          />
          <path
            className="logo-vault"
            d="M14.4 30.6V13.4h9.1c4.5 0 7.5 2.6 7.5 6.5s-3 6.5-7.5 6.5h-4.1v4.2h-5Z"
          />
          <path className="logo-cut" d="M19.4 22.1h3.7c1.9 0 3-0.8 3-2.2s-1.1-2.2-3-2.2h-3.7v4.4Z" />
          <path className="logo-route" d="M29.4 13.8h5.1v5.1M34.4 13.9l-7.8 7.8" />
          <circle className="logo-node" cx="31.9" cy="31.5" r="2.8" />
        </svg>
      </span>
      <span className="payby-logo-word">Payby</span>
    </span>
  );
}
