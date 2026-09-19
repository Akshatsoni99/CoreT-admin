/**
 * Backend Storage Abstraction — Repository Pattern
 * Zero Supabase dependency.
 * Persists data to a local JSON file with in-memory caching.
 */

import fs from 'fs';
import path from 'path';
import { BankServiceRequest, RequestFilters, StatusUpdatePayload } from './types.js';

export interface IRequestRepository {
  create(request: BankServiceRequest): Promise<BankServiceRequest>;
  getAll(filters?: RequestFilters): Promise<BankServiceRequest[]>;
  getById(idOrVerificationId: string): Promise<BankServiceRequest | null>;
  updateStatus(idOrVerificationId: string, payload: StatusUpdatePayload): Promise<BankServiceRequest | null>;
  delete(idOrVerificationId: string): Promise<boolean>;
  clearAll(): Promise<boolean>;
  restoreDefault(): Promise<BankServiceRequest[]>;
}

class JsonFileRequestRepository implements IRequestRepository {
  private filePath: string;
  private memoryCache: BankServiceRequest[] = [];
  private isLoaded: boolean = false;

  constructor() {
    const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    const targetDir = isServerless 
      ? path.join('/tmp', 'coret_data') 
      : path.resolve(process.cwd(), 'server', 'data');

    try {
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
    } catch (e) {
      console.warn('Directory creation notice:', e);
    }

    this.filePath = path.join(targetDir, 'requests.json');
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        if (raw.trim()) {
          this.memoryCache = JSON.parse(raw);
          this.isLoaded = true;
          return;
        }
      }

      // Check bundled fallback seed if target file is empty or missing (e.g. on Vercel)
      const bundledPath = path.resolve(process.cwd(), 'server', 'data', 'requests.json');
      if (fs.existsSync(bundledPath)) {
        const rawBundled = fs.readFileSync(bundledPath, 'utf-8');
        if (rawBundled.trim()) {
          this.memoryCache = JSON.parse(rawBundled);
          this.isLoaded = true;
          // Try to copy to writable location
          try {
            fs.writeFileSync(this.filePath, rawBundled, 'utf-8');
          } catch {}
          return;
        }
      }
    } catch (e) {
      console.error('Error loading requests from disk:', e);
      this.memoryCache = [];
    }
    this.isLoaded = true;
  }

  private saveToDisk() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.memoryCache, null, 2), 'utf-8');
    } catch (e) {
      // Fallback to /tmp if process.cwd failed (e.g. read-only file system)
      try {
        const tmpPath = path.join('/tmp', 'requests.json');
        fs.writeFileSync(tmpPath, JSON.stringify(this.memoryCache, null, 2), 'utf-8');
        this.filePath = tmpPath;
      } catch (err) {
        console.warn('Memory cache preserved, disk write skipped:', err);
      }
    }
  }

  async create(request: BankServiceRequest): Promise<BankServiceRequest> {
    if (!this.isLoaded) this.loadFromDisk();

    // Check if duplicate request ID or uniqueVerificationId exists
    const existingIndex = this.memoryCache.findIndex(
      r => r.id === request.id || r.requestId === request.requestId || r.uniqueVerificationId === request.uniqueVerificationId
    );

    const now = new Date().toISOString();
    const enrichedRequest: BankServiceRequest = {
      ...request,
      status: request.status || 'PENDING',
      createdAt: request.createdAt || now,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      this.memoryCache[existingIndex] = {
        ...this.memoryCache[existingIndex],
        ...enrichedRequest,
      };
    } else {
      this.memoryCache.unshift(enrichedRequest);
    }

    this.saveToDisk();
    return enrichedRequest;
  }

  async getAll(filters?: RequestFilters): Promise<BankServiceRequest[]> {
    if (!this.isLoaded) this.loadFromDisk();

    let list = [...this.memoryCache];

    if (!filters) return list;

    if (filters.status && filters.status !== 'all') {
      const s = filters.status.toUpperCase();
      list = list.filter(r => r.status.toUpperCase() === s);
    }

    if (filters.serviceType && filters.serviceType !== 'all') {
      const st = filters.serviceType.toLowerCase();
      list = list.filter(r => r.serviceType.toLowerCase() === st);
    }

    if (filters.source && filters.source !== 'all') {
      const src = filters.source.toLowerCase();
      list = list.filter(r => r.source.toLowerCase().includes(src));
    }

    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter(r => 
        (r.id && r.id.toLowerCase().includes(q)) ||
        (r.uniqueVerificationId && r.uniqueVerificationId.toLowerCase().includes(q)) ||
        (r.accountHolderName && r.accountHolderName.toLowerCase().includes(q)) ||
        (r.accountNumber && r.accountNumber.includes(q)) ||
        (r.serviceType && r.serviceType.toLowerCase().includes(q)) ||
        (r.source && r.source.toLowerCase().includes(q)) ||
        (r.status && r.status.toLowerCase().includes(q))
      );
    }

    return list;
  }

  async getById(idOrVerificationId: string): Promise<BankServiceRequest | null> {
    if (!this.isLoaded) this.loadFromDisk();
    const match = this.memoryCache.find(
      r => r.id === idOrVerificationId || 
           r.requestId === idOrVerificationId || 
           r.uniqueVerificationId === idOrVerificationId
    );
    return match || null;
  }

  async updateStatus(idOrVerificationId: string, payload: StatusUpdatePayload): Promise<BankServiceRequest | null> {
    if (!this.isLoaded) this.loadFromDisk();

    const index = this.memoryCache.findIndex(
      r => r.id === idOrVerificationId || 
           r.requestId === idOrVerificationId || 
           r.uniqueVerificationId === idOrVerificationId
    );

    if (index === -1) return null;

    const current = this.memoryCache[index];
    const now = new Date().toISOString();

    const updated: BankServiceRequest = {
      ...current,
      status: payload.status,
      updatedAt: now,
    };

    if (payload.status === 'APPROVED') {
      updated.approvedAt = now;
      updated.approvedBy = payload.officer || 'Branch Cashier';
    } else if (payload.status === 'REJECTED') {
      updated.rejectedAt = now;
      updated.rejectedBy = payload.officer || 'Branch Cashier';
      updated.rejectionReason = payload.reason || 'Verification criteria not met';
    }

    this.memoryCache[index] = updated;
    this.saveToDisk();
    return updated;
  }

  async delete(idOrVerificationId: string): Promise<boolean> {
    if (!this.isLoaded) this.loadFromDisk();
    const before = this.memoryCache.length;
    this.memoryCache = this.memoryCache.filter(
      r => r.id !== idOrVerificationId && 
           r.requestId !== idOrVerificationId && 
           r.uniqueVerificationId !== idOrVerificationId
    );
    if (this.memoryCache.length !== before) {
      this.saveToDisk();
      return true;
    }
    return false;
  }

  async clearAll(): Promise<boolean> {
    if (!this.isLoaded) this.loadFromDisk();
    this.memoryCache = [];
    this.saveToDisk();
    return true;
  }

  async restoreDefault(): Promise<BankServiceRequest[]> {
    const today = new Date().toLocaleDateString('en-GB');
    const defaultRecords: BankServiceRequest[] = [
      {
        id: 'SS-WD-26-DEMO@A1#1',
        requestId: 'SS-WD-26-DEMO@A1#1',
        uniqueVerificationId: 'SS-WD-26-DEMO@A1#1',
        serviceType: 'withdrawal',
        source: 'demo_withdrawal',
        status: 'PENDING',
        createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        date: today,
        amountNumeric: 1500,
        amountInWords: 'One Thousand Five Hundred Rupees Only',
        accountHolderName: 'Akshat Soni',
        accountNumber: '501004928172910',
        bankName: 'State Bank of India',
        branch: 'Main Branch',
        transactionId: 'SS-WD-26-DEMO@A1#1',
        tokenNumber: 'T-101',
        purpose: 'WITHDRAWAL Counter Service',
        signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        uploadedDocument: '',
        OCRData: null,
        ocrDetectedFields: {},
        userConfirmedData: { name: 'Akshat Soni', accountNumber: '501004928172910', amount: '1500' },
        finalFormData: { name: 'Akshat Soni', accountNumber: '501004928172910', amount: '1500' },
        allFormFields: {},
        completedFields: ['name', 'accountNumber', 'amount'],
        userInputs: {},
        generatedSlipData: '',
        notes: 'Demo Cash Withdrawal Slip'
      },
      {
        id: 'SS-DP-26-DEMO@B2#2',
        requestId: 'SS-DP-26-DEMO@B2#2',
        uniqueVerificationId: 'SS-DP-26-DEMO@B2#2',
        serviceType: 'deposit',
        source: 'demo_deposit',
        status: 'PENDING',
        createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
        date: today,
        amountNumeric: 5000,
        amountInWords: 'Five Thousand Rupees Only',
        accountHolderName: 'Priya Sharma',
        accountNumber: '302005918273910',
        bankName: 'State Bank of India',
        branch: 'Indore City',
        transactionId: 'SS-DP-26-DEMO@B2#2',
        tokenNumber: 'T-204',
        purpose: 'DEPOSIT Counter Service',
        signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        uploadedDocument: '',
        OCRData: null,
        ocrDetectedFields: {},
        userConfirmedData: { name: 'Priya Sharma', accountNumber: '302005918273910', amount: '5000' },
        finalFormData: { name: 'Priya Sharma', accountNumber: '302005918273910', amount: '5000' },
        allFormFields: {},
        completedFields: ['name', 'accountNumber', 'amount'],
        userInputs: {},
        generatedSlipData: '',
        notes: 'Demo Cash Deposit Slip'
      },
      {
        id: 'SS-WD-26-OCR@C3#3',
        requestId: 'SS-WD-26-OCR@C3#3',
        uniqueVerificationId: 'SS-WD-26-OCR@C3#3',
        serviceType: 'withdrawal',
        source: 'ocr_scan',
        status: 'PENDING',
        createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        date: today,
        amountNumeric: 2500,
        amountInWords: 'Two Thousand Five Hundred Rupees Only',
        accountHolderName: 'Vikram Singh',
        accountNumber: '409001928374900',
        bankName: 'State Bank of India',
        branch: 'Civil Lines Branch',
        transactionId: 'SS-WD-26-OCR@C3#3',
        tokenNumber: 'T-308',
        purpose: 'WITHDRAWAL Counter Service',
        signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        uploadedDocument: '',
        OCRData: null,
        ocrDetectedFields: { name: 'Vlkram Slngh', accountNumber: '409001928374900', amount: '2500' },
        userConfirmedData: { name: 'Vikram Singh', accountNumber: '409001928374900', amount: '2500' },
        finalFormData: { name: 'Vikram Singh', accountNumber: '409001928374900', amount: '2500' },
        allFormFields: {},
        completedFields: ['name', 'accountNumber', 'amount'],
        userInputs: {},
        generatedSlipData: '',
        notes: 'Scanned via Physical Slip OCR'
      },
      {
        id: 'SS-WD-26-APP@D4#4',
        requestId: 'SS-WD-26-APP@D4#4',
        uniqueVerificationId: 'SS-WD-26-APP@D4#4',
        serviceType: 'withdrawal',
        source: 'find_service_withdrawal',
        status: 'APPROVED',
        createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        approvedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        approvedBy: 'Branch Cashier',
        date: today,
        amountNumeric: 10000,
        amountInWords: 'Ten Thousand Rupees Only',
        accountHolderName: 'Ramesh Kumar',
        accountNumber: '601004928172910',
        bankName: 'State Bank of India',
        branch: 'Main Branch',
        transactionId: 'SS-WD-26-APP@D4#4',
        tokenNumber: 'T-415',
        purpose: 'WITHDRAWAL Counter Service',
        signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        uploadedDocument: '',
        OCRData: null,
        ocrDetectedFields: {},
        userConfirmedData: { name: 'Ramesh Kumar', accountNumber: '601004928172910', amount: '10000' },
        finalFormData: { name: 'Ramesh Kumar', accountNumber: '601004928172910', amount: '10000' },
        allFormFields: {},
        completedFields: ['name', 'accountNumber', 'amount'],
        userInputs: {},
        generatedSlipData: '',
        notes: 'Verified against passbook'
      },
      {
        id: 'SS-DP-26-REJ@E5#5',
        requestId: 'SS-DP-26-REJ@E5#5',
        uniqueVerificationId: 'SS-DP-26-REJ@E5#5',
        serviceType: 'deposit',
        source: 'upload_photo',
        status: 'REJECTED',
        createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 70).toISOString(),
        rejectedAt: new Date(Date.now() - 1000 * 60 * 70).toISOString(),
        rejectedBy: 'Branch Cashier',
        rejectionReason: 'Account number does not match account title',
        date: today,
        amountNumeric: 25000,
        amountInWords: 'Twenty Five Thousand Rupees Only',
        accountHolderName: 'Sunita Devi',
        accountNumber: '701004928172910',
        bankName: 'State Bank of India',
        branch: 'Main Branch',
        transactionId: 'SS-DP-26-REJ@E5#5',
        tokenNumber: 'T-522',
        purpose: 'DEPOSIT Counter Service',
        signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        uploadedDocument: '',
        OCRData: null,
        ocrDetectedFields: { amount: '25000' },
        userConfirmedData: { name: 'Sunita Devi', accountNumber: '701004928172910', amount: '25000' },
        finalFormData: { name: 'Sunita Devi', accountNumber: '701004928172910', amount: '25000' },
        allFormFields: {},
        completedFields: ['name', 'accountNumber', 'amount'],
        userInputs: {},
        generatedSlipData: '',
        notes: 'Upload photo deposit slip'
      }
    ];

    this.memoryCache = defaultRecords;
    this.saveToDisk();
    return defaultRecords;
  }
}

export const requestRepository: IRequestRepository = new JsonFileRequestRepository();
