import { useCallback, useEffect, useRef, useState } from "react";
import { LockIcon, ShieldIcon, CheckIcon, CardIcon } from "../ui/Icons";
import Button from "../ui/Button";
import { formatCents } from "../../utils/money";
import "./SecurePayOverlay.css";

// The payment step, presented like a hosted payment page. Presentation only:
// the outcome comes from the API, the timers just pace the wait, and no step
// is ever shown finished before the thing it describes has happened.

const STEPS = [
  { key: "channel", label: "Establishing secure channel" },
  { key: "issuer",  label: "Contacting issuing bank" },
  { key: "auth",    label: "Authorising payment" },
  { key: "order",   label: "Confirming your order" },
];

// Long enough for each line to be read, short enough not to feel padded.
const STEP_MS = 620;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function SecurePayOverlay({ open, amountCents, card, run, onApproved, onDismiss }) {
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState("working"); // working | approved | failed
  const [failure, setFailure] = useState(null);
  const [reference, setReference] = useState(null);
  const dialogRef = useRef(null);
  const timers = useRef([]);
  const failureRef = useRef(null);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const wait = useCallback((ms) => new Promise((resolve) => {
    const t = setTimeout(resolve, prefersReducedMotion() ? 0 : ms);
    timers.current.push(t);
  }), []);

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;
    setStep(0);
    setStatus("working");
    setFailure(null);
    failureRef.current = null;
    setReference(null);

    (async () => {
      // Fire the real request straight away; the steps pace the wait, they do
      // not gate the call.
      const pending = run();

      // Handler attached here, not at the await below: a fast failure settles
      // during the pacing waits with nothing listening, which logs an
      // unhandled rejection on every decline. try/catch still does the work.
      pending.catch(() => {});

      // Steps 0-1 are the round trip getting under way, safe to time. Step 2
      // is the authorisation and must wait for the real answer rather than
      // claim an outcome we do not have yet.
      await wait(STEP_MS);
      if (!cancelled) setStep(1);
      await wait(STEP_MS);
      if (!cancelled) setStep(2);

      try {
        const order = await pending;
        if (cancelled) return;

        setReference(order?.paymentReference || null);
        setStep(3);
        await wait(STEP_MS);
        if (cancelled) return;

        setStatus("approved");
        await wait(900);
        if (!cancelled) onApproved(order);
      } catch (err) {
        if (cancelled) return;
        setStatus("failed");
        setFailure(err);
        failureRef.current = err;
      }
    })();

    return () => { cancelled = true; clearTimers(); };
    // run/onApproved are recreated each render by the parent; re-running this
    // on every render would restart the payment, so only `open` drives it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open && dialogRef.current) dialogRef.current.focus();
  }, [open]);

  // Escape closes only once there is nothing in flight. Letting it dismiss
  // mid-authorisation would hide a payment that is still happening.
  useEffect(() => {
    if (!open || status === "working") return undefined;
    const onKey = (e) => { if (e.key === "Escape") onDismiss(failureRef.current); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, status, onDismiss]);

  if (!open) return null;

  const failureTone = failureKind(failure);

  return (
    <div className="gv-pay" role="dialog" aria-modal="true" aria-labelledby="gv-pay-title">
      <div className="gv-pay__sheet" ref={dialogRef} tabIndex={-1}>
        <header className="gv-pay__head">
          <div className="gv-pay__brand">
            <ShieldIcon className="gv-pay__brand-mark" />
            <span>GadgetVault <strong>SecurePay</strong></span>
          </div>
          <span className="gv-pay__lock"><LockIcon /> Encrypted</span>
        </header>

        {/* Not decoration - anyone on this screen must be able to tell at a
            glance that no real money is involved. */}
        <p className="gv-pay__sandbox">
          Sandbox — simulated payment, no real money moves and no card is stored.
        </p>

        <div className="gv-pay__amount">
          <span className="gv-pay__amount-label">Amount payable</span>
          <span className="gv-pay__amount-value">{formatCents(amountCents)}</span>
        </div>

        <p className="gv-pay__card">
          <CardIcon /> {card?.brand ? `${card.brand} ` : ""}•••• {card?.last4 || "••••"}
        </p>

        {status !== "failed" && (
          <ol className="gv-pay__steps">
            {STEPS.map((s, i) => {
              const state = i < step ? "done" : i === step ? "active" : "waiting";
              return (
                <li key={s.key} className={`gv-pay__step is-${state}`}>
                  <span className="gv-pay__step-mark" aria-hidden="true">
                    {state === "done" ? <CheckIcon /> : <span className="gv-pay__dot" />}
                  </span>
                  <span className="gv-pay__step-label">{s.label}</span>
                </li>
              );
            })}
          </ol>
        )}

        {status === "working" && (
          <p className="gv-pay__status" role="status">
            {STEPS[step]?.label}… please do not close this window.
          </p>
        )}

        {status === "approved" && (
          <div className="gv-pay__result is-approved" role="status">
            <CheckIcon className="gv-pay__result-mark" />
            <p className="gv-pay__result-title">Payment approved</p>
            {reference && <p className="gv-pay__ref">Reference {reference}</p>}
            <p className="gv-pay__result-sub">Taking you to your order…</p>
          </div>
        )}

        {status === "failed" && (
          <div className={`gv-pay__result is-${failureTone.tone}`} role="alert">
            <p className="gv-pay__result-title">{failureTone.title}</p>
            <p className="gv-pay__result-sub">{failureTone.detail(failure)}</p>
            <Button variant="outline" full onClick={() => onDismiss(failure)}>Back to checkout</Button>
          </div>
        )}

        <footer className="gv-pay__foot">
          GadgetVault SecurePay · a coursework payment simulator for SEN371
        </footer>
      </div>
    </div>
  );
}

// Each failure the payment integration can produce, said plainly. A customer
// needs to know whether to try a different card or simply wait.
function failureKind(err) {
  if (!err) return { tone: "danger", title: "Payment failed", detail: () => "Please try again." };

  if (err.status === 402) {
    return {
      tone: "danger",
      title: "Payment declined",
      detail: (e) => `${e.message} Nothing was charged and your cart is untouched — try another card.`,
    };
  }
  if (err.status === 503) {
    return {
      tone: "warning",
      title: "Payment service unreachable",
      detail: (e) => `${e.message} Nothing was charged. Please try again in a moment.`,
    };
  }
  if (err.status === 422) {
    return { tone: "warning", title: "Order could not be placed", detail: (e) => e.message };
  }
  if (err.status === 400) {
    return {
      tone: "warning",
      title: "Check your details",
      detail: () => "Some of the details entered were not accepted. Close this and correct the highlighted fields.",
    };
  }
  return { tone: "danger", title: "Payment failed", detail: (e) => e.message || "Please try again." };
}
