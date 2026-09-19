import { useState, useEffect } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Volume2, 
  Eye, 
  Building2, 
  Calendar, 
  FileText, 
  Edit3, 
  CheckCircle2, 
  ArrowRight,
  Maximize2,
  Minimize2,
  Download,
  AlertCircle,
  Loader2
} from 'lucide-react';

import WithdrawalSlipImg from '../../assets/withdrawal-slip.png';
import DepositSlipImg from '../../assets/deposit-slip.png';
import BankTransferSlipImg from '../../assets/bank-transfer-slip.png';

import { getUserProfile } from '../../services/userProfileStore';
import { generateVerificationId, generateFormNumber, FormPrefix } from '../../services/verificationService';
import { addBankRecord } from '../../services/bankAdminStore';
import { generateCompletedSlip } from '../../utils/slipRenderer';
import { AccountNumberBoxes } from './AccountNumberBoxes';
import { SignaturePad } from './SignaturePad';
import { SuccessAnimation } from './SuccessAnimation';
import { RequestSource, BankServiceRequest } from '../../../server/types';
import { submitBankServiceRequest } from '../../services/apiService';

export type BankServiceType = 'withdrawal' | 'deposit' | 'transfer';

export interface BankFormModalProps {
  type: BankServiceType;
  source?: RequestSource;
  onClose: () => void;
  initialData?: Record<string, string>;
  ocrMetadata?: {
    OCRData?: any;
    ocrDetectedFields?: Record<string, string>;
    uploadedDocument?: string;
  };
}

// Convert numbers to Indian English Words
function numberToIndianWords(numStr: string): string {
  const clean = numStr.replace(/\D/g, '');
  const num = parseInt(clean, 10);
  if (isNaN(num) || num <= 0) return '';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
                 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n: number): string {
    if (n < 20) return units[n];
    return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + units[n % 10] : '');
  }

  function convertThreeDigits(n: number): string {
    let str = '';
    if (n >= 100) {
      str += units[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n > 0) {
      str += convertTwoDigits(n);
    }
    return str.trim();
  }

  let crore = Math.floor(num / 10000000);
  let lakh = Math.floor((num % 10000000) / 100000);
  let thousand = Math.floor((num % 100000) / 1000);
  let remainder = num % 1000;

  let result = '';
  if (crore > 0) result += convertTwoDigits(crore) + ' Crore ';
  if (lakh > 0) result += convertTwoDigits(lakh) + ' Lakh ';
  if (thousand > 0) result += convertTwoDigits(thousand) + ' Thousand ';
  if (remainder > 0) result += convertThreeDigits(remainder);

  return result.trim() ? result.trim() + ' Rupees Only' : '';
}

function getTodayFormatted(): string {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function BankFormModal({ type, source, onClose, initialData, ocrMetadata }: BankFormModalProps) {
  const profile = getUserProfile();

  // Form Configurations — Asking strictly only required fields per service
  const formConfigs = {
    withdrawal: {
      prefix: 'WD' as FormPrefix,
      title: 'Cash Withdrawal Slip',
      slipAsset: WithdrawalSlipImg,
      subtitle: 'Fill this slip to withdraw cash at the bank counter',
      accountLength: 15,
      steps: [
        {
          id: 'name',
          title: "Account Holder Name",
          label: "Bank account mein registered naam",
          placeholder: "Enter full name",
          helper: "Must match the name printed on your bank passbook",
          raahaTip: {
            en: "Enter the account holder's full name as printed on your passbook.",
            hi: "अपना वही नाम लिखिए जो बैंक अकाउंट और पासबुक में दर्ज है।"
          },
          highlight: { top: '50%', left: '50%', width: '46%', height: '8%' },
          fieldKey: 'name',
          required: true
        },
        {
          id: 'accountNumber',
          title: "Account Number",
          label: "15-digit bank account number",
          placeholder: "Enter 15-digit account number",
          helper: "Found on the front page of your passbook",
          raahaTip: {
            en: "Enter each digit of your 15-digit bank account number in the boxes.",
            hi: "अपनी पासबुक से देखकर 15 अंकों का खाता नंबर खानों में भरें।"
          },
          highlight: { top: '47%', left: '5%', width: '45%', height: '11%' },
          fieldKey: 'accountNumber',
          required: true
        },
        {
          id: 'amount',
          title: "Amount in Numbers",
          label: "Cash to withdraw (₹)",
          placeholder: "0",
          helper: "Amount you wish to withdraw",
          raahaTip: {
            en: "Enter the cash amount you wish to withdraw.",
            hi: "जितने पैसे निकालने हैं, वह राशि अंकों में लिखें।"
          },
          highlight: { top: '32%', left: '75%', width: '22%', height: '10%' },
          fieldKey: 'amount',
          required: true
        },
        {
          id: 'amountWords',
          title: "Amount in Words",
          label: "Amount written in words",
          placeholder: "Auto-generated in words",
          helper: "Always conclude with 'Rupees Only'",
          raahaTip: {
            en: "We have converted your amount into words. Please verify.",
            hi: "राशि को शब्दों में लिख दिया गया है, एक बार जांच लें।"
          },
          highlight: { top: '29%', left: '27%', width: '45%', height: '8%' },
          fieldKey: 'amountWords',
          required: true
        },
        {
          id: 'date',
          title: "Today's Date",
          label: "Date of withdrawal",
          placeholder: "DD/MM/YYYY",
          helper: "Withdrawal slip is valid for today's date",
          raahaTip: {
            en: "Today's date is entered here for counter verification.",
            hi: "आज की तारीख दर्ज करें। पर्ची उसी दिन के लिए मान्य होती है।"
          },
          highlight: { top: '22%', left: '74%', width: '23%', height: '8%' },
          fieldKey: 'date',
          required: true
        },
        {
          id: 'signature',
          title: "Account Holder Signature",
          label: "Hastakshar / Sign below",
          placeholder: "Sign manually in the box",
          helper: "Must match your bank records",
          raahaTip: {
            en: "Sign manually inside the white box using your finger or mouse.",
            hi: "सफ़ेद बॉक्स में अपनी उंगली या माउस से अपने असली हस्ताक्षर करें।"
          },
          highlight: { top: '48%', left: '50%', width: '25%', height: '6%' },
          fieldKey: 'signature',
          required: true
        }
      ]
    },
    deposit: {
      prefix: 'DP' as FormPrefix,
      title: 'Cash Deposit Slip',
      slipAsset: DepositSlipImg,
      subtitle: 'Fill this slip to deposit cash at the bank counter',
      accountLength: 15,
      steps: [
        {
          id: 'branch',
          title: "Branch Name",
          label: "Bank branch name",
          placeholder: "e.g. Main Branch",
          helper: "Branch where you are depositing cash",
          raahaTip: {
            en: "Enter the bank branch name where you are depositing.",
            hi: "जिस बैंक शाखा में पैसे जमा कर रहे हैं, उसका नाम लिखें।"
          },
          highlight: { top: '15%', left: '79%', width: '18%', height: '6%' },
          fieldKey: 'branch',
          required: true
        },
        {
          id: 'accountNumber',
          title: "Account Number",
          label: "Jis account mein paise daalne hain",
          placeholder: "Enter 15-digit account number",
          helper: "Double check the account number to ensure safe deposit",
          raahaTip: {
            en: "Enter the 15-digit bank account number where money should be credited.",
            hi: "जिस खाते में पैसे जमा करने हैं, उसका 15 अंकों का खाता नंबर लिखें।"
          },
          highlight: { top: '22%', left: '54%', width: '44%', height: '7%' },
          fieldKey: 'accountNumber',
          required: true
        },
        {
          id: 'name',
          title: "Account Holder / Depositor Name",
          label: "Khata-dharak ka naam",
          placeholder: "Full name",
          helper: "Name of the account holder or person depositing",
          raahaTip: {
            en: "Enter the account holder's name clearly.",
            hi: "खाताधारक या जमाकर्ता का नाम लिखें।"
          },
          highlight: { top: '31%', left: '57%', width: '40%', height: '6%' },
          fieldKey: 'name',
          required: true
        },
        {
          id: 'mobileNumber',
          title: "Mobile Number",
          label: "SMS receipt mobile number",
          placeholder: "10-digit mobile number",
          helper: "For SMS deposit confirmation",
          raahaTip: {
            en: "Provide your mobile number to receive SMS confirmation.",
            hi: "जमा की पुष्टि का SMS पाने के लिए 10 अंकों का फोन नंबर भरें।"
          },
          highlight: { top: '37%', left: '60%', width: '24%', height: '6%' },
          fieldKey: 'mobileNumber',
          required: false
        },
        {
          id: 'amount',
          title: "Deposit Amount",
          label: "Total cash to deposit (₹)",
          placeholder: "0",
          helper: "Cash amount being deposited",
          raahaTip: {
            en: "Enter the total cash amount. (PAN required if ₹50,000 or above).",
            hi: "जमा की जाने वाली राशि लिखें। 50,000 रुपये से अधिक पर पैन कार्ड आवश्यक है।"
          },
          highlight: { top: '47%', left: '84%', width: '14%', height: '6%' },
          fieldKey: 'amount',
          required: true
        },
        {
          id: 'amountWords',
          title: "Amount in Words",
          label: "Deposit amount in words",
          placeholder: "Auto-generated in words",
          helper: "Always conclude with 'Rupees Only'",
          raahaTip: {
            en: "Verify the deposit amount spelled out in words.",
            hi: "शब्दों में लिखी राशि की जांच कर लें।"
          },
          highlight: { top: '43%', left: '58%', width: '40%', height: '6%' },
          fieldKey: 'amountWords',
          required: true
        },
        {
          id: 'date',
          title: "Today's Date",
          label: "Date of deposit",
          placeholder: "DD/MM/YYYY",
          helper: "Today's deposit date",
          raahaTip: {
            en: "Today's date is entered in the date boxes on the top right.",
            hi: "आज की तारीख दर्ज करें।"
          },
          highlight: { top: '8%', left: '84%', width: '14%', height: '6%' },
          fieldKey: 'date',
          required: true
        },
        {
          id: 'signature',
          title: "Depositor Signature",
          label: "Depositor ke hastakshar",
          placeholder: "Sign manually in the box",
          helper: "Signature of person handing over cash",
          raahaTip: {
            en: "Sign manually inside the white box.",
            hi: "सफ़ेद बॉक्स में अपने हस्ताक्षर करें।"
          },
          highlight: { top: '78%', left: '85%', width: '13%', height: '7%' },
          fieldKey: 'signature',
          required: true
        }
      ]
    },
    transfer: {
      prefix: 'TR' as FormPrefix,
      title: 'Bank Transfer Slip (NEFT / RTGS)',
      slipAsset: BankTransferSlipImg,
      subtitle: 'Transfer money from your account to any bank account',
      accountLength: 15,
      steps: [
        {
          id: 'date',
          title: "Application Date",
          label: "Transfer application date",
          placeholder: "DD/MM/YYYY",
          helper: "Today's date",
          raahaTip: {
            en: "Enter today's date on the transfer slip.",
            hi: "ट्रांसफर फॉर्म पर आज की तारीख दर्ज करें।"
          },
          highlight: { top: '4%', left: '77%', width: '21%', height: '4%' },
          fieldKey: 'date',
          required: true
        },
        {
          id: 'senderName',
          title: "Sender (Applicant) Name",
          label: "Aapka poora naam (Sender)",
          placeholder: "Your full name",
          helper: "Name registered in the debit bank account",
          raahaTip: {
            en: "Enter your name as registered in the sending bank account.",
            hi: "पैसे भेजने वाले का नाम (आपका नाम) यहाँ लिखें।"
          },
          highlight: { top: '28%', left: '19%', width: '76%', height: '3%' },
          fieldKey: 'senderName',
          required: true
        },
        {
          id: 'senderAccount',
          title: "Sender Account Number",
          label: "Jis account se paise katenge",
          placeholder: "Your account number",
          helper: "Money will be deducted from this account",
          raahaTip: {
            en: "Enter your account number from which money will be debited.",
            hi: "जिस खाते से पैसे कटेंगे, उसका खाता नंबर दर्ज करें।"
          },
          highlight: { top: '23%', left: '22%', width: '42%', height: '3%' },
          fieldKey: 'senderAccount',
          required: true
        },
        {
          id: 'amount',
          title: "Transfer Amount",
          label: "Bhejne wali rashi (₹)",
          placeholder: "0",
          helper: "NEFT / RTGS transfer amount",
          raahaTip: {
            en: "Enter the amount to transfer.",
            hi: "जितनी राशि ट्रांसफर करनी है, वह दर्ज करें।"
          },
          highlight: { top: '13%', left: '33%', width: '13%', height: '3%' },
          fieldKey: 'amount',
          required: true
        },
        {
          id: 'amountWords',
          title: "Amount in Words",
          label: "Transfer amount in words",
          placeholder: "Auto-generated in words",
          helper: "Conclude with 'Rupees Only'",
          raahaTip: {
            en: "Check the transfer amount written in words.",
            hi: "राशि को शब्दों में लिखा गया है, कृपया जांच लें।"
          },
          highlight: { top: '13%', left: '56%', width: '38%', height: '3%' },
          fieldKey: 'amountWords',
          required: true
        },
        {
          id: 'beneficiaryName',
          title: "Beneficiary (Receiver) Name",
          label: "Jisko paise bhejne hain (Receiver)",
          placeholder: "Recipient's full name",
          helper: "Must match the receiver's bank account",
          raahaTip: {
            en: "Enter the name of the person or entity receiving the money.",
            hi: "जिस व्यक्ति को पैसे भेज रहे हैं, उनका नाम सही-सही लिखें।"
          },
          highlight: { top: '39%', left: '19%', width: '76%', height: '3%' },
          fieldKey: 'beneficiaryName',
          required: true
        },
        {
          id: 'beneficiaryAccount',
          title: "Beneficiary Account Number",
          label: "Receiver ka account number",
          placeholder: "Enter receiver's account number",
          helper: "Double check each digit carefully",
          raahaTip: {
            en: "Bank transfers are routed strictly by account number. Verify twice!",
            hi: "खाता नंबर बिल्कुल सही भरें क्योंकि ट्रांसफर इसी नंबर पर होता है।"
          },
          highlight: { top: '42%', left: '22%', width: '42%', height: '3%' },
          fieldKey: 'beneficiaryAccount',
          required: true
        },
        {
          id: 'bankName',
          title: "Beneficiary Bank & Branch",
          label: "Receiver ke bank aur branch ka naam",
          placeholder: "e.g. State Bank of India, Main Branch",
          helper: "Bank & branch of recipient",
          raahaTip: {
            en: "Enter the bank name and branch of the receiver.",
            hi: "सामने वाले के बैंक का नाम और शाखा लिखें।"
          },
          highlight: { top: '45%', left: '19%', width: '76%', height: '3%' },
          fieldKey: 'bankName',
          required: true
        },
        {
          id: 'ifscCode',
          title: "IFSC Code",
          label: "11-character IFSC code",
          placeholder: "e.g. SBIN0001234",
          helper: "Found on receiver's passbook or cheque",
          raahaTip: {
            en: "IFSC is the unique 11-digit code identifying the destination branch.",
            hi: "IFSC कोड 11 अक्षरों का होता है जो पासबुक या चेक पर छपा होता है।"
          },
          highlight: { top: '48%', left: '22%', width: '29%', height: '3%' },
          fieldKey: 'ifscCode',
          required: true
        },
        {
          id: 'signature',
          title: "Applicant's Signature",
          label: "Applicant signature",
          placeholder: "Sign manually in the box",
          helper: "Authorizes the bank to debit your account",
          raahaTip: {
            en: "Sign manually inside the white box.",
            hi: "सफ़ेद बॉक्स में प्राथमिक आवेदक के हस्ताक्षर करें।"
          },
          highlight: { top: '78%', left: '2%', width: '30%', height: '6%' },
          fieldKey: 'signature',
          required: true
        }
      ]
    }
  };

  const currentConfig = formConfigs[type];
  const steps = currentConfig.steps;

  // View state
  const [viewMode, setViewMode] = useState<'wizard' | 'review' | 'success' | 'view_completed_slip'>('wizard');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSlipExpanded, setIsSlipExpanded] = useState(false);
  const [raahaLang, setRaahaLang] = useState<'en' | 'hi'>('hi');
  const [isVoiceSpeaking, setIsVoiceSpeaking] = useState(false);
  const [stepError, setStepError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State: Initialize cleanly from profile if available, otherwise empty (NEVER fake Rohan Sharma)
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const today = getTodayFormatted();
    const defaults: Record<string, string> = {
      date: today,
      name: profile.name || '',
      senderName: profile.name || '',
      mobileNumber: profile.phone || '',
      branch: '',
      accountNumber: '',
      senderAccount: '',
      beneficiaryName: '',
      beneficiaryAccount: '',
      bankName: '',
      ifscCode: '',
      amount: '',
      amountWords: '',
      signature: ''
    };

    if (initialData) {
      Object.assign(defaults, initialData);
      if (initialData.amount) {
        defaults.amountWords = numberToIndianWords(initialData.amount);
      }
    }

    return defaults;
  });

  // Rendered slip and verification ID state
  const [completedSlipUrl, setCompletedSlipUrl] = useState<string>('');
  const [isRenderingSlip, setIsRenderingSlip] = useState(false);
  const [verificationId, setVerificationId] = useState<string>('');
  const [formNumber, setFormNumber] = useState<string>('');

  const currentStep = steps[currentStepIndex];

  // Amount formatting and live sync with words
  const handleAmountChange = (val: string) => {
    const cleanNum = val.replace(/\D/g, '');
    const words = numberToIndianWords(cleanNum);
    setFormData(prev => ({
      ...prev,
      amount: cleanNum,
      amountWords: words
    }));
    setStepError('');
  };

  // Generate completed physical slip preview whenever entering review screen
  useEffect(() => {
    if (viewMode === 'review') {
      let isCancelled = false;
      setIsRenderingSlip(true);
      generateCompletedSlip({
        type,
        data: formData,
        signatureDataUrl: formData.signature,
        verificationId: verificationId || undefined
      })
        .then(url => {
          if (!isCancelled) {
            setCompletedSlipUrl(url);
            setIsRenderingSlip(false);
          }
        })
        .catch(err => {
          console.error('Failed to render completed physical slip:', err);
          if (!isCancelled) setIsRenderingSlip(false);
        });

      return () => {
        isCancelled = true;
      };
    }
  }, [viewMode, formData, type, verificationId]);

  // Voice narration simulation
  const triggerVoiceTip = () => {
    setIsVoiceSpeaking(true);
    if ('speechSynthesis' in window) {
      try {
        const text = currentStep.raahaTip[raahaLang];
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = raahaLang === 'hi' ? 'hi-IN' : 'en-IN';
        utterance.onend = () => setIsVoiceSpeaking(false);
        utterance.onerror = () => setIsVoiceSpeaking(false);
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
        return;
      } catch (e) {
        // fallback
      }
    }
    setTimeout(() => setIsVoiceSpeaking(false), 2800);
  };

  // Validate step before advancing
  const validateCurrentStep = (): boolean => {
    const key = currentStep.fieldKey;
    const val = (formData[key] || '').trim();

    if (currentStep.required) {
      if (!val) {
        setStepError(`Please provide ${currentStep.title} to continue.`);
        return false;
      }
      if (currentStep.id === 'accountNumber' || currentStep.id === 'senderAccount') {
        const cleanDigits = val.replace(/\D/g, '');
        if (cleanDigits.length < 11) {
          setStepError(`Please enter a valid bank account number (at least 11 digits).`);
          return false;
        }
      }
      if (currentStep.id === 'signature') {
        if (!formData.signature || !formData.signature.startsWith('data:image')) {
          setStepError('Please sign manually inside the white box before continuing.');
          return false;
        }
      }
      if (currentStep.id === 'amount') {
        const num = parseInt(val, 10);
        if (isNaN(num) || num <= 0) {
          setStepError('Please enter a valid amount greater than ₹0.');
          return false;
        }
      }
    }

    setStepError('');
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;

    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      setViewMode('review');
    }
  };

  const handleBack = () => {
    setStepError('');
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    } else {
      onClose();
    }
  };

  // Handle final submission (DONE — DETAILS ARE CORRECT)
  const handleFinalSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // 1. Generate Unique Verification ID ONCE
      const uniqueId = verificationId || generateVerificationId(currentConfig.prefix);
      const fNum = formNumber || generateFormNumber(currentConfig.prefix);
      setVerificationId(uniqueId);
      setFormNumber(fNum);

      // 2. Render completed slip with the unique Verification ID stamped
      let finalSlipDataUrl = completedSlipUrl;
      try {
        finalSlipDataUrl = await generateCompletedSlip({
          type,
          data: formData,
          signatureDataUrl: formData.signature,
          verificationId: uniqueId
        });
        setCompletedSlipUrl(finalSlipDataUrl);
      } catch (e) {
        console.warn('Error rendering final slip stamp:', e);
      }

      // 3. Prepare complete Request Object (per requirement 4, 5, 42)
      const cleanAmt = (formData.amount || '').replace(/\D/g, '');
      const amtNumeric = cleanAmt ? parseInt(cleanAmt, 10) : undefined;
      const amtWords = formData.amountWords || (amtNumeric ? numberToIndianWords(String(amtNumeric)) : '');
      const reqSource: RequestSource = source || (
        type === 'withdrawal' ? 'find_service_withdrawal' :
        type === 'deposit' ? 'find_service_deposit' : 'direct_submission'
      );

      const requestPayload: Partial<BankServiceRequest> = {
        id: uniqueId,
        requestId: fNum,
        uniqueVerificationId: uniqueId,
        serviceType: type,
        source: reqSource,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        date: formData.date || getTodayFormatted(),
        amountNumeric: amtNumeric,
        amountInWords: amtWords,
        accountHolderName: formData.name || formData.senderName || profile.name || 'Citizen Applicant',
        accountNumber: formData.accountNumber || formData.senderAccount || '',
        bankName: formData.bankName || 'State Bank of India',
        branch: formData.branch || 'Main Branch',
        transactionId: uniqueId,
        tokenNumber: `T-${Math.floor(100 + Math.random() * 900)}`,
        purpose: currentConfig.title,
        signature: formData.signature,
        uploadedDocument: ocrMetadata?.uploadedDocument,
        OCRData: ocrMetadata?.OCRData,
        ocrDetectedFields: ocrMetadata?.ocrDetectedFields || {},
        userConfirmedData: { ...formData },
        finalFormData: { ...formData },
        allFormFields: { ...formData },
        completedFields: Object.keys(formData).filter(k => Boolean(formData[k])),
        userInputs: { ...formData },
        generatedSlipData: finalSlipDataUrl,
      };

      // 4. Save to REST API Backend (which also synchronizes to local store)
      await submitBankServiceRequest(requestPayload);

      // 5. Transition to Success Animation Screen
      setViewMode('success');
    } catch (e) {
      console.error('Error submitting bank service request:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render active step input
  const renderStepInput = () => {
    const fieldKey = currentStep.fieldKey;
    const value = formData[fieldKey] || '';

    // Signature Pad Step
    if (currentStep.id === 'signature') {
      return (
        <SignaturePad
          initialDataUrl={formData.signature}
          onSave={(dataUrl) => {
            setFormData(prev => ({ ...prev, signature: dataUrl }));
            if (dataUrl) setStepError('');
          }}
          onClear={() => {
            setFormData(prev => ({ ...prev, signature: '' }));
          }}
          requiredError={stepError}
        />
      );
    }

    // Account Number with individual digit boxes
    if (currentStep.id === 'accountNumber' || currentStep.id === 'senderAccount' || currentStep.id === 'beneficiaryAccount') {
      return (
        <AccountNumberBoxes
          value={value}
          onChange={(val) => {
            setFormData(prev => ({ ...prev, [fieldKey]: val }));
            setStepError('');
          }}
          length={currentConfig.accountLength}
          label={currentStep.label}
          helperText={currentStep.helper}
        />
      );
    }

    // Amount input with live Indian words
    if (currentStep.id === 'amount') {
      const quickAmounts = [1000, 2000, 5000, 10000, 25000, 50000];
      return (
        <div className="space-y-4">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-extrabold text-[#002D5A]">₹</span>
            <input
              type="text"
              inputMode="numeric"
              value={value ? Number(value).toLocaleString('en-IN') : ''}
              onChange={(e) => handleAmountChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleNext(); }}
              placeholder="0"
              className="w-full bg-white border-2 border-[#004B87]/40 focus:border-[#004B87] rounded-2xl py-4 pl-12 pr-4 text-3xl font-black text-[#002D5A] focus:outline-none shadow-sm transition-all"
              autoFocus
            />
          </div>

          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">Quick Pick Amounts</span>
            <div className="flex flex-wrap gap-2">
              {quickAmounts.map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleAmountChange(String(amt))}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                    value === String(amt)
                      ? 'bg-[#004B87] text-white border-[#004B87] shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  ₹{amt.toLocaleString('en-IN')}
                </button>
              ))}
            </div>
          </div>

          {formData.amountWords ? (
            <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3.5">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">In Words (Shabdon Mein)</span>
              <p className="text-sm font-bold text-[#002D5A] mt-0.5">{formData.amountWords}</p>
            </div>
          ) : (
            <div className="text-xs text-gray-400 italic">
              Amount in words will appear here automatically.
            </div>
          )}
        </div>
      );
    }

    // Date Step (dynamic today's date)
    if (currentStep.id === 'date') {
      return (
        <div className="space-y-3">
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={value}
              onChange={(e) => {
                setFormData({ ...formData, [fieldKey]: e.target.value });
                setStepError('');
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleNext(); }}
              placeholder={currentStep.placeholder}
              className="w-full bg-white border-2 border-gray-200 focus:border-[#004B87] rounded-2xl py-3.5 pl-12 pr-4 text-base font-bold text-gray-900 focus:outline-none transition-all"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setFormData({ ...formData, [fieldKey]: getTodayFormatted() });
              setStepError('');
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#004B87] bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
          >
            <Calendar size={14} /> Use Today's Date ({getTodayFormatted()})
          </button>
        </div>
      );
    }

    // Default text input (Name, Branch, etc.)
    return (
      <div className="space-y-2">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setFormData({ ...formData, [fieldKey]: e.target.value });
            setStepError('');
          }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleNext(); }}
          placeholder={currentStep.placeholder}
          className="w-full bg-white border-2 border-gray-200 focus:border-[#004B87] rounded-2xl py-3.5 px-4 text-base font-bold text-gray-900 focus:outline-none transition-all shadow-sm"
          autoFocus
        />
        {/* Profile Autofill suggestion if available */}
        {profile.name && (currentStep.id === 'name' || currentStep.id === 'senderName') && value !== profile.name && (
          <button
            type="button"
            onClick={() => {
              setFormData({ ...formData, [fieldKey]: profile.name });
              setStepError('');
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#004B87] bg-blue-50 border border-blue-200 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors"
          >
            <CheckCircle2 size={13} /> Use My Saved Name: {profile.name}
          </button>
        )}
      </div>
    );
  };

  // Review Screen (Parts 8 & 9)
  const renderReviewScreen = () => {
    return (
      <div className="flex flex-col h-full bg-[#F9FAFB]">
        {/* Header */}
        <header className="px-5 pt-12 pb-4 bg-white border-b border-gray-100 flex items-center justify-between sticky top-0 z-20">
          <button onClick={() => setViewMode('wizard')} className="p-2 -ml-2 text-gray-900">
            <ChevronLeft size={24} />
          </button>
          <div className="text-center">
            <h2 className="text-lg font-bold text-gray-900">CHECK YOUR DETAILS</h2>
            <p className="text-[11px] text-gray-500">{currentConfig.title}</p>
          </div>
          <div className="w-8" />
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-6">
          
          {/* Status Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
            <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-emerald-900">Completed Physical Slip Generated</h4>
              <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
                Your entered information and actual drawn signature have been placed onto the official physical bank slip below.
              </p>
            </div>
          </div>

          {/* PHYSICAL COMPLETED SLIP PREVIEW (Part 8 & 39) */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden">
            <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <FileText size={15} className="text-[#004B87]" /> Actual Completed Physical Slip
              </span>
              <button
                onClick={() => setViewMode('view_completed_slip')}
                className="text-xs font-bold text-[#004B87] hover:underline flex items-center gap-1"
              >
                <Maximize2 size={13} /> Full Screen
              </button>
            </div>

            <div className="p-2 bg-gray-100 flex items-center justify-center min-h-[160px] relative">
              {isRenderingSlip ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-500 text-xs">
                  <div className="w-6 h-6 border-2 border-[#004B87] border-t-transparent rounded-full animate-spin mb-2" />
                  Generating physical slip overlay...
                </div>
              ) : completedSlipUrl ? (
                <img
                  src={completedSlipUrl}
                  alt="Completed Bank Slip"
                  className="w-full h-auto object-contain rounded border border-gray-300 shadow-sm cursor-pointer"
                  onClick={() => setViewMode('view_completed_slip')}
                />
              ) : (
                <div className="text-xs text-gray-400">Loading slip preview...</div>
              )}
            </div>

            <div className="p-2.5 text-center bg-blue-50/60 border-t border-blue-100 text-[11px] text-blue-900 font-medium">
              🔍 Tap slip to inspect full high-resolution image with your actual signature.
            </div>
          </div>

          {/* User Entered Values Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
            <div className="p-3.5 bg-gray-50/70 border-b border-gray-100 font-bold text-xs text-gray-700">
              Entered Form Fields
            </div>
            {steps.map((step, idx) => {
              const val = formData[step.fieldKey];
              const isAmount = step.id === 'amount';
              const isSig = step.id === 'signature';

              return (
                <div key={step.id} className="p-3.5 flex items-center justify-between hover:bg-gray-50/80 transition-colors">
                  <div className="flex-1 pr-3 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                      {step.title}
                    </span>
                    {isSig ? (
                      val ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-1">
                          <Check size={12} /> Manually Signed
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-red-600">Not signed</span>
                      )
                    ) : (
                      <span className={`block mt-0.5 truncate font-bold ${isAmount ? 'text-lg text-[#004B87]' : 'text-sm text-gray-900'}`}>
                        {isAmount ? `₹${Number(val || 0).toLocaleString('en-IN')}` : (val || '—')}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setCurrentStepIndex(idx);
                      setViewMode('wizard');
                    }}
                    className="p-2 text-[#004B87] hover:bg-blue-50 rounded-xl transition-colors shrink-0"
                    title="Edit this field"
                  >
                    <Edit3 size={16} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* FINAL CHECK CHECKLIST (Part 9) */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Check once before submitting
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-700 font-medium">
                <CheckCircle2 size={16} />
                <span>Name: <strong>{formData.name || formData.senderName || 'Provided'}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700 font-medium">
                <CheckCircle2 size={16} />
                <span>Account Number: <strong>{formData.accountNumber || formData.senderAccount || 'Provided'}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700 font-medium">
                <CheckCircle2 size={16} />
                <span>Amount: <strong>₹{Number(formData.amount || 0).toLocaleString('en-IN')}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700 font-medium">
                <CheckCircle2 size={16} />
                <span>Amount in Words: <strong>{formData.amountWords || 'Provided'}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700 font-medium">
                <CheckCircle2 size={16} />
                <span>Date: <strong>{formData.date || getTodayFormatted()}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700 font-medium">
                <CheckCircle2 size={16} />
                <span>Signature: <strong>Manually Drawn</strong></span>
              </div>
            </div>
          </div>

        </div>

        {/* Pinned Bottom Actions */}
        <div className="p-4 bg-white border-t border-gray-200 shrink-0 z-30 flex gap-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <button
            type="button"
            onClick={() => setViewMode('wizard')}
            className="flex-1 py-3.5 border border-gray-300 text-gray-700 font-bold rounded-full text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
          >
            <ChevronLeft size={18} /> Back & Edit
          </button>
          <button
            type="button"
            onClick={handleFinalSubmit}
            disabled={isSubmitting}
            className="flex-[2] py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black rounded-full text-sm transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-95 cursor-pointer disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>SUBMITTING TO BANK...</span>
              </>
            ) : (
              <>
                <Check size={18} strokeWidth={3} />
                <span>DONE — DETAILS ARE CORRECT</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  // Full Screen Completed Slip View
  const renderCompletedSlipView = () => {
    return (
      <div className="flex flex-col h-full bg-gray-950 text-white">
        <header className="px-4 pt-12 pb-4 bg-gray-900 border-b border-gray-800 flex items-center justify-between">
          <button onClick={() => setViewMode(verificationId ? 'success' : 'review')} className="p-2 text-white">
            <ChevronLeft size={24} />
          </button>
          <div className="text-center">
            <h3 className="font-bold text-sm text-white">Completed {currentConfig.title}</h3>
            {verificationId && <p className="text-[10px] text-emerald-400 font-mono">{verificationId}</p>}
          </div>
          {completedSlipUrl ? (
            <a
              href={completedSlipUrl}
              download={`${type}-slip-${getTodayFormatted().replace(/\//g, '')}.png`}
              className="p-2 text-blue-400 hover:text-white"
              title="Download Slip Image"
            >
              <Download size={20} />
            </a>
          ) : (
            <div className="w-8" />
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center">
          {completedSlipUrl ? (
            <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-700">
              <img
                src={completedSlipUrl}
                alt="Completed Slip"
                className="w-full h-auto object-contain block"
              />
            </div>
          ) : (
            <div className="text-gray-400 text-xs">Loading slip...</div>
          )}

          <div className="mt-4 bg-gray-900 border border-gray-800 rounded-2xl p-4 w-full max-w-lg text-left">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-400 block text-[10px]">Customer:</span>
                <span className="font-bold text-white">{formData.name || formData.senderName}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">Account No:</span>
                <span className="font-bold text-white">{formData.accountNumber || formData.senderAccount}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">Amount:</span>
                <span className="font-bold text-emerald-400">₹{Number(formData.amount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">Date:</span>
                <span className="font-bold text-white">{formData.date}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-900 border-t border-gray-800 flex gap-3">
          <button
            onClick={() => setViewMode(verificationId ? 'success' : 'review')}
            className="flex-1 py-3.5 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-full text-sm"
          >
            Back
          </button>
          {verificationId && (
            <button
              onClick={onClose}
              className="flex-1 py-3.5 bg-[#004B87] hover:bg-blue-700 text-white font-bold rounded-full text-sm"
            >
              Finish
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white h-full max-h-[100dvh] sm:h-[90vh] sm:max-h-[92vh] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
        {viewMode === 'review' && renderReviewScreen()}
        {viewMode === 'view_completed_slip' && renderCompletedSlipView()}
        {viewMode === 'success' && (
          <SuccessAnimation
            title={currentConfig.title}
            formNumber={formNumber}
            verificationId={verificationId}
            amount={formData.amount}
            onViewSlip={() => setViewMode('view_completed_slip')}
            onDone={onClose}
          />
        )}

        {viewMode === 'wizard' && (
          <div className="flex flex-col h-full bg-[#F9FAFB]">
            {/* Header */}
            <header className="px-4 pt-12 pb-3 bg-white border-b border-gray-100 flex items-center justify-between sticky top-0 z-20">
              <button onClick={handleBack} className="p-2 -ml-2 text-gray-900">
                <ChevronLeft size={24} />
              </button>
              
              <div className="text-center">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#004B87]">
                  Step {currentStepIndex + 1} of {steps.length}
                </span>
                <h1 className="text-sm font-bold text-gray-900 truncate max-w-[200px]">
                  {currentConfig.title}
                </h1>
              </div>

              <button 
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </header>

            {/* Progress Bar */}
            <div className="w-full bg-gray-100 h-1.5">
              <div 
                className="bg-[#004B87] h-1.5 transition-all duration-300"
                style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
              />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-6">
              
              {/* Slip Visual Reference Card */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-2.5 bg-gray-50 border-b border-gray-200/80 flex items-center justify-between text-xs font-semibold text-gray-700">
                  <span className="flex items-center gap-1.5">
                    <FileText size={14} className="text-[#004B87]" /> Official Bank Paper Slip
                  </span>
                  <button 
                    onClick={() => setIsSlipExpanded(!isSlipExpanded)}
                    className="text-[#004B87] hover:underline flex items-center gap-1 text-[11px] font-bold"
                  >
                    {isSlipExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                    {isSlipExpanded ? 'Collapse' : 'Full View'}
                  </button>
                </div>

                <div className={`relative overflow-hidden bg-gray-100 transition-all ${isSlipExpanded ? 'h-72' : 'h-36'}`}>
                  <img 
                    src={currentConfig.slipAsset} 
                    alt={currentConfig.title}
                    className="w-full h-full object-contain pointer-events-none"
                  />
                  
                  {/* Dynamic pulsing highlight box indicating current field on the paper slip */}
                  {currentStep.highlight && (
                    <div 
                      className="absolute border-2 border-red-500 bg-red-500/20 rounded shadow-lg animate-pulse transition-all duration-300 pointer-events-none flex items-center justify-center"
                      style={{
                        top: currentStep.highlight.top,
                        left: currentStep.highlight.left,
                        width: currentStep.highlight.width,
                        height: currentStep.highlight.height
                      }}
                    >
                      <span className="bg-red-600 text-white text-[9px] font-bold px-1 rounded shadow-sm scale-90">
                        Fill Here
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-2 text-center text-[10px] text-gray-500 bg-white">
                  📍 Red highlight shows where <strong>{currentStep.title}</strong> is placed on the paper slip.
                </div>
              </div>

              {/* RAAHA Guidance Box (Part 34 & 35) */}
              <div className="bg-white border-2 border-blue-100 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#002D5A] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                      R
                    </div>
                    <div>
                      <span className="font-bold text-gray-900 text-xs">RAAHA Banking Companion</span>
                      <span className="text-[10px] text-gray-500 block -mt-0.5">Raah dikhane wala saathi</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setRaahaLang(raahaLang === 'en' ? 'hi' : 'en')}
                      className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
                    >
                      {raahaLang === 'en' ? 'हिंदी में' : 'English'}
                    </button>

                    <button
                      onClick={triggerVoiceTip}
                      className={`p-1.5 rounded-full transition-colors ${
                        isVoiceSpeaking 
                          ? 'bg-blue-600 text-white animate-bounce' 
                          : 'bg-blue-50 text-[#004B87] hover:bg-blue-100'
                      }`}
                      title="Listen to RAAHA guidance"
                    >
                      <Volume2 size={16} />
                    </button>
                  </div>
                </div>

                <p className="text-xs font-semibold text-gray-800 leading-relaxed bg-blue-50/40 p-2.5 rounded-xl border border-blue-100/50">
                  "{currentStep.raahaTip[raahaLang]}"
                </p>
                {isVoiceSpeaking && (
                  <span className="inline-block mt-2 text-[10px] font-bold text-blue-600 animate-pulse">
                    🔊 RAAHA bolkar samjha raha hai...
                  </span>
                )}
              </div>

              {/* Active Step Input Card */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                    {currentStep.label}
                  </label>
                  <span className={`text-[11px] font-bold ${currentStep.required ? 'text-red-500' : 'text-gray-400'}`}>
                    {currentStep.required ? 'Required *' : 'Optional'}
                  </span>
                </div>

                {renderStepInput()}

                {stepError && (
                  <div className="flex items-center gap-1.5 text-xs text-red-600 font-bold bg-red-50 p-2.5 rounded-xl border border-red-200">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{stepError}</span>
                  </div>
                )}

                <p className="text-[11px] text-gray-400 leading-snug">
                  ℹ️ {currentStep.helper}
                </p>

                {/* Inline Action Button for immediate step continuation */}
                {currentStep.id !== 'signature' && (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="w-full py-3 bg-[#004B87] hover:bg-blue-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 mt-3"
                  >
                    <span>{currentStepIndex === steps.length - 1 ? 'Review Slip' : 'Continue / Next'}</span>
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>

            </div>

            {/* Pinned Bottom Navigation */}
            <div className="p-4 bg-white border-t border-gray-200 shrink-0 z-30 flex gap-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 py-3.5 border border-gray-300 text-gray-700 font-bold rounded-full text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <ChevronLeft size={18} /> Back
              </button>
              
              <button
                type="button"
                onClick={handleNext}
                className="flex-[2] py-3.5 bg-[#004B87] hover:bg-blue-800 text-white font-bold rounded-full text-sm transition-all shadow-lg shadow-[#004B87]/30 flex items-center justify-center gap-2 active:scale-95"
              >
                <span>{currentStepIndex === steps.length - 1 ? 'Review Slip' : 'Continue / Next'}</span>
                <ChevronRight size={18} />
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
