/**
 * Bank Admin Store — Shared persistence & real-time synchronization for Bank Form Records.
 */

export type FormRecordStatus = 'DRAFT' | 'USER_COMPLETED' | 'READY_FOR_BANK' | 'VERIFIED' | 'COMPLETED' | 'REJECTED';

export interface BankFormRecord {
  id: string; // Unique Verification ID e.g. WD-20260918-A7#K9!Q2
  formNumber: string; // e.g. WD-20260918-8421
  type: 'withdrawal' | 'deposit' | 'transfer' | 'ocr_form';
  title: string;
  customerName: string;
  accountNumber: string;
  amount?: string;
  amountWords?: string;
  date: string;
  signatureDataUrl?: string;
  completedSlipImageUrl?: string;
  details: Record<string, string>;
  status: FormRecordStatus;
  submittedAt: string;
  updatedAt: string;
  notes?: string;
}

const STORAGE_KEY = 'coreserve_bank_records';

/**
 * Mask account number for security: show only the last 4 digits
 * Example: "501004928172910" -> "•••• •••• •••• 2910"
 */
export function maskAccountNumber(acc: string): string {
  if (!acc) return '••••';
  const clean = acc.replace(/\s+/g, '');
  if (clean.length <= 4) return clean;
  const visible = clean.slice(-4);
  const hiddenCount = clean.length - 4;
  const maskedPrefix = '•'.repeat(Math.min(hiddenCount, 12)).replace(/(.{4})/g, '$1 ').trim();
  return `${maskedPrefix} ${visible}`.trim();
}

/**
 * Fetch all bank form records
 */
export function getAllBankRecords(): BankFormRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn('Error reading bank records from localStorage:', e);
  }
  return [];
}

/**
 * Save or insert a new bank form record
 */
export function addBankRecord(record: BankFormRecord): BankFormRecord {
  const current = getAllBankRecords();
  // Check if record with this ID already exists
  const existingIdx = current.findIndex(r => r.id === record.id);
  let updatedList: BankFormRecord[];

  if (existingIdx >= 0) {
    updatedList = [...current];
    updatedList[existingIdx] = {
      ...current[existingIdx],
      ...record,
      updatedAt: new Date().toISOString()
    };
  } else {
    updatedList = [record, ...current];
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    window.dispatchEvent(new CustomEvent('coreserve_records_updated', { detail: updatedList }));
  } catch (e) {
    console.error('Error saving bank record to localStorage:', e);
  }

  return record;
}

/**
 * Update the status of an existing record
 */
export function updateBankRecordStatus(id: string, status: FormRecordStatus, notes?: string): boolean {
  const current = getAllBankRecords();
  const idx = current.findIndex(r => r.id === id);
  if (idx === -1) return false;

  current[idx].status = status;
  current[idx].updatedAt = new Date().toISOString();
  if (notes !== undefined) {
    current[idx].notes = notes;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('coreserve_records_updated', { detail: current }));
    return true;
  } catch (e) {
    console.error('Error updating bank record status:', e);
    return false;
  }
}

/**
 * Delete a record
 */
export function deleteBankRecord(id: string): boolean {
  const current = getAllBankRecords();
  const filtered = current.filter(r => r.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('coreserve_records_updated', { detail: filtered }));
    return true;
  } catch (e) {
    console.error('Error deleting bank record:', e);
    return false;
  }
}

/**
 * Clear all bank records from local storage
 */
export function clearAllBankRecords(): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    window.dispatchEvent(new CustomEvent('coreserve_records_updated', { detail: [] }));
    return true;
  } catch (e) {
    console.error('Error clearing bank records:', e);
    return false;
  }
}

/**
 * Restore sample/default bank records into local storage
 */
export function restoreDefaultBankRecords(records?: BankFormRecord[]): boolean {
  const listToSave = records && records.length > 0 ? records : [];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(listToSave));
    window.dispatchEvent(new CustomEvent('coreserve_records_updated', { detail: listToSave }));
    return true;
  } catch (e) {
    console.error('Error restoring bank records in local store:', e);
    return false;
  }
}

/**
 * Subscribe to bank records changes (returns cleanup function)
 */
export function subscribeToBankRecords(callback: (records: BankFormRecord[]) => void): () => void {
  const handler = () => {
    callback(getAllBankRecords());
  };
  window.addEventListener('coreserve_records_updated', handler);
  window.addEventListener('storage', handler);
  // initial invoke
  callback(getAllBankRecords());

  return () => {
    window.removeEventListener('coreserve_records_updated', handler);
    window.removeEventListener('storage', handler);
  };
}
