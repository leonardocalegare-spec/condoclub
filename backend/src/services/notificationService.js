// Email notification service placeholder.
// To integrate a real provider:
//   - nodemailer (SMTP): npm install nodemailer
//   - SendGrid: npm install @sendgrid/mail
//   - AWS SES: npm install @aws-sdk/client-ses
// Replace the log-based implementations below with actual send calls and
// set the corresponding environment variables (SMTP_HOST, SENDGRID_API_KEY, etc.).

'use strict';

const isProd = () => process.env.NODE_ENV === 'production';

/**
 * Sends a welcome email to a newly registered user.
 * @param {object} user - The user object.
 */
async function sendWelcomeEmail(user) {
  if (isProd()) {
    console.log(`[Email] Would send welcome email to ${user.email}`);
  } else {
    console.log(`[Notification] Welcome email for ${user.name} <${user.email}>`);
  }
  return { success: true, message: 'Email enviado' };
}

/**
 * Sends an order confirmation email to the resident who placed the order.
 * @param {object} order - The order object.
 * @param {object} user  - The resident user object.
 */
async function sendOrderConfirmation(order, user) {
  if (isProd()) {
    console.log(`[Email] Would send order confirmation for order ${order.id} to ${user.email}`);
  } else {
    console.log(`[Notification] Order confirmation for order ${order.id} → ${user.name} <${user.email}>`);
  }
  return { success: true, message: 'Email enviado' };
}

/**
 * Sends an order status update notification to the resident.
 * @param {object} order     - The order object.
 * @param {object} user      - The resident user object.
 * @param {string} newStatus - The new order status.
 */
async function sendOrderStatusUpdate(order, user, newStatus) {
  if (isProd()) {
    console.log(`[Email] Would send status update (${newStatus}) for order ${order.id} to ${user.email}`);
  } else {
    console.log(`[Notification] Order ${order.id} status → ${newStatus} for ${user.name} <${user.email}>`);
  }
  return { success: true, message: 'Email enviado' };
}

/**
 * Alerts a supplier when a new order containing their services arrives.
 * @param {object} order    - The order object.
 * @param {object} supplier - The supplier object (must include contactEmail).
 */
async function sendNewOrderAlert(order, supplier) {
  if (isProd()) {
    console.log(`[Email] Would send new order alert for order ${order.id} to supplier ${supplier.contactEmail}`);
  } else {
    console.log(`[Notification] New order alert for order ${order.id} → supplier ${supplier.name} <${supplier.contactEmail}>`);
  }
  return { success: true, message: 'Email enviado' };
}

/**
 * Sends a monthly commission report to a supplier.
 * @param {object} supplier         - The supplier object.
 * @param {Date|string} periodStart - Start of the report period.
 * @param {Date|string} periodEnd   - End of the report period.
 * @param {number} totalCommission  - Total commission amount for the period.
 */
async function sendCommissionReport(supplier, periodStart, periodEnd, totalCommission) {
  if (isProd()) {
    console.log(
      `[Email] Would send commission report to ${supplier.contactEmail} ` +
        `for period ${periodStart} – ${periodEnd}: R$ ${totalCommission}`
    );
  } else {
    console.log(
      `[Notification] Commission report for ${supplier.name} <${supplier.contactEmail}> ` +
        `${periodStart} – ${periodEnd}: R$ ${totalCommission}`
    );
  }
  return { success: true, message: 'Email enviado' };
}

module.exports = {
  sendWelcomeEmail,
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendNewOrderAlert,
  sendCommissionReport,
};
