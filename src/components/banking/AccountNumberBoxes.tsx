import { useRef, useEffect, KeyboardEvent, ClipboardEvent, ChangeEvent } from 'react';

interface AccountNumberBoxesProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  label?: string;
  helperText?: string;
}

export function AccountNumberBoxes({
  value,
  onChange,
  length = 15,
  label = 'Account Number',
  helperText = 'Found on the front page of your bank passbook'
}: AccountNumberBoxesProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Split string into array of characters
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  useEffect(() => {
    // Focus first empty box on mount if empty
    if (!value) {
      inputsRef.current[0]?.focus();
    }
  }, []);

  const handleDigitChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    // Allow only numeric characters
    const numericChar = rawVal.replace(/\D/g, '').slice(-1);

    const newDigits = [...digits];
    newDigits[index] = numericChar;
    const combined = newDigits.join('').slice(0, length);
    onChange(combined);

    // Auto-advance to next box if a digit was typed
    if (numericChar && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Current box is empty, jump back and clear previous
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        onChange(newDigits.join(''));
        inputsRef.current[index - 1]?.focus();
      } else if (digits[index]) {
        // Clear current box
        const newDigits = [...digits];
        newDigits[index] = '';
        onChange(newDigits.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pasted) {
      onChange(pasted);
      // Focus the next empty box or last box
      const nextIdx = Math.min(pasted.length, length - 1);
      inputsRef.current[nextIdx]?.focus();
    }
  };

  const isComplete = value.length === length;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-gray-700">{label}</span>
        <span className={`text-xs font-bold ${isComplete ? 'text-emerald-600' : 'text-blue-600'}`}>
          {value.length}/{length} digits {isComplete && '✓'}
        </span>
      </div>

      {/* Grid of boxes */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {Array.from({ length }).map((_, idx) => (
          <div key={idx} className="relative">
            <input
              ref={(el) => (inputsRef.current[idx] = el)}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digits[idx]}
              onChange={(e) => handleDigitChange(idx, e)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={handlePaste}
              className={`w-full h-12 text-center text-lg font-black rounded-xl border-2 transition-all outline-none select-all ${
                digits[idx]
                  ? 'border-[#004B87] bg-blue-50/40 text-[#002D5A]'
                  : 'border-gray-300 bg-white text-gray-900 focus:border-[#004B87] focus:bg-blue-50/20'
              }`}
            />
            <span className="absolute bottom-1 right-1 text-[8px] text-gray-300 pointer-events-none font-mono">
              {idx + 1}
            </span>
          </div>
        ))}
      </div>

      {/* Validation / Helper message */}
      <div className="flex items-center justify-between text-[11px] text-gray-500">
        <span>{helperText}</span>
        {value.length > 0 && !isComplete && (
          <span className="text-amber-600 font-semibold">
            Enter {length - value.length} more digit{length - value.length > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}
