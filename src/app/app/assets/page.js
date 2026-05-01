"use client";

import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAssets } from "@/hooks/use-assets";
import { toast } from "sonner";
import {
  Search,
  Upload,
  Eye,
  CheckCircle,
  Trash2,
  Loader2,
  ImagePlus,
  Sparkles,
  Wand2,
  FileText,
  Package,
  Video,
  Play,
  Layers,
  PenLine,
  Download,
  ChevronRight,
  CheckCircle2,
  Building2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SCRIPT = 200;

const LANGUAGES = [
  { id: "english", label: "English" },
  { id: "hindi", label: "Hindi" },
  { id: "hinglish", label: "Hinglish" },
];

function dataUrlToFile(dataUrl, filename) {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], filename, { type: mime });
}

// ─── Animate It Modal ────────────────────────────────────────────────────────
function AnimateModal({ open, onClose, asset, onVideoCreated }) {
  const [animStep, setAnimStep] = useState(0); // 0=script, 1=generating/result
  const [script, setScript] = useState("");
  const [language, setLanguage] = useState("english");
  const [generatingScript, setGeneratingScript] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [compositeFile, setCompositeFile] = useState(null);

  // Download the composite once when modal opens
  async function ensureFile() {
    if (compositeFile) return compositeFile;
    try {
      const res = await fetch(asset.url);
      const blob = await res.blob();
      const file = new File([blob], "composite.png", { type: blob.type });
      setCompositeFile(file);
      return file;
    } catch (err) {
      toast.error("Failed to load composite image");
      return null;
    }
  }

  async function handleGenerateScript() {
    setGeneratingScript(true);
    try {
      const file = await ensureFile();
      if (!file) return;
      const fd = new FormData();
      fd.append("compositeImage", file);
      fd.append("language", language);
      fd.append("tone", "professional");

      const res = await fetch("/api/real-estate-video/generate-script", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setScript(data.script);
      toast.success("Script generated!");
    } catch (err) {
      toast.error("Script generation failed", { description: err.message });
    } finally {
      setGeneratingScript(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setVideoUrl(null);
    setAnimStep(1);
    try {
      const file = await ensureFile();
      if (!file) return;
      const fd = new FormData();
      fd.append("compositeImage", file);
      fd.append("script", script.trim());
      // No voicePrompt — backend generates it internally

      const response = await fetch("/api/real-estate-video/generate", { method: "POST", body: fd });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Generation failed");
      }
      if (!response.body) throw new Error("No stream");

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
            if (event.type === "progress") toast.info(event.message, { id: "animate-gen" });
            if (event.type === "video_ready") {
              setVideoUrl(event.videoUrl);
              toast.success("🏠 Video ready!", { id: "animate-gen" });
              if (onVideoCreated) onVideoCreated();
            }
            if (event.type === "error") {
              toast.error("Generation failed", { description: event.message });
            }
          } catch {}
        }
      }
    } catch (err) {
      toast.error("Video generation failed", { description: err.message });
    } finally {
      setGenerating(false);
    }
  }

  function handleClose() {
    setAnimStep(0);
    setScript("");
    setVideoUrl(null);
    setCompositeFile(null);
    setGenerating(false);
    onClose();
  }

  if (!asset) return null;

  const scriptValid = script.trim().length >= 15;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Animate It!
          </DialogTitle>
          <DialogDescription>
            Generate a property showcase video from this composite
          </DialogDescription>
        </DialogHeader>

        {/* Composite preview */}
        <div className="flex gap-3 items-start">
          <img src={asset.url} alt={asset.name} className="w-24 h-36 rounded-xl object-cover border border-border shadow-md shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{asset.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">RE Composite</p>
          </div>
        </div>

        {/* ── Step 0: Script ── */}
        {animStep === 0 && (
          <div className="space-y-4 animate-in fade-in duration-200">
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
            <div className="space-y-1">
              <div className="flex justify-between">
                <Label className="text-xs">Script</Label>
                <span className={`text-[10px] font-mono ${script.length > MAX_SCRIPT ? "text-destructive" : "text-muted-foreground"}`}>
                  {script.length}/{MAX_SCRIPT}
                </span>
              </div>
              <Textarea value={script} onChange={(e) => setScript(e.target.value.slice(0, MAX_SCRIPT))} placeholder="What should the presenter say?" className="min-h-[80px] resize-none text-sm" maxLength={MAX_SCRIPT} />
              <Button variant="outline" size="sm" onClick={handleGenerateScript} disabled={generatingScript} className="cursor-pointer text-xs">
                {generatingScript ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <PenLine className="w-3 h-3 mr-1" />}
                ✨ AI Write
              </Button>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleGenerate} disabled={!scriptValid || generating} className="gradient-bg text-white cursor-pointer px-6" size="sm">
                {generating ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Generating...</> : <><Sparkles className="w-3.5 h-3.5 mr-1.5" /> Generate Video</>}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 1: Generating / Result ── */}
        {animStep === 1 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {!videoUrl && generating && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                <p className="text-sm font-medium">Creating your video...</p>
                <p className="text-xs text-muted-foreground">Voice & video are being generated behind the scenes</p>
              </div>
            )}

            {videoUrl && (
              <>
                <div className="rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-72 mx-auto">
                  <video src={videoUrl} controls className="w-full h-full object-contain" />
                </div>
                <div className="flex items-center justify-between">
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/30 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Saved to Library
                  </Badge>
                  <a href={videoUrl} download="re-animated-video.mp4" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80">
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                </div>
                <Button onClick={handleClose} variant="outline" className="w-full cursor-pointer text-xs">
                  Done
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function AssetLibraryPage() {
  const {
    assets,
    avatars,
    customAvatars,
    libraryAvatars,
    productImages,
    composites,
    videos,
    loading,
    uploading,
    uploadAsset,
    deleteAsset,
    refetch,
  } = useAssets();

  const router = useRouter();

  const [search, setSearch] = useState("");
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [previewAsset, setPreviewAsset] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [assetName, setAssetName] = useState("");
  const [assetType, setAssetType] = useState("avatar");
  const [deleting, setDeleting] = useState(null);
  const fileInputRef = useRef(null);

  // Animate modal
  const [animateAsset, setAnimateAsset] = useState(null);
  const [animateOpen, setAnimateOpen] = useState(false);

  const filteredLibrary = libraryAvatars.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.ethnicity?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCustom = customAvatars.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredProducts = productImages.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredComposites = composites.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );
  
  const filteredVideos = videos.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  const isFullUrl = (url) => url && url.startsWith("http") || url.startsWith("/");

  function handleFileSelect(e, type = "avatar") {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Invalid file type", { description: "Please use JPEG, PNG, or WebP images." });
      return;
    }

    setUploadFile(file);
    setUploadPreview(URL.createObjectURL(file));
    setAssetName(file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "));
    setAssetType(type);
    setUploadModalOpen(true);
  }

  async function handleUpload() {
    if (!uploadFile) return;

    const result = await uploadAsset(uploadFile, assetName, assetType, assetType === "avatar" ? "avatars" : "products");

    if (result.success) {
      toast.success("Asset uploaded! 🎉");
      closeUploadModal();
    } else {
      toast.error("Upload failed", { description: result.error });
    }
  }

  function closeUploadModal() {
    setUploadModalOpen(false);
    setUploadFile(null);
    setUploadPreview(null);
    setAssetName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDelete(id) {
    setDeleting(id);
    const result = await deleteAsset(id);

    if (result.success) {
      toast.success("Asset deleted");
      if (selectedAsset?.id === id) setSelectedAsset(null);
      if (previewAsset?.id === id) setPreviewAsset(null);
    } else {
      toast.error("Delete failed", { description: result.error });
    }
    setDeleting(null);
  }

  function AssetCard({ asset, showDelete = false }) {
    const isSelected = selectedAsset?.id === asset.id;
    const isComposite = asset.type === "composite";
    const isVideo = asset.type === "video" || asset.type === "clip";

    return (
      <Card
        className={`group cursor-pointer border-border/50 hover:shadow-lg transition-all hover:-translate-y-1 overflow-hidden ${
          isSelected ? "ring-2 ring-primary border-primary" : ""
        } ${isVideo ? "aspect-[9/16]" : ""}`}
        onClick={() => { setSelectedAsset(asset); if (isVideo) setPreviewAsset(asset); }}
      >
        <CardContent className="p-0">
          <div className="aspect-square bg-gradient-to-br from-primary/10 to-accent/10 relative flex items-center justify-center overflow-hidden">
            {isVideo ? (
              <video
                src={asset.url}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                muted
                onMouseEnter={(e) => e.target.play()}
                onMouseLeave={(e) => { e.target.pause(); e.target.currentTime = 0; }}
              />
            ) : (
              <img
                src={asset.url || asset.image_url}
                alt={asset.name}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
            )}
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center cursor-pointer hover:bg-white/30 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewAsset(asset);
                }}
              >
                <Eye className="w-4 h-4 text-white" />
              </button>
              {isComposite && (
                <button
                  className="w-8 h-8 rounded-full bg-primary/60 backdrop-blur flex items-center justify-center cursor-pointer hover:bg-primary/80 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAnimateAsset(asset);
                    setAnimateOpen(true);
                  }}
                  title="Animate It!"
                >
                  <Play className="w-4 h-4 text-white" />
                </button>
              )}
              {showDelete && (
                <button
                  className="w-8 h-8 rounded-full bg-red-500/30 backdrop-blur flex items-center justify-center cursor-pointer hover:bg-red-500/50 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(asset.id);
                  }}
                  disabled={deleting === asset.id}
                >
                  {deleting === asset.id ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 text-white" />
                  )}
                </button>
              )}
            </div>
            
            <div className="absolute top-2 left-2">
              <Badge className="bg-primary/80 text-white text-[10px] px-1.5 py-0.5 border-0 flex items-center gap-1">
                {asset.type === "avatar" && <Sparkles className="w-2.5 h-2.5" />}
                {asset.type === "product" && <Package className="w-2.5 h-2.5" />}
                {asset.type === "composite" && <Layers className="w-2.5 h-2.5" />}
                {isVideo && <Video className="w-2.5 h-2.5" />}
                {asset.type === "avatar" ? "Avatar" : asset.type === "product" ? "Product" : asset.type === "composite" ? "Composite" : "Video"}
              </Badge>
            </div>

            {/* Animate It badge for composites */}
            {isComposite && (
              <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Badge className="bg-primary/90 text-white text-[10px] px-2 py-0.5 border-0 cursor-pointer hover:bg-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAnimateAsset(asset);
                    setAnimateOpen(true);
                  }}
                >
                  <Play className="w-2.5 h-2.5 mr-0.5" /> Animate It!
                </Badge>
              </div>
            )}
          </div>
          <div className="p-3">
            <p className="text-sm font-medium truncate">{asset.name}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {asset.is_custom ? "Added by you" : "Library Asset"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFileSelect(e, assetType)}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading">
            Asset Library
          </h1>
          <p className="text-muted-foreground mt-1">
            Store and reuse your product images, composites, avatars, and videos
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={() => {
              setAssetType("product");
              fileInputRef.current?.click();
            }}
          >
            <Package className="w-4 h-4 mr-2" />
            Add Product Image
          </Button>
          <Button
            className="cursor-pointer gradient-bg text-white shadow-lg"
            onClick={() => {
              setAssetType("avatar");
              fileInputRef.current?.click();
            }}
          >
            <Upload className="w-4 h-4 mr-2" />
            Add Avatar
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search your library..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-0">
                <Skeleton className="aspect-square w-full" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="all" className="cursor-pointer">All Assets ({assets.length})</TabsTrigger>
            <TabsTrigger value="avatars" className="cursor-pointer">Avatars ({avatars.length})</TabsTrigger>
            <TabsTrigger value="composites" className="cursor-pointer">Composites ({composites.length})</TabsTrigger>
            <TabsTrigger value="products" className="cursor-pointer">Products ({productImages.length})</TabsTrigger>
            <TabsTrigger value="videos" className="cursor-pointer">Videos ({videos.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {assets.filter(a => a.name.toLowerCase().includes(search.toLowerCase())).map((asset) => (
                <AssetCard key={asset.id} asset={asset} showDelete={asset.is_custom} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="avatars" className="mt-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {avatars.filter(a => a.name.toLowerCase().includes(search.toLowerCase())).map((asset) => (
                <AssetCard key={asset.id} asset={asset} showDelete={asset.is_custom} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="composites" className="mt-6">
            {composites.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <Layers className="w-10 h-10 text-muted-foreground mx-auto opacity-50" />
                <p className="text-sm text-muted-foreground">No composites yet</p>
                <p className="text-xs text-muted-foreground">
                  Generate property composites in the <strong>Real Estate</strong> section — unused ones are saved here automatically!
                </p>
                <Button variant="outline" size="sm" onClick={() => router.push("/app/ai-walkthrough")} className="cursor-pointer text-xs mt-2">
                  <Building2 className="w-3 h-3 mr-1" /> Go to Real Estate
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredComposites.map((asset) => (
                  <AssetCard key={asset.id} asset={asset} showDelete={asset.is_custom} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="products" className="mt-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {productImages.filter(a => a.name.toLowerCase().includes(search.toLowerCase())).map((asset) => (
                <AssetCard key={asset.id} asset={asset} showDelete={asset.is_custom} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="videos" className="mt-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {videos.filter(a => a.name.toLowerCase().includes(search.toLowerCase())).map((asset) => (
                <AssetCard key={asset.id} asset={asset} showDelete={asset.is_custom} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}

      
      {/* Preview Modal */}
      <Dialog open={!!previewAsset} onOpenChange={(open) => !open && setPreviewAsset(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border-border/50">
          <div className="relative w-full h-[80vh] flex items-center justify-center">
            {previewAsset && (
              previewAsset.type === "video" || previewAsset.type === "clip" ? (
                <video src={previewAsset.url} controls autoPlay className="max-w-full max-h-full object-contain" />
              ) : (
                <img src={previewAsset.url || previewAsset.image_url} alt={previewAsset.name} className="max-w-full max-h-full object-contain" />
              )
            )}
            <div className="absolute top-4 left-4">
              <Badge className="bg-black/50 text-white border-white/20 backdrop-blur">
                {previewAsset?.name}
              </Badge>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Modal */}
      <Dialog open={uploadModalOpen} onOpenChange={(open) => !open && closeUploadModal()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Upload {assetType === "avatar" ? "Avatar" : "Product Image"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="aspect-square rounded-xl bg-muted flex items-center justify-center overflow-hidden">
              {uploadPreview && <img src={uploadPreview} className="w-full h-full object-cover" />}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</label>
              <Input value={assetName} onChange={(e) => setAssetName(e.target.value)} />
            </div>
            <Button className="w-full gradient-bg text-white" onClick={handleUpload} disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Upload to Library
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Animate It Modal */}
      <AnimateModal
        open={animateOpen}
        onClose={() => { setAnimateOpen(false); setAnimateAsset(null); }}
        asset={animateAsset}
        onVideoCreated={() => refetch()}
      />
    </div>
  );
}
