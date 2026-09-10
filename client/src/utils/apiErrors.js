// The API answers a failed validation with error.details = [{ field, message }].
// This turns that into the { fieldName: message } shape the forms render, so a
// 400 lands next to the input that caused it instead of in a banner.
export function fieldErrors(err) {
  const details = err?.details;
  if (!Array.isArray(details)) return {};
  return details.reduce((acc, d) => {
    if (!d || !d.field) return acc;
    // "shippingAddress.line1" -> "line1": forms are flat, the API is not.
    const key = String(d.field).split(".").pop();
    // Keep the first message per field; later rules are usually noise.
    return key in acc ? acc : { ...acc, [key]: d.message };
  }, {});
}

// The message to show above the form when the failure is not field-specific.
export function summaryMessage(err, fallback = "Something went wrong. Please try again.") {
  if (!err) return null;
  if (err.code === "NETWORK_ERROR") return "Could not reach the server. Check that the API is running.";
  return err.message || fallback;
}
