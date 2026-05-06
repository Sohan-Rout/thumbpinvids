import { CheckCircle2, Download, Loader2 } from "lucide-react";

export default function VideoCard({ status, video }) {
  const isGenerating = status === "generating";
  const isReady = status === "ready" && video?.videoUrl;

  return (
    <div className={`rounded-xl border transition-all ${
      isReady ? "border-primary/40 bg-card shadow-lg" : isGenerating ? "border-amber-500/40 bg-amber-500/5 animate-pulse" : "border-border/40 bg-muted/30 opacity-50"
    }`}>
      <div className="p-3 flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
          isReady ? "gradient-bg text-white" : isGenerating ? "bg-amber-500/20 text-amber-600 dark:text-amber-400" : "bg-muted text-muted-foreground"
        }`}>
          {isReady ? <CheckCircle2 className="w-4 h-4" /> : isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : "1"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{isReady ? "Video Ready!" : isGenerating ? "Generating..." : "Waiting..."}</p>
          <p className="text-xs text-muted-foreground">{isReady ? "Your property showcase is ready" : isGenerating ? "Crafting voice & video..." : "Pending"}</p>
        </div>
      </div>
      {isReady && video?.videoUrl && (
        <div className="px-3 pb-3">
          <div className="rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-80 mx-auto">
            <video src={video.videoUrl} controls className="w-full h-full object-contain" />
          </div>
          <div className="flex justify-end mt-2">
            <a href={video.videoUrl} download="real-estate-video.mp4" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
              <Download className="w-3.5 h-3.5" /> Download
            </a>
          </div>
        </div>
      )}
    </div>
  );
}