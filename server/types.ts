/**
 * CoreT Bank Service Request Types & Data Models
 * Supports full end-to-end integration between User Panel and Admin Panel
 */

export type BankServiceRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type RequestSource = 
  | 'ocr_scan' 
  | 'upload_photo' 
  | 'demo_withdrawal' 
  | 'demo_deposit' 
  | 'find_service_withdrawal' 
  | 'find_service_deposit'
  | 'direct_submission';

export type ServiceType = 'withdrawal' | 'deposit' | 'transfer' | 'ocr_form';

export interface BankServiceRequest {
  id: string; // Unique ID (e.g. SS-WD-26-A7@K9#2)
  requestId: string; // Machine / API identifier
  uniqueVerificationId: string; // Citizen verification ID
  serviceType: ServiceType;
  source: RequestSource;
  status: BankServiceRequestStatus;
  createdAt: string;
  updatedAt: string;
  date: string; // Formatted runtime date e.g. "19/09/2026"
  amountNumeric?: number;
  amountInWords?: string;
  accountHolderName: string;
  accountNumber: string;
  bankName?: string;
  branch?: string;
  transactionId?: string;
  tokenNumber?: string;
  purpose?: string;
  signature?: string; // Data URL of signature bitmap
  uploadedDocument?: string; // Data URL of uploaded/camera document
  OCRData?: any; // Raw OCR engine output
  ocrDetectedFields?: Record<string, string>; // Initial fields read by OCR
  userConfirmedData?: Record<string, string>; // Fields verified/edited by citizen
  finalFormData?: Record<string, string>; // Consolidated submitted data
  allFormFields?: Record<string, string>; // All key-values
  completedFields?: string[]; // List of completed field IDs
  userInputs?: Record<string, string>; // User explicit typed inputs
  generatedSlipData?: string; // High-res canvas rendered physical slip (Data URL)
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  notes?: string;
}

export interface RequestFilters {
  status?: string;
  serviceType?: string;
  source?: string;
  search?: string;
}

export interface StatusUpdatePayload {
  status: 'APPROVED' | 'REJECTED';
  officer?: string;
  reason?: string;
}
