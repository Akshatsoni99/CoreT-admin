import { useState, useEffect } from 'react';
import { ChevronLeft, Check, CheckCircle2, ArrowRight, FileText, UserCheck, Calendar, Eye, Download, ShieldCheck } from 'lucide-react';
import { OCRAnalysisResult, ExtractedFormField } from '../../services/ocrService';
import { getUserProfile } from '../../services/userProfileStore';
import { generateVerificationId, generateFormNumber, FormPrefix } from '../../services/verificationService';
import { addBankRecord } from '../../services/bankAdminStore';
import { generateCompletedSlip } from '../../utils/slipRenderer';
import { SignaturePad } from '../../components/banking/SignaturePad';
import { AccountNumberBoxes } from '../../components/banking/AccountNumberBoxes';
import { SuccessAnimation } from '../../components/banking/SuccessAnimation';
import { submitBankServiceRequest } from '../../services/apiService';
import { calculateAmountInWords } from '../../utils/currencyUtils';

interface FormCompletionProps {
  result: OCRAnalysisResult;
  onComplete: () => void;
  onBack: () => void;
}

export function FormCompletion({ result, onComplete, onBack }: FormCompletionProps) {
  const profile = getUserProfile();

  // All fields dictionary
  const [allFields, setAllFields] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    result.fields.forEach(f => {
      map[f.id] = f.value || '';
    });
    return map;
  });

  // Only ask fields that actually need user input
  const missingFields = result.fields.filter(f => f.status === 'needs-input' || f.status === 'review');
  const [currentMissingIdx, setCurrentMissingIdx] = useState(0);

  // States: 'input' | 'review' | 'success' | 'view_slip'
  const [viewState, setViewState] = useState<'input' | 'review' | 'success' | 'view_slip'>(
    missingFields.length > 0 ? 'input' : 'review'
  );

  const [signatureDataUrl, setSignatureDataUrl] = useState<string>('');
  const [completedSlipUrl, setCompletedSlipUrl] = useState<string>('');
  const [isRendering, setIsRendering] = useState(false);
  const [stepError, setStepError] = useState('');

  const [verificationId, setVerificationId] = useState('');
  const [formNumber, setFormNumber] = useState('');

  const currentField: ExtractedFormField | undefined = missingFields[currentMissingIdx];

  const handleFieldValChange = (id: string, val: string) => {
    setAllFields(prev => ({ ...prev, [id]: val }));
    setStepError('');
  };

  // Generate completed slip preview when entering review
  useEffect(() => {
    if (viewState === 'review') {
      setIsRendering(true);
      const slipType = result.detectedSlipType || 'withdrawal';
      generateCompletedSlip({
        type: slipType as any,
        data: allFields,
        signatureDataUrl,
        verificationId: verificationId || undefined
      })
        .then(url => {
          setCompletedSlipUrl(url);
          setIsRendering(false);
        })
        .catch(err => {
          console.warn('Could not render completed slip canvas:', err);
          setIsRendering(false);
        });
    }
  }, [viewState, allFields, signatureDataUrl, verificationId, result.detectedSlipType]);

  const handleNextInput = () => {
    if (!currentField) return;

    // Validate current field
    const val = (allFields[currentField.id] || '').trim();
    if (currentField.id === 'signature' && !signatureDataUrl) {
      setStepError('Please sign manually inside the white box before continuing.');
      return;
    }
    if (currentField.required && !val && currentField.id !== 'signature') {
      setStepError(`Please provide ${currentField.label} to continue.`);
      return;
    }

    setStepError('');
    if (currentMissingIdx < missingFields.length - 1) {
      setCurrentMissingIdx(prev => prev + 1);
    } else {
      setViewState('review');
    }
  };

  const handlePrevInput = () => {
    setStepError('');
    if (currentMissingIdx > 0) {
      setCurrentMissingIdx(prev => prev - 1);
    } else {
      onBack();
    }
  };

  // Submit and register in Admin Panel
  const handleFinalSubmit = async () => {
    const prefix: FormPrefix = result.detectedSlipType === 'deposit' ? 'DP' :
                              result.detectedSlipType === 'transfer' ? 'TR' : 'WD';

    const uniqueId = generateVerificationId(prefix);
    const fNum = generateFormNumber(prefix);
    setVerificationId(uniqueId);
    setFormNumber(fNum);

    // Final render with stamp
    let finalSlipUrl = completedSlipUrl;
    try {
      finalSlipUrl = await generateCompletedSlip({
        type: (result.detectedSlipType || 'withdrawal') as any,
        data: allFields,
        signatureDataUrl,
        verificationId: uniqueId
      });
      setCompletedSlipUrl(finalSlipUrl);
    } catch (e) {
      console.warn('Stamp render error:', e);
    }

    // Prepare complete Request Object
    const cleanAmt = (allFields.amount || '').replace(/\D/g, '');
    const amtNumeric = cleanAmt ? parseInt(cleanAmt, 10) : undefined;
    const amtWords = allFields.amountWords || (amtNumeric ? calculateAmountInWords(amtNumeric) : '');
    const detectedType = (result.detectedSlipType === 'deposit' ? 'deposit' : 'withdrawal') as any;

    await submitBankServiceRequest({
      id: uniqueId,
      requestId: fNum,
      uniqueVerificationId: uniqueId,
      serviceType: detectedType,
      source: 'ocr_scan',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      date: allFields.date || new Date().toLocaleDateString('en-GB'),
      amountNumeric: amtNumeric,
      amountInWords: amtWords,
      accountHolderName: allFields.name || allFields.senderName || profile.name || 'Citizen Applicant',
      accountNumber: allFields.accountNumber || allFields.senderAccount || '',
      bankName: 'State Bank of India',
      branch: allFields.branch || 'Main Branch',
      transactionId: uniqueId,
      tokenNumber: `T-${Math.floor(100 + Math.random() * 900)}`,
      purpose: result.documentType,
      signature: signatureDataUrl,
      uploadedDocument: result.capturedImage,
      OCRData: result,
      ocrDetectedFields: { ...allFields },
      userConfirmedData: { ...allFields },
      finalFormData: { ...allFields },
      allFormFields: { ...allFields },
      completedFields: Object.keys(allFields).filter(k => Boolean(allFields[k])),
      userInputs: { ...allFields },
      generatedSlipData: finalSlipUrl,
      notes: `Extracted via on-device OCR (${result.confidence}% confidence)`
    });

    setViewState('success');
  };

  // SUCCESS SCREEN (Parts 10 & 11)
  if (viewState === 'success') {
    return (
      <SuccessAnimation
        title={result.documentType}
        formNumber={formNumber}
        verificationId={verificationId}
        amount={allFields.amount}
        onViewSlip={() => setViewState('view_slip')}
        onDone={onComplete}
      />
    );
  }

  // VIEW FULL COMPLETED SLIP MODAL
  if (viewState === 'view_slip') {
    return (
      <div className="flex flex-col h-full bg-gray-950 text-white">
        <header className="px-4 pt-12 pb-4 bg-gray-900 border-b border-gray-800 flex items-center justify-between">
          <button onClick={() => setViewState(verificationId ? 'success' : 'review')} className="p-2 text-white">
            <ChevronLeft size={24} />
          </button>
          <div className="text-center">
            <h3 className="font-bold text-sm text-white">Completed Document</h3>
            {verificationId && <p className="text-[10px] text-emerald-400 font-mono">{verificationId}</p>}
          </div>
          {completedSlipUrl ? (
            <a
              href={completedSlipUrl}
              download="completed-document.png"
              className="p-2 text-blue-400 hover:text-white"
              title="Download Document"
            >
              <Download size={20} />
            </a>
          ) : <div className="w-8" />}
        </header>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center">
          {completedSlipUrl ? (
            <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-700">
              <img
                src={completedSlipUrl}
                alt="Completed Document Preview"
                className="w-full h-auto object-contain block"
              />
            </div>
          ) : (
            <div className="text-gray-400 text-xs">Generating document...</div>
          )}
        </div>

        <div className="p-4 bg-gray-900 border-t border-gray-800 flex gap-3">
          <button
            onClick={() => setViewState(verificationId ? 'success' : 'review')}
            className="flex-1 py-3.5 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-full text-sm"
          >
            Back
          </button>
          {verificationId && (
            <button
              onClick={onComplete}
              className="flex-1 py-3.5 bg-[#004B87] hover:bg-blue-700 text-white font-bold rounded-full text-sm"
            >
              Done
            </button>
          )}
        </div>
      </div>
    );
  }

  // REVIEW SCREEN
  if (viewState === 'review') {
    return (
      <div className="flex flex-col h-full bg-[#F9FAFB]">
        <header className="px-5 pt-12 pb-4 bg-white border-b border-gray-100 flex items-center justify-between sticky top-0 z-20">
          <button 
            onClick={() => missingFields.length > 0 ? setViewState('input') : onBack()} 
            className="p-2 -ml-2 text-gray-900"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="text-center">
            <h2 className="text-base font-bold text-gray-900">CHECK YOUR DETAILS</h2>
            <p className="text-[11px] text-gray-500">{result.documentType}</p>
          </div>
          <div className="w-8" />
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-6">
          
          {/* Completed Slip Physical Preview */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden">
            <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <FileText size={15} className="text-[#004B87]" /> Completed Physical Form Preview
              </span>
              <button
                onClick={() => setViewState('view_slip')}
                className="text-xs font-bold text-[#004B87] hover:underline flex items-center gap-1"
              >
                <Eye size={13} /> Inspect Full
              </button>
            </div>

            <div className="p-2 bg-gray-100 flex items-center justify-center min-h-[140px]">
              {isRendering ? (
                <div className="text-xs text-gray-500 py-6">Generating physical preview...</div>
              ) : completedSlipUrl ? (
                <img
                  src={completedSlipUrl}
                  alt="Completed Slip"
                  className="w-full h-auto object-contain rounded border border-gray-300 shadow-sm cursor-pointer"
                  onClick={() => setViewState('view_slip')}
                />
              ) : (
                <img
                  src={result.capturedImage}
                  alt="Scanned Document"
                  className="w-full h-auto object-contain rounded opacity-80"
                />
              )}
            </div>
          </div>

          {/* Form Fields Summary */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100 text-xs">
            <div className="p-3 bg-gray-50 font-bold text-gray-700">All Form Information</div>
            {result.fields.map(f => {
              const val = allFields[f.id];
              return (
                <div key={f.id} className="p-3.5 flex justify-between items-center">
                  <span className="text-gray-500 font-medium">{f.label}</span>
                  {f.id === 'signature' ? (
                    signatureDataUrl ? (
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                        ✓ Manually Signed
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">Not signed</span>
                    )
                  ) : (
                    <span className="text-gray-900 font-bold max-w-[60%] text-right truncate">
                      {val || '—'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Checklist before submission */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-2 text-xs">
            <h4 className="font-bold text-emerald-950 uppercase tracking-wider text-[11px]">
              Pre-Submission Verification
            </h4>
            <div className="flex items-center gap-2 text-emerald-800">
              <CheckCircle2 size={15} /> <span>All missing fields completed</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-800">
              <CheckCircle2 size={15} /> <span>Physical document preview validated</span>
            </div>
            {signatureDataUrl && (
              <div className="flex items-center gap-2 text-emerald-800">
                <CheckCircle2 size={15} /> <span>Manual applicant signature captured</span>
              </div>
            )}
          </div>
        </div>

        {/* Pinned Bottom Actions */}
        <div className="p-4 bg-white border-t border-gray-200 shrink-0 z-30 flex gap-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          {missingFields.length > 0 && (
            <button
              type="button"
              onClick={() => setViewState('input')}
              className="flex-1 py-3.5 border border-gray-300 text-gray-700 font-bold rounded-full text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
            >
              <ChevronLeft size={18} /> Edit Fields
            </button>
          )}
          <button
            type="button"
            onClick={handleFinalSubmit}
            className="flex-[2] py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-full text-sm transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-95"
          >
            <Check size={18} strokeWidth={3} /> DONE — DETAILS ARE CORRECT
          </button>
        </div>
      </div>
    );
  }

  // INPUT STATE — Asking only missing fields
  return (
    <div className="flex flex-col h-full bg-white relative">
      <header className="flex items-center justify-between p-4 border-b border-gray-100">
        <button onClick={handlePrevInput} className="p-2 -ml-2 text-gray-900">
          <ChevronLeft size={24} />
        </button>
        <span className="font-bold text-gray-900 text-xs truncate max-w-[180px]">
          {result.documentType}
        </span>
        <span className="text-xs font-bold text-gray-500">
          Missing {currentMissingIdx + 1} of {missingFields.length}
        </span>
      </header>
      
      {/* Progress Bar */}
      <div className="w-full bg-gray-100 h-1.5">
        <div 
          className="bg-[#004B87] h-1.5 rounded-r-full transition-all duration-300"
          style={{ width: `${((currentMissingIdx + 1) / missingFields.length) * 100}%` }}
        />
      </div>

      <div className="p-6 flex-1 overflow-y-auto space-y-4">
        {currentField && (
          <>
            <div>
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-xl font-bold text-gray-900">
                  {currentField.label} {currentField.required && <span className="text-red-500">*</span>}
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-800 px-2 py-0.5 rounded">
                  Needed for Form
                </span>
              </div>
              <p className="text-gray-500 text-xs leading-relaxed">
                This field was blank or unreadable on your physical form. Please enter it to complete the document.
              </p>
            </div>

            {/* Signature field */}
            {currentField.id === 'signature' ? (
              <SignaturePad
                initialDataUrl={signatureDataUrl}
                onSave={(url) => {
                  setSignatureDataUrl(url);
                  handleFieldValChange('signature', url);
                }}
                onClear={() => {
                  setSignatureDataUrl('');
                  handleFieldValChange('signature', '');
                }}
                requiredError={stepError}
              />
            ) : currentField.id === 'accountNumber' || currentField.id === 'senderAccount' ? (
              <AccountNumberBoxes
                value={allFields[currentField.id] || ''}
                onChange={(val) => handleFieldValChange(currentField.id, val)}
                length={15}
                label={currentField.label}
              />
            ) : currentField.id === 'date' ? (
              <div className="space-y-3">
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input 
                    type="text" 
                    value={allFields[currentField.id] || ''}
                    onChange={(e) => handleFieldValChange(currentField.id, e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-2xl py-3.5 pl-12 pr-4 text-base font-bold text-gray-900 focus:outline-none focus:border-[#004B87] transition-colors"
                    placeholder="DD/MM/YYYY"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleFieldValChange(currentField.id, new Date().toLocaleDateString('en-GB'))}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#004B87] bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full hover:bg-blue-100"
                >
                  <Calendar size={14} /> Use Today's Date ({new Date().toLocaleDateString('en-GB')})
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input 
                  type="text" 
                  value={allFields[currentField.id] || ''}
                  onChange={(e) => handleFieldValChange(currentField.id, e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-base font-bold text-gray-900 focus:outline-none focus:border-[#004B87] transition-colors bg-white shadow-sm"
                  placeholder={`Enter ${currentField.label}`}
                  autoFocus
                />
              </div>
            )}

            {/* Profile Personalization Auto-suggest (Part 20) */}
            {profile.name && currentField.id === 'name' && allFields.name !== profile.name && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center shrink-0">
                    <UserCheck size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] text-emerald-800 font-bold">Your saved profile has a name</p>
                    <p className="text-xs font-bold text-gray-900">{profile.name}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleFieldValChange('name', profile.name)}
                  className="text-[#004B87] text-xs font-bold bg-white px-3.5 py-2 rounded-xl border border-gray-200 shadow-sm shrink-0 hover:bg-blue-50 transition-colors"
                >
                  Use My Name
                </button>
              </div>
            )}

            {profile.phone && currentField.id === 'mobile' && allFields.mobile !== profile.phone && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center shrink-0">
                    <UserCheck size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] text-emerald-800 font-bold">Your saved phone number</p>
                    <p className="text-xs font-bold text-gray-900">{profile.phone}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleFieldValChange('mobile', profile.phone)}
                  className="text-[#004B87] text-xs font-bold bg-white px-3.5 py-2 rounded-xl border border-gray-200 shadow-sm shrink-0 hover:bg-blue-50 transition-colors"
                >
                  Use My Phone
                </button>
              </div>
            )}

            {stepError && (
              <div className="text-xs text-red-600 font-bold bg-red-50 p-3 rounded-xl border border-red-200">
                {stepError}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Sticky Action */}
      <div className="p-4 bg-white border-t border-gray-200 shrink-0 z-30 flex gap-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <button
          type="button"
          onClick={handlePrevInput}
          className="flex-1 py-3.5 border border-gray-300 text-gray-700 font-bold rounded-full text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
        >
          <ChevronLeft size={18} /> Back
        </button>
        <button 
          type="button"
          onClick={handleNextInput}
          className="flex-[2] bg-[#004B87] hover:bg-blue-800 text-white rounded-full py-3.5 font-bold transition-all shadow-lg shadow-[#004B87]/30 flex items-center justify-center gap-2 text-sm active:scale-95"
        >
          <span>{currentMissingIdx === missingFields.length - 1 ? 'Review Slip' : 'Next Field'}</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
