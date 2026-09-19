import { useState } from 'react';
import { Check, Copy, CheckCheck, Building2, Eye, ArrowRight, ShieldCheck } from 'lucide-react';

interface SuccessAnimationProps {
  title: string;
  formNumber: string;
  verificationId: string;
  amount?: string;
  onViewSlip: () => void;
  onDone: () => void;
}

export function SuccessAnimation({
  title,
  formNumber,
  verificationId,
  amount,
  onViewSlip,
  onDone
}: SuccessAnimationProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(verificationId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-white items-center justify-center p-6 text-center animate-in fade-in duration-300 relative overflow-y-auto">
      {/* Polished Payment-App Green Circle Animation */}
      <div className="relative mb-6 mt-4">
        {/* Pulsing ring */}
        <div className="absolute -inset-3 rounded-full bg-emerald-100/70 animate-ping duration-1000 opacity-75 pointer-events-none" />
        <div className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-500 text-white flex items-center justify-center shadow-2xl shadow-emerald-600/30 scale-100 transition-transform">
          <Check size={52} strokeWidth={3.5} className="animate-in zoom-in-75 duration-300" />
        </div>
      </div>

      <span className="text-[11px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full mb-2">
        Form Submitted Successfully
      </span>

      <h2 className="text-2xl font-black text-gray-900 mb-1">
        {title} Ready
      </h2>

      {amount && (
        <p className="text-2xl font-extrabold text-[#004B87] mb-4">
          ₹{Number(amount).toLocaleString('en-IN')}
        </p>
      )}

      <p className="text-xs text-gray-500 max-w-xs mb-6 leading-relaxed">
        Your digital slip has been verified, registered in the bank system, and is ready for the branch counter.
      </p>

      {/* Unique Verification ID Card (Part 11) */}
      <div className="w-full max-w-sm bg-gradient-to-br from-[#002D5A] to-[#004B87] text-white rounded-2xl p-5 mb-5 shadow-lg text-left relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-28 h-28 bg-white/10 rounded-full pointer-events-none" />
        
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-blue-200 uppercase tracking-wider flex items-center gap-1">
            <ShieldCheck size={14} className="text-emerald-400" /> Official Verification ID
          </span>
          <span className="text-[10px] text-blue-200 font-mono">
            {formNumber}
          </span>
        </div>

        <div className="flex items-center justify-between bg-black/20 backdrop-blur-sm rounded-xl px-3.5 py-2.5 border border-white/10">
          <span className="font-mono text-base font-extrabold text-white tracking-wide select-all">
            {verificationId}
          </span>
          <button
            onClick={handleCopyId}
            className="p-1.5 hover:bg-white/10 rounded-lg text-blue-100 hover:text-white transition-colors"
            title="Copy Verification ID"
          >
            {copied ? <CheckCheck size={16} className="text-emerald-400" /> : <Copy size={16} />}
          </button>
        </div>

        <p className="text-[10px] text-blue-200 mt-2 flex items-center justify-between">
          <span>Show this ID to the bank cashier</span>
          {copied && <span className="text-emerald-300 font-bold">Copied to clipboard!</span>}
        </p>
      </div>

      {/* Next Step Information */}
      <div className="w-full max-w-sm bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-6 text-left flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#004B87] flex items-center justify-center shrink-0 mt-0.5">
          <Building2 size={20} />
        </div>
        <div className="text-xs">
          <h4 className="font-bold text-gray-900 mb-0.5">Bank Counter Instructions</h4>
          <p className="text-gray-600 leading-relaxed">
            Present your completed digital slip or Verification ID at the counter. The cashier will cross-verify and process immediately.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-sm space-y-2.5 pb-2">
        <button
          onClick={onViewSlip}
          className="w-full py-3.5 bg-white border-2 border-[#004B87] text-[#004B87] hover:bg-blue-50 font-bold rounded-full text-sm transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"
        >
          <Eye size={18} /> View Completed Physical Slip
        </button>

        <button
          onClick={onDone}
          className="w-full py-4 bg-[#004B87] hover:bg-blue-800 text-white font-bold rounded-full text-sm transition-all shadow-lg shadow-[#004B87]/30 flex items-center justify-center gap-2 active:scale-95"
        >
          Done & Return to Services <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
