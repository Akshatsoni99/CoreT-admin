import { useState } from 'react';
import { ChevronLeft, ArrowRight, CheckCircle2, AlertTriangle, Info, FileText, ChevronDown, ChevronUp, Landmark } from 'lucide-react';
import { OCRAnalysisResult } from '../../services/ocrService';

interface AnalysisResultsProps {
  result: OCRAnalysisResult;
  onNext: () => void;
  onBack: () => void;
}

export function AnalysisResults({ result, onNext, onBack }: AnalysisResultsProps) {
  const [showRawText, setShowRawText] = useState(false);

  const autoFilledFields = result.fields.filter(f => f.status === 'auto-filled');
  const needsInputFields = result.fields.filter(f => f.status === 'needs-input');
  const reviewFields = result.fields.filter(f => f.status === 'review');

  return (
    <div className="flex flex-col h-full bg-[#F9FAFB]">
      <header className="flex items-center justify-center p-4 bg-white relative border-b border-gray-100">
        <button onClick={onBack} className="absolute left-4 p-2 -ml-2 text-gray-900">
          <ChevronLeft size={24} />
        </button>
        <span className="font-bold text-gray-900 text-xl tracking-tight text-[#004B87]">
          Core<span className="text-red-500">T</span>
        </span>
      </header>
      
      <div className="flex-1 overflow-y-auto">
        {/* Document Overview Header Card */}
        <div className="bg-white p-6 rounded-b-3xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] mb-6">
          <div className="flex gap-4 items-start">
            {/* Real Captured Image Thumbnail */}
            <div className="w-24 h-32 bg-gray-100 rounded-xl border border-gray-200 shadow-sm shrink-0 overflow-hidden relative">
              {result.capturedImage ? (
                <img 
                  src={result.capturedImage} 
                  alt="Scanned Form" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <FileText size={28} />
                </div>
              )}
              <div className="absolute top-1 right-1 bg-emerald-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow">
                OCR OK
              </div>
            </div>

            <div className="flex-1 min-w-0">
              {result.detectedSlipType && result.detectedSlipType !== 'general' && (
                <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded mb-1.5 border border-emerald-200">
                  <Landmark size={12} />
                  <span>Bank Slip Detected</span>
                </div>
              )}
              <h2 className="text-base font-extrabold text-gray-900 leading-tight mb-1">
                {result.documentType}
              </h2>
              <p className="text-xs text-gray-500 mb-3 font-medium">
                {result.issuingAuthority}
              </p>
              
              <div className="space-y-1 text-xs">
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-500">Read Confidence</span>
                  <span className="text-gray-900 font-semibold">{result.confidence}%</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-500">Total Fields</span>
                  <span className="text-gray-900 font-semibold">{result.fields.length} Analyzed</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Field Analysis Breakdown (Part 18 & 22) */}
        <div className="px-6 pb-6 space-y-4">
          <div className="flex justify-between items-center">
             <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
               Form Analysis Breakdown
             </h3>
             <span className="text-xs font-semibold text-[#004B87]">
               {autoFilledFields.length} Detected
             </span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
            {/* Detected / Auto-filled count (Dynamic) */}
            <div className="p-4 flex gap-3 items-start">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 size={22} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 text-sm">
                  {autoFilledFields.length} {autoFilledFields.length === 1 ? 'field' : 'fields'} detected as filled
                </h4>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  {autoFilledFields.length > 0 
                    ? autoFilledFields.map(f => f.label).join(', ') 
                    : 'No pre-filled fields found on this document.'}
                </p>
              </div>
            </div>
            
            {/* Needs input count (Dynamic) */}
            {needsInputFields.length > 0 && (
              <div className="p-4 flex gap-3 items-start bg-orange-50/40">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle size={22} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-orange-950 text-sm">
                    {needsInputFields.length} {needsInputFields.length === 1 ? 'field needs' : 'fields need'} your input
                  </h4>
                  <div className="mt-1 space-y-1">
                    <p className="text-xs text-orange-800 font-semibold">Missing fields to fill:</p>
                    <ul className="text-xs text-orange-700 list-disc list-inside space-y-0.5">
                      {needsInputFields.map(f => (
                        <li key={f.id}>
                          <strong>{f.label}</strong>
                          {f.hasProfileSuggestion && (
                            <span className="ml-1 text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                              Saved in Profile
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Review count */}
            {reviewFields.length > 0 && (
              <div className="p-4 flex gap-3 items-start bg-blue-50/40">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Info size={22} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 text-sm">
                    {reviewFields.length} field{reviewFields.length > 1 ? 's' : ''} suggested for review
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {reviewFields.map(f => f.label).join(', ')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Collapsible Raw OCR Inspection */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button 
              onClick={() => setShowRawText(!showRawText)}
              className="w-full p-4 flex justify-between items-center text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-[#004B87]" />
                <span className="text-xs font-bold text-gray-800">
                  Inspect Raw Extracted OCR Text
                </span>
              </div>
              {showRawText ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
            </button>

            {showRawText && (
              <div className="p-4 border-t border-gray-100 bg-gray-50">
                <pre className="text-[11px] font-mono text-gray-700 whitespace-pre-wrap break-words max-h-48 overflow-y-auto p-3 bg-white border border-gray-200 rounded-xl">
                  {result.rawText || 'No text extracted.'}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="p-4 bg-white border-t border-gray-200 shrink-0 z-30 flex gap-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3.5 border border-gray-300 text-gray-700 font-bold rounded-full text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
        >
          <ChevronLeft size={18} /> Back
        </button>
        <button 
          type="button"
          onClick={onNext}
          className="flex-[2] bg-[#004B87] hover:bg-blue-800 text-white rounded-full py-3.5 font-bold transition-all shadow-lg shadow-[#004B87]/30 flex items-center justify-center gap-2 text-sm active:scale-95"
        >
          <span>
            {needsInputFields.length > 0 
              ? `Fill Missing Fields (${needsInputFields.length})`
              : 'Review Completed Slip'}
          </span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
