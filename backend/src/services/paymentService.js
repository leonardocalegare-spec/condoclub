// MercadoPago integration placeholder.
// To integrate the real SDK:
//   1. npm install mercadopago
//   2. Replace the mock implementations below with real MercadoPago API calls.
//   3. Set MERCADOPAGO_ACCESS_TOKEN in your .env file.
//   Docs: https://www.mercadopago.com.br/developers/pt/docs

'use strict';

/**
 * Creates a payment preference/checkout for the given order.
 * @param {object} order - The order object from Prisma.
 * @returns {Promise<{paymentId: string, checkoutUrl: string, status: string}>}
 */
async function createPayment(order) {
  // Real implementation would call:
  // const mp = new MercadoPago({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
  // const preference = await mp.preferences.create({ items: [...], external_reference: order.id });
  // return { paymentId: preference.id, checkoutUrl: preference.init_point, status: 'pending' };

  const paymentId = `mock_payment_${order.id}_${Date.now()}`;
  return {
    paymentId,
    checkoutUrl: `https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=${paymentId}`,
    status: 'pending',
  };
}

/**
 * Checks the current status of a payment.
 * @param {string} paymentId - The MercadoPago payment ID.
 * @returns {Promise<{paymentId: string, status: string, amount: number}>}
 */
async function getPaymentStatus(paymentId) {
  // Real implementation would call:
  // const mp = new MercadoPago({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
  // const payment = await mp.payment.findById(paymentId);
  // return { paymentId, status: payment.status, amount: payment.transaction_amount };

  return {
    paymentId,
    status: 'approved',
    amount: 0,
  };
}

/**
 * Processes a payment gateway webhook notification.
 * @param {object} payload - The raw webhook payload from MercadoPago.
 * @returns {Promise<{orderId: string, status: string, paymentId: string}>}
 */
async function processWebhook(payload) {
  // Real implementation would verify the signature and fetch the payment:
  // const mp = new MercadoPago({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
  // const payment = await mp.payment.findById(payload.data?.id);
  // const orderId = payment.external_reference;
  // return { orderId, status: payment.status, paymentId: String(payment.id) };

  const paymentId = payload?.data?.id ? String(payload.data.id) : 'mock_payment_id';
  return {
    orderId: payload?.external_reference || 'mock_order_id',
    status: 'approved',
    paymentId,
  };
}

module.exports = { createPayment, getPaymentStatus, processWebhook };
