import { useId } from "react";
import "./Field.css";

// One input + label + error, so every form in the app reports failures the
// same way. `error` is the message the API put in error.details for this field.
export default function Field({
  label, error, hint, action, className = "", type = "text", ...rest
}) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className={`gv-field ${error ? "has-error" : ""} ${className}`}>
      <div className="gv-field__top">
        <label className="gv-field__label" htmlFor={id}>{label}</label>
        {action}
      </div>
      <input
        id={id}
        type={type}
        className="gv-field__input"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...rest}
      />
      {error && <p className="gv-field__error" id={errorId} role="alert">{error}</p>}
      {!error && hint && <p className="gv-field__hint">{hint}</p>}
    </div>
  );
}
