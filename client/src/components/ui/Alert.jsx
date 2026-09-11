import "./Alert.css";

export default function Alert({ tone = "danger", title, children, action }) {
  return (
    <div className={`gv-alert gv-alert--${tone}`} role={tone === "danger" ? "alert" : "status"}>
      <div className="gv-alert__body">
        {title && <p className="gv-alert__title">{title}</p>}
        {children && <div className="gv-alert__text">{children}</div>}
      </div>
      {action}
    </div>
  );
}
