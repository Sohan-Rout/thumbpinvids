"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { HeygenAvatarSelector } from "@/components/dashboard/heygen-avatar-selector";
import { useHeygen } from "@/hooks/use-heygen";

import {
  Loader2,
  Send,
  ChevronDown,
  Info,
  RotateCcw,
  Download,
} from "lucide-react";

const MODELS = [
  { id: "kling", name: "Kling AI", tag: "Popular" },
  { id: "runway", name: "Runway ML", tag: "Pro" },
  { id: "luma", name: "Luma Dream Machine", tag: "" },
  { id: "pika", name: "Pika Labs", tag: "Fast" },
  { id: "minimax", name: "Minimax (Hailuo)", tag: "New" },
  { id: "heygen", name: "HeyGen", tag: "" },
];

const RATIOS = ["16:9", "9:16", "1:1"];
const DURATIONS = ["3", "5", "10"];

export default function TextToVideoPage() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("kling");
  const [ratio, setRatio] = useState("16:9");
  const [duration, setDuration] = useState("5");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [modelStatuses, setModelStatuses] = useState({});
  const [selectedAvatarId, setSelectedAvatarId] = useState(null);
  const [talkingPhotoId, setTalkingPhotoId] = useState(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState(null);
  const [voiceSearch, setVoiceSearch] = useState("");
  const [polling, setPolling] = useState(false);

  const { voices: heygenVoices } = useHeygen();

  const filteredVoices = heygenVoices.filter(v => {
    const s = voiceSearch.toLowerCase();
    return v.name.toLowerCase().includes(s) || 
           v.language.toLowerCase().includes(s) ||
           (v.language_id && v.language_id.toLowerCase().includes(s));
  });


  // Load state from localStorage on mount
  useEffect(() => {
    const savedResult = localStorage.getItem("t2v_result");
    const savedModel = localStorage.getItem("t2v_model");
    const savedAvatar = localStorage.getItem("t2v_avatar");
    const savedPhoto = localStorage.getItem("t2v_photo");
    const savedVoice = localStorage.getItem("t2v_voice");

    if (savedResult) {
      try {
        setResult(JSON.parse(savedResult));
      } catch (e) {
        console.error("Failed to parse saved result", e);
      }
    }
    if (savedModel) setModel(savedModel);
    if (savedAvatar) setSelectedAvatarId(savedAvatar);
    if (savedPhoto) setTalkingPhotoId(savedPhoto);
    if (savedVoice) setSelectedVoiceId(savedVoice);
  }, []);

  // Save state to localStorage
  useEffect(() => {
    if (result) {
      localStorage.setItem("t2v_result", JSON.stringify(result));
    } else {
      localStorage.removeItem("t2v_result");
    }
  }, [result]);

  useEffect(() => {
    localStorage.setItem("t2v_model", model);
  }, [model]);

  useEffect(() => {
    if (selectedAvatarId) localStorage.setItem("t2v_avatar", selectedAvatarId);
    else localStorage.removeItem("t2v_avatar");
  }, [selectedAvatarId]);

  useEffect(() => {
    if (talkingPhotoId) localStorage.setItem("t2v_photo", talkingPhotoId);
    else localStorage.removeItem("t2v_photo");
  }, [talkingPhotoId]);

  useEffect(() => {
    if (selectedVoiceId) localStorage.setItem("t2v_voice", selectedVoiceId);
    else localStorage.removeItem("t2v_voice");
  }, [selectedVoiceId]);
  useEffect(() => {
    fetch("/api/text-to-video")
      .then((r) => r.json())
      .then((d) => {
        const s = {};
        d.models?.forEach((m) => (s[m.id] = m.configured));
        setModelStatuses(s);
      })
      .catch(() => {});
  }, []);

  // Polling for video status
  useEffect(() => {
    let interval;
    if (result && result.video_id && (result.status === "processing" || result.status === "waiting") && !result.demo) {
      setPolling(true);
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/text-to-video/status?video_id=${result.video_id}&model=${model}`);
          const data = await res.json();
          
          if (data.status === "completed" || data.status === "failed" || data.error) {
            setResult(prev => ({ 
              ...prev, 
              status: data.status || "failed", 
              data: { ...prev.data, video_url: data.video_url, thumbnail_url: data.thumbnail_url } 
            }));
            setPolling(false);
            clearInterval(interval);
            if (data.status === "completed") toast.success("Video is ready!");
            if (data.status === "failed" || data.error) toast.error("Generation failed", { description: data.error });
          } else {
            setResult(prev => ({ ...prev, status: data.status }));
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [result?.video_id, result?.status, model]);


  const canGenerate = prompt.trim().length >= 5 && !generating;
  const demoBugs = process.env.NEXT_PUBLIC_DEMO_BUGS === "true";

  async function handleGenerate() {
    if (!canGenerate) return;
    setGenerating(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/text-to-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model,
          settings: { 
            aspect_ratio: ratio, 
            duration,
            avatar_id: model === "heygen" ? selectedAvatarId : undefined,
            talking_photo_id: model === "heygen" ? talkingPhotoId : undefined,
            voice_id: model === "heygen" ? selectedVoiceId : undefined,
          },

        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setResult(data);
      if (data.demo) {
        toast.info(`${data.model} is in demo mode`, {
          description: "Add the API key to .env.local for real generation.",
        });
      } else {
        toast.success("Video generation started!");
      }
    } catch (err) {
      setError(err.message);
      toast.error("Failed", { description: err.message });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 animate-fade-in">
      {/* Title */}
      <h1 className="text-2xl font-bold font-heading mb-1">Text to Video</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Describe a scene and generate a video with your preferred AI model.
      </p>

      {/* Main input area */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <Textarea
          placeholder="Describe the video you want to create..."
          className="min-h-[120px] border-0 resize-none focus-visible:ring-0 rounded-b-none text-base p-4"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          maxLength={1000}
          disabled={generating}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && canGenerate) {
              e.preventDefault();
              handleGenerate();
            }
          }}
        />

        {/* Heygen Avatar Selector */}
        {model === "heygen" && (
          <div className="px-4 pb-4 border-b border-border/50 bg-muted/20">
            <div className="py-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Select Heygen Avatar
              </h3>
              { (selectedAvatarId || talkingPhotoId) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-[10px] text-primary"
                  onClick={() => { setSelectedAvatarId(null); setTalkingPhotoId(null); }}
                >
                  Clear Selection
                </Button>
              )}
            </div>
            <HeygenAvatarSelector 
              selectedId={selectedAvatarId || talkingPhotoId}
              onSelect={(id) => {
                setSelectedAvatarId(id);
                setTalkingPhotoId(null);
              }}
              onTalkingPhotoUpload={(id) => {
                setTalkingPhotoId(id);
                setSelectedAvatarId(null);
              }}
            />
          </div>
        )}

        {/* Heygen Voice Selector */}
        {model === "heygen" && (
          <div className="px-4 pb-4 border-b border-border/50 bg-muted/20 animate-in fade-in slide-in-from-top-1 duration-300">
            <div className="py-2 flex items-center justify-between">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Voice Selection
              </h3>
              { (selectedVoiceId || voiceSearch) && (
                <button 
                  onClick={() => { setSelectedVoiceId(null); setVoiceSearch(""); }}
                  className="text-[10px] text-primary hover:underline cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
            
            <div className="flex flex-col gap-2">
              <div className="relative">
                <Input 
                  placeholder="Search by name or language (e.g. Hindi)..."
                  className="h-8 text-[11px] bg-card/50 border-border/30 focus-visible:ring-primary/20 pr-8"
                  value={voiceSearch}
                  onChange={(e) => setVoiceSearch(e.target.value)}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  {['English', 'Hindi', 'Spanish'].map(lang => (
                    <button
                      key={lang}
                      onClick={() => setVoiceSearch(lang)}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              <Select value={selectedVoiceId} onValueChange={setSelectedVoiceId} disabled={generating}>
                <SelectTrigger className="h-10 w-full bg-card border-border/40 hover:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all rounded-lg shadow-sm">
                  <SelectValue placeholder={voiceSearch ? `Found ${filteredVoices.length} voices...` : "Pick a speaker..."} />
                </SelectTrigger>
                <SelectContent className="max-h-[350px] overflow-y-auto scrollbar-hide">
                  <div className="p-2 pb-1 text-[10px] text-muted-foreground font-medium border-b mb-1 flex justify-between items-center">
                    <span>{voiceSearch ? `Search results: ${filteredVoices.length}` : `All AI Voices (${heygenVoices.length})`}</span>
                    {voiceSearch && <span className="text-[9px] opacity-70">Filtered by "{voiceSearch}"</span>}
                  </div>
                  {filteredVoices.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No voices found matching "{voiceSearch}"
                    </div>
                  ) : (
                    filteredVoices.map((v) => (
                      <SelectItem key={v.voice_id} value={v.voice_id} className="text-xs py-2 cursor-pointer focus:bg-primary/5">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{v.name}</span>
                            <Badge variant="outline" className="text-[8px] h-3.5 px-1 py-0 opacity-70">
                              {v.language_id || v.language}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-muted-foreground/80 font-normal">
                            {v.gender} • {v.type} • {v.voice_id.substring(0, 8)}...
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}


        {/* Bottom bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/50">
          <div className="flex items-center gap-3">
            {/* Model dropdown */}
            <Select value={model} onValueChange={setModel} disabled={generating}>
              <SelectTrigger className="h-8 w-auto gap-1.5 text-xs border-0 bg-muted/50 hover:bg-muted cursor-pointer px-3 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-sm">
                    <div className="flex items-center gap-2">
                      <span>{m.name}</span>
                      {m.tag && (
                        <span className="text-[10px] text-muted-foreground">{m.tag}</span>
                      )}
                      {modelStatuses[m.id] === false && (
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                      )}
                      {modelStatuses[m.id] === true && (
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Ratio */}
            <Select value={ratio} onValueChange={setRatio} disabled={generating}>
              <SelectTrigger className="h-8 w-auto gap-1.5 text-xs border-0 bg-muted/50 hover:bg-muted cursor-pointer px-3 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RATIOS.map((r) => (
                  <SelectItem key={r} value={r} className="text-sm">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Duration */}
            <Select value={duration} onValueChange={setDuration} disabled={generating || model === "heygen"}>
              <SelectTrigger className="h-8 w-auto gap-1.5 text-xs border-0 bg-muted/50 hover:bg-muted cursor-pointer px-3 rounded-lg">
                <SelectValue>
                  {model === "heygen" ? "Auto" : `${duration}s`}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {DURATIONS.map((d) => (
                  <SelectItem key={d} value={d} className="text-sm">
                    {d} seconds
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Send button */}
          <Button
            size="icon"
            className="h-8 w-8 rounded-lg gradient-bg text-white cursor-pointer shadow-sm"
            disabled={demoBugs ? true : !canGenerate}
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

      {/* Character count */}
      <p className="text-[11px] text-muted-foreground mt-1.5 px-1">
        {demoBugs ? `${prompt.length}/underfined` : `${prompt.length}/1000`}
      </p>

      {/* Result */}
      {(result || error || generating) && (
        <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-sm">
          {generating ? (
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <div>
                <p className="text-sm font-medium">
                  Sending to {MODELS.find((m) => m.id === model)?.name}...
                </p>
                <p className="text-xs text-muted-foreground">
                  This may take 30 seconds to 2 minutes.
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="space-y-3">
              <p className="text-sm text-destructive font-medium">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => { setError(null); setResult(null); }}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Try again
              </Button>
            </div>
          ) : result?.demo ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{result.model} — Demo Mode</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {result.message}
                  </p>
                </div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                <p><span className="font-medium text-foreground">Prompt:</span> {result.prompt}</p>
                <p><span className="font-medium text-foreground">Model:</span> {result.model}</p>
                <p><span className="font-medium text-foreground">Estimated time:</span> {result.estimated_time}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => setResult(null)}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                New prompt
              </Button>
            </div>
          ) : result ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  Video on {result.model}
                </p>
                <div className="flex items-center gap-2">
                  {polling && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                  <Badge variant={result.status === "completed" ? "default" : "secondary"} className={result.status === "completed" ? "bg-green-500 hover:bg-green-600" : ""}>
                    {result.status}
                  </Badge>
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                <p><span className="font-medium text-foreground">Video ID:</span> {result.video_id || "—"}</p>
                {polling && <p className="text-[10px] animate-pulse">Checking for updates...</p>}
              </div>

              {result.status === "completed" && result.data?.video_url ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="aspect-video rounded-xl overflow-hidden border border-border bg-black shadow-inner">
                    <video 
                      src={result.data.video_url} 
                      controls 
                      className="w-full h-full"
                      poster={result.data.thumbnail_url}
                      autoPlay
                    />
                  </div>
                  <div className="flex gap-2">
                    <a href={result.data.video_url} download target="_blank" rel="noopener noreferrer" className="flex-1">
                      <Button className="w-full gradient-bg text-white cursor-pointer shadow-md">
                        <Download className="w-4 h-4 mr-2" />
                        Download Video
                      </Button>
                    </a>
                    <Button
                      variant="outline"
                      className="cursor-pointer"
                      onClick={() => setResult(null)}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      New Task
                    </Button>
                  </div>
                </div>
              ) : result.status === "failed" ? (
                <div className="space-y-3">
                  <p className="text-sm text-destructive font-medium">Generation failed</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() => setResult(null)}
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                    Try again
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => setResult(null)}
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  Cancel / New
                </Button>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
