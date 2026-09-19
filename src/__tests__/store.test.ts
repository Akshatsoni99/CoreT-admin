/**
 * Storage and Store Logic Tests
 */

// Mock localStorage for Node.js environment
const storage: Record<string, string> = {};
(global as any).localStorage = {
  getItem: (key: string) => storage[key] || null,
  setItem: (key: string, val: string) => { storage[key] = val; },
  removeItem: (key: string) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};
(global as any).window = {
  dispatchEvent: () => true
};
(global as any).CustomEvent = class CustomEvent {
  constructor(public type: string, public detail?: any) {}
};

import { getUserProfile, setUserProfile } from '../services/userProfileStore';
import { getAllBankRecords, addBankRecord, updateBankRecordStatus } from '../services/bankAdminStore';

console.log('=== RUNNING STORE AND STATE TESTS ===\n');

// Test 1: User Profile Defaults
console.log('Test 1: Clean User Profile Defaults');
const initialProfile = getUserProfile();
console.log('  Initial profile:', JSON.stringify(initialProfile));
if (initialProfile.name !== '' || initialProfile.email !== '' || initialProfile.phone !== '') {
  throw new Error('Initial profile contains hardcoded fake user data!');
}
console.log('  ✓ Test 1 Passed: No hardcoded fake profile data.\n');

// Test 2: Profile Update
console.log('Test 2: Save and Retrieve User Profile');
setUserProfile({
  name: 'Vikram Patel',
  phone: '9812345678',
  email: 'vikram.patel@example.com',
  address: 'Mumbai Central'
});
const updatedProfile = getUserProfile();
console.log('  Updated profile:', updatedProfile.name, updatedProfile.phone);
if (updatedProfile.name !== 'Vikram Patel' || updatedProfile.email !== 'vikram.patel@example.com') {
  throw new Error('Profile save/retrieve failed');
}
console.log('  ✓ Test 2 Passed: Profile correctly saved and retrieved.\n');

// Test 3: Bank Admin Store Records
console.log('Test 3: Admin Records and Lifecycle Status');
const recordsBefore = getAllBankRecords();
console.log('  Records initially:', recordsBefore.length);

addBankRecord({
  id: 'WD-20260918-T8#K1!M9',
  formNumber: 'WD-20260918-1234',
  type: 'withdrawal',
  title: 'Cash Withdrawal Slip',
  customerName: 'Vikram Patel',
  accountNumber: '501234567890123',
  amount: '35000',
  amountWords: 'Thirty Five Thousand Rupees Only',
  date: '18/09/2026',
  signatureDataUrl: 'data:image/png;base64,sampleSignatureData',
  details: { branch: 'Mumbai Central' },
  status: 'READY_FOR_BANK',
  submittedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  notes: 'Submitted via citizen app'
});

const recordsAfter = getAllBankRecords();
console.log('  Records after addition:', recordsAfter.length);
if (recordsAfter.length !== recordsBefore.length + 1) {
  throw new Error('Failed to add record to bankAdminStore');
}

const newRecord = recordsAfter[0];
console.log('  New record ID:', newRecord.id, 'Status:', newRecord.status);
if (newRecord.status !== 'READY_FOR_BANK') {
  throw new Error(`Expected initial status READY_FOR_BANK, got ${newRecord.status}`);
}

// Update Status to VERIFIED
updateBankRecordStatus(newRecord.id, 'VERIFIED', 'Cash counter 3 officer check');
const verifiedRecords = getAllBankRecords();
const verifiedRecord = verifiedRecords.find(r => r.id === newRecord.id);
console.log('  Updated record Status:', verifiedRecord?.status, 'Officer Note:', verifiedRecord?.notes);
if (verifiedRecord?.status !== 'VERIFIED') {
  throw new Error('Status transition to VERIFIED failed');
}

// Update Status to COMPLETED
updateBankRecordStatus(newRecord.id, 'COMPLETED', 'Cash disbursed ₹35,000');
const completedRecords = getAllBankRecords();
const completedRecord = completedRecords.find(r => r.id === newRecord.id);
console.log('  Final record Status:', completedRecord?.status);
if (completedRecord?.status !== 'COMPLETED') {
  throw new Error('Status transition to COMPLETED failed');
}
console.log('  ✓ Test 3 Passed: Bank Admin lifecycle and status management verified.\n');

console.log('=== ALL STORE TESTS PASSED SUCCESSFULLY! ===');
