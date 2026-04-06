"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  PersonStanding,
  Upload,
  X,
  ImagePlus,
  MapPin,
  FileText,
  Sparkles,
  Loader2,
  Play,
  CheckCircle2,
  ChevronRight,
  Info,
  Download,
} from "lucide-react";

const MAX_SCRIPT = 450;

function splitScript(script, parts = 3) {
  const trimmed = script.trim();
  if (!trimmed) return [];
  // Try to split on sentence boundaries, otherwise split evenly
  const sentences = trimmed.match(/[^.!?]+[.!?]+/g) || [trimmed];
  if (sentences.length >= parts) {
    // Merge into ~parts groups
    const groups = [];
    const size = Math.ceil(sentences.length / parts);
    for (let i = 0; i < parts; i++) {
      const chunk = sentences.slice(i * size, (i + 1) * size).join(" ").trim();
      if (chunk) groups.push(chunk);
    }
    return groups.length > 0 ? groups : [trimmed];
  }
  // Fall back: split evenly by chars
  const chunkSize = Math.ceil(trimmed.length / parts);
  const result = [];
  for (let i = 0; i < parts; i++) {
    const chunk = trimmed.slice(i * chunkSize, (i + 1) * chunkSize).trim();
    if (chunk) result.push(chunk);
  }
  return result;
}

function ImageUploadBox({ label, icon: Icon, images, onAdd, onRemove, maxImages, hint }) {
  const inputRef = useRef(null);

  function handleFiles(files) {
    const valid = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const remaining = maxImages - images.length;
    valid.slice(0, remaining).forEach((f) => onAdd(f));
    if (!valid.length) toast.error("Please upload image files (JPEG, PNG, WebP)");
  }

  function handleDrop(e) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-xs text-muted-foreground ml-auto">{images.length}/{maxImages}</span>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}

      {/* Preview grid */}
      {images.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {images.map((img, i) => (
            <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-border shadow-sm group">
              <img
                src={URL.createObjectURL(img)}
                alt={`${label} ${i + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => onRemove(i)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {images.length < maxImages && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="w-full border-2 border-dashed border-border hover:border-primary/60 rounded-xl p-5 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
        >
          <ImagePlus className="w-7 h-7 group-hover:text-primary transition-colors" />
          <p className="text-xs font-medium">Click or drag to upload</p>
          <p className="text-[11px]">JPEG, PNG, WebP • max {maxImages} image{maxImages > 1 ? "s" : ""}</p>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*"
        multiple={maxImages > 1}
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}

function VideoCard({ index, video, status, totalParts }) {
  const isReady = status === "ready";
  const isGenerating = status === "generating";
  const isPending = status === "pending";

  return (
    <div
      className={`rounded-2xl border transition-all duration-500 overflow-hidden ${
        isReady
          ? "border-primary/40 bg-card shadow-lg"
          : isGenerating
          ? "border-amber-500/40 bg-amber-500/5 animate-pulse"
          : "border-border/40 bg-muted/30 opacity-50"
      }`}
    >
      <div className="p-3 flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
            isReady
              ? "gradient-bg text-white"
              : isGenerating
              ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {isReady ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">
            {isReady ? `Video ${index + 1}` : isGenerating ? (index === 0 ? "Generating..." : "Extending...") : `Video ${index + 1}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {isReady
              ? "Ready to watch"
              : isGenerating
              ? index === 0
                ? "Creating first clip with your images..."
                : `Extending from video ${index}...`
              : "Waiting..."}
          </p>
        </div>
        {isGenerating && <Loader2 className="w-4 h-4 animate-spin text-amber-500 shrink-0" />}
      </div>

      {isReady && video?.videoUrl && (
        <div className="px-3 pb-3">
          <div className="rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-80 mx-auto relative">
            <video
              src={video.videoUrl}
              controls
              className="w-full h-full object-contain"
              autoPlay={false}
            >
              Your browser does not support video.
            </video>
          </div>
          <div className="flex justify-end mt-2">
            <a
              href={video.videoUrl}
              download={`walkthrough-${index + 1}.mp4`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

const STEPS = ["Person", "Location", "Script"];

export default function AIWalkthroughPage() {
  const [step, setStep] = useState(0);

  // Images
  const [personImages, setPersonImages] = useState([]);
  const [locationImages, setLocationImages] = useState([]);

  // Script
  const [script, setScript] = useState("");
  const [numParts, setNumParts] = useState(3);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [videoStatuses, setVideoStatuses] = useState([]); // "pending" | "generating" | "ready"
  const [videos, setVideos] = useState([]); // [{ videoUrl }]
  const [done, setDone] = useState(false);

  const step1Valid = personImages.length >= 1;
  const step2Valid = locationImages.length >= 1;
  const step3Valid = script.trim().length >= 20;

  function addPersonImage(file) {
    setPersonImages((prev) => [...prev, file]);
  }
  function removePersonImage(i) {
    setPersonImages((prev) => prev.filter((_, idx) => idx !== i));
  }
  function addLocationImage(file) {
    setLocationImages((prev) => [...prev, file]);
  }
  function removeLocationImage(i) {
    setLocationImages((prev) => prev.filter((_, idx) => idx !== i));
  }

  // Compute max location images based on person count (total ≤ 3, person gets priority)
  const personSlots = Math.min(personImages.length, 2);
  const maxLocationFromState = Math.min(2, 3 - Math.min(personSlots, 2));
  // If no person images yet, allow up to 2 location (will be recalculated on generate)
  const maxLocationImages = personImages.length > 0 ? maxLocationFromState : 2;

  async function handleGenerate() {
    if (!step1Valid || !step2Valid || !step3Valid) return;

    const parts = splitScript(script, numParts);
    if (parts.length === 0) {
      toast.error("Could not split script. Please try again.");
      return;
    }

    // Init video slots
    const total = parts.length;
    setVideoStatuses(Array(total).fill("pending"));
    setVideos(Array(total).fill(null));
    setDone(false);
    setGenerating(true);

    try {
      const fd = new FormData();
      personImages.forEach((f) => fd.append("personImages", f));
      locationImages.forEach((f) => fd.append("locationImages", f));
      fd.append("scriptParts", JSON.stringify(parts));

      const response = await fetch("/api/ai-walkthrough/generate", {
        method: "POST",
        body: fd,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Generation failed");
      }

      if (!response.body) throw new Error("No response stream");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            handleSSEEvent(event, total);
          } catch {}
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Generation failed", { description: err.message });
      setVideoStatuses((prev) => prev.map((s) => (s === "generating" ? "error" : s)));
    } finally {
      setGenerating(false);
    }
  }

  function handleSSEEvent(event, total) {
    if (event.type === "progress") {
      const { videoIndex } = event;
      setVideoStatuses((prev) => {
        const next = [...prev];
        next[videoIndex] = "generating";
        return next;
      });
      toast.info(event.message, { id: `video-progress-${videoIndex}` });
    }

    if (event.type === "video_ready") {
      const { videoIndex, videoUrl } = event;
      setVideoStatuses((prev) => {
        const next = [...prev];
        next[videoIndex] = "ready";
        return next;
      });
      setVideos((prev) => {
        const next = [...prev];
        next[videoIndex] = { videoUrl };
        return next;
      });
      toast.success(`🎬 Video ${videoIndex + 1} ready!`, { id: `video-progress-${videoIndex}` });
    }

    if (event.type === "done") {
      setDone(true);
      toast.success(`✅ All ${event.totalVideos} videos generated!`);
    }

    if (event.type === "error") {
      toast.error("Generation error", { description: event.message });
    }
  }

  function reset() {
    setPersonImages([]);
    setLocationImages([]);
    setScript("");
    setVideoStatuses([]);
    setVideos([]);
    setDone(false);
    setGenerating(false);
    setStep(0);
  }

  const showResults = videoStatuses.length > 0;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-md">
          <PersonStanding className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-heading">AI Walkthrough Video</h1>
          <p className="text-sm text-muted-foreground">
            Turn your photo + a location into a cinematic walkthrough — powered by Google Veo.
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex gap-2.5 mb-6">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Upload <strong className="text-foreground">1–2 photos of a person</strong> and <strong className="text-foreground">1–2 location images</strong>. Write a short script (max 450 chars) — we'll split it into clips and stitch them together using Veo's video extension. Supporting English, Hindi, and more.
        </p>
      </div>

      {/* ── Step progress ── */}
      {!showResults && (
        <div className="flex items-center gap-1 mb-7">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1 flex-1">
              <button
                onClick={() => {
                  if (i < step || (i === 1 && step1Valid) || (i === 2 && step1Valid && step2Valid)) setStep(i);
                }}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
                  step === i
                    ? "gradient-bg text-white shadow-md"
                    : i < step
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground bg-muted/50"
                }`}
              >
                {i < step ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <span className="w-4 h-4 rounded-full border text-[10px] flex items-center justify-center font-bold">
                    {i + 1}
                  </span>
                )}
                <span className="hidden sm:inline">{s}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`h-px flex-1 transition-colors ${i < step ? "bg-primary/40" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── STEP 0: Person ── */}
      {!showResults && step === 0 && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <ImageUploadBox
            label="Person Photo"
            icon={PersonStanding}
            images={personImages}
            onAdd={addPersonImage}
            onRemove={removePersonImage}
            maxImages={2}
            hint="Upload 1–2 photos of the person (full body or half body). These will guide Veo on what the person looks like."
          />

          <div className="flex justify-end">
            <Button
              onClick={() => setStep(1)}
              disabled={!step1Valid}
              className="gradient-bg text-white shadow-md cursor-pointer"
            >
              Next: Location
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 1: Location ── */}
      {!showResults && step === 1 && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <ImageUploadBox
            label="Location / Surroundings"
            icon={MapPin}
            images={locationImages}
            onAdd={addLocationImage}
            onRemove={removeLocationImage}
            maxImages={maxLocationImages}
            hint={`Upload 1–${maxLocationImages} photo(s) of the space or surroundings. These set the background/environment of the video.`}
          />

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(0)} className="cursor-pointer">
              Back
            </Button>
            <Button
              onClick={() => setStep(2)}
              disabled={!step2Valid}
              className="gradient-bg text-white shadow-md cursor-pointer"
            >
              Next: Script
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Script ── */}
      {!showResults && step === 2 && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Script</span>
              <span
                className={`text-xs ml-auto font-mono ${
                  script.length > MAX_SCRIPT ? "text-destructive font-bold" : "text-muted-foreground"
                }`}
              >
                {script.length}/{MAX_SCRIPT}
              </span>
            </div>
            <Textarea
              value={script}
              onChange={(e) => setScript(e.target.value.slice(0, MAX_SCRIPT))}
              placeholder="e.g. Welcome to this stunning 3-bedroom home. Notice the open floor plan, chef's kitchen, and breathtaking garden views."
              className="min-h-[110px] resize-none text-sm"
              maxLength={MAX_SCRIPT}
            />
            <p className="text-xs text-muted-foreground">
              Max {MAX_SCRIPT} characters. This will be split into {numParts} video clips.
            </p>
          </div>

          {/* Parts selector */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Number of video clips</span>
            <div className="flex gap-2">
              {[3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setNumParts(n)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                    numParts === n
                      ? "gradient-bg text-white border-transparent shadow"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {n} clips
                </button>
              ))}
            </div>
          </div>

          {/* Script preview split */}
          {script.trim().length >= 20 && (
            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Preview — how your script will be split:</p>
              {splitScript(script, numParts).map((part, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-xs text-foreground/80 leading-relaxed">{part}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={() => setStep(1)} className="cursor-pointer">
              Back
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!step3Valid || generating || script.length > MAX_SCRIPT}
              className="gradient-bg text-white shadow-md cursor-pointer"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Videos
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ── RESULTS ── */}
      {showResults && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">
              {done ? `✅ ${videoStatuses.length} videos ready` : "Generating your walkthrough..."}
            </h2>
            {done && (
              <Button variant="outline" size="sm" onClick={reset} className="cursor-pointer text-xs">
                Start over
              </Button>
            )}
          </div>

          <div className="grid gap-4">
            {videoStatuses.map((status, i) => (
              <VideoCard
                key={i}
                index={i}
                status={status}
                video={videos[i]}
                totalParts={videoStatuses.length}
              />
            ))}
          </div>

          {done && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
              <p className="text-sm font-medium">🎬 All videos generated!</p>
              <p className="text-xs text-muted-foreground mt-1">
                Download each clip above. Video joining (to create one seamless video) is coming soon.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
