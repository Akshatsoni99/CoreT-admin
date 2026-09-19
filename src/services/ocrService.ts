import Tesseract from 'tesseract.js';
import { getUserProfile, UserProfile } from './userProfileStore';

export interface OCRProgress {
  status: string;
  progress: number;
  message: string;
}

export type DocumentValidationStatus = 'VALID_DOCUMENT' | 'INVALID_OBJECT' | 'LOW_CONFIDENCE_DOCUMENT';

export type FieldStatus = 'auto-filled' | 'needs-input' | 'review';

export interface ExtractedFormField {
  id: string;
  label: string;
  value: string;
  suggestedValue?: string;
  hasProfileSuggestion?: boolean;
  confidence: number;
  status: FieldStatus;
  source: 'ocr' | 'profile' | 'date_default' | 'empty';
  required?: boolean;
}

export interface OCRAnalysisResult {
  validationStatus: DocumentValidationStatus;
  validationMessage?: string;
  rawText: string;
  confidence: number;
  documentType: string;
  detectedSlipType?: 'withdrawal' | 'deposit' | 'transfer' | 'general';
  issuingAuthority: string;
  fields: ExtractedFormField[];
  filledCount: number;
  missingCount: number;
  reviewCount: number;
  missingFieldLabels: string[];
  capturedImage: string;
}

/**
 * Format progress message from Tesseract status
 */
function formatStatusMessage(status: string, progress: number): string {
  const percent = Math.round((progress || 0) * 100);
  switch (status) {
    case 'loading tesseract core':
      return 'Loading OCR WebAssembly core...';
    case 'loaded tesseract core':
      return 'OCR core ready.';
    case 'loading language traineddata':
      return `Loading language traineddata (${percent}%)...`;
    case 'loaded language traineddata':
      return 'Language data ready.';
    case 'initializing api':
      return 'Initializing document recognition...';
    case 'initialized api':
      return 'Recognition engine ready.';
    case 'recognizing text':
      return `Analyzing text & form layout (${percent}%)...`;
    default:
      if (percent > 0) {
        return `Scanning document (${percent}%)...`;
      }
      return 'Inspecting document image...';
  }
}

/**
 * Document keywords to differentiate real forms from walls, faces, or random photos
 */
const DOCUMENT_KEYWORDS = [
  'bank', 'branch', 'account', 'withdrawal', 'deposit', 'transfer', 'rupees', 'rs', 'sum',
  'debit', 'credit', 'holder', 'signature', 'sig', 'applicant', 'date', 'form', 'slip',
  'application', 'certificate', 'revenue', 'pan', 'aadhaar', 'voter', 'election', 'income',
  'government', 'department', 'public', 'services', 'office', 'tehsil', 'district', 'cheque',
  'ifsc', 'neft', 'rtgs', 'beneficiary', 'nominee', 'customer', 'token', 'verified'
];

/**
 * Multi-signal validation to detect non-documents (face, wall, table, landscape, blank image)
 */
export function evaluateDocumentValidity(
  rawText: string,
  confidence: number
): { status: DocumentValidationStatus; message?: string } {
  const clean = rawText.trim();
  const lower = clean.toLowerCase();

  // Signal 1: Empty or extremely short text
  if (clean.length < 12) {
    return {
      status: 'INVALID_OBJECT',
      message: 'This does not look like a bank form or document. Please scan a valid form, bank slip, certificate or document.'
    };
  }

  // Signal 2: Check matching document keywords using whole-word matching
  const tokenizedWords = lower.split(/[^a-z0-9]+/);
  const wordSet = new Set(tokenizedWords);
  const matchedKeywords = DOCUMENT_KEYWORDS.filter(kw => {
    if (kw.includes(' ')) {
      return lower.includes(kw);
    }
    return wordSet.has(kw);
  });

  // If zero document keywords were found, this is an arbitrary non-document object (face, wall, landscape, shirt, etc.)
  if (matchedKeywords.length === 0) {
    return {
      status: 'INVALID_OBJECT',
      message: 'This does not look like a bank form or document. Please scan a valid form, bank slip, certificate or document.'
    };
  }

  // Low confidence check for blurry or poorly lit documents
  if (confidence < 30 || (matchedKeywords.length <= 1 && confidence < 45)) {
    return {
      status: 'LOW_CONFIDENCE_DOCUMENT',
      message: "Document detected, but we couldn't read it clearly. Please hold camera steady or upload a clearer photo."
    };
  }

  return {
    status: 'VALID_DOCUMENT'
  };
}

function getTodayFormatted(): string {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Identify document type and issuing authority from recognized text
 */
export function identifyDocumentType(text: string): { 
  documentType: string; 
  authority: string; 
  detectedSlipType?: 'withdrawal' | 'deposit' | 'transfer' | 'general';
} {
  const upper = text.toUpperCase();

  // 1. Bank Cash Withdrawal Slip
  if (
    upper.includes('WITHDRAWAL') || 
    (upper.includes('DEBIT') && upper.includes('BANK')) ||
    (upper.includes('PAY SELF') && upper.includes('SUM OF')) ||
    (upper.includes('CASH') && upper.includes('SLIP') && !upper.includes('DEPOSIT'))
  ) {
    return {
      documentType: 'Bank Cash Withdrawal Slip',
      authority: 'Bank Counter Operations',
      detectedSlipType: 'withdrawal'
    };
  }

  // 2. Bank Cash Deposit Slip
  if (
    upper.includes('DEPOSIT') || 
    upper.includes('DEPOSITOR') || 
    (upper.includes('CREDIT') && upper.includes('ALC NO')) ||
    upper.includes('CREDIT CARD NO')
  ) {
    return {
      documentType: 'Bank Cash Deposit Slip',
      authority: 'Bank Counter Operations',
      detectedSlipType: 'deposit'
    };
  }

  // 3. Bank Transfer Slip (NEFT / RTGS)
  if (
    upper.includes('TRANSFER') || 
    upper.includes('NEFT') || 
    upper.includes('RTGS') || 
    upper.includes('BENEFICIARY') || 
    upper.includes('REMITTANCE') ||
    upper.includes('IFSC')
  ) {
    return {
      documentType: 'Bank Transfer Application (NEFT / RTGS)',
      authority: 'Bank Electronic Remittance Department',
      detectedSlipType: 'transfer'
    };
  }

  // 4. Government Certificates
  if (upper.includes('INCOME') || upper.includes('AAY') || upper.includes('TAHSIL') || upper.includes('REVENUE DEPARTMENT')) {
    return {
      documentType: 'Income Certificate Application Form',
      authority: 'Department of Revenue & Public Grievance',
      detectedSlipType: 'general'
    };
  }
  if (upper.includes('AADHAAR') || upper.includes('UIDAI') || upper.includes('UNIQUE IDENTIFICATION')) {
    return {
      documentType: 'Aadhaar Enrolment / Update Form',
      authority: 'Unique Identification Authority of India (UIDAI)',
      detectedSlipType: 'general'
    };
  }
  if (upper.includes('PAN') || upper.includes('INCOME TAX') || upper.includes('PERMANENT ACCOUNT NUMBER')) {
    return {
      documentType: 'PAN Card Application (Form 49A)',
      authority: 'Income Tax Department, Govt of India',
      detectedSlipType: 'general'
    };
  }
  if (upper.includes('VOTER') || upper.includes('ELECTION') || upper.includes('EPIC')) {
    return {
      documentType: 'Voter Registration Form 6',
      authority: 'Election Commission of India',
      detectedSlipType: 'general'
    };
  }

  return {
    documentType: 'Bank / Citizen Service Form',
    authority: 'Official Citizen & Banking Service',
    detectedSlipType: 'general'
  };
}

/**
 * Dynamically extract and analyze fields based on actual detected document content
 * and real user profile (NEVER hardcoded fake data).
 */
function parseFieldsDynamically(
  text: string, 
  slipType: 'withdrawal' | 'deposit' | 'transfer' | 'general' | undefined,
  userProfile: UserProfile
): ExtractedFormField[] {
  const fields: ExtractedFormField[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const today = getTodayFormatted();

  if (slipType === 'withdrawal') {
    // Bank Withdrawal Slip Fields

    // 1. Account Number
    let detectedAcc = '';
    const accMatch = text.match(/\b\d{11,16}\b/);
    if (accMatch) {
      detectedAcc = accMatch[0];
    }

    fields.push({
      id: 'accountNumber',
      label: 'Account Number',
      value: detectedAcc,
      confidence: detectedAcc ? 92 : 0,
      status: detectedAcc ? 'auto-filled' : 'needs-input',
      source: detectedAcc ? 'ocr' : 'empty',
      required: true
    });

    // 2. Amount in Numbers
    let detectedAmount = '';
    const amtMatch = text.match(/(?:rs\.?|inr|₹)?\s*([1-9]\d{2,6})\b/i);
    if (amtMatch) {
      detectedAmount = amtMatch[1].replace(/,/g, '');
    }

    fields.push({
      id: 'amount',
      label: 'Amount in Numbers',
      value: detectedAmount,
      confidence: detectedAmount ? 88 : 0,
      status: detectedAmount ? 'auto-filled' : 'needs-input',
      source: detectedAmount ? 'ocr' : 'empty',
      required: true
    });

    // 3. Amount in Words
    let detectedWords = '';
    if (detectedAmount) {
      // If amount found, convert to words
      const wordsMatch = text.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|twenty|fifty|thousand|hundred|lakh|rupees)\b/i);
      if (wordsMatch) {
        detectedWords = 'Auto-matched from slip';
      }
    }

    fields.push({
      id: 'amountWords',
      label: 'Amount in Words',
      value: detectedWords,
      confidence: detectedWords ? 85 : 0,
      status: detectedWords ? 'auto-filled' : 'needs-input',
      source: detectedWords ? 'ocr' : 'empty',
      required: true
    });

    // 4. Account Holder Name
    let detectedName = '';
    const nameLine = lines.find(l => /(?:name|holder|shri|smt)\s*[:.-]?\s*([a-zA-Z\s]{3,})/i.test(l));
    if (nameLine) {
      const match = nameLine.match(/(?:name|holder|shri|smt)\s*[:.-]?\s*([a-zA-Z\s]{3,})/i);
      if (match && match[1]?.trim().length > 2 && !/of|bank|branch|slip|office/i.test(match[1])) {
        detectedName = match[1].trim();
      }
    }

    fields.push({
      id: 'name',
      label: 'Account Holder Name',
      value: detectedName,
      suggestedValue: userProfile.name || undefined,
      hasProfileSuggestion: Boolean(userProfile.name),
      confidence: detectedName ? 90 : (userProfile.name ? 95 : 0),
      status: detectedName ? 'auto-filled' : 'needs-input',
      source: detectedName ? 'ocr' : (userProfile.name ? 'profile' : 'empty'),
      required: true
    });

    // 5. Date
    let detectedDate = '';
    const dateMatch = text.match(/\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/);
    if (dateMatch) {
      detectedDate = dateMatch[1];
    }

    fields.push({
      id: 'date',
      label: "Today's Date",
      value: detectedDate || today,
      suggestedValue: today,
      confidence: detectedDate ? 92 : 98,
      status: detectedDate ? 'auto-filled' : 'auto-filled',
      source: detectedDate ? 'ocr' : 'date_default',
      required: true
    });

    // 6. Signature
    let signaturePresent = false;
    if (text.includes('Sig.') && text.includes('Holder') && text.length > 250) {
      // Signature area had marked density
      signaturePresent = false; // Always verify signature manually per bank policy
    }

    fields.push({
      id: 'signature',
      label: 'Account Holder Signature',
      value: '',
      confidence: signaturePresent ? 70 : 0,
      status: 'needs-input',
      source: 'empty',
      required: true
    });

    return fields;
  }

  if (slipType === 'deposit') {
    // Bank Deposit Slip Fields
    let detectedAcc = '';
    const accMatch = text.match(/\b\d{11,16}\b/);
    if (accMatch) detectedAcc = accMatch[0];

    fields.push({
      id: 'accountNumber',
      label: 'Deposit Account Number',
      value: detectedAcc,
      confidence: detectedAcc ? 90 : 0,
      status: detectedAcc ? 'auto-filled' : 'needs-input',
      source: detectedAcc ? 'ocr' : 'empty',
      required: true
    });

    let detectedBranch = '';
    const branchMatch = text.match(/(?:branch)\s*[:.-]?\s*([a-zA-Z\s]{3,20})/i);
    if (branchMatch) detectedBranch = branchMatch[1].trim();

    fields.push({
      id: 'branch',
      label: 'Branch Name',
      value: detectedBranch,
      confidence: detectedBranch ? 85 : 0,
      status: detectedBranch ? 'auto-filled' : 'needs-input',
      source: detectedBranch ? 'ocr' : 'empty',
      required: true
    });

    fields.push({
      id: 'name',
      label: 'Account Holder / Depositor Name',
      value: '',
      suggestedValue: userProfile.name || undefined,
      hasProfileSuggestion: Boolean(userProfile.name),
      confidence: userProfile.name ? 95 : 0,
      status: 'needs-input',
      source: userProfile.name ? 'profile' : 'empty',
      required: true
    });

    let detectedAmount = '';
    const amtMatch = text.match(/(?:total|rs\.?|₹)\s*([1-9]\d{2,6})\b/i);
    if (amtMatch) detectedAmount = amtMatch[1].replace(/,/g, '');

    fields.push({
      id: 'amount',
      label: 'Deposit Amount',
      value: detectedAmount,
      confidence: detectedAmount ? 88 : 0,
      status: detectedAmount ? 'auto-filled' : 'needs-input',
      source: detectedAmount ? 'ocr' : 'empty',
      required: true
    });

    fields.push({
      id: 'date',
      label: 'Deposit Date',
      value: today,
      suggestedValue: today,
      confidence: 98,
      status: 'auto-filled',
      source: 'date_default',
      required: true
    });

    fields.push({
      id: 'signature',
      label: 'Depositor Signature',
      value: '',
      confidence: 0,
      status: 'needs-input',
      source: 'empty',
      required: true
    });

    return fields;
  }

  // General Government Form or Certificate
  let detectedName = '';
  const nameMatch = text.match(/(?:name|applicant|shri|smt)\s*[:.-]?\s*([a-zA-Z\s]{3,25})/i);
  if (nameMatch && nameMatch[1]?.trim().length > 2) detectedName = nameMatch[1].trim();

  fields.push({
    id: 'name',
    label: 'Full Name of Applicant',
    value: detectedName,
    suggestedValue: userProfile.name || undefined,
    hasProfileSuggestion: Boolean(userProfile.name),
    confidence: detectedName ? 90 : (userProfile.name ? 95 : 0),
    status: detectedName ? 'auto-filled' : 'needs-input',
    source: detectedName ? 'ocr' : (userProfile.name ? 'profile' : 'empty'),
    required: true
  });

  let detectedPhone = '';
  const phoneMatch = text.match(/(?:[+91]{2,3}[\s-]?)?([6-9]\d{9})/);
  if (phoneMatch) detectedPhone = `+91 ${phoneMatch[1]}`;

  fields.push({
    id: 'mobile',
    label: 'Mobile Number',
    value: detectedPhone || userProfile.phone || '',
    suggestedValue: userProfile.phone || undefined,
    hasProfileSuggestion: Boolean(userProfile.phone),
    confidence: detectedPhone ? 92 : (userProfile.phone ? 95 : 0),
    status: (detectedPhone || userProfile.phone) ? 'auto-filled' : 'needs-input',
    source: detectedPhone ? 'ocr' : (userProfile.phone ? 'profile' : 'empty'),
    required: true
  });

  fields.push({
    id: 'date',
    label: 'Date of Application',
    value: today,
    suggestedValue: today,
    confidence: 98,
    status: 'auto-filled',
    source: 'date_default',
    required: true
  });

  fields.push({
    id: 'signature',
    label: 'Applicant Signature',
    value: '',
    confidence: 0,
    status: 'needs-input',
    source: 'empty',
    required: true
  });

  return fields;
}

/**
 * Execute OCR recognition with multi-signal document validation.
 * NEVER falls back to fake "Rohan Sharma" data.
 */
export async function runOCRScan(
  imageSource: string | File | Blob,
  onProgress?: (progress: OCRProgress) => void
): Promise<OCRAnalysisResult> {
  const userProfile = getUserProfile();

  let capturedImageDataUrl = '';
  if (typeof imageSource === 'string') {
    capturedImageDataUrl = imageSource;
  } else {
    capturedImageDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(imageSource);
    });
  }

  try {
    const ocrPromise = Tesseract.recognize(
      imageSource,
      'eng',
      {
        logger: (m) => {
          if (onProgress) {
            onProgress({
              status: m.status,
              progress: m.progress || 0,
              message: formatStatusMessage(m.status, m.progress || 0)
            });
          }
        }
      }
    );

    // Timeout after 9 seconds
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), 9000);
    });

    const result = await Promise.race([ocrPromise, timeoutPromise]);

    // Handle failure or timeout — genuine failure, NEVER fake sample text
    if (!result || !result.data || !result.data.text?.trim()) {
      return {
        validationStatus: 'INVALID_OBJECT',
        validationMessage: 'This does not look like a bank form or document. Please scan a valid form, bank slip, certificate or document.',
        rawText: '',
        confidence: 0,
        documentType: 'Invalid Document',
        issuingAuthority: 'Unrecognized',
        fields: [],
        filledCount: 0,
        missingCount: 0,
        reviewCount: 0,
        missingFieldLabels: [],
        capturedImage: capturedImageDataUrl
      };
    }

    const rawText = result.data.text;
    const confidence = Math.round(result.data.confidence || 0);

    // Evaluate validity across multi-signals
    const validity = evaluateDocumentValidity(rawText, confidence);
    if (validity.status !== 'VALID_DOCUMENT') {
      return {
        validationStatus: validity.status,
        validationMessage: validity.message,
        rawText,
        confidence,
        documentType: validity.status === 'LOW_CONFIDENCE_DOCUMENT' ? 'Unclear Document' : 'Invalid Document',
        issuingAuthority: 'Unrecognized',
        fields: [],
        filledCount: 0,
        missingCount: 0,
        reviewCount: 0,
        missingFieldLabels: [],
        capturedImage: capturedImageDataUrl
      };
    }

    // Valid document -> identify document & extract fields dynamically
    const { documentType, authority, detectedSlipType } = identifyDocumentType(rawText);
    const fields = parseFieldsDynamically(rawText, detectedSlipType, userProfile);

    const filledCount = fields.filter(f => f.status === 'auto-filled').length;
    const missingCount = fields.filter(f => f.status === 'needs-input').length;
    const reviewCount = fields.filter(f => f.status === 'review').length;
    const missingFieldLabels = fields.filter(f => f.status === 'needs-input').map(f => f.label);

    return {
      validationStatus: 'VALID_DOCUMENT',
      rawText,
      confidence,
      documentType,
      detectedSlipType,
      issuingAuthority: authority,
      fields,
      filledCount,
      missingCount,
      reviewCount,
      missingFieldLabels,
      capturedImage: capturedImageDataUrl
    };
  } catch (error) {
    console.error('Tesseract OCR error:', error);
    return {
      validationStatus: 'INVALID_OBJECT',
      validationMessage: "Couldn't read this document clearly. Please hold your camera steady and scan again.",
      rawText: '',
      confidence: 0,
      documentType: 'Scan Failed',
      issuingAuthority: 'Error',
      fields: [],
      filledCount: 0,
      missingCount: 0,
      reviewCount: 0,
      missingFieldLabels: [],
      capturedImage: capturedImageDataUrl
    };
  }
}
