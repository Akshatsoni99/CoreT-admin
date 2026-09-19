import { createContext, useContext, useState, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type PopupType = 'success' | 'error' | 'info' | 'warning';

export interface PopupOptions {
  type: PopupType;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  autoCloseMs?: number;
}

interface PopupContextType {
  showPopup: (options: PopupOptions) => void;
  showSuccess: (title: string, message?: string, onConfirm?: () => void, confirmText?: string) => void;
  showError: (title: string, message?: string, onConfirm?: () => void, confirmText?: string) => void;
  showInfo: (title: string, message?: string, onConfirm?: () => void, confirmText?: string) => void;
  showWarning: (title: string, message?: string, onConfirm?: () => void, onCancel?: () => void, confirmText?: string) => void;
  closePopup: () => void;
}

const PopupContext = createContext<PopupContextType | undefined>(undefined);

export function PopupProvider({ children }: { children: ReactNode }) {
  const [popup, setPopup] = useState<PopupOptions | null>(null);

  const closePopup = () => {
    setPopup(null);
  };

  const showPopup = (options: PopupOptions) => {
    setPopup(options);
    if (options.autoCloseMs && options.autoCloseMs > 0) {
      setTimeout(() => {
        setPopup((curr) => (curr === options ? null : curr));
      }, options.autoCloseMs);
    }
  };

  const showSuccess = (title: string, message?: string, onConfirm?: () => void, confirmText = 'Great, Continue') => {
    showPopup({
      type: 'success',
      title,
      message,
      confirmText,
      onConfirm,
    });
  };

  const showError = (title: string, message?: string, onConfirm?: () => void, confirmText = 'Understood') => {
    showPopup({
      type: 'error',
      title,
      message,
      confirmText,
      onConfirm,
    });
  };

  const showInfo = (title: string, message?: string, onConfirm?: () => void, confirmText = 'OK') => {
    showPopup({
      type: 'info',
      title,
      message,
      confirmText,
      onConfirm,
    });
  };

  const showWarning = (title: string, message?: string, onConfirm?: () => void, onCancel?: () => void, confirmText = 'Yes, Proceed') => {
    showPopup({
      type: 'warning',
      title,
      message,
      confirmText,
      cancelText: 'Cancel',
      onConfirm,
      onCancel,
    });
  };

  const handleConfirm = () => {
    const action = popup?.onConfirm;
    closePopup();
    if (action) action();
  };

  const handleCancel = () => {
    const action = popup?.onCancel;
    closePopup();
    if (action) action();
  };

  return (
    <PopupContext.Provider value={{ showPopup, showSuccess, showError, showInfo, showWarning, closePopup }}>
      {children}

      {/* Global Popup Dialog Modal */}
      {popup && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="w-full max-w-xs bg-white rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center relative border border-gray-100 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Cross */}
            <button 
              onClick={closePopup}
              className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X size={18} />
            </button>

            {/* Type Icon */}
            <div className="mb-4 mt-2">
              {popup.type === 'success' && (
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-md shadow-emerald-100">
                  <CheckCircle2 size={36} strokeWidth={2.5} />
                </div>
              )}
              {popup.type === 'error' && (
                <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shadow-md shadow-rose-100">
                  <AlertCircle size={36} strokeWidth={2.5} />
                </div>
              )}
              {popup.type === 'info' && (
                <div className="w-16 h-16 rounded-full bg-blue-100 text-[#004B87] flex items-center justify-center shadow-md shadow-blue-100">
                  <Info size={36} strokeWidth={2.5} />
                </div>
              )}
              {popup.type === 'warning' && (
                <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shadow-md shadow-amber-100">
                  <AlertTriangle size={36} strokeWidth={2.5} />
                </div>
              )}
            </div>

            {/* Title */}
            <h3 className="text-lg font-bold text-gray-900 mb-1.5 px-2">
              {popup.title}
            </h3>

            {/* Message Body */}
            {popup.message && (
              <p className="text-xs text-gray-600 leading-relaxed mb-6 px-1">
                {popup.message}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 w-full mt-2">
              {popup.cancelText && (
                <button 
                  onClick={handleCancel}
                  className="flex-1 py-3 px-4 rounded-full border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 transition-colors"
                >
                  {popup.cancelText}
                </button>
              )}

              <button 
                onClick={handleConfirm}
                className={`flex-1 py-3 px-4 rounded-full font-bold text-xs text-white transition-all shadow-md active:scale-95 ${
                  popup.type === 'error' 
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30' 
                    : popup.type === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30'
                    : 'bg-[#004B87] hover:bg-blue-800 shadow-[#004B87]/30'
                }`}
              >
                {popup.confirmText || 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PopupContext.Provider>
  );
}

export function usePopup() {
  const context = useContext(PopupContext);
  if (!context) {
    throw new Error('usePopup must be used within a PopupProvider');
  }
  return context;
}
