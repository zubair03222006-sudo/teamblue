import { useGenerationJob } from "@/hooks/useGenerationJob";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Check, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const statusConfig = {
  pending: { label: "Queued", color: "from-amber-500 to-orange-500" },
  processing: { label: "Generating", color: "from-violet-500 to-fuchsia-500" },
  completed: { label: "Ready!", color: "from-emerald-500 to-teal-500" },
  failed: { label: "Failed", color: "from-red-500 to-rose-500" },
};

const GenerationIndicator = () => {
  const { job, isGenerating, clearJob } = useGenerationJob();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  // Show when job exists, auto-dismiss completed/failed after 6s
  useEffect(() => {
    if (!job || dismissed) {
      setShow(false);
      return;
    }
    setShow(true);

    if (job.status === "completed" || job.status === "failed") {
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(() => clearJob(), 400);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [job, job?.status, dismissed, clearJob]);

  // Reset dismissed flag when a new job starts
  useEffect(() => {
    if (isGenerating) setDismissed(false);
  }, [isGenerating]);

  if (!job) return null;

  const config = statusConfig[job.status] || statusConfig.pending;

  const handleClick = () => {
    if (job.status === "completed") {
      navigate("/analyzer");
      setShow(false);
      setTimeout(() => clearJob(), 400);
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
    setShow(false);
    if (job.status === "completed" || job.status === "failed") {
      setTimeout(() => clearJob(), 400);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="fixed top-20 right-4 z-[100] cursor-pointer select-none"
          onClick={handleClick}
          role="status"
          aria-live="polite"
        >
          <div
            className={`
              relative overflow-hidden rounded-2xl
              bg-gradient-to-r ${config.color}
              p-[1px]
              shadow-lg shadow-black/20
            `}
          >
            {/* Animated shimmer for active states */}
            {isGenerating && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
            )}

            <div className="relative flex items-center gap-3 rounded-[15px] bg-background/90 backdrop-blur-xl px-4 py-2.5">
              {/* Icon */}
              <div className="relative flex-shrink-0">
                {isGenerating ? (
                  <>
                    {/* Pulsing ring */}
                    <motion.div
                      className={`absolute inset-0 rounded-full bg-gradient-to-r ${config.color} opacity-40`}
                      animate={{ scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    {/* Spinning sparkle */}
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles className="h-5 w-5 text-accent relative z-10" />
                    </motion.div>
                  </>
                ) : job.status === "completed" ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  >
                    <Check className="h-5 w-5 text-emerald-400" />
                  </motion.div>
                ) : (
                  <X className="h-5 w-5 text-red-400" />
                )}
              </div>

              {/* Text */}
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-foreground leading-tight">
                  {isGenerating ? "AI Outfit" : config.label}
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight truncate max-w-[140px]">
                  {isGenerating && (
                    <motion.span
                      className="inline-flex items-center gap-1"
                    >
                      {config.label}
                      <motion.span
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        ...
                      </motion.span>
                    </motion.span>
                  )}
                  {job.status === "completed" && "Click to view"}
                  {job.status === "failed" && (job.error?.slice(0, 30) || "Something went wrong")}
                </span>
              </div>

              {/* Progress dots for generating states */}
              {isGenerating && (
                <div className="flex gap-1 ml-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${config.color}`}
                      animate={{ scale: [0.5, 1, 0.5], opacity: [0.3, 1, 0.3] }}
                      transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Dismiss button */}
              <button
                onClick={handleDismiss}
                className="ml-1 flex-shrink-0 p-0.5 rounded-full hover:bg-foreground/10 transition-colors"
                aria-label="Dismiss notification"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GenerationIndicator;
