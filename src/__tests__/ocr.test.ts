/**
 * OCR Validation & Classification Tests
 */
import { evaluateDocumentValidity, identifyDocumentType } from '../services/ocrService';

console.log('=== RUNNING OCR MULTI-SIGNAL VALIDATION TESTS ===\n');

// Test 1: Empty or very short text (e.g. wall, plain background, blurry capture)
console.log('Test 1: Non-document capture (Wall / Blank)');
const blankResult = evaluateDocumentValidity('   ', 0);
console.log('  Blank status:', blankResult.status);
if (blankResult.status !== 'INVALID_OBJECT') {
  throw new Error(`Expected INVALID_OBJECT for blank capture, got ${blankResult.status}`);
}

const randomNoiseResult = evaluateDocumentValidity('ab cd', 15);
console.log('  Noise status:', randomNoiseResult.status);
if (randomNoiseResult.status !== 'INVALID_OBJECT') {
  throw new Error(`Expected INVALID_OBJECT for random noise, got ${randomNoiseResult.status}`);
}
console.log('  ✓ Test 1 Passed: Blank/noise correctly flagged as INVALID_OBJECT.\n');

// Test 2: Non-document object (Face, chair, bottle with random single word)
console.log('Test 2: Non-document Object (Face/Living room)');
const faceResult = evaluateDocumentValidity('person face photo blue shirt', 40);
console.log('  Photo status:', faceResult.status);
if (faceResult.status !== 'INVALID_OBJECT') {
  throw new Error(`Expected INVALID_OBJECT for non-document photo, got ${faceResult.status}`);
}
console.log('  ✓ Test 2 Passed: Non-document objects detected and rejected.\n');

// Test 3: Low confidence document (blurry bank document)
console.log('Test 3: Low Confidence Document');
const lowConfResult = evaluateDocumentValidity('bank of india pay to self rupees account number 501', 25);
console.log('  Low conf status:', lowConfResult.status);
if (lowConfResult.status !== 'LOW_CONFIDENCE_DOCUMENT') {
  throw new Error(`Expected LOW_CONFIDENCE_DOCUMENT for blurry document, got ${lowConfResult.status}`);
}
console.log('  ✓ Test 3 Passed: Low confidence trigger verified.\n');

// Test 4: Valid Bank Withdrawal Slip
console.log('Test 4: Bank of India Withdrawal Slip');
const withdrawalText = 'BANK OF INDIA WITHDRAWAL FORM PAY TO SELF RUPEES TWENTY FIVE THOUSAND ONLY A/C NO 501004928172910 DATE 18/09/2026';
const validWithdrawal = evaluateDocumentValidity(withdrawalText, 85);
console.log('  Valid status:', validWithdrawal.status);
if (validWithdrawal.status !== 'VALID_DOCUMENT') {
  throw new Error(`Expected VALID_DOCUMENT for withdrawal slip, got ${validWithdrawal.status}`);
}

const docTypeW = identifyDocumentType(withdrawalText);
console.log('  Doc Type:', docTypeW.documentType, 'Slip Type:', docTypeW.detectedSlipType);
if (docTypeW.detectedSlipType !== 'withdrawal') {
  throw new Error(`Expected withdrawal slip type, got ${docTypeW.detectedSlipType}`);
}
console.log('  ✓ Test 4 Passed: Cash Withdrawal Slip correctly classified.\n');

// Test 5: Valid Bank Deposit Slip
console.log('Test 5: Cash Deposit Slip');
const depositText = 'BANK OF INDIA CASH DEPOSIT SLIP CREDIT TO ACCOUNT NO 123456789012345 DEPOSITOR NAME ARJUN VERMA AMOUNT 10000 DATE 18/09/2026';
const validDeposit = evaluateDocumentValidity(depositText, 88);
const docTypeD = identifyDocumentType(depositText);
console.log('  Deposit Slip Type:', docTypeD.detectedSlipType);
if (docTypeD.detectedSlipType !== 'deposit') {
  throw new Error(`Expected deposit slip type, got ${docTypeD.detectedSlipType}`);
}
console.log('  ✓ Test 5 Passed: Cash Deposit Slip correctly classified.\n');

// Test 6: Bank Transfer (NEFT / RTGS)
console.log('Test 6: Bank Transfer Application');
const transferText = 'APPLICATION FOR ELECTRONIC FUNDS TRANSFER NEFT RTGS BENEFICIARY NAME SUMIT SHARMA IFSC BKID0001234 AMOUNT 50000 DATE 18/09/2026';
const docTypeT = identifyDocumentType(transferText);
console.log('  Transfer Slip Type:', docTypeT.detectedSlipType);
if (docTypeT.detectedSlipType !== 'transfer') {
  throw new Error(`Expected transfer slip type, got ${docTypeT.detectedSlipType}`);
}
console.log('  ✓ Test 6 Passed: Transfer Slip correctly classified.\n');

console.log('=== ALL OCR VALIDATION TESTS PASSED SUCCESSFULLY! ===');
