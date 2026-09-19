/**
 * Verification Service — Dynamic, secure Unique Verification ID and Form Reference generator.
 * Format requirement: Alphabets + Numbers + Special Characters.
 * Example: WD-20260918-A7#K9!Q2
 */

export type FormPrefix = 'WD' | 'DP' | 'TR' | 'BK' | 'OF';

function getCryptoRandomString(length: number, charset: string): string {
  let result = '';
  const bytes = new Uint8Array(length);
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(bytes);
    for (let i = 0; i < length; i++) {
      result += charset[bytes[i] % charset.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      result += charset[Math.floor(Math.random() * charset.length)];
    }
  }
  return result;
}

function getFormattedDateStamp(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Generate a unique verification identifier containing alphabets, numbers, and special characters.
 * Example: SS-WD-26-A7@K9#2
 */
export function generateVerificationId(prefix: FormPrefix): string {
  const d = new Date();
  const year2 = String(d.getFullYear()).slice(-2);
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  
  // Use crypto random values
  const seg1 = getCryptoRandomString(2, chars);
  const seg2 = getCryptoRandomString(2, chars);
  const seg3 = getCryptoRandomString(1, '23456789');

  return `SS-${prefix}-${year2}-${seg1}@${seg2}#${seg3}`;
}

/**
 * Generate a human-readable form transaction number.
 * Example: WD-20260918-8421
 */
export function generateFormNumber(prefix: FormPrefix): string {
  const dateStamp = getFormattedDateStamp();
  const digits = '1234567890';
  const suffix = getCryptoRandomString(4, digits);
  return `${prefix}-${dateStamp}-${suffix}`;
}

/**
 * Get readable form title from prefix
 */
export function getFormPrefixTitle(prefix: FormPrefix): string {
  switch (prefix) {
    case 'WD':
      return 'Cash Withdrawal';
    case 'DP':
      return 'Cash Deposit';
    case 'TR':
      return 'Bank Transfer';
    case 'BK':
      return 'Bank Service';
    case 'OF':
      return 'Official Form';
    default:
      return 'Bank Form';
  }
}
