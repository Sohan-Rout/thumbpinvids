"use client";
import { useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import MultiImageUploadBox from "@/modules/realEstate/multiImageUpload";
import VideoCard from "@/modules/realEstate/videoCard";
import { PersonStanding, Upload, X, User, FileText, Sparkles, Loader2, CheckCircle2, ChevronRight, Info, Download, RotateCcw, PenLine, Layers, Check, MapPin, Building2, Film, Minus, Plus, Merge } from "lucide-react";
import { AssetSelector } from "@/components/dashboard/asset-selector";
import { combineVideos, uploadCombinedVideo } from "@/lib/video-combiner";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";

const MAX_SCRIPT = 200;

const RE_AVATARS = Array.from({ length: 14 }, (_, i) => ({
  id: `re-${i + 1}`,
  name: `RE Agent ${i + 1}`,
  url: `/avatars/re/realestate${i + 1}.png`,
}));

const LANGUAGES = [
  { id: "english", label: "English" },
  { id: "hindi", label: "Hindi" },
  { id: "hinglish", label: "Hinglish" },
];

const TONES = [
  { id: "professional", label: "Professional" },
  { id: "luxury", label: "Luxury" },
  { id: "casual", label: "Casual" },
  { id: "energetic", label: "Energetic" },
  { id: "storytelling", label: "Storytelling" },
  { id: "urgent", label: "Urgent" },
  { id: "aspirational", label: "Aspirational" },
];

// ─── Interactive Questionnaire Presets ────────────────────────────────────────
const PROPERTY_TYPES = [
  "1 BHK Apartment",
  "2 BHK Apartment",
  "3 BHK Apartment",
  "4 BHK Apartment",
  "Villa",
  "Penthouse",
  "Studio",
  "Independent House",
  "Plot",
  "Farmhouse",
  "Commercial Space",
  "Row House",
  "Duplex",
];

const PRICE_RANGES = [
  { id: "30-50L", label: "₹30-50L" },
  { id: "50L-1Cr", label: "₹50L-1Cr" },
  { id: "1-2Cr", label: "₹1-2Cr" },
  { id: "2-5Cr", label: "₹2-5Cr" },
  { id: "5Cr+", label: "₹5Cr+" },
  { id: "custom", label: "Custom" },
];

const KEY_FEATURES = [
  "Modular Kitchen",
  "Floor-to-Ceiling Windows",
  "Park View",
  "Balcony",
  "Smart Home",
  "Italian Marble",
  "Walk-in Closet",
  "Home Office",
  "Servant Room",
  "Pooja Room",
  "City View",
  "Open Kitchen",
  "French Windows",
  "Wooden Flooring",
  "Designer Bathroom",
];

const AMENITIES = [
  { id: "pool", label: "Pool", emoji: "🏊" },
  { id: "gym", label: "Gym", emoji: "🏋️" },
  { id: "clubhouse", label: "Clubhouse", emoji: "🎾" },
  { id: "parking", label: "Parking", emoji: "🅿️" },
  { id: "garden", label: "Garden", emoji: "🌳" },
  { id: "security", label: "24/7 Security", emoji: "🛡️" },
  { id: "jogging", label: "Jogging Track", emoji: "🏃" },
  { id: "playground", label: "Kids Play Area", emoji: "🎪" },
  { id: "power", label: "Power Backup", emoji: "⚡" },
  { id: "lift", label: "Lift", emoji: "🛗" },
  { id: "intercom", label: "Intercom", emoji: "📞" },
  { id: "cctv", label: "CCTV", emoji: "📷" },
];

const FURNISHING_OPTIONS = ["Unfurnished", "Semi-Furnished", "Fully Furnished"];
const FACING_OPTIONS = [
  "North",
  "South",
  "East",
  "West",
  "NE",
  "NW",
  "SE",
  "SW",
];
const FLOOR_OPTIONS = [
  "Ground",
  "1-5",
  "6-10",
  "11-20",
  "20+",
  "Top Floor",
  "Duplex",
];

const STORAGE_KEY = "re_walkthrough_state";

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
          if (width > maxDimension) {
            height *= maxDimension / width;
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width *= maxDimension / height;
            height = maxDimension;
          }
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) =>
            resolve(
              new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              }),
            ),
          "image/jpeg",
          quality,
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

// ─── Video Result Card ───────────────────────────────────────────────────────

// ─── Main 3-Step Page ────────────────────────────────────────────────────────
const STEPS = ["Details & Avatar", "Pick Composite", "Script & Generate"];

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
  const [lightboxUrl, setLightboxUrl] = useState(null); // avatar expand lightbox
  const [propertyDrawerOpen, setPropertyDrawerOpen] = useState(false);

  // Step 1: Composites (multi-select)
  const [composites, setComposites] = useState([]);
  const [generatingComposites, setGeneratingComposites] = useState(false);
  const [selectedCompositeIndices, setSelectedCompositeIndices] = useState(
    new Set(),
  );
  const [savingComposites, setSavingComposites] = useState(false);

  // Property brief (interactive questionnaire — moved to step 0)
  const [propertyBrief, setPropertyBrief] = useState({
    location: "",
    propertyType: "",
    price: "",
    priceRange: "",
    bedrooms: 2,
    bathrooms: 2,
    area: "",
    selectedFeatures: [],
    selectedAmenities: [],
    furnishing: "",
    facing: "",
    floor: "",
    keyFeatures: "",
    amenities: "",
  });

  // Step 2: Script + Generate (voice is backend-only)
  const [script, setScript] = useState("");
  const [batchScripts, setBatchScripts] = useState([]);
  const [language, setLanguage] = useState("english");
  const [scriptTone, setScriptTone] = useState("professional");
  const [allowEmotionTags, setAllowEmotionTags] = useState(true);
  const [generatingScript, setGeneratingScript] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [videoStatuses, setVideoStatuses] = useState([]);
  const [videoResults, setVideoResults] = useState([]);

  // Combine state
  const [combining, setCombining] = useState(false);
  const [combineProgress, setCombineProgress] = useState("");
  const [combinedVideo, setCombinedVideo] = useState(null); // { blobUrl, serverUrl }

  // ── Restore state from localStorage ──────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.step !== undefined) setStep(s.step);
        if (s.language) setLanguage(s.language);
        if (s.scriptTone) setScriptTone(s.scriptTone);
        if (typeof s.allowEmotionTags === "boolean")
          setAllowEmotionTags(s.allowEmotionTags);
        if (s.propertyBrief) setPropertyBrief(s.propertyBrief);
        if (s.script) setScript(s.script);
        if (s.avatarMode) setAvatarMode(s.avatarMode);
      }
    } catch {}
    if (initialScript) {
      setScript(initialScript);
      setStep(2);
    }
  }, [initialScript]);

  // ── Persist state to localStorage on change ───────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          step,
          language,
          scriptTone,
          allowEmotionTags,
          propertyBrief,
          script,
          avatarMode,
        }),
      );
    } catch {}
  }, [
    step,
    language,
    scriptTone,
    allowEmotionTags,
    propertyBrief,
    script,
    avatarMode,
  ]);

  const selectedCompositeArray = [...selectedCompositeIndices]
    .sort()
    .map((i) => composites[i])
    .filter(Boolean);
  const isBatchMode = selectedCompositeIndices.size > 1;

  // Toggle composite selection
  function toggleComposite(i) {
    setSelectedCompositeIndices((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }
  function selectAllComposites() {
    if (selectedCompositeIndices.size === composites.length)
      setSelectedCompositeIndices(new Set());
    else setSelectedCompositeIndices(new Set(composites.map((_, i) => i)));
  }

  // Batch credit calculation
  const batchSize = selectedCompositeIndices.size;
  const perVideoCost = 3;
  const totalFullPrice = batchSize * perVideoCost;
  const discountedTotal =
    batchSize <= 1
      ? perVideoCost
      : batchSize === 2
        ? 5
        : Math.round(batchSize * perVideoCost * 0.75);
  const savings = totalFullPrice - discountedTotal;

  // Validity
  const step0Valid = propertyImages.length >= 1 && !!selectedAvatar;
  const step1Valid = selectedCompositeIndices.size >= 1;
  const step2Valid = isBatchMode
    ? batchScripts.length === batchSize &&
      batchScripts.every((s) => s.trim().length >= 15)
    : script.trim().length >= 15;

  // ── Avatar generation ──────────────────────────────────────────────────────
  async function handleGenerateAvatars() {
    if (!avatarPrompt.trim() || avatarPrompt.trim().length < 10) return;
    setGeneratingAvatar(true);
    setGeneratedAvatars([]);
    try {
      const res = await fetch("/api/product-video/generate-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: avatarPrompt.trim(),
          variants: avatarVariantCount,
        }),
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
    setSelectedCompositeIndices(new Set());
    setBatchScripts([]);
    try {
      let avatarFile;
      if (selectedAvatar.file) {
        avatarFile = await compressImage(selectedAvatar.file);
      } else {
        const res = await fetch(selectedAvatar.url);
        const blob = await res.blob();
        avatarFile = await compressImage(
          new File([blob], "avatar.png", { type: blob.type }),
        );
      }

      const results = [];
      for (let i = 0; i < propertyImages.length; i++) {
        toast.info(`Creating composite ${i + 1}/${propertyImages.length}...`, {
          id: "composite-progress",
        });
        const compressedProperty = await compressImage(propertyImages[i]);
        const fd = new FormData();
        fd.append("avatarImage", avatarFile);
        fd.append("propertyImage", compressedProperty);

        const res = await fetch("/api/real-estate-video/composite", {
          method: "POST",
          body: fd,
        });
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
      toast.success(
        `${results.length} composite(s) ready — select your favorites!`,
        { id: "composite-progress" },
      );
      if (results.length === 1) setSelectedCompositeIndices(new Set([0]));
    } catch (err) {
      toast.error("Composite generation failed", { description: err.message });
    } finally {
      setGeneratingComposites(false);
    }
  }

  // ── Save unused composites to Asset Library ────────────────────────────────
  async function saveUnusedComposites() {
    const unselected = composites.filter(
      (_, i) => !selectedCompositeIndices.has(i),
    );
    if (unselected.length === 0) return;
    setSavingComposites(true);
    try {
      const payload = {
        composites: composites.map((c) => ({ dataUrl: c.url, name: c.title })),
        selectedIndex: [...selectedCompositeIndices][0] ?? 0,
      };
      const res = await fetch("/api/real-estate-video/save-composites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.saved?.length > 0) {
        toast.success(
          `${data.saved.length} composite(s) saved to Asset Library`,
        );
      }
    } catch (err) {
      console.error("Failed to save composites:", err);
    } finally {
      setSavingComposites(false);
    }
  }

  // ── Proceed from composite pick → script ───────────────────────────────────
  async function handleCompositeNext() {
    if (selectedCompositeIndices.size === 0) return;
    saveUnusedComposites(); // background
    setStep(2);
  }

  // ── Script generation (single + batch) ─────────────────────────────────────
  async function handleGenerateScript() {
    if (selectedCompositeArray.length === 0) return;
    setGeneratingScript(true);
    try {
      const fd = new FormData();
      // Build brief with combined features/amenities
      const enrichedBrief = {
        ...propertyBrief,
        keyFeatures: [
          ...(propertyBrief.selectedFeatures || []),
          propertyBrief.keyFeatures,
        ]
          .filter(Boolean)
          .join(", "),
        amenities: [
          ...(propertyBrief.selectedAmenities || [])
            .map((id) => AMENITIES.find((a) => a.id === id)?.label)
            .filter(Boolean),
          propertyBrief.amenities,
        ]
          .filter(Boolean)
          .join(", "),
      };
      fd.append("propertyBrief", JSON.stringify(enrichedBrief));
      fd.append("language", language);
      fd.append("tone", scriptTone);
      fd.append("allowEmotionTags", String(allowEmotionTags));

      if (isBatchMode) {
        fd.append("compositeCount", String(selectedCompositeArray.length));
        for (let i = 0; i < selectedCompositeArray.length; i++) {
          fd.append(`compositeImage_${i}`, selectedCompositeArray[i].file);
          const propIdx = selectedCompositeArray[i].propertyIndex ?? 0;
          if (propertyImages[propIdx])
            fd.append(
              `propertyImage_${i}`,
              await compressImage(propertyImages[propIdx]),
            );
        }
        const res = await fetch("/api/real-estate-video/generate-script", {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Script generation failed");
        setBatchScripts(data.scripts || []);
        toast.success(
          `${data.scripts?.length || 0} continuation scripts generated!`,
        );
      } else {
        fd.append("compositeImage", selectedCompositeArray[0].file);
        const propIdx = selectedCompositeArray[0].propertyIndex ?? 0;
        if (propertyImages[propIdx])
          fd.append(
            "propertyImage",
            await compressImage(propertyImages[propIdx]),
          );
        const res = await fetch("/api/real-estate-video/generate-script", {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Script generation failed");
        setScript(data.script);
        toast.success("Script generated!");
      }
    } catch (err) {
      toast.error("Script generation failed", { description: err.message });
    } finally {
      setGeneratingScript(false);
    }
  }

  // ── Single video generation via SSE ────────────────────────────────────────
  async function generateSingleVideo(composite, scriptText, videoIndex) {
    const fd = new FormData();
    fd.append("compositeImage", composite.file);
    fd.append("script", scriptText.trim());

    const response = await fetch("/api/real-estate-video/generate", {
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
          if (event.type === "progress")
            toast.info(event.message, { id: `video-gen-${videoIndex}` });
          if (event.type === "video_ready") {
            setVideoStatuses((prev) => {
              const n = [...prev];
              n[videoIndex] = "ready";
              return n;
            });
            setVideoResults((prev) => {
              const n = [...prev];
              n[videoIndex] = { videoUrl: event.videoUrl };
              return n;
            });
            toast.success(`🏠 Video ${videoIndex + 1} ready!`, {
              id: `video-gen-${videoIndex}`,
            });
          }
          if (event.type === "error") {
            setVideoStatuses((prev) => {
              const n = [...prev];
              n[videoIndex] = "error";
              return n;
            });
            toast.error(`Video ${videoIndex + 1} failed`, {
              description: event.message,
            });
          }
        } catch {}
      }
    }
  }

  // ── Video generation (supports batch — sequential) ─────────────────────────
  async function handleGenerateVideo() {
    const comps = selectedCompositeArray;
    const scripts = isBatchMode ? batchScripts : [script];
    if (comps.length === 0 || scripts.some((s) => !s?.trim())) return;

    setGenerating(true);
    setVideoStatuses(comps.map(() => "generating"));
    setVideoResults(comps.map(() => null));

    for (let i = 0; i < comps.length; i++) {
      try {
        await generateSingleVideo(comps[i], scripts[i], i);
      } catch (err) {
        console.error(`Video ${i + 1} error:`, err);
        setVideoStatuses((prev) => {
          const n = [...prev];
          n[i] = "error";
          return n;
        });
        toast.error(`Video ${i + 1} failed`, { description: err.message });
      }
    }
    setGenerating(false);
  }

  // ── Combine batch videos (client-side FFmpeg WASM) ─────────────────────────
  async function handleCombineVideos() {
    const readyUrls = videoResults
      .filter(Boolean)
      .map((r) => r.videoUrl)
      .filter(Boolean);
    if (readyUrls.length < 2) return;

    setCombining(true);
    setCombineProgress("Initializing...");
    setCombinedVideo(null);

    try {
      const { blobUrl, blob } = await combineVideos(readyUrls, {
        crossfadeDuration: 0.5,
        onProgress: (msg) => setCombineProgress(msg),
      });

      setCombinedVideo({ blobUrl, serverUrl: null });
      toast.success("Videos combined successfully!");

      // Upload to server for permanent storage
      setCombineProgress("Uploading to server...");
      try {
        const { url } = await uploadCombinedVideo(blob);
        setCombinedVideo((prev) => ({ ...prev, serverUrl: url }));
        toast.success("Combined video saved to Asset Library!");
      } catch (uploadErr) {
        console.error("Upload failed:", uploadErr);
        toast.error(
          "Upload failed — you can still download the video locally.",
        );
      }
    } catch (err) {
      console.error("Combine failed:", err);
      toast.error("Video combining failed", { description: err.message });
    } finally {
      setCombining(false);
      setCombineProgress("");
    }
  }

  function reset() {
    setPropertyImages([]);
    setSelectedAvatar(null);
    setUploadedAvatarFile(null);
    setGeneratedAvatars([]);
    setComposites([]);
    setSelectedCompositeIndices(new Set());
    setScript("");
    setBatchScripts([]);
    setVideoStatuses([]);
    setVideoResults([]);
    setCombinedVideo(null);
    setCombining(false);
    setGenerating(false);
    setStep(0);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  const showResults =
    videoStatuses.length > 0 && videoStatuses.some((s) => s !== "idle");

  return (
    <div className="max-w-2xl mx-auto py-2 px-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-md">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-heading">Real Estate Video</h1>
          <p className="text-sm text-muted-foreground">
            3 steps to a cinematic property showcase
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex gap-2.5 mb-6">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">1.</strong> Upload properties &
          pick avatar → <strong className="text-foreground">2.</strong> Choose
          your best composite → <strong className="text-foreground">3.</strong>{" "}
          Add script & generate!
        </p>
      </div>

      {/* 3 Steps */}
      {!showResults && (
        <div className="flex items-center gap-1 mb-7">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1 flex-1 min-w-0">
              <button
                onClick={() => {
                  if (i < step) setStep(i);
                }}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full transition-all whitespace-nowrap cursor-pointer ${
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
                  <span className="w-5 h-5 rounded-full border text-[11px] flex items-center justify-center font-bold">
                    {i + 1}
                  </span>
                )}
                {s}
              </button>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-px flex-1 min-w-3 transition-colors ${i < step ? "bg-primary/40" : "bg-border"}`}
                />
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
            onAdd={(file) =>
              setPropertyImages((prev) => [...prev, file].slice(0, 3))
            }
            onRemove={(i) =>
              setPropertyImages((prev) => prev.filter((_, idx) => idx !== i))
            }
            maxImages={3}
          />

          {/* ── Property Details — Drawer Trigger ── */}
          {(() => {
            const filledCount = [
              propertyBrief.location,
              propertyBrief.propertyType,
              propertyBrief.price || propertyBrief.priceRange,
              propertyBrief.area,
              propertyBrief.furnishing,
              propertyBrief.facing,
              propertyBrief.floor,
              propertyBrief.selectedFeatures?.length > 0,
              propertyBrief.selectedAmenities?.length > 0,
            ].filter(Boolean).length;
            return (
              <button
                onClick={() => setPropertyDrawerOpen(true)}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border border-gray-200 bg-black hover:bg-neutral-900 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm text-neutral-200">
                    Property Details
                  </span>
                  <span className="text-sm text-neutral-400 font-medium">
                    (optional)
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {filledCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-100 border border-gray-100 text-[10px] font-bold text-gray-700 uppercase tracking-wide">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-900" />
                      {filledCount} filled
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-neutral-400 transition-colors" />
                </div>
              </button>
            );
          })()}

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
              Choose Your Presenter
            </span>
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
                  onClick={() => {
                    setAvatarMode(m.id);
                    setSelectedAvatar(null);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    avatarMode === m.id
                      ? "gradient-bg text-white shadow-md"
                      : "border border-border hover:border-primary/40 text-muted-foreground"
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
                  <div
                    key={av.id}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all group ${
                      selectedAvatar?.url === av.url
                        ? "border-primary ring-2 ring-primary/30 scale-105"
                        : "border-border/50 hover:border-primary/50"
                    }`}
                  >
                    <img
                      src={av.url}
                      alt={av.name}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() =>
                        setSelectedAvatar({
                          url: av.url,
                          file: null,
                          name: av.name,
                        })
                      }
                    />
                    {/* Expand button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxUrl(av.url);
                      }}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full items-center justify-center hidden group-hover:flex transition-all cursor-pointer"
                      title="Expand"
                    >
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                        />
                      </svg>
                    </button>
                    {selectedAvatar?.url === av.url && (
                      <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[10px] text-white text-center truncate">
                        {av.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {avatarMode === "upload" && (
              <div className="space-y-2">
                {uploadedAvatarFile ? (
                  <div className="relative rounded-xl overflow-hidden border border-border/50 shadow-md bg-card group max-w-[200px]">
                    <img
                      src={URL.createObjectURL(uploadedAvatarFile)}
                      alt="Avatar"
                      className="w-full aspect-square object-cover"
                    />
                    <button
                      onClick={() => {
                        setUploadedAvatarFile(null);
                        setSelectedAvatar(null);
                      }}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div
                      onClick={() =>
                        document.getElementById("avatar-upload-input")?.click()
                      }
                      className="border-2 border-dashed border-border/50 rounded-xl p-6 flex flex-col items-center gap-2 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer"
                    >
                      <User className="w-5 h-5 text-primary" />
                      <p className="text-xs text-muted-foreground">
                        Upload a clear photo of the presenter
                      </p>
                      <input
                        id="avatar-upload-input"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setUploadedAvatarFile(file);
                            setSelectedAvatar({
                              url: URL.createObjectURL(file),
                              file,
                              name: "Custom",
                            });
                          }
                        }}
                      />
                    </div>
                    <AssetSelector
                      type="avatars"
                      onSelect={async (asset) => {
                        try {
                          const res = await fetch(asset.url);
                          const blob = await res.blob();
                          const file = new File([blob], asset.name, {
                            type: blob.type,
                          });
                          setUploadedAvatarFile(file);
                          setSelectedAvatar({
                            url: URL.createObjectURL(file),
                            file,
                            name: asset.name,
                          });
                        } catch (err) {
                          toast.error("Failed to load asset");
                        }
                      }}
                    />
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
                            avatarVariantCount === n
                              ? "gradient-bg text-white"
                              : "border border-border text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button
                    onClick={handleGenerateAvatars}
                    disabled={
                      generatingAvatar || avatarPrompt.trim().length < 10
                    }
                    className="gradient-bg text-white shadow-md cursor-pointer mt-4"
                    size="sm"
                  >
                    {generatingAvatar ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />{" "}
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Generate
                      </>
                    )}
                  </Button>
                </div>
                {generatedAvatars.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    {generatedAvatars.map((av, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          const file = dataUrlToFile(
                            av.url,
                            `avatar-re-${i}.png`,
                          );
                          setSelectedAvatar({
                            url: av.url,
                            file,
                            name: `Generated ${i + 1}`,
                          });
                        }}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                          selectedAvatar?.url === av.url
                            ? "border-primary ring-2 ring-primary/30 scale-105"
                            : "border-border/50 hover:border-primary/50"
                        }`}
                      >
                        <img
                          src={av.url}
                          alt={`V${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {selectedAvatar?.url === av.url && (
                          <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          </div>
                        )}
                        <Badge className="absolute top-1 left-1 bg-primary/80 text-white text-[8px] px-1 py-0 border-0">
                          V{i + 1}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedAvatar && (
              <div className="flex items-center gap-2 pt-1">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span className="text-sm">
                  Presenter: <strong>{selectedAvatar.name}</strong>
                </span>
              </div>
            )}
          </div>
          <Sheet open={propertyDrawerOpen} onOpenChange={setPropertyDrawerOpen}>
            <SheetContent
              side="right"
              className="overflow-y-auto w-full bg-white border-l border-gray-100 p-0 shadow-2xl sm:max-w-md [&>button]:hidden"
            >
              <div className="flex h-full flex-col">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-900">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <SheetTitle className="text-base font-semibold text-gray-900">
                      Property Details
                    </SheetTitle>
                  </div>
                  <button
                    onClick={() => setPropertyDrawerOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                  <SheetDescription className="px-0 pb-2 text-xs font-normal text-gray-500 leading-relaxed">
                    Every field is optional. This helps the our agent write a
                    more relevant script for your specific needs.
                  </SheetDescription>

                  {/* Location */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-900">
                      Location
                    </Label>
                    <input
                      className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 transition-all"
                      placeholder="e.g., Gurgaon Sector 49, Mumbai Bandra West"
                      value={propertyBrief.location}
                      onChange={(e) =>
                        setPropertyBrief((p) => ({
                          ...p,
                          location: e.target.value,
                        }))
                      }
                    />
                  </div>

                  {/* Property Type */}
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold text-gray-900">
                      Property Type
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {PROPERTY_TYPES.map((pt) => (
                        <button
                          key={pt}
                          onClick={() =>
                            setPropertyBrief((p) => ({
                              ...p,
                              propertyType: p.propertyType === pt ? "" : pt,
                            }))
                          }
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                            propertyBrief.propertyType === pt
                              ? "border-gray-900 bg-gray-900 text-white shadow-sm"
                              : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {pt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price Range */}
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold text-gray-900">
                      Price Range
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {PRICE_RANGES.map((pr) => (
                        <button
                          key={pr.id}
                          onClick={() => {
                            if (pr.id === "custom")
                              setPropertyBrief((p) => ({
                                ...p,
                                priceRange: "custom",
                              }));
                            else
                              setPropertyBrief((p) => ({
                                ...p,
                                priceRange: p.priceRange === pr.id ? "" : pr.id,
                                price: pr.label,
                              }));
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                            propertyBrief.priceRange === pr.id
                              ? "border-gray-900 bg-gray-900 text-white shadow-sm"
                              : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {pr.label}
                        </button>
                      ))}
                    </div>
                    {propertyBrief.priceRange === "custom" && (
                      <input
                        className="mt-2 flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 transition-all"
                        placeholder="Enter custom price (e.g., ₹95 Lakhs)"
                        value={propertyBrief.price}
                        onChange={(e) =>
                          setPropertyBrief((p) => ({
                            ...p,
                            price: e.target.value,
                          }))
                        }
                      />
                    )}
                  </div>

                  {/* Bed + Bath Steppers */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-gray-900">
                        Bedrooms
                      </Label>
                      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
                        <button
                          onClick={() =>
                            setPropertyBrief((p) => ({
                              ...p,
                              bedrooms: Math.max(0, p.bedrooms - 1),
                            }))
                          }
                          disabled={propertyBrief.bedrooms <= 0}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-[1.5rem] text-center text-sm font-semibold text-gray-900">
                          {propertyBrief.bedrooms}
                        </span>
                        <button
                          onClick={() =>
                            setPropertyBrief((p) => ({
                              ...p,
                              bedrooms: Math.min(10, p.bedrooms + 1),
                            }))
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-gray-900">
                        Bathrooms
                      </Label>
                      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
                        <button
                          onClick={() =>
                            setPropertyBrief((p) => ({
                              ...p,
                              bathrooms: Math.max(0, p.bathrooms - 1),
                            }))
                          }
                          disabled={propertyBrief.bathrooms <= 0}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-[1.5rem] text-center text-sm font-semibold text-gray-900">
                          {propertyBrief.bathrooms}
                        </span>
                        <button
                          onClick={() =>
                            setPropertyBrief((p) => ({
                              ...p,
                              bathrooms: Math.min(10, p.bathrooms + 1),
                            }))
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Area */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-900">
                      Area / Size
                    </Label>
                    <input
                      className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 transition-all"
                      placeholder="e.g., 1650 sq ft"
                      value={propertyBrief.area}
                      onChange={(e) =>
                        setPropertyBrief((p) => ({
                          ...p,
                          area: e.target.value,
                        }))
                      }
                    />
                  </div>

                  {/* Furnishing */}
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold text-gray-900">
                      Furnishing
                    </Label>
                    <div className="flex gap-2">
                      {FURNISHING_OPTIONS.map((f) => (
                        <button
                          key={f}
                          onClick={() =>
                            setPropertyBrief((p) => ({
                              ...p,
                              furnishing: p.furnishing === f ? "" : f,
                            }))
                          }
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                            propertyBrief.furnishing === f
                              ? "border-gray-900 bg-gray-900 text-white shadow-sm"
                              : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Facing */}
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold text-gray-900">
                      Facing Direction
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {FACING_OPTIONS.map((dir) => (
                        <button
                          key={dir}
                          onClick={() =>
                            setPropertyBrief((p) => ({
                              ...p,
                              facing: p.facing === dir ? "" : dir,
                            }))
                          }
                          className={`h-10 w-10 rounded-lg border text-xs font-bold transition-all flex items-center justify-center ${
                            propertyBrief.facing === dir
                              ? "border-gray-900 bg-gray-900 text-white shadow-sm"
                              : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {dir}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Floor */}
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold text-gray-900">
                      Floor
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {FLOOR_OPTIONS.map((fl) => (
                        <button
                          key={fl}
                          onClick={() =>
                            setPropertyBrief((p) => ({
                              ...p,
                              floor: p.floor === fl ? "" : fl,
                            }))
                          }
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                            propertyBrief.floor === fl
                              ? "border-gray-900 bg-gray-900 text-white shadow-sm"
                              : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {fl}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Key Features */}
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold text-gray-900">
                      Key Features{" "}
                      <span className="font-normal text-gray-400">
                        (select all that apply)
                      </span>
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {KEY_FEATURES.map((feat) => {
                        const isOn =
                          propertyBrief.selectedFeatures?.includes(feat);
                        return (
                          <button
                            key={feat}
                            onClick={() =>
                              setPropertyBrief((p) => ({
                                ...p,
                                selectedFeatures: isOn
                                  ? p.selectedFeatures.filter((f) => f !== feat)
                                  : [...(p.selectedFeatures || []), feat],
                              }))
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-1.5 ${
                              isOn
                                ? "border-gray-900 bg-gray-50 text-gray-900"
                                : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            {isOn && (
                              <div className="h-1 w-1 rounded-full bg-gray-900" />
                            )}{" "}
                            {feat}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Amenities */}
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold text-gray-900">
                      Amenities
                    </Label>
                    <div className="grid grid-cols-4 gap-2">
                      {AMENITIES.map((am) => {
                        const isOn = propertyBrief.selectedAmenities?.includes(
                          am.id,
                        );
                        return (
                          <button
                            key={am.id}
                            onClick={() =>
                              setPropertyBrief((p) => ({
                                ...p,
                                selectedAmenities: isOn
                                  ? p.selectedAmenities.filter(
                                      (a) => a !== am.id,
                                    )
                                  : [...(p.selectedAmenities || []), am.id],
                              }))
                            }
                            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer ${
                              isOn
                                ? "border-gray-900 bg-gray-50 text-gray-900 shadow-sm"
                                : "border-gray-100 bg-white text-gray-400 hover:border-gray-200 hover:text-gray-600"
                            }`}
                          >
                            <span className="text-lg">{am.emoji}</span>
                            <span className="truncate w-full text-center text-[10px] leading-tight">
                              {am.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Sticky Footer */}
                <div className="border-t border-gray-100 p-6 pb-8">
                  <Button
                    onClick={() => setPropertyDrawerOpen(false)}
                    className="w-full h-11 bg-gray-900 text-white font-medium text-sm hover:bg-gray-800 rounded-xl shadow-lg shadow-gray-900/10 transition-all"
                  >
                    Done
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Next */}
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setStep(1);
                handleGenerateComposites();
              }}
              disabled={!step0Valid}
              className="gradient-bg text-white shadow-md cursor-pointer px-6"
            >
              Create Composites <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setLightboxUrl(null)}
        >
          <div
            className="relative max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxUrl}
              alt="Avatar preview"
              className="w-full rounded-2xl shadow-2xl border border-white/10"
            />
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute top-3 right-3 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════ STEP 1: Pick Composites (Multi-Select) ══════════════ */}
      {!showResults && step === 1 && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Select Composites</span>
            {composites.length > 1 && (
              <Badge variant="outline" className="text-[10px] ml-auto">
                {selectedCompositeIndices.size}/{composites.length} selected
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Select <strong>one or more</strong> composites to generate videos
            for. Multiple selections = batch walkthrough with continuation
            scripts!
          </p>

          {generatingComposites && (
            <div className="rounded-xl border-2 border-dashed border-amber-500/30 p-8 flex flex-col items-center gap-3 bg-amber-500/5">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <p className="text-sm text-muted-foreground">
                Generating composites...
              </p>
              <p className="text-xs text-muted-foreground">
                ~15-30 seconds each
              </p>
            </div>
          )}

          {composites.length > 0 && !generatingComposites && (
            <>
              {/* Select All toggle */}
              {composites.length > 1 && (
                <button
                  onClick={selectAllComposites}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    selectedCompositeIndices.size === composites.length
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "border border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {selectedCompositeIndices.size === composites.length
                    ? "✓ All Selected"
                    : "Select All"}
                </button>
              )}

              <div
                className={`grid gap-4 ${composites.length === 1 ? "grid-cols-1 max-w-xs mx-auto" : composites.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}
              >
                {composites.map((comp, i) => {
                  const isSelected = selectedCompositeIndices.has(i);
                  return (
                    <div
                      key={i}
                      onClick={() => toggleComposite(i)}
                      className={`relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer group ${
                        isSelected
                          ? "border-primary ring-2 ring-primary/30 scale-[1.02]"
                          : "border-border/50 hover:border-primary/50"
                      }`}
                    >
                      <img
                        src={comp.url}
                        alt={comp.title}
                        className="w-full rounded-xl"
                      />
                      <Badge className="absolute top-2 left-2 bg-black/70 text-white border-0 text-[10px] backdrop-blur-sm">
                        <MapPin className="w-2.5 h-2.5 mr-0.5" /> {comp.title}
                      </Badge>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Batch pricing banner */}
              {selectedCompositeIndices.size > 1 && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-center gap-3">
                  <span className="text-lg">🎬</span>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      Batch Walkthrough — {batchSize} videos
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {savings > 0 ? (
                        <>
                          <span className="line-through mr-1">
                            {totalFullPrice} credits
                          </span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {discountedTotal} credits
                          </span>
                          <span className="ml-1 text-emerald-600 dark:text-emerald-400">
                            (save {savings}!)
                          </span>
                        </>
                      ) : (
                        <span>{discountedTotal} credits</span>
                      )}
                      {" · "}Continuation-style narrative scripts
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateComposites}
                  disabled={generatingComposites}
                  className="cursor-pointer text-xs"
                >
                  <RotateCcw className="w-3 h-3 mr-1" /> Regenerate All
                </Button>
              </div>
            </>
          )}

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setStep(0)}
              className="cursor-pointer"
            >
              Back
            </Button>
            <Button
              onClick={handleCompositeNext}
              disabled={!step1Valid || savingComposites}
              className="gradient-bg text-white shadow-md cursor-pointer"
            >
              {savingComposites ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  Next: Script & Generate{" "}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
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
            {isBatchMode && (
              <Badge className="gradient-bg text-white border-0 text-[10px]">
                Batch · {batchSize} videos
              </Badge>
            )}
          </div>

          {/* Selected composites preview strip */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {selectedCompositeArray.map((comp, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-xl border border-border/50 p-1.5 bg-card/50 shrink-0"
              >
                <img
                  src={comp.url}
                  alt={comp.title}
                  className="w-10 h-14 rounded-lg object-cover border border-border"
                />
                <div>
                  <p className="text-[10px] font-semibold">{comp.title}</p>
                  <p className="text-[9px] text-muted-foreground">
                    {isBatchMode ? `Video ${i + 1}` : "Selected"}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Language */}
          <div className="flex gap-2 flex-wrap">
            {LANGUAGES.map((l) => (
              <button
                key={l.id}
                onClick={() => setLanguage(l.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  language === l.id
                    ? "gradient-bg text-white"
                    : "border border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Tone */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Script Tone</Label>
            <div className="flex gap-2 flex-wrap">
              {TONES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setScriptTone(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    scriptTone === t.id
                      ? "gradient-bg text-white"
                      : "border border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Emotion tags toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAllowEmotionTags((v) => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                allowEmotionTags ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  allowEmotionTags ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
            <span className="text-xs text-muted-foreground">
              Allow emotion tags like{" "}
              <code className="text-primary bg-primary/10 px-1 rounded">{`{{happy}}`}</code>{" "}
              in script
            </span>
          </div>

          {/* Script(s) — Batch vs Single */}
          {isBatchMode ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-xs">
                  Continuation Scripts ({batchSize} videos)
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateScript}
                  disabled={generatingScript}
                  className="cursor-pointer text-xs"
                >
                  {generatingScript ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <PenLine className="w-3 h-3 mr-1" />
                  )}
                  ✨ AI Write All
                </Button>
              </div>
              {selectedCompositeArray.map((comp, i) => (
                <div
                  key={i}
                  className="space-y-1 rounded-lg border border-border/40 p-3 bg-card/30"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px]">
                      {i === 0
                        ? "Opening"
                        : i === batchSize - 1
                          ? "Closing"
                          : `Part ${i + 1}`}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {comp.title}
                    </span>
                    <span
                      className={`text-[10px] font-mono ml-auto ${(batchScripts[i] || "").length > MAX_SCRIPT ? "text-destructive" : "text-muted-foreground"}`}
                    >
                      {(batchScripts[i] || "").length}/{MAX_SCRIPT}
                    </span>
                  </div>
                  <Textarea
                    value={batchScripts[i] || ""}
                    onChange={(e) => {
                      const val = e.target.value.slice(0, MAX_SCRIPT);
                      setBatchScripts((prev) => {
                        const n = [...prev];
                        n[i] = val;
                        return n;
                      });
                    }}
                    placeholder={
                      i === 0
                        ? "Opening hook + first space..."
                        : i === batchSize - 1
                          ? "Final reveal + CTA..."
                          : `Continuation for ${comp.title}...`
                    }
                    className="min-h-[70px] resize-none text-sm"
                    maxLength={MAX_SCRIPT}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs">
                  What should the presenter say?
                </Label>
                <span
                  className={`text-xs font-mono ${script.length > MAX_SCRIPT ? "text-destructive font-bold" : "text-muted-foreground"}`}
                >
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
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateScript}
                disabled={generatingScript}
                className="cursor-pointer text-xs"
              >
                {generatingScript ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <PenLine className="w-3 h-3 mr-1" />
                )}
                ✨ AI Write Script
              </Button>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setStep(1)}
              className="cursor-pointer"
            >
              Back
            </Button>
            <Button
              onClick={handleGenerateVideo}
              disabled={!step2Valid || generating}
              className="gradient-bg text-white shadow-md cursor-pointer px-8"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />{" "}
                  {isBatchMode
                    ? `Generate ${batchSize} Videos`
                    : "Generate Video"}
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ══════════════ RESULTS ══════════════ */}
      {showResults && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">
              {videoStatuses.every((s) => s === "ready")
                ? `✅ ${videoStatuses.length > 1 ? `All ${videoStatuses.length} videos are` : "Your video is"} ready!`
                : videoStatuses.some((s) => s === "error")
                  ? "⚠️ Some videos encountered errors"
                  : "🏠 Creating your property showcase..."}
            </h2>
            {videoStatuses.every((s) => s === "ready" || s === "error") && (
              <Button
                variant="outline"
                size="sm"
                onClick={reset}
                className="cursor-pointer text-xs"
              >
                Start over
              </Button>
            )}
          </div>

          {/* Background generation notice */}
          {videoStatuses.some((s) => s === "generating") && (
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 flex items-start gap-2">
              <span className="text-base">🎬</span>
              <div>
                <p className="text-xs font-semibold text-primary mb-0.5">
                  Generating{" "}
                  {videoStatuses.filter((s) => s === "generating").length}{" "}
                  video(s)...
                </p>
                <p className="text-[11px] text-muted-foreground">
                  You can freely browse — progress is saved automatically.
                </p>
              </div>
            </div>
          )}

          {/* Video cards */}
          {videoStatuses.map((status, i) => (
            <VideoCard key={i} status={status} video={videoResults[i]} />
          ))}

          {videoStatuses.every((s) => s === "ready") && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
              <p className="text-sm font-medium">
                🏠{" "}
                {videoStatuses.length > 1
                  ? `${videoStatuses.length} property videos`
                  : "Property showcase video"}{" "}
                generated!
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Auto-saved to your Asset Library.
              </p>
            </div>
          )}

          {/* ── Combine Videos Section (batch only, 2+ videos ready) ── */}
          {videoStatuses.length > 1 &&
            videoStatuses.filter((s) => s === "ready").length >= 2 && (
              <div className="rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center">
                    <Film className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      Combine into One Video
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Stitch all clips into a seamless walkthrough with
                      crossfade transitions
                    </p>
                  </div>
                </div>

                {!combinedVideo && !combining && (
                  <Button
                    onClick={handleCombineVideos}
                    className="w-full gradient-bg text-white shadow-md cursor-pointer gap-2"
                  >
                    <Merge className="w-4 h-4" />
                    Combine {
                      videoStatuses.filter((s) => s === "ready").length
                    }{" "}
                    Videos
                  </Button>
                )}

                {combining && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                    <Loader2 className="w-4 h-4 animate-spin text-violet-600 dark:text-violet-400 shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">
                        Processing in browser...
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {combineProgress || "Working..."}
                      </p>
                    </div>
                  </div>
                )}

                {combinedVideo && (
                  <div className="space-y-3">
                    <div className="rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-80 mx-auto border border-violet-500/30">
                      <video
                        src={combinedVideo.serverUrl || combinedVideo.blobUrl}
                        controls
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex justify-center gap-3">
                      <a
                        href={combinedVideo.blobUrl}
                        download="combined-walkthrough.mp4"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-500 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" /> Download Combined
                      </a>
                      {combinedVideo.serverUrl && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" /> Saved to Library
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
        </div>
      )}
    </div>
  );
}

export default function AIWalkthroughPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <RealEstateVideoContent />
    </Suspense>
  );
}
