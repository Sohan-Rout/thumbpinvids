"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2,
  Send,
  Download,
  RotateCcw,
  Play,
  Info,
  ImageIcon,
  Copy,
  Check,
  Maximize2,
} from "lucide-react";

const IMAGE_MODELS = [
  { id: "dall-e", name: "DALL-E 3" },
  { id: "stability", name: "Stability AI" },
  { id: "flux", name: "Flux (fal.ai)" },
  { id: "gemini", name: "Google Imagen" },
];

const VIDEO_MODELS = [
  { id: "kling", name: "Kling AI" },
  { id: "runway", name: "Runway ML" },
  { id: "luma", name: "Luma" },
  { id: "minimax", name: "Minimax" },
  { id: "pika", name: "Pika" },
];

const VARIANTS = ["1", "2", "3", "4"];

export default function ImageGenPage() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("dall-e");
  const [variants, setVariants] = useState("2");
  const [generating, setGenerating] = useState(false);
  const [images, setImages] = useState([]);
  const [error, setError] = useState(null);
  const [isDemo, setIsDemo] = useState(false);

  // Image-to-video state
  const [animateOpen, setAnimateOpen] = useState(false);
  const [animateImage, setAnimateImage] = useState(null);
  const [animatePrompt, setAnimatePrompt] = useState("");
  const [animateModel, setAnimateModel] = useState("kling");
  const [animating, setAnimating] = useState(false);
  const [animateResult, setAnimateResult] = useState(null);

  // Fullscreen preview
  const [previewImage, setPreviewImage] = useState(null);

  const [modelStatuses, setModelStatuses] = useState({});
  const [videoModelStatuses, setVideoModelStatuses] = useState({});

  useEffect(() => {
    fetch("/api/image-gen")
      .then((r) => r.json())
      .then((d) => {
        const s = {};
        d.models?.forEach((m) => (s[m.id] = m.configured));
        setModelStatuses(s);
      })
      .catch(() => {});

    fetch("/api/image-to-video")
      .then((r) => r.json())
      .then((d) => {
        const s = {};
        d.models?.forEach((m) => (s[m.id] = m.configured));
        setVideoModelStatuses(s);
      })
      .catch(() => {});
  }, []);

  const canGenerate = prompt.trim().length >= 3 && !generating;

  async function handleGenerate() {
    if (!canGenerate) return;
    setGenerating(true);
    setImages([]);
    setError(null);
    setIsDemo(false);

    try {
      const res = await fetch("/api/image-gen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model,
          settings: { variants: parseInt(variants) },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      setImages(data.images || []);
      setIsDemo(!!data.demo);

      if (data.demo) {
        toast.info(`${data.model} — Demo mode`, {
          description: data.message,
        });
      } else {
        toast.success(`${data.images?.length || 0} image(s) generated!`);
      }
    } catch (err) {
      setError(err.message);
      toast.error("Failed", { description: err.message });
    } finally {
      setGenerating(false);
    }
  }

  async function handleAnimate() {
    if (!animateImage) return;
    setAnimating(true);
    setAnimateResult(null);

    try {
      const res = await fetch("/api/image-to-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: animateImage,
          prompt: animatePrompt.trim() || "Animate this image with natural, cinematic motion",
          model: animateModel,
          settings: { duration: "5" },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Animation failed");

      setAnimateResult(data);
      if (data.demo) {
        toast.info(`${data.model} — Demo mode`, { description: data.message });
      } else {
        toast.success("Video generation started!");
      }
    } catch (err) {
      toast.error("Animation failed", { description: err.message });
    } finally {
      setAnimating(false);
    }
  }

  function openAnimate(imageUrl) {
    setAnimateImage(imageUrl);
    setAnimatePrompt("");
    setAnimateResult(null);
    setAnimateOpen(true);
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 animate-fade-in">
      {/* Title */}
      <h1 className="text-2xl font-bold font-heading mb-1">Image Generation</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Generate images and animate them into videos.
      </p>

      {/* Input area */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <Textarea
          placeholder="Describe the image you want to create..."
          className="min-h-[100px] border-0 resize-none focus-visible:ring-0 rounded-b-none text-base p-4"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          maxLength={500}
          disabled={generating}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && canGenerate) {
              e.preventDefault();
              handleGenerate();
            }
          }}
        />

        {/* Bottom bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/50">
          <div className="flex items-center gap-3">
            {/* Model */}
            <Select value={model} onValueChange={setModel} disabled={generating}>
              <SelectTrigger className="h-8 w-auto gap-1.5 text-xs border-0 bg-muted/50 hover:bg-muted cursor-pointer px-3 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMAGE_MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-sm">
                    <div className="flex items-center gap-2">
                      <span>{m.name}</span>
                      {modelStatuses[m.id] === true && (
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      )}
                      {modelStatuses[m.id] === false && (
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Variants */}
            <Select value={variants} onValueChange={setVariants} disabled={generating}>
              <SelectTrigger className="h-8 w-auto gap-1.5 text-xs border-0 bg-muted/50 hover:bg-muted cursor-pointer px-3 rounded-lg">
                <SelectValue>{variants} variant{variants !== "1" ? "s" : ""}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {VARIANTS.map((v) => (
                  <SelectItem key={v} value={v} className="text-sm">
                    {v} variant{v !== "1" ? "s" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            size="icon"
            className="h-8 w-8 rounded-lg gradient-bg text-white cursor-pointer shadow-sm"
            disabled={!canGenerate}
            onClick={handleGenerate}
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground mt-1.5 px-1">
        {prompt.length}/500
      </p>

      {/* Loading */}
      {generating && (
        <div className="mt-8 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">
            Generating {variants} image{variants !== "1" ? "s" : ""} with{" "}
            {IMAGE_MODELS.find((m) => m.id === model)?.name}...
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-6 rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-sm text-destructive font-medium">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer mt-2"
            onClick={() => { setError(null); setImages([]); }}
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Try again
          </Button>
        </div>
      )}

      {/* Generated Images Grid */}
      {images.length > 0 && (
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">
                {images.length} image{images.length !== 1 ? "s" : ""} generated
              </p>
              {isDemo && (
                <Badge variant="outline" className="text-[10px] text-yellow-600 border-yellow-500/30">
                  Demo
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer text-xs"
              onClick={() => { setImages([]); setError(null); }}
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Clear
            </Button>
          </div>

          <div className={`grid gap-4 ${
            images.length === 1
              ? "grid-cols-1 max-w-md"
              : images.length === 2
              ? "grid-cols-2"
              : images.length === 3
              ? "grid-cols-3"
              : "grid-cols-2 lg:grid-cols-4"
          }`}>
            {images.map((img, i) => (
              <div
                key={i}
                className="group relative rounded-xl border border-border overflow-hidden bg-muted/30"
              >
                <img
                  src={img.url}
                  alt={`Generated image ${i + 1}`}
                  className="w-full aspect-square object-cover"
                  loading="lazy"
                />

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-3">
                  <div className="flex gap-2">
                    {/* Animate to Video */}
                    <Button
                      size="sm"
                      className="gradient-bg text-white cursor-pointer text-xs shadow-lg"
                      onClick={() => openAnimate(img.url)}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Animate
                    </Button>

                    {/* Download */}
                    <a
                      href={img.url}
                      download={`adora-gen-${i + 1}.png`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button
                        size="sm"
                        variant="secondary"
                        className="cursor-pointer text-xs"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Save
                      </Button>
                    </a>

                    {/* Expand */}
                    <Button
                      size="sm"
                      variant="secondary"
                      className="cursor-pointer text-xs"
                      onClick={() => setPreviewImage(img.url)}
                    >
                      <Maximize2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Variant label */}
                <div className="absolute top-2 left-2">
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-black/50 text-white border-0 backdrop-blur"
                  >
                    {i + 1}/{images.length}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          {img_revised_prompt(images)}
        </div>
      )}

      {/* Animate Dialog (Image-to-Video) */}
      <Dialog
        open={animateOpen}
        onOpenChange={(open) => {
          if (!open) {
            setAnimateOpen(false);
            setAnimateResult(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Animate to Video</DialogTitle>
            <DialogDescription>
              Use this image as the starting frame and generate a video.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Source image preview */}
            {animateImage && (
              <div className="rounded-lg overflow-hidden border border-border">
                <img
                  src={animateImage}
                  alt="Source image"
                  className="w-full aspect-video object-cover"
                />
              </div>
            )}

            {/* Motion prompt */}
            <div className="space-y-1.5">
              <Label className="text-sm">Motion Prompt (optional)</Label>
              <Input
                placeholder="e.g., Camera slowly zooms in, petals falling..."
                value={animatePrompt}
                onChange={(e) => setAnimatePrompt(e.target.value)}
                maxLength={300}
                disabled={animating}
              />
              <p className="text-[11px] text-muted-foreground">
                Describe how you want the image to move. Leave empty for auto motion.
              </p>
            </div>

            {/* Video model selector */}
            <div className="space-y-1.5">
              <Label className="text-sm">AI Model</Label>
              <Select
                value={animateModel}
                onValueChange={setAnimateModel}
                disabled={animating}
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VIDEO_MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <div className="flex items-center gap-2">
                        <span>{m.name}</span>
                        {videoModelStatuses[m.id] === true && (
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        )}
                        {videoModelStatuses[m.id] === false && (
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Result */}
            {animateResult && (
              <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs space-y-1">
                {animateResult.demo ? (
                  <>
                    <div className="flex items-start gap-2">
                      <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <p className="text-muted-foreground">{animateResult.message}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <p><span className="font-medium text-foreground">Status:</span> {animateResult.status}</p>
                    <p><span className="font-medium text-foreground">Video ID:</span> {animateResult.video_id || "---"}</p>
                  </>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 cursor-pointer"
                onClick={() => {
                  setAnimateOpen(false);
                  setAnimateResult(null);
                }}
              >
                {animateResult ? "Close" : "Cancel"}
              </Button>
              {!animateResult && (
                <Button
                  className="flex-1 gradient-bg text-white cursor-pointer shadow-lg"
                  disabled={animating}
                  onClick={handleAnimate}
                >
                  {animating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Animating...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Generate Video
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Preview */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-3xl p-2">
          {previewImage && (
            <img
              src={previewImage}
              alt="Preview"
              className="w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Show revised prompt if DALL-E returned one
function img_revised_prompt(images) {
  const revised = images.find((img) => img.revised_prompt);
  if (!revised) return null;

  return (
    <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs">
      <p className="font-medium text-foreground mb-1">Revised prompt:</p>
      <p className="text-muted-foreground">{revised.revised_prompt}</p>
    </div>
  );
}
