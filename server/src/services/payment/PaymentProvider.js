"use strict";

// PERSON 2 OWNS THIS FOLDER.
//
// Strategy pattern - the contract half.
//
// ARCHITECTURE.md and section 3 of the System Plan both claim Strategy.
// This is where the claim is actually met: one interface, two interchangeable
// implementations, and a caller that never learns which one it was handed.
//
// order.service.js calls provider.authorize(...) and branches on the result.
// It does not know whether that result came from an HTTP call to a gateway or
// from a fixed value in a test. Swapping one for the other is a configuration
// change, not a code change, which is the entire point of the pattern.

/**
 * @typedef  {Object} AuthorizationRequest
 * @property {number} amountCents   Server-calculated order total. Never from the request body.
 * @property {string} currency      Three-letter ISO code, e.g. "ZAR".
 * @property {string} orderNumber   The order this authorisation belongs to.
 * @property {Object} card          { number, expMonth, expYear, cvc }
 *
 * @typedef  {Object} AuthorizationResult
 * @property {boolean}     approved
 * @property {string|null} providerReference  Gateway's reference when approved, null otherwise.
 * @property {string}      message            Safe to show a customer.
 * @property {string|null} code               Machine-readable decline reason, e.g. "insufficient_funds".
 */

class PaymentProvider {
  /**
   * Authorise one payment.
   *
   * Resolves for both outcomes the business cares about: approved, and
   * declined. A decline is a normal answer from a working provider, not an
   * error, so it comes back as `approved: false`.
   *
   * Rejects only when no answer was obtained at all - the provider is down,
   * too slow, or misconfigured. Those throw ServiceUnavailableError, and
   * checkout turns them into a 503 after rolling stock back.
   *
   * @param   {AuthorizationRequest} request
   * @returns {Promise<AuthorizationResult>}
   */
  // eslint-disable-next-line no-unused-vars
  async authorize(request) {
    throw new Error(
      `${this.constructor.name} must implement authorize(); PaymentProvider is the contract, not an implementation`
    );
  }

  /** Identifies the active strategy in logs and in the health endpoint. */
  get name() {
    return this.constructor.name;
  }
}

module.exports = PaymentProvider;
