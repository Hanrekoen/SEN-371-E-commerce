"use strict";

// PERSON 2 OWNS THIS FOLDER.
// Strategy contract (System Plan section 3): two implementations, and a caller that
// never learns which it got, so swapping them is a config change, not a code change.

/**
 * @typedef  {Object} AuthorizationRequest
 * @property {number} amountCents  Server-calculated total. Never from the request body.
 * @property {string} currency     ISO code, e.g. "ZAR".
 * @property {string} orderNumber
 * @property {Object} card         { number, expMonth, expYear, cvc }
 *
 * @typedef  {Object} AuthorizationResult
 * @property {boolean}     approved
 * @property {string|null} providerReference
 * @property {string}      message   Safe to show a customer.
 * @property {string|null} code      e.g. "insufficient_funds"
 */

class PaymentProvider {
  /**
   * Resolves for approved AND declined - a decline is a normal answer. Rejects only
   * when no answer was obtained, which checkout turns into a 503 after rolling stock back.
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

  get name() {
    return this.constructor.name;
  }
}

module.exports = PaymentProvider;
