/**
 * SSLCOMMERZ Payment Gateway Configuration
 * Reads credentials securely from environment variables.
 */

const isLive = process.env.SSLCOMMERZ_IS_LIVE === 'true';
const baseUrl = isLive 
  ? 'https://securepay.sslcommerz.com' 
  : 'https://sandbox.sslcommerz.com';

const appUrl = process.env.APP_URL || 'http://localhost:5000';

module.exports = {
  storeId: process.env.SSLCOMMERZ_STORE_ID || 'delice_testbox',
  storePasswd: process.env.SSLCOMMERZ_STORE_PASSWORD || 'delice_testpass',
  isLive,
  baseUrl,
  sessionApi: `${baseUrl}/gwprocess/v4/api.php`,
  validationApi: `${baseUrl}/validator/api/validationserverAPI.php`,
  successUrl: `${appUrl}/api/payment/success`,
  failUrl: `${appUrl}/api/payment/fail`,
  cancelUrl: `${appUrl}/api/payment/cancel`,
  ipnUrl: `${appUrl}/api/payment/ipn`,
  appUrl
};
