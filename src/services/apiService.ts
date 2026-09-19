/**
 * Frontend API Service Layer
 * Connects CoreT User Panel and Admin Panel to the REST API Backend.
 * Supports configurable VITE_API_BASE_URL for separate Vercel deployment.
 * Fallback-aware so client remains responsive.
 */

import { BankServiceRequest, RequestFilters, StatusUpdatePayload } from '../../server/types';
import { 
  addBankRecord, 
  updateBankRecordStatus, 
  clearAllBankRecords, 
  restoreDefaultBankRecords, 
  BankFormRecord 
} from './bankAdminStore';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Check URL parameter e.g. https://coret.vercel.app?api=https://coret-admin.vercel.app
    try {
      const params = new URLSearchParams(window.location.search);
      const urlParam = params.get('api');
      if (urlParam && urlParam.trim()) {
        const clean = urlParam.trim().replace(/\/+$/, '');
        localStorage.setItem('coret_api_base_url', clean);
        return clean;
      }
    } catch {}

    // Check localStorage
    try {
      const stored = localStorage.getItem('coret_api_base_url');
      if (stored && stored.trim()) {
        return stored.trim().replace(/\/+$/, '');
      }
    } catch {}
  }

  const envUrl = (import.meta.env.VITE_API_BASE_URL as string) || '';
  return envUrl.replace(/\/+$/, '');
}

export function setApiBaseUrl(newUrl: string): void {
  if (typeof window !== 'undefined') {
    if (!newUrl || !newUrl.trim()) {
      localStorage.removeItem('coret_api_base_url');
    } else {
      localStorage.setItem('coret_api_base_url', newUrl.trim().replace(/\/+$/, ''));
    }
  }
}

/**
 * Helper to convert BankServiceRequest to legacy BankFormRecord
 * so local cache and events stay synchronized
 */
function toLegacyRecord(req: BankServiceRequest): BankFormRecord {
  return {
    id: req.uniqueVerificationId || req.id,
    formNumber: req.requestId || req.id,
    type: req.serviceType as any,
    title: req.purpose || `${req.serviceType.toUpperCase()} Request`,
    customerName: req.accountHolderName,
    accountNumber: req.accountNumber,
    amount: req.amountNumeric !== undefined ? String(req.amountNumeric) : undefined,
    amountWords: req.amountInWords,
    date: req.date,
    signatureDataUrl: req.signature,
    completedSlipImageUrl: req.generatedSlipData,
    details: req.allFormFields || {},
    status: req.status === 'APPROVED' ? 'COMPLETED' : 
            req.status === 'REJECTED' ? 'REJECTED' : 'READY_FOR_BANK',
    submittedAt: req.createdAt,
    updatedAt: req.updatedAt,
    notes: req.notes || (req.rejectionReason ? `Reason: ${req.rejectionReason}` : undefined),
  };
}

/**
 * Submit a complete bank service request
 */
export async function submitBankServiceRequest(data: Partial<BankServiceRequest>): Promise<BankServiceRequest> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/requests`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || `Server responded with ${response.status}`);
    }

    const json = await response.json();
    const savedRequest: BankServiceRequest = json.request;

    // Synchronize to local store
    try {
      addBankRecord(toLegacyRecord(savedRequest));
    } catch (e) {
      console.warn('Local store sync error:', e);
    }

    return savedRequest;
  } catch (error: any) {
    console.warn('Network request failed, saving to local store fallback:', error.message);

    // Fallback: build request and save locally
    const now = new Date().toISOString();
    const uniqueId = data.uniqueVerificationId || data.id || `TR-${Date.now().toString().slice(-6)}`;
    const fallbackRequest: BankServiceRequest = {
      id: uniqueId,
      requestId: data.requestId || uniqueId,
      uniqueVerificationId: uniqueId,
      serviceType: data.serviceType || 'withdrawal',
      source: data.source || 'direct_submission',
      status: 'PENDING',
      createdAt: data.createdAt || now,
      updatedAt: now,
      date: data.date || new Date().toLocaleDateString('en-GB'),
      amountNumeric: data.amountNumeric,
      amountInWords: data.amountInWords,
      accountHolderName: data.accountHolderName || 'Citizen Applicant',
      accountNumber: data.accountNumber || '',
      bankName: data.bankName || 'State Bank of India',
      branch: data.branch || 'Main Branch',
      transactionId: data.transactionId || uniqueId,
      tokenNumber: data.tokenNumber || `T-${Math.floor(100 + Math.random() * 900)}`,
      purpose: data.purpose || 'Bank Service',
      signature: data.signature,
      uploadedDocument: data.uploadedDocument,
      OCRData: data.OCRData,
      ocrDetectedFields: data.ocrDetectedFields,
      userConfirmedData: data.userConfirmedData,
      finalFormData: data.finalFormData,
      allFormFields: data.allFormFields,
      completedFields: data.completedFields,
      userInputs: data.userInputs,
      generatedSlipData: data.generatedSlipData,
      notes: data.notes,
    };

    addBankRecord(toLegacyRecord(fallbackRequest));
    return fallbackRequest;
  }
}

/**
 * Fetch all bank service requests with optional filters
 */
export async function fetchBankServiceRequests(filters?: RequestFilters): Promise<BankServiceRequest[]> {
  const baseUrl = getApiBaseUrl();
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters?.serviceType && filters.serviceType !== 'all') params.set('serviceType', filters.serviceType);
  if (filters?.source && filters.source !== 'all') params.set('source', filters.source);
  if (filters?.search && filters.search.trim()) params.set('search', filters.search.trim());

  const queryString = params.toString() ? `?${params.toString()}` : '';
  const url = `${baseUrl}/api/requests${queryString}`;

  try {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return data.requests || [];
    }
  } catch (err: any) {
    console.warn('API fetch requests failed, falling back to local store:', err.message);
  }

  // Fallback to local store
  const localList = (window as any).localStorage?.getItem('coreserve_bank_records');
  if (localList) {
    try {
      const parsed: BankFormRecord[] = JSON.parse(localList);
      return parsed.map(r => ({
        id: r.id,
        requestId: r.formNumber || r.id,
        uniqueVerificationId: r.id,
        serviceType: (r.type as any) || 'withdrawal',
        source: 'find_service_withdrawal' as const,
        status: (r.status === 'COMPLETED' ? 'APPROVED' : r.status === 'REJECTED' ? 'REJECTED' : 'PENDING') as any,
        createdAt: r.submittedAt,
        updatedAt: r.updatedAt,
        date: r.date,
        amountNumeric: r.amount ? parseFloat(r.amount) : undefined,
        amountInWords: r.amountWords,
        accountHolderName: r.customerName,
        accountNumber: r.accountNumber,
        signature: r.signatureDataUrl,
        generatedSlipData: r.completedSlipImageUrl,
        allFormFields: r.details,
      }));
    } catch (e) {
      console.error(e);
    }
  }

  return [];
}

/**
 * Fetch a single bank service request by ID
 */
export async function fetchBankServiceRequestById(id: string): Promise<BankServiceRequest | null> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/requests/${encodeURIComponent(id)}`);
    if (res.ok) {
      const data = await res.json();
      return data.request;
    }
  } catch (err) {
    console.warn('API fetch request by ID failed:', err);
  }
  return null;
}

/**
 * Admin action: Update request status (APPROVE / REJECT)
 */
export async function updateBankServiceRequestStatus(
  id: string,
  payload: StatusUpdatePayload
): Promise<BankServiceRequest> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/requests/${encodeURIComponent(id)}/status`;

  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Server responded with ${res.status}`);
    }

    const data = await res.json();
    const updated: BankServiceRequest = data.request;

    // Update local cache
    updateBankRecordStatus(
      id,
      payload.status === 'APPROVED' ? 'COMPLETED' : 'REJECTED',
      payload.reason
    );

    return updated;
  } catch (error: any) {
    console.warn('Network update failed, applying status locally:', error.message);
    updateBankRecordStatus(
      id,
      payload.status === 'APPROVED' ? 'COMPLETED' : 'REJECTED',
      payload.reason
    );
    return {
      id,
      requestId: id,
      uniqueVerificationId: id,
      serviceType: 'withdrawal',
      source: 'find_service_withdrawal',
      status: payload.status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      date: new Date().toLocaleDateString('en-GB'),
      accountHolderName: '',
      accountNumber: '',
      rejectionReason: payload.reason,
    };
  }
}

/**
 * Citizen action: Check status of submitted request
 */
export async function checkBankServiceRequestStatus(id: string): Promise<any> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/requests/${encodeURIComponent(id)}/status`;
  const res = await fetch(url);
  if (res.ok) {
    return res.json();
  }
  throw new Error(`Could not retrieve status for request: ${id}`);
}

/**
 * Admin action: Clean/delete all requests from backend and local storage
 */
export async function cleanAllBankRequests(): Promise<boolean> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/requests/clean`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      await fetch(`${baseUrl}/api/requests`, { method: 'DELETE' }).catch(() => {});
    }
  } catch (err) {
    console.warn('Backend clean request failed, clearing local store:', err);
  }
  clearAllBankRecords();
  return true;
}

/**
 * Admin action: Restore fresh demo requests into backend and local storage
 */
export async function restoreDefaultBankRequests(): Promise<BankServiceRequest[]> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/requests/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      const list: BankServiceRequest[] = data.requests || [];
      const localRecords: BankFormRecord[] = list.map(r => ({
        id: r.uniqueVerificationId,
        formNumber: r.uniqueVerificationId,
        type: r.serviceType as any,
        title: `${r.serviceType.toUpperCase()} Counter Service`,
        customerName: r.accountHolderName,
        accountNumber: r.accountNumber,
        amount: r.amountNumeric ? String(r.amountNumeric) : undefined,
        amountWords: r.amountInWords,
        date: r.date || '',
        details: {},
        status: r.status === 'APPROVED' ? 'COMPLETED' : r.status === 'REJECTED' ? 'REJECTED' : 'READY_FOR_BANK',
        submittedAt: r.createdAt,
        updatedAt: r.updatedAt,
        notes: r.notes || r.rejectionReason || ''
      }));
      restoreDefaultBankRecords(localRecords);
      return list;
    }
  } catch (err) {
    console.warn('Backend restore request failed, restoring local store:', err);
  }
  return [];
}
