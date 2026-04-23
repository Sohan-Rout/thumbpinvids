"use client";

import { useState, useRef, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  PersonStanding,
  Upload,
  X,
  User,
  FileText,
  Sparkles,
  Loader2,
  CheckCircle2,
  ChevronRight,
  Info,
  Download,
  ImagePlus,
  Play,
  RotateCcw,
  PenLine,
  Layers,
  Check,
  MapPin,
  Building2,
  Save,
} from "lucide-react";
import { AssetSelector } from "@/components/dashboard/asset-selector";

const MAX_SCRIPT = 200;

const RE_AVATARS = Array.from({ length: 6 }, (_, i) => ({
  id: `re-${i + 1}`,
  name: `RE Agent ${i + 1}`,
  url: `/avatars/re/realestate${i + 1}.png`,
}));

const LANGUAGES = [
  { id: "english", label: "English" },
  { id: "hindi", label: "Hindi" },
  { id: "hinglish", label: "Hinglish" },
];

async function compressImage(file, maxDimension = 1200, quality = 0.7) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDimension) { height *= maxDimension / width; width = maxDimension; }
        } else {
          if (height > maxDimension) { width *= maxDimension / height; height = maxDimension; }
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => resolve(new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() })),
          "image/jpeg",
          quality
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function dataUrlToFile(dataUrl, filename) {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], filename, { type: mime });
}

// ─── Multi-image upload for properties ───────────────────────────────────────
function MultiImageUploadBox({ images, onAdd, onRemove, maxImages = 3 }) {
  const inputRef = useRef(null);

  function handleFiles(files) {
    const valid = Array.from(files).filter((f) => f.type.startsWith("image/"));
    valid.forEach((f) => {
      if (images.length < maxImages) onAdd(f);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Building2 className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold">Property Images</span>
        <Badge variant="outline" className="text-[10px] ml-auto">{images.length}/{maxImages}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Upload 1-{maxImages} property images. A composite will be created for each.
      </p>

      {images.length > 0 && (
        <div className={`grid gap-3 ${images.length === 1 ? "grid-cols-1 max-w-xs mx-auto" : images.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
          {images.map((img, i) => (
            <div key={i} className="relative rounded-xl overflow-hidden border border-border/50 shadow-md group aspect-[4/3]">
              <img src={URL.createObjectURL(img)} alt={`Property ${i + 1}`} className="w-full h-full object-cover" />
              <button
                onClick={() => onRemove(i)}
                className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <X className="w-3 h-3 text-white" />
              </button>
              <Badge className="absolute top-2 left-2 bg-black/70 text-white border-0 text-[10px] backdrop-blur-sm">
                <MapPin className="w-2.5 h-2.5 mr-0.5" /> Property {i + 1}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {images.length < maxImages && (
        <div
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-primary", "bg-primary/5"); }}
          onDragLeave={(e) => { e.currentTarget.classList.remove("border-primary", "bg-primary/5"); }}
          onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("border-primary", "bg-primary/5"); handleFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-border/50 rounded-xl p-6 flex flex-col items-center gap-2 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer"
        >
          <ImagePlus className="w-5 h-5 text-primary" />
          <p className="text-xs text-muted-foreground">
            {images.length === 0 ? "Upload property images (1-3)" : `Add more (${maxImages - images.length} remaining)`}
          </p>
          <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); }} />
        </div>
      )}
    </div>
  );
}

// ─── Video Result Card ───────────────────────────────────────────────────────
function VideoCard({ status, video }) {
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

// ─── Main 3-Step Page ────────────────────────────────────────────────────────
const STEPS = ["Upload & Avatar", "Pick Composite", "Script & Generate"];

function RealEstateVideoContent() {
  const searchParams = useSearchParams();
  const initialScript = searchParams.get("script");

  const [step, setStep] = useState(0);

  // Step 0: Property images + Avatar (combined)
  const [propertyImages, setPropertyImages] = useState([]);
  const [avatarMode, setAvatarMode] = useState("prebuilt");
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [uploadedAvatarFile, setUploadedAvatarFile] = useState(null);
  const [avatarPrompt, setAvatarPrompt] = useState("");
  const [avatarVariantCount, setAvatarVariantCount] = useState(1);
  const [generatedAvatars, setGeneratedAvatars] = useState([]);
  const [generatingAvatar, setGeneratingAvatar] = useState(false);

  // Step 1: Composites
  const [composites, setComposites] = useState([]);
  const [generatingComposites, setGeneratingComposites] = useState(false);
  const [selectedCompositeIndex, setSelectedCompositeIndex] = useState(null);
  const [savingComposites, setSavingComposites] = useState(false);

  // Step 2: Script + Generate (voice is backend-only)
  const [script, setScript] = useState("");
  const [language, setLanguage] = useState("english");
  const [generatingScript, setGeneratingScript] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [videoStatus, setVideoStatus] = useState("idle");
  const [videoResult, setVideoResult] = useState(null);

  useEffect(() => {
    if (initialScript) { setScript(initialScript); setStep(2); }
  }, [initialScript]);

  const selectedComposite = selectedCompositeIndex !== null ? composites[selectedCompositeIndex] : null;

  // Validity
  const step0Valid = propertyImages.length >= 1 && !!selectedAvatar;
  const step1Valid = selectedCompositeIndex !== null;
  const step2Valid = script.trim().length >= 15;

  // ── Avatar generation ──────────────────────────────────────────────────────
  async function handleGenerateAvatars() {
    if (!avatarPrompt.trim() || avatarPrompt.trim().length < 10) return;
    setGeneratingAvatar(true);
    setGeneratedAvatars([]);
    try {
      const res = await fetch("/api/product-video/generate-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: avatarPrompt.trim(), variants: avatarVariantCount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setGeneratedAvatars(data.images || []);
      toast.success(`Generated ${data.images.length} avatar(s)!`);
    } catch (err) {
      toast.error("Avatar generation failed", { description: err.message });
    } finally {
      setGeneratingAvatar(false);
    }
  }

  // ── Generate composites ────────────────────────────────────────────────────
  async function handleGenerateComposites() {
    if (!selectedAvatar || propertyImages.length === 0) return;
    setGeneratingComposites(true);
    setComposites([]);
    setSelectedCompositeIndex(null);
    try {
      let avatarFile;
      if (selectedAvatar.file) {
        avatarFile = await compressImage(selectedAvatar.file);
      } else {
        const res = await fetch(selectedAvatar.url);
        const blob = await res.blob();
        avatarFile = await compressImage(new File([blob], "avatar.png", { type: blob.type }));
      }

      const results = [];
      for (let i = 0; i < propertyImages.length; i++) {
        toast.info(`Creating composite ${i + 1}/${propertyImages.length}...`, { id: "composite-progress" });
        const compressedProperty = await compressImage(propertyImages[i]);
        const fd = new FormData();
        fd.append("avatarImage", avatarFile);
        fd.append("propertyImage", compressedProperty);

        const res = await fetch("/api/real-estate-video/composite", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Composite ${i + 1} failed`);

        results.push({
          url: data.compositeUrl,
          file: dataUrlToFile(data.compositeUrl, `re-composite-${i}.png`),
          title: `Property ${i + 1}`,
          propertyIndex: i,
        });
      }

      setComposites(results);
      toast.success(`${results.length} composite(s) ready — pick your best!`, { id: "composite-progress" });
      if (results.length === 1) setSelectedCompositeIndex(0);
    } catch (err) {
      toast.error("Composite generation failed", { description: err.message });
    } finally {
      setGeneratingComposites(false);
    }
  }

  // ── Save unused composites to Asset Library ────────────────────────────────
  async function saveUnusedComposites(selected) {
    if (composites.length <= 1) return;
    setSavingComposites(true);
    try {
      const payload = {
        composites: composites.map((c) => ({ dataUrl: c.url, name: c.title })),
        selectedIndex: selected,
      };
      const res = await fetch("/api/real-estate-video/save-composites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.saved?.length > 0) {
        toast.success(`${data.saved.length} composite(s) saved to Asset Library`, {
          description: "Animate them anytime from the Asset Library!",
        });
      }
    } catch (err) {
      console.error("Failed to save composites:", err);
    } finally {
      setSavingComposites(false);
    }
  }

  // ── Proceed from composite pick → script ───────────────────────────────────
  async function handleCompositeNext() {
    if (selectedCompositeIndex === null) return;
    saveUnusedComposites(selectedCompositeIndex); // background
    setStep(2);
  }

  // ── Script generation ──────────────────────────────────────────────────────
  async function handleGenerateScript() {
    if (!selectedComposite) return;
    setGeneratingScript(true);
    try {
      const fd = new FormData();
      fd.append("compositeImage", selectedComposite.file);
      const propIdx = selectedComposite.propertyIndex ?? 0;
      if (propertyImages[propIdx]) fd.append("propertyImage", await compressImage(propertyImages[propIdx]));
      fd.append("language", language);
      fd.append("tone", "professional");

      const res = await fetch("/api/real-estate-video/generate-script", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Script generation failed");
      setScript(data.script);
      toast.success("Script generated!");
    } catch (err) {
      toast.error("Script generation failed", { description: err.message });
    } finally {
      setGeneratingScript(false);
    }
  }

  // ── Video generation (script → backend handles voice → Veo 3.1) ───────────
  async function handleGenerateVideo() {
    if (!selectedComposite || !script.trim()) return;
    setGenerating(true);
    setVideoStatus("generating");
    setVideoResult(null);

    try {
      const fd = new FormData();
      fd.append("compositeImage", selectedComposite.file);
      fd.append("script", script.trim());
      // No voicePrompt — backend will generate it internally

      const response = await fetch("/api/real-estate-video/generate", { method: "POST", body: fd });
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
            if (event.type === "progress") toast.info(event.message, { id: "video-gen" });
            if (event.type === "video_ready") {
              setVideoStatus("ready");
              setVideoResult({ videoUrl: event.videoUrl });
              toast.success("🏠 Video ready!", { id: "video-gen" });
            }
            if (event.type === "error") {
              toast.error("Generation failed", { description: event.message });
              setVideoStatus("error");
            }
          } catch {}
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Video generation failed", { description: err.message });
      setVideoStatus("error");
    } finally {
      setGenerating(false);
    }
  }

  function reset() {
    setPropertyImages([]);
    setSelectedAvatar(null);
    setUploadedAvatarFile(null);
    setGeneratedAvatars([]);
    setComposites([]);
    setSelectedCompositeIndex(null);
    setScript("");
    setVideoStatus("idle");
    setVideoResult(null);
    setGenerating(false);
    setStep(0);
  }

  const showResults = videoStatus !== "idle";

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-md">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-heading">Real Estate Video</h1>
          <p className="text-sm text-muted-foreground">
            3 steps to a cinematic property showcase — powered by Gemini & Veo 3.1
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex gap-2.5 mb-6">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">1.</strong> Upload properties + pick avatar →{" "}
          <strong className="text-foreground">2.</strong> Choose your best composite →{" "}
          <strong className="text-foreground">3.</strong> Add script & generate!
        </p>
      </div>

      {/* 3 Steps */}
      {!showResults && (
        <div className="flex items-center gap-1 mb-7">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1 flex-1 min-w-0">
              <button
                onClick={() => { if (i < step) setStep(i); }}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full transition-all whitespace-nowrap cursor-pointer ${
                  step === i ? "gradient-bg text-white shadow-md" : i < step ? "bg-primary/10 text-primary" : "text-muted-foreground bg-muted/50"
                }`}
              >
                {i < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : (
                  <span className="w-5 h-5 rounded-full border text-[11px] flex items-center justify-center font-bold">{i + 1}</span>
                )}
                {s}
              </button>
              {i < STEPS.length - 1 && (
                <div className={`h-px flex-1 min-w-3 transition-colors ${i < step ? "bg-primary/40" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* ══════════════ STEP 0: Upload Properties + Pick Avatar ══════════════ */}
      {!showResults && step === 0 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Property Images */}
          <MultiImageUploadBox
            images={propertyImages}
            onAdd={(file) => setPropertyImages((prev) => [...prev, file].slice(0, 3))}
            onRemove={(i) => setPropertyImages((prev) => prev.filter((_, idx) => idx !== i))}
            maxImages={3}
          />

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Choose Your Presenter</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Avatar selection */}
          <div className="space-y-4">
            <div className="flex gap-2">
              {[
                { id: "prebuilt", label: "RE Agents", icon: PersonStanding },
                { id: "upload", label: "Upload", icon: Upload },
                { id: "generate", label: "Create Avatar", icon: Sparkles },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => { setAvatarMode(m.id); setSelectedAvatar(null); }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    avatarMode === m.id ? "gradient-bg text-white shadow-md" : "border border-border hover:border-primary/40 text-muted-foreground"
                  }`}
                >
                  <m.icon className="w-3.5 h-3.5" />
                  {m.label}
                </button>
              ))}
            </div>

            {avatarMode === "prebuilt" && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {RE_AVATARS.map((av) => (
                  <button
                    key={av.id}
                    onClick={() => setSelectedAvatar({ url: av.url, file: null, name: av.name })}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer group ${
                      selectedAvatar?.url === av.url ? "border-primary ring-2 ring-primary/30 scale-105" : "border-border/50 hover:border-primary/50"
                    }`}
                  >
                    <img src={av.url} alt={av.name} className="w-full h-full object-cover" />
                    {selectedAvatar?.url === av.url && (
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[10px] text-white text-center truncate">{av.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {avatarMode === "upload" && (
              <div className="space-y-2">
                {uploadedAvatarFile ? (
                  <div className="relative rounded-xl overflow-hidden border border-border/50 shadow-md bg-card group max-w-[200px]">
                    <img src={URL.createObjectURL(uploadedAvatarFile)} alt="Avatar" className="w-full aspect-square object-cover" />
                    <button
                      onClick={() => { setUploadedAvatarFile(null); setSelectedAvatar(null); }}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div
                      onClick={() => document.getElementById("avatar-upload-input")?.click()}
                      className="border-2 border-dashed border-border/50 rounded-xl p-6 flex flex-col items-center gap-2 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer"
                    >
                      <User className="w-5 h-5 text-primary" />
                      <p className="text-xs text-muted-foreground">Upload a clear photo of the presenter</p>
                      <input id="avatar-upload-input" type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setUploadedAvatarFile(file);
                          setSelectedAvatar({ url: URL.createObjectURL(file), file, name: "Custom" });
                        }
                      }} />
                    </div>
                    <AssetSelector type="avatars" onSelect={async (asset) => {
                      try {
                        const res = await fetch(asset.url);
                        const blob = await res.blob();
                        const file = new File([blob], asset.name, { type: blob.type });
                        setUploadedAvatarFile(file);
                        setSelectedAvatar({ url: URL.createObjectURL(file), file, name: asset.name });
                      } catch (err) { toast.error("Failed to load asset"); }
                    }} />
                  </>
                )}
              </div>
            )}

            {avatarMode === "generate" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">Describe the avatar</Label>
                  <Textarea
                    value={avatarPrompt}
                    onChange={(e) => setAvatarPrompt(e.target.value)}
                    placeholder="e.g., A confident Indian man in his 30s wearing formal business attire, warm professional smile..."
                    className="min-h-[80px] resize-none text-sm"
                    maxLength={500}
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Variants</Label>
                    <div className="flex gap-1.5">
                      {[1, 2, 3].map((n) => (
                        <button
                          key={n}
                          onClick={() => setAvatarVariantCount(n)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            avatarVariantCount === n ? "gradient-bg text-white" : "border border-border text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button onClick={handleGenerateAvatars} disabled={generatingAvatar || avatarPrompt.trim().length < 10} className="gradient-bg text-white shadow-md cursor-pointer mt-4" size="sm">
                    {generatingAvatar ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Generating...</> : <><Sparkles className="w-3.5 h-3.5 mr-1.5" /> Generate</>}
                  </Button>
                </div>
                {generatedAvatars.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    {generatedAvatars.map((av, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          const file = dataUrlToFile(av.url, `avatar-re-${i}.png`);
                          setSelectedAvatar({ url: av.url, file, name: `Generated ${i + 1}` });
                        }}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                          selectedAvatar?.url === av.url ? "border-primary ring-2 ring-primary/30 scale-105" : "border-border/50 hover:border-primary/50"
                        }`}
                      >
                        <img src={av.url} alt={`V${i + 1}`} className="w-full h-full object-cover" />
                        {selectedAvatar?.url === av.url && (
                          <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          </div>
                        )}
                        <Badge className="absolute top-1 left-1 bg-primary/80 text-white text-[8px] px-1 py-0 border-0">V{i + 1}</Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedAvatar && (
              <div className="flex items-center gap-2 pt-1">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span className="text-sm">Presenter: <strong>{selectedAvatar.name}</strong></span>
              </div>
            )}
          </div>

          {/* Next */}
          <div className="flex justify-end">
            <Button onClick={() => { setStep(1); handleGenerateComposites(); }} disabled={!step0Valid} className="gradient-bg text-white shadow-md cursor-pointer px-6">
              Create Composites <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ══════════════ STEP 1: Pick Composite ══════════════ */}
      {!showResults && step === 1 && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Pick Your Best Composite</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Click your favorite — the rest get saved to your <strong>Asset Library</strong> for later.
          </p>

          {generatingComposites && (
            <div className="rounded-xl border-2 border-dashed border-amber-500/30 p-8 flex flex-col items-center gap-3 bg-amber-500/5">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <p className="text-sm text-muted-foreground">Generating composites...</p>
              <p className="text-xs text-muted-foreground">~15-30 seconds each</p>
            </div>
          )}

          {composites.length > 0 && !generatingComposites && (
            <>
              <div className={`grid gap-4 ${composites.length === 1 ? "grid-cols-1 max-w-xs mx-auto" : composites.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                {composites.map((comp, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedCompositeIndex(i)}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer group ${
                      selectedCompositeIndex === i
                        ? "border-primary ring-2 ring-primary/30 scale-[1.02]"
                        : "border-border/50 hover:border-primary/50"
                    }`}
                  >
                    <img src={comp.url} alt={comp.title} className="w-full rounded-xl" />
                    <Badge className="absolute top-2 left-2 bg-black/70 text-white border-0 text-[10px] backdrop-blur-sm">
                      <MapPin className="w-2.5 h-2.5 mr-0.5" /> {comp.title}
                    </Badge>
                    {selectedCompositeIndex === i && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    {selectedCompositeIndex !== null && selectedCompositeIndex !== i && composites.length > 1 && (
                      <div className="absolute bottom-2 right-2 opacity-80">
                        <Badge variant="outline" className="text-[9px] bg-black/50 text-white border-white/20 backdrop-blur-sm">
                          <Save className="w-2.5 h-2.5 mr-0.5" /> Saved to Library
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-center">
                <Button variant="outline" size="sm" onClick={handleGenerateComposites} disabled={generatingComposites} className="cursor-pointer text-xs">
                  <RotateCcw className="w-3 h-3 mr-1" /> Regenerate All
                </Button>
              </div>
            </>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(0)} className="cursor-pointer">Back</Button>
            <Button onClick={handleCompositeNext} disabled={!step1Valid || savingComposites} className="gradient-bg text-white shadow-md cursor-pointer">
              {savingComposites ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Saving...</> : <>Next: Script & Generate <ChevronRight className="w-4 h-4 ml-1" /></>}
            </Button>
          </div>
        </div>
      )}

      {/* ══════════════ STEP 2: Script + Generate ══════════════ */}
      {!showResults && step === 2 && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Script & Generate</span>
          </div>

          {/* Composite preview */}
          {selectedComposite && (
            <div className="flex items-center gap-3 rounded-xl border border-border/50 p-2 bg-card/50">
              <img src={selectedComposite.url} alt="Selected" className="w-14 h-20 rounded-lg object-cover border border-border" />
              <div>
                <p className="text-xs font-semibold">{selectedComposite.title}</p>
                <p className="text-[10px] text-muted-foreground">Selected for video</p>
              </div>
            </div>
          )}

          {/* Language */}
          <div className="flex gap-2">
            {LANGUAGES.map((l) => (
              <button
                key={l.id}
                onClick={() => setLanguage(l.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  language === l.id ? "gradient-bg text-white" : "border border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Script */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs">What should the presenter say?</Label>
              <span className={`text-xs font-mono ${script.length > MAX_SCRIPT ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                {script.length}/{MAX_SCRIPT}
              </span>
            </div>
            <Textarea
              value={script}
              onChange={(e) => setScript(e.target.value.slice(0, MAX_SCRIPT))}
              placeholder="Describe the property highlights or let AI write for you..."
              className="min-h-[100px] resize-none text-sm"
              maxLength={MAX_SCRIPT}
            />
            <Button variant="outline" size="sm" onClick={handleGenerateScript} disabled={generatingScript} className="cursor-pointer text-xs">
              {generatingScript ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <PenLine className="w-3 h-3 mr-1" />}
              ✨ AI Write Script
            </Button>
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)} className="cursor-pointer">Back</Button>
            <Button onClick={handleGenerateVideo} disabled={!step2Valid || generating} className="gradient-bg text-white shadow-md cursor-pointer px-8">
              {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4 mr-2" /> Generate Video</>}
            </Button>
          </div>
        </div>
      )}

      {/* ══════════════ RESULTS ══════════════ */}
      {showResults && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">
              {videoStatus === "ready" ? "✅ Your property video is ready!" : videoStatus === "error" ? "❌ Generation failed" : "🏠 Creating your property showcase..."}
            </h2>
            {(videoStatus === "ready" || videoStatus === "error") && (
              <Button variant="outline" size="sm" onClick={reset} className="cursor-pointer text-xs">Start over</Button>
            )}
          </div>

          <VideoCard status={videoStatus} video={videoResult} />

          {videoStatus === "ready" && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
              <p className="text-sm font-medium">🏠 Property showcase video generated!</p>
              <p className="text-xs text-muted-foreground mt-1">Auto-saved to your Asset Library.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AIWalkthroughPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <RealEstateVideoContent />
    </Suspense>
  );
}
