const crypto = require('crypto');

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;

function generateOtp() {
  return crypto.randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, '0');
}

function hashOtp(otp) {
  return crypto
    .createHash('sha256')
    .update(`${otp}:${process.env.JWT_SECRET}`)
    .digest('hex');
}

function getOtpExpiryDate() {
  return new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
}

function isOtpExpired(expiresAt) {
  return new Date(expiresAt).getTime() <= Date.now();
}

module.exports = {
  OTP_LENGTH,
  OTP_MAX_ATTEMPTS,
  OTP_TTL_MINUTES,
  generateOtp,
  getOtpExpiryDate,
  hashOtp,
  isOtpExpired,
};
