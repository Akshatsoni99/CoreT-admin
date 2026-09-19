import { useState } from 'react';
import { StartScanner } from './Scanner/StartScanner';
import { CameraScanner } from './Scanner/CameraScanner';
import { ProcessingScanner } from './Scanner/ProcessingScanner';
import { AnalysisResults } from './Scanner/AnalysisResults';
import { FormCompletion } from './Scanner/FormCompletion';
import { OCRAnalysisResult } from '../services/ocrService';
import { BankFormModal, BankServiceType } from '../components/banking/BankFormModal';
import { RequestSource } from '../../server/types';

interface ScannerViewProps {
  onComplete: () => void;
}

export function ScannerView({ onComplete }: ScannerViewProps) {
  const [step, setStep] = useState(1);
  const [capturedImage, setCapturedImage] = useState<string>('');
  const [scanSource, setScanSource] = useState<RequestSource>('ocr_scan');
  const [scanResult, setScanResult] = useState<OCRAnalysisResult | null>(null);

  // Active bank form modal to use the unified BankFormModal engine
  const [activeBankModal, setActiveBankModal] = useState<{
    type: BankServiceType;
    source: RequestSource;
    initialData?: Record<string, string>;
    ocrMetadata?: {
      OCRData?: any;
      ocrDetectedFields?: Record<string, string>;
      uploadedDocument?: string;
    };
  } | null>(null);

  // When image is captured from camera
  const handleCameraCapture = (imageDataUrl: string) => {
    setScanSource('ocr_scan');
    setCapturedImage(imageDataUrl);
    setStep(3); // Go to Processing / OCR
  };

  // When an image is picked from file upload
  const handleImageSelected = (imageDataUrl: string, source: 'ocr_scan' | 'upload_photo' = 'upload_photo') => {
    setScanSource(source);
    setCapturedImage(imageDataUrl);
    setStep(3); // Go to Processing / OCR
  };

  // When demo withdrawal is chosen
  const handleDemoWithdrawal = () => {
    setActiveBankModal({
      type: 'withdrawal',
      source: 'demo_withdrawal'
    });
  };

  // When demo deposit is chosen
  const handleDemoDeposit = () => {
    setActiveBankModal({
      type: 'deposit',
      source: 'demo_deposit'
    });
  };

  // When OCR scan completes in ProcessingScanner
  const handleScanComplete = (result: OCRAnalysisResult) => {
    setScanResult(result);
    setStep(4); // Go to Analysis Results
  };

  // Transition from AnalysisResults directly to the unified BankFormModal engine
  const handleProceedToFormEngine = () => {
    if (!scanResult) return;

    const initialData: Record<string, string> = {};
    scanResult.fields.forEach(f => {
      if (f.value && f.value.trim()) {
        initialData[f.id] = f.value.trim();
      }
    });

    const slipType: BankServiceType = scanResult.detectedSlipType === 'deposit' ? 'deposit' : 'withdrawal';

    setActiveBankModal({
      type: slipType,
      source: scanSource,
      initialData,
      ocrMetadata: {
        OCRData: scanResult,
        ocrDetectedFields: { ...initialData },
        uploadedDocument: capturedImage
      }
    });
  };

  const handleBack = () => {
    if (step === 1) {
      onComplete();
    } else if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      setStep(capturedImage ? 2 : 1);
    } else if (step === 4) {
      setStep(2);
    } else if (step === 5) {
      setStep(4);
    }
  };

  return (
    <div className="h-full w-full bg-white flex flex-col relative">
      {step === 1 && (
        <StartScanner 
          onNext={() => setStep(2)} 
          onBack={handleBack} 
          onImageSelected={handleImageSelected} 
          onDemoWithdrawal={handleDemoWithdrawal}
          onDemoDeposit={handleDemoDeposit}
        />
      )}

      {step === 2 && (
        <CameraScanner 
          onCapture={handleCameraCapture} 
          onBack={handleBack} 
        />
      )}

      {step === 3 && (
        <ProcessingScanner 
          capturedImage={capturedImage} 
          onScanComplete={handleScanComplete} 
          onBack={handleBack}
          onScanAgain={() => setStep(2)}
        />
      )}

      {step === 4 && scanResult && (
        <AnalysisResults 
          result={scanResult} 
          onNext={handleProceedToFormEngine} 
          onBack={handleBack} 
        />
      )}

      {step === 5 && scanResult && (
        <FormCompletion 
          result={scanResult} 
          onComplete={onComplete} 
          onBack={handleBack} 
        />
      )}

      {/* Unified Bank Form Engine Modal */}
      {activeBankModal && (
        <BankFormModal
          type={activeBankModal.type}
          source={activeBankModal.source}
          initialData={activeBankModal.initialData}
          ocrMetadata={activeBankModal.ocrMetadata}
          onClose={() => {
            setActiveBankModal(null);
            onComplete();
          }}
        />
      )}
    </div>
  );
}
