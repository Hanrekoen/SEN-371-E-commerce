"use strict";

// PERSON 2 OWNS THIS FOLDER.
//
// Strategy pattern - the contract. One interface, two implementations, and a
// caller that never learns which one it got, so swapping them is a config
// change rather than a code change. This is the Strategy the System Plan
// claims in section 3.

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
   * Resolves for approved AND declined - a decline is a normal answer from a
   * working provider. Rejects only when no answer was obtained at all, which
   * checkout turns into a 503 after rolling stock back.
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
