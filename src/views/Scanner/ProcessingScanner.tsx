import { useEffect, useState, useRef, ChangeEvent } from 'react';
import { ChevronLeft, CheckCircle2, Circle, ShieldAlert, AlertTriangle, RefreshCcw, Image as ImageIcon } from 'lucide-react';
import { runOCRScan, OCRProgress, OCRAnalysisResult } from '../../services/ocrService';

interface ProcessingScannerProps {
  capturedImage: string;
  onScanComplete: (result: OCRAnalysisResult) => void;
  onBack?: () => void;
  onScanAgain?: () => void;
}

export function ProcessingScanner({ capturedImage, onScanComplete, onBack, onScanAgain }: ProcessingScannerProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [ocrProgress, setOcrProgress] = useState<number>(10);
  const [statusMessage, setStatusMessage] = useState('Reading captured document...');
  const [invalidResult, setInvalidResult] = useState<OCRAnalysisResult | null>(null);

  const onScanCompleteRef = useRef(onScanComplete);
  onScanCompleteRef.current = onScanComplete;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps = [
    "Reading captured document",
    "Verifying document geometry",
    "Extracting text (OCR)",
    "Parsing fields & profile match"
  ];

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Restart scan with new image
          setInvalidResult(null);
          executeScan(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const executeScan = async (imgSource: string) => {
    setActiveStep(0);
    setOcrProgress(15);
    setStatusMessage('Reading captured document image...');

    try {
      const result = await runOCRScan(imgSource, (progress: OCRProgress) => {
        const pct = Math.round((progress.progress || 0) * 100);
        if (pct > 0) setOcrProgress(pct);
        if (progress.message) setStatusMessage(progress.message);
        if (progress.status === 'recognizing text') {
          setActiveStep(2);
        }
      });

      if (result.validationStatus === 'VALID_DOCUMENT') {
        setActiveStep(3);
        setOcrProgress(100);
        setStatusMessage('Form detected and fields analyzed!');
        setTimeout(() => {
          onScanCompleteRef.current(result);
        }, 500);
      } else {
        // Invalid or Low Confidence Document
        setInvalidResult(result);
      }
    } catch (err) {
      console.error('OCR Processing error:', err);
      setInvalidResult({
        validationStatus: 'INVALID_OBJECT',
        validationMessage: 'Could not read document. Please scan a valid bank form or certificate.',
        rawText: '',
        confidence: 0,
        documentType: 'Invalid Document',
        issuingAuthority: 'Unrecognized',
        fields: [],
        filledCount: 0,
        missingCount: 0,
        reviewCount: 0,
        missingFieldLabels: [],
        capturedImage: imgSource
      });
    }
  };

  useEffect(() => {
    executeScan(capturedImage);
  }, [capturedImage]);

  // INVALID DOCUMENT STATE (Part 16)
  if (invalidResult && invalidResult.validationStatus === 'INVALID_OBJECT') {
    return (
      <div className="flex flex-col h-full bg-white">
        <header className="p-4 border-b border-gray-100 flex items-center justify-between">
          <button onClick={onBack} className="p-2 -ml-2 text-gray-900">
            <ChevronLeft size={24} />
          </button>
          <span className="font-bold text-sm text-gray-900">Document Scan</span>
          <div className="w-8" />
        </header>

        <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-5 shadow-lg shadow-red-500/20 animate-in zoom-in-50 duration-200">
            <ShieldAlert size={44} />
          </div>

          <h2 className="text-2xl font-black text-gray-900 mb-2">
            INVALID DOCUMENT
          </h2>

          <p className="text-sm font-semibold text-gray-700 mb-2 max-w-xs">
            {invalidResult.validationMessage || "This does not look like a bank form or document."}
          </p>

          <p className="text-xs text-gray-500 mb-8 max-w-xs leading-relaxed">
            Please scan a valid physical form, cash withdrawal/deposit slip, certificate, or official government document.
          </p>

          {/* Thumbnail preview of what was captured */}
          {invalidResult.capturedImage && (
            <div className="w-36 h-36 bg-gray-100 rounded-2xl border-2 border-red-200 overflow-hidden mb-8 relative shadow-inner">
              <img
                src={invalidResult.capturedImage}
                alt="Invalid Capture"
                className="w-full h-full object-cover opacity-75 grayscale"
              />
              <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center">
                <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                  Not a Document
                </span>
              </div>
            </div>
          )}

          <div className="w-full max-w-xs space-y-3">
            <button
              onClick={onScanAgain || onBack}
              className="w-full py-3.5 bg-[#004B87] hover:bg-blue-800 text-white font-bold rounded-full text-sm transition-all shadow-lg shadow-[#004B87]/30 flex items-center justify-center gap-2"
            >
              <RefreshCcw size={16} /> Scan Again
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-full text-xs hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <ImageIcon size={15} /> Upload Clear Document Image
            </button>
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    );
  }

  // LOW CONFIDENCE DOCUMENT STATE (Part 17)
  if (invalidResult && invalidResult.validationStatus === 'LOW_CONFIDENCE_DOCUMENT') {
    return (
      <div className="flex flex-col h-full bg-white">
        <header className="p-4 border-b border-gray-100 flex items-center justify-between">
          <button onClick={onBack} className="p-2 -ml-2 text-gray-900">
            <ChevronLeft size={24} />
          </button>
          <span className="font-bold text-sm text-gray-900">Scan Quality Warning</span>
          <div className="w-8" />
        </header>

        <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-5 shadow-lg shadow-amber-500/20 animate-in zoom-in-50 duration-200">
            <AlertTriangle size={44} />
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Unclear Document Image
          </h2>

          <p className="text-xs text-gray-600 mb-6 max-w-xs leading-relaxed">
            Document detected, but we couldn't read it clearly. Please hold your camera steady, ensure good lighting, or upload a clear photo.
          </p>

          <div className="w-full max-w-xs space-y-3">
            <button
              onClick={onScanAgain || onBack}
              className="w-full py-3.5 bg-[#004B87] hover:bg-blue-800 text-white font-bold rounded-full text-sm transition-all shadow-lg shadow-[#004B87]/30 flex items-center justify-center gap-2"
            >
              <RefreshCcw size={16} /> Retake Photo
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-full text-xs hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <ImageIcon size={15} /> Upload Clear Image
            </button>
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <header className="flex items-center justify-center p-4 border-b border-gray-100 relative">
        {onBack && (
          <button onClick={onBack} className="absolute left-4 p-2 -ml-2 text-gray-900">
            <ChevronLeft size={24} />
          </button>
        )}
        <span className="font-bold text-gray-900 text-xl tracking-tight text-[#004B87]">
          Core<span className="text-red-500">T</span>
        </span>
      </header>
      
      <div className="p-6 flex-1 flex flex-col items-center overflow-y-auto">
        {/* Animated Spinner */}
        <div className="relative w-20 h-20 mb-4 mt-1">
          <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-[#004B87] rounded-full border-t-transparent animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-[#004B87]">
              {ocrProgress}%
            </span>
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-1 text-center">Processing Document</h2>
        <p className="text-gray-500 text-center mb-6 text-xs px-4 leading-relaxed font-medium">
          {statusMessage}
        </p>

        {/* Real Document Thumbnail with Scanning Laser Animation */}
        <div className="w-48 h-56 bg-gray-100 rounded-xl border-2 border-blue-200 mb-6 shadow-md relative overflow-hidden flex items-center justify-center">
          {capturedImage ? (
            <img 
              src={capturedImage} 
              alt="Scanning Document" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
              Document Preview
            </div>
          )}

          <div className="absolute inset-0 bg-blue-900/10 pointer-events-none"></div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-400 shadow-[0_0_12px_rgba(6,182,212,1)] animate-[scan_2s_ease-in-out_infinite] pointer-events-none"></div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-100 h-2 rounded-full mb-6 overflow-hidden">
          <div 
            className="bg-[#004B87] h-full transition-all duration-300 ease-out rounded-full"
            style={{ width: `${ocrProgress}%` }}
          ></div>
        </div>

        {/* Progress Checklist */}
        <div className="w-full space-y-3 px-2 mb-6">
          {steps.map((step, index) => {
            const isCompleted = index < activeStep || ocrProgress === 100;
            const isCurrent = index === activeStep && ocrProgress < 100;
            return (
              <div 
                key={index} 
                className={`flex items-center gap-3 transition-opacity duration-300 ${isCompleted || isCurrent ? 'opacity-100' : 'opacity-40'}`}
              >
                {isCompleted ? (
                  <CheckCircle2 size={20} className="text-green-500 shrink-0" />
                ) : isCurrent ? (
                  <div className="w-5 h-5 rounded-full border-2 border-[#004B87] flex items-center justify-center shrink-0">
                    <div className="w-2 h-2 bg-[#004B87] rounded-full animate-pulse"></div>
                  </div>
                ) : (
                  <Circle size={20} className="text-gray-300 shrink-0" />
                )}
                <span className={`font-semibold text-xs ${isCompleted ? 'text-gray-900' : isCurrent ? 'text-[#004B87]' : 'text-gray-500'}`}>
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      
      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0.9; }
          50% { top: 96%; opacity: 1; }
          100% { top: 0%; opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
