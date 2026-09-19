import { useRef, useState, useEffect, MouseEvent, TouchEvent } from 'react';
import { RotateCcw, Check, Edit3, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface SignaturePadProps {
  initialDataUrl?: string;
  onSave: (dataUrl: string) => void;
  onClear?: () => void;
  requiredError?: string;
}

export function SignaturePad({
  initialDataUrl,
  onSave,
  onClear,
  requiredError
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(Boolean(initialDataUrl));
  const [strokeCount, setStrokeCount] = useState(0);

  // Set up canvas context and load initial image if provided
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill white background so exported PNG is clean and not transparent-black
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (initialDataUrl && initialDataUrl.startsWith('data:image')) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setHasDrawn(true);
      };
      img.src = initialDataUrl;
    }
  }, []);

  const getCoordinates = (e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    const mouseEvent = e as MouseEvent<HTMLCanvasElement>;
    return {
      x: (mouseEvent.clientX - rect.left) * scaleX,
      y: (mouseEvent.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);
    setStrokeCount((prev) => prev + 1);

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#002D5A';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      onSave(dataUrl);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setStrokeCount(0);
    if (onClear) onClear();
    onSave('');
  };

  return (
    <div className="space-y-3 select-none">
      {/* Informative Guidance */}
      <div className="bg-blue-50/70 border border-blue-200/70 rounded-xl p-3 flex items-start gap-2.5">
        <Edit3 size={18} className="text-[#004B87] shrink-0 mt-0.5" />
        <p className="text-xs text-blue-900 leading-relaxed font-medium">
          Please sign manually in the box below using your finger, stylus, or mouse.
          Your signature must match your official bank account records.
        </p>
      </div>

      {/* Clean White Canvas Box */}
      <div
        className={`relative border-2 rounded-2xl bg-white overflow-hidden shadow-sm touch-none h-44 flex items-center justify-center transition-all ${
          !hasDrawn && requiredError ? 'border-red-400 bg-red-50/20' : hasDrawn ? 'border-emerald-500' : 'border-gray-300'
        }`}
      >
        <canvas
          ref={canvasRef}
          width={500}
          height={180}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full cursor-crosshair block"
        />

        {!hasDrawn && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-gray-400">
            <Edit3 size={28} className="mb-1 text-gray-300" />
            <span className="text-xs font-bold text-gray-500">Sign here (finger or mouse)</span>
            <span className="text-[10px] text-gray-400">Haste-hastakshar karein</span>
          </div>
        )}

        {hasDrawn && (
          <div className="absolute top-2 right-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
            <CheckCircle2 size={12} /> Captured
          </div>
        )}
      </div>

      {/* Error Message if empty */}
      {!hasDrawn && requiredError && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 font-bold">
          <ShieldAlert size={14} />
          <span>{requiredError}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={handleClear}
          disabled={!hasDrawn}
          className="flex-1 py-2.5 px-3 border border-gray-300 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1.5 transition-colors"
        >
          <RotateCcw size={14} /> Clear Signature
        </button>
      </div>
    </div>
  );
}
