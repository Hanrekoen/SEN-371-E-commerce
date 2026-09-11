import "./Button.css";

export default function Button({
  variant = "primary", size = "md", full = false, loading = false,
  as: Tag = "button", className = "", children, disabled, ...rest
}) {
  const classes = [
    "gv-btn", `gv-btn--${variant}`, `gv-btn--${size}`,
    full ? "gv-btn--full" : "", loading ? "is-loading" : "", className,
  ].filter(Boolean).join(" ");

  return (
    <Tag className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <span className="gv-btn__spinner" aria-hidden="true" />}
      <span className="gv-btn__label">{children}</span>
    </Tag>
  );
}
