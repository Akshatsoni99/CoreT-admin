import { X, Zap, Image as ImageIcon, RefreshCcw, Camera, Check, RotateCcw, ShieldAlert, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState, ChangeEvent } from 'react';

interface CameraScannerProps {
  onCapture: (imageDataUrl: string) => void;
  onBack: () => void;
}

export function CameraScanner({ onCapture, onBack }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  // Detect whether current environment allows getUserMedia (requires HTTPS or localhost on modern mobile browsers)
  const isSecureContext = typeof window !== 'undefined' && (
    window.isSecureContext ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          // ignore
        }
      });
      streamRef.current = null;
    }
  };

  const startCamera = async (facing: 'environment' | 'user') => {
    stopCameraStream();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasPermission(false);
      setCameraError(
        isSecureContext 
          ? 'Camera API is not supported in this browser. Please use the device camera or upload option.'
          : 'Mobile browsers require HTTPS or localhost for live camera streaming. Please use the camera button below to take a photo directly.'
      );
      return;
    }

    try {
      // 1. Try high-definition rear camera with ideal constraints
      const s = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 }
        }
      });
      streamRef.current = s;
      setHasPermission(true);
      setCameraError('');
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.play().catch(err => console.warn('Autoplay error:', err));
      }
    } catch (err: any) {
      console.warn('Camera with resolution constraints failed, attempting fallback constraints:', err);
      try {
        // 2. Try simple facingMode constraint
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing } }
        });
        streamRef.current = fallbackStream;
        setHasPermission(true);
        setCameraError('');
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          videoRef.current.play().catch(e => console.warn('Fallback play error:', e));
        }
      } catch (secondErr) {
        try {
          // 3. Last resort generic video constraint
          const basicStream = await navigator.mediaDevices.getUserMedia({ video: true });
          streamRef.current = basicStream;
          setHasPermission(true);
          setCameraError('');
          if (videoRef.current) {
            videoRef.current.srcObject = basicStream;
            videoRef.current.play().catch(e => console.warn('Basic play error:', e));
          }
        } catch (finalErr: any) {
          console.error('Camera access denied or unavailable:', finalErr);
          setHasPermission(false);
          const isDenied = finalErr?.name === 'NotAllowedError' || finalErr?.name === 'PermissionDeniedError';
          setCameraError(
            isDenied 
              ? 'Camera permission was denied. Please allow camera access in browser settings or use the device photo option below.'
              : 'Could not start live camera preview. You can use your phone camera app or upload from gallery.'
          );
        }
      }
    }
  };

  useEffect(() => {
    // Only start camera if not in photo review state
    if (!capturedPhoto) {
      startCamera(facingMode);
    }

    return () => {
      stopCameraStream();
    };
  }, [facingMode, capturedPhoto]);

  const toggleCamera = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  const toggleTorch = async () => {
    try {
      if (streamRef.current) {
        const track = streamRef.current.getVideoTracks()[0];
        const capabilities = track.getCapabilities?.() as any;
        if (capabilities && 'torch' in capabilities) {
          const nextTorch = !torchOn;
          await track.applyConstraints({
            advanced: [{ torch: nextTorch } as any]
          });
          setTorchOn(nextTorch);
        } else {
          setTorchOn(!torchOn);
        }
      }
    } catch (err) {
      console.warn('Torch control error:', err);
    }
  };

  // Capture current frame from live video canvas
  const handleShutterClick = () => {
    if (isCapturing) return;
    setIsCapturing(true);

    if (videoRef.current && videoRef.current.videoWidth > 0) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.94);
        stopCameraStream();
        setCapturedPhoto(dataUrl);
        setIsCapturing(false);
        return;
      }
    }

    // Fallback if video is not streaming
    setIsCapturing(false);
    nativeCameraInputRef.current?.click();
  };

  // Handle image selected via native camera or file upload
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          stopCameraStream();
          setCapturedPhoto(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset file input value so same photo can be re-selected if needed
    e.target.value = '';
  };

  // User decides to retake the photo
  const handleRetake = () => {
    setCapturedPhoto(null);
  };

  // User confirms the photo to proceed to OCR processing
  const handleUsePhoto = () => {
    if (capturedPhoto) {
      onCapture(capturedPhoto);
    }
  };

  // ==========================================
  // VIEW: Captured Photo Review State (Retake / Use Photo)
  // ==========================================
  if (capturedPhoto) {
    return (
      <div className="flex flex-col h-full bg-black relative select-none">
        {/* Top Header */}
        <header className="absolute top-0 inset-x-0 p-4 pt-12 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent">
          <button 
            onClick={handleRetake} 
            className="p-2.5 rounded-full bg-black/50 backdrop-blur-md text-white border border-white/20 hover:bg-black/70 flex items-center gap-1 text-xs font-semibold"
          >
            <RotateCcw size={16} /> Retake
          </button>
          <div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-xs font-bold border border-white/20 flex items-center gap-1.5">
            <Sparkles size={14} className="text-cyan-400" />
            Photo Captured
          </div>
          <button 
            onClick={onBack} 
            className="p-2.5 rounded-full bg-black/50 backdrop-blur-md text-white border border-white/20 hover:bg-black/70"
          >
            <X size={18} />
          </button>
        </header>

        {/* Captured Photo Fullscreen Display */}
        <div className="flex-1 flex items-center justify-center overflow-hidden p-4 pt-20 pb-36">
          <div className="relative max-w-sm w-full max-h-full rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl bg-gray-950">
            <img 
              src={capturedPhoto} 
              alt="Captured Document Preview" 
              className="w-full h-auto max-h-[60vh] object-contain block mx-auto"
            />
          </div>
        </div>

        {/* Bottom Actions: Retake & Use Photo */}
        <div className="absolute bottom-0 inset-x-0 p-6 pb-10 bg-gradient-to-t from-black via-black/80 to-transparent z-20 flex flex-col gap-3">
          <div className="text-center text-gray-300 text-xs mb-1">
            Make sure the slip text, numbers and signature are clearly visible
          </div>

          <div className="flex gap-3 max-w-sm mx-auto w-full">
            <button
              onClick={handleRetake}
              className="flex-1 py-3.5 bg-white/15 hover:bg-white/25 text-white font-bold rounded-2xl text-sm border border-white/20 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <RotateCcw size={18} /> Retake
            </button>

            <button
              onClick={handleUsePhoto}
              className="flex-[1.5] py-3.5 bg-[#004B87] hover:bg-blue-600 text-white font-black rounded-2xl text-sm transition-all shadow-lg shadow-[#004B87]/40 flex items-center justify-center gap-2 active:scale-95"
            >
              <Check size={18} strokeWidth={3} /> Use Photo
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: Live Viewfinder / Camera Fallback
  // ==========================================
  return (
    <div className="flex flex-col h-full bg-black relative select-none">
      {/* Hidden file input for native device camera */}
      <input 
        type="file" 
        ref={nativeCameraInputRef} 
        accept="image/*" 
        capture="environment"
        className="hidden" 
        onChange={handleFileChange} 
      />

      {/* Hidden file input for gallery picker */}
      <input 
        type="file" 
        ref={galleryInputRef} 
        accept="image/*" 
        className="hidden" 
        onChange={handleFileChange} 
      />

      {/* Video Viewfinder */}
      <div className="absolute inset-0 overflow-hidden">
        {hasPermission === false ? (
          <div className="flex flex-col items-center justify-center h-full text-white px-6 text-center bg-gray-950">
            <div className="w-16 h-16 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
              <Camera size={32} />
            </div>
            <h3 className="font-bold text-lg mb-2">Device Camera</h3>
            <p className="text-gray-400 text-xs mb-6 max-w-xs leading-relaxed">
              {cameraError || "Take a clear photo of your bank form or select an image from your device."}
            </p>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              {/* Native mobile camera trigger */}
              <button
                onClick={() => nativeCameraInputRef.current?.click()}
                className="w-full py-3.5 bg-[#004B87] hover:bg-blue-600 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#004B87]/30 active:scale-95 transition-transform"
              >
                <Camera size={18} /> Open Phone Camera
              </button>

              <button
                onClick={() => galleryInputRef.current?.click()}
                className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 border border-white/15 transition-colors"
              >
                <ImageIcon size={16} /> Upload Image from Device
              </button>

              <button
                onClick={() => startCamera(facingMode)}
                className="w-full py-2.5 text-gray-400 hover:text-white text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <RefreshCcw size={13} /> Retry Live Preview
              </button>
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Camera Guidance Overlay Overlay Frame */}
      {hasPermission && (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6 pt-16 pb-32">
          <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-white text-xs font-semibold flex items-center gap-2 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Align document inside frame</span>
          </div>

          {/* Document Framing Box */}
          <div className="w-full max-w-xs h-[55%] border-2 border-dashed border-white/60 rounded-3xl relative flex items-center justify-center">
            {/* Corner Markers */}
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-cyan-400 rounded-tl-xl"></div>
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-cyan-400 rounded-tr-xl"></div>
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-cyan-400 rounded-bl-xl"></div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-cyan-400 rounded-br-xl"></div>
          </div>

          <div className="text-[11px] text-white/80 bg-black/40 px-3 py-1.5 rounded-xl backdrop-blur-sm text-center">
            Make sure text is readable & well-lit
          </div>
        </div>
      )}

      {/* Top Controls */}
      <header className="absolute top-0 inset-x-0 p-4 pt-12 flex justify-between items-center z-10">
        <button 
          onClick={onBack} 
          className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/20 hover:bg-black/60"
        >
          <X size={20} />
        </button>

        <div className="flex gap-2">
          {hasPermission && (
            <>
              <button 
                onClick={toggleTorch} 
                className={`p-2.5 rounded-full backdrop-blur-md border border-white/20 transition-colors ${
                  torchOn ? 'bg-amber-400 text-black' : 'bg-black/40 text-white hover:bg-black/60'
                }`}
                title="Toggle Flash"
              >
                <Zap size={20} />
              </button>
              <button 
                onClick={toggleCamera} 
                className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/20 hover:bg-black/60"
                title="Switch Camera"
              >
                <RefreshCcw size={20} />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Bottom Shutter & Upload Controls */}
      <div className="absolute bottom-0 inset-x-0 p-6 pb-10 flex items-center justify-around z-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        {/* Gallery Upload Fallback */}
        <button 
          onClick={() => galleryInputRef.current?.click()} 
          className="p-3.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30 hover:bg-white/30 transition-all"
          title="Upload from Device"
        >
          <ImageIcon size={22} />
        </button>

        {/* Live Shutter Button or Native Camera button */}
        {hasPermission ? (
          <button 
            onClick={handleShutterClick} 
            disabled={isCapturing}
            className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1 group active:scale-95 transition-all"
            title="Take Photo"
          >
            <div className="w-full h-full rounded-full bg-white group-hover:bg-gray-200 transition-colors shadow-lg"></div>
          </button>
        ) : (
          <button 
            onClick={() => nativeCameraInputRef.current?.click()} 
            className="w-20 h-20 rounded-full bg-[#004B87] border-4 border-white/80 flex items-center justify-center text-white shadow-xl active:scale-95 transition-all"
            title="Open Phone Camera"
          >
            <Camera size={30} />
          </button>
        )}

        {/* Native phone camera button shortcut if live preview is on */}
        {hasPermission ? (
          <button 
            onClick={() => nativeCameraInputRef.current?.click()} 
            className="p-3.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30 hover:bg-white/30 transition-all"
            title="Device Camera App"
          >
            <Camera size={22} />
          </button>
        ) : (
          <div className="w-12"></div>
        )}
      </div>
    </div>
  );
}

