import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Check, X, ScanLine, RefreshCw, Loader2, WifiOff, CloudUpload } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";
import { validateDocket } from "@/functions/validateDocket";
import { base44 } from "@/api/base44Client";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";

/**
 * CameraDocketCapture — camera-first docket ingestion.
 * The camera activates immediately on mount. A "ghost frame" overlay helps
 * the user align the docket. Auto-captures when the frame is filled,
 * then submits to the AI validator automatically.
 *
 * Supports predictive pre-fill (job data merged into result) and
 * offline draft mode (queues the docket for sync when reconnected).
 */

export default function CameraDocketCapture({ onCaptured, onClose, prefillData }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isDraft, setIsDraft] = useState(false);
  const autoCaptureTimer = useRef(null);
  const { isOnline, create: offlineCreate, pendingCount, flushQueue } = useOfflineQueue();

  // Start camera on mount
  useEffect(() => {
    let mounted = true;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
        }
      } catch (err) {
        setError("Camera access denied. Please allow camera permissions or upload a file instead.");
      }
    }

    startCamera();
    return () => {
      mounted = false;
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (autoCaptureTimer.current) clearInterval(autoCaptureTimer.current);
    };
  }, []);

  // Auto-capture check — looks at frame brightness to detect a document in frame
  const checkFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !cameraReady || capturing || preview) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, 320, 240);

    // Sample center region brightness — a white docket filling the frame will be bright
    const data = ctx.getImageData(80, 60, 160, 120).data;
    let total = 0;
    for (let i = 0; i < data.length; i += 4) {
      total += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    const avgBrightness = total / (data.length / 4);

    // If center is very bright (white paper), auto-capture
    if (avgBrightness > 200 && !capturing && !preview) {
      capture();
    }
  }, [cameraReady, capturing, preview]);

  useEffect(() => {
    if (cameraReady && !preview) {
      autoCaptureTimer.current = setInterval(checkFrame, 1500);
    }
    return () => { if (autoCaptureTimer.current) clearInterval(autoCaptureTimer.current); };
  }, [cameraReady, checkFrame, preview]);

  const capture = useCallback(async () => {
    if (!videoRef.current || capturing || preview) return;
    setCapturing(true);

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      const file = new File([blob], `docket-${Date.now()}.jpg`, { type: "image/jpeg" });
      setPreview(URL.createObjectURL(blob));
      setCapturing(false);
      await processDocket(file);
    }, "image/jpeg", 0.9);
  }, [capturing, preview]);

  const processDocket = async (file) => {
    setProcessing(true);
    setError(null);

    // Offline draft mode — queue the docket for later sync
    if (!isOnline) {
      const draftDocket = {
        docket_no: prefillData?.job_id ? `${prefillData.job_id}-DRAFT` : `DRAFT-${Date.now()}`,
        source: "camera_draft",
        date: new Date().toISOString().split("T")[0],
        vehicle: prefillData?.vehicle_id || "",
        driver: prefillData?.driver_name || "",
        site: prefillData?.site_address || prefillData?.client || "",
        status: "pending",
        ...prefillData,
      };
      await offlineCreate("Docket", draftDocket);
      setIsDraft(true);
      setResult({ docket: draftDocket, status: "draft" });
      setProcessing(false);
      onCaptured?.(draftDocket);
      return;
    }

    try {
      // Upload the image
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      // Validate via OCR
      const res = await validateDocket({ file_url });
      // Merge predictive pre-fill data into the result
      const mergedDocket = { ...prefillData, ...res.data?.docket };
      const mergedResult = { ...res.data, docket: mergedDocket };
      setResult(mergedResult);
      if (res.data?.status === "validated" || res.data?.status === "created") {
        onCaptured?.(mergedDocket);
      }
    } catch (err) {
      setError("Could not read docket. Try retaking with better lighting.");
    } finally {
      setProcessing(false);
    }
  };

  const retake = () => {
    setPreview(null);
    setResult(null);
    setError(null);
  };

  return (
    <GlassCard level={3} className="relative overflow-hidden p-0" >
      <div className="relative aspect-[3/4] max-w-sm mx-auto bg-robur-charcoal rounded-2xl overflow-hidden">
        {!preview ? (
          <>
            {/* Camera viewport */}
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover"
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Ghost frame overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-6 border-2 border-white/40 rounded-lg" />
              <div className="absolute inset-6 border-2 border-dashed border-robur-yellow/60 rounded-lg" />
              {/* Corner markers */}
              {[
                "top-6 left-6 border-t-2 border-l-2",
                "top-6 right-6 border-t-2 border-r-2",
                "bottom-6 left-6 border-b-2 border-l-2",
                "bottom-6 right-6 border-b-2 border-r-2",
              ].map((pos) => (
                <div key={pos} className={cn("absolute h-5 w-5 border-robur-yellow", pos)} />
              ))}
              {/* Scanning line animation */}
              <motion.div
                className="absolute left-6 right-6 h-0.5 bg-robur-yellow/80"
                initial={{ top: "24px" }}
                animate={{ top: ["24px", "calc(100% - 24px)", "24px"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
            </div>

            {/* Status text */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1.5 backdrop-blur-sm">
                <div className={cn("h-2 w-2 rounded-full", cameraReady ? "bg-emerald-400 animate-pulse" : "bg-amber-400")} />
                <span className="text-[10px] font-semibold text-white">
                  {cameraReady ? "Align docket in frame" : "Starting camera..."}
                </span>
              </div>
              {onClose && (
                <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 backdrop-blur-sm">
                  <X className="h-3.5 w-3.5 text-white" />
                </button>
              )}
            </div>

            {/* Manual capture button */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center">
              <button
                onClick={capture}
                disabled={!cameraReady || capturing}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-white ring-4 ring-white/30 active:scale-90 transition-transform disabled:opacity-50"
              >
                {capturing ? (
                  <Loader2 className="h-6 w-6 text-robur-charcoal animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-robur-charcoal" strokeWidth={2} />
                )}
              </button>
            </div>

            {/* Auto-capture hint */}
            {cameraReady && (
              <div className="absolute bottom-20 left-0 right-0 flex justify-center">
                <div className="flex items-center gap-1 rounded-full bg-black/50 px-3 py-1 backdrop-blur-sm">
                  <ScanLine className="h-3 w-3 text-robur-yellow" />
                  <span className="text-[9px] font-medium text-white">Auto-captures when aligned</span>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Preview + processing state */
          <div className="absolute inset-0">
            <img src={preview} alt="Captured docket" className="absolute inset-0 h-full w-full object-cover" />

            <AnimatePresence>
              {processing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
                >
                  <Loader2 className="h-8 w-8 text-robur-yellow animate-spin mb-3" />
                  <p className="text-xs font-semibold text-white">Reading docket...</p>
                  <p className="text-[10px] text-white/60 mt-1">AI extracting fields</p>
                </motion.div>
              )}
            </AnimatePresence>

            {result && !processing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm"
              >
                {isDraft ? (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 mb-3">
                    <WifiOff className="h-6 w-6 text-white" strokeWidth={2.5} />
                  </div>
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 mb-3">
                    <Check className="h-6 w-6 text-white" strokeWidth={3} />
                  </div>
                )}
                <p className="text-sm font-bold text-white">
                  {isDraft ? "Saved as Draft" : "Docket Validated"}
                </p>
                {result.docket?.docket_no && (
                  <p className="text-[10px] text-white/70 mt-1">{result.docket.docket_no}</p>
                )}
                {isDraft ? (
                  <p className="text-[10px] text-amber-300 mt-1 max-w-[200px] text-center">
                    Offline — will sync when reconnected ({pendingCount} queued)
                  </p>
                ) : prefillData ? (
                  <p className="text-[10px] text-white/50 mt-1">Pre-filled from job data</p>
                ) : null}
                {isDraft && (
                  <button
                    onClick={() => flushQueue()}
                    className="mt-3 flex items-center gap-1.5 rounded-lg bg-robur-yellow px-3 py-1.5 text-xs font-bold text-robur-charcoal"
                  >
                    <CloudUpload className="h-3 w-3" /> Sync Now
                  </button>
                )}
                <button onClick={retake} className="mt-4 flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/30 transition-colors">
                  <RefreshCw className="h-3 w-3" /> Capture Another
                </button>
              </motion.div>
            )}

            {error && !processing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm p-4"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 mb-3">
                  <X className="h-6 w-6 text-white" strokeWidth={3} />
                </div>
                <p className="text-xs font-semibold text-white text-center">{error}</p>
                <button onClick={retake} className="mt-4 flex items-center gap-1.5 rounded-lg bg-robur-yellow px-4 py-2 text-xs font-bold text-robur-charcoal">
                  <RefreshCw className="h-3 w-3" /> Try Again
                </button>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </GlassCard>
  );
}