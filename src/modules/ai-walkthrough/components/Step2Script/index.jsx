import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Loader2, PenLine, Sparkles, RotateCcw, Clock, Video } from "lucide-react";
import { LANGUAGES, TONES, MAX_SCRIPT } from "@/utils/constants";

export const Step2Script = ({ compositesHook, scriptHook, videoHook, onBack, onGenerate, isValid }) => {
  const {
    selectedCompositeArray,
    batchSize,
    isBatchMode,
  } = compositesHook;

  const {
    script,
    setScript,
    language,
    setLanguage,
    scriptTone,
    setScriptTone,
    allowEmotionTags,
    setAllowEmotionTags,
    generatingScript,
    structuredScripts, // Now contains 2 scripts (short + long)
    setStructuredScripts,
    setBatchScripts,
    sharedVoicePrompt,
    handleGenerateScript,
    retryScriptGeneration,
    regenerateSingleScript, // New function for regenerating individual script
  } = scriptHook;

  const { generating } = videoHook;

  // Get the two script types
  const shortScript = structuredScripts?.find(s => s?.type === "short_form");
  const longScript = structuredScripts?.find(s => s?.type === "long_form");
  const canGenerateFinalVideos =
    (shortScript?.fullScript || "").trim().length >= 15 &&
    (longScript?.fullScript || "").trim().length >= 15;

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold">Script & Generate</span>
        <Badge className="gradient-bg text-white border-0 text-[10px]">
          {selectedCompositeArray.length} Reference Angles
        </Badge>
      </div>

      {/* Selected composites preview strip */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Reference Material ({selectedCompositeArray.length} composites)</Label>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {selectedCompositeArray.map((comp, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl border border-border/50 p-1.5 bg-card/50 shrink-0">
              <img src={comp.url} alt={comp.title} className="w-10 h-14 rounded-lg object-cover border border-border" />
              <div>
                <p className="text-[10px] font-semibold">{comp.title}</p>
                <p className="text-[9px] text-muted-foreground">{comp.avatarAngle || `Angle ${i + 1}`}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Language */}
      <div className="flex gap-2 flex-wrap">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.id}
            onClick={() => setLanguage(lang.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              language === lang.id ? "gradient-bg text-white" : "border border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            {lang.label}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground -mt-1">
        Indian languages supported: Hindi, Hinglish, Marathi, Tamil, Telugu, Kannada, Malayalam, Bengali, Gujarati, Punjabi, Urdu, and Odia.
      </p>

      {/* Tone */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Script Tone</Label>
        <div className="flex gap-2 flex-wrap">
          {TONES.map((tone) => (
            <button
              key={tone.id}
              onClick={() => setScriptTone(tone.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                scriptTone === tone.id ? "gradient-bg text-white" : "border border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {tone.label}
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
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            allowEmotionTags ? "translate-x-4" : "translate-x-0.5"
          }`} />
        </button>
        <span className="text-xs text-muted-foreground">
          Allow emotion tags like <code className="text-primary bg-primary/10 px-1 rounded">{`{{happy}}`}</code> in script
        </span>
      </div>

      {/* User Intent Input (Optional) */}
      <div className="space-y-2">
        <Label className="text-xs">
          Anything specific you want in the scripts? <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          value={script}
          onChange={(e) => setScript(e.target.value.slice(0, MAX_SCRIPT))}
          placeholder="e.g. 'mention the terrace view' or 'highlight the modern kitchen' — AI will incorporate this into both scripts"
          className="min-h-20 resize-none text-sm"
          maxLength={MAX_SCRIPT}
        />
      </div>

      {/* Generate Scripts Button */}
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleGenerateScript} 
        disabled={generatingScript} 
        className={`w-full cursor-pointer text-sm h-11 transition-all ${generatingScript ? 'bg-primary/5' : 'hover:bg-primary/5 hover:border-primary/50'}`}
      >
        {generatingScript ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin text-primary" /> Crafting Professional Scripts...</>
        ) : (
          <><Sparkles className="w-4 h-4 mr-2 text-primary" /> ✨ Generate 2 Scripts (Short + Long)</>
        )}
      </Button>

      {/* Loading Skeleton if generating and no scripts yet */}
      {generatingScript && structuredScripts.length === 0 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-dashed border-border/60 p-8 flex flex-col items-center justify-center gap-3 bg-muted/20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <div className="space-y-1 text-center">
              <p className="text-sm font-medium">AI is writing your scripts...</p>
              <p className="text-[10px] text-muted-foreground">Using {selectedCompositeArray.length} reference angles for accuracy</p>
            </div>
          </div>
          <div className="h-30 rounded-xl bg-muted/40 animate-pulse" />
          <div className="h-45 rounded-xl bg-muted/40 animate-pulse" />
        </div>
      )}

      {/* Empty State / Not Generated yet */}
      {!generatingScript && !shortScript && !longScript && (
        <div className="rounded-xl border-2 border-dashed border-border/40 p-10 flex flex-col items-center justify-center gap-4 bg-muted/10">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold">No scripts generated yet</p>
            <p className="text-xs text-muted-foreground max-w-60 mx-auto">
              Click the button above to generate professional short and long form scripts for your videos.
            </p>
          </div>
        </div>
      )}

      {/* Short Script (8-10 seconds) */}
      {(shortScript || (generatingScript && structuredScripts.length > 0)) && (
        <div className={`rounded-xl border transition-all overflow-hidden ${shortScript ? 'border-primary/30 bg-primary/5' : 'border-border/50 bg-muted/10 opacity-50'}`}>
          <div className="flex items-center gap-2 px-3 py-2 border-b border-primary/20 bg-primary/10">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <Badge className="bg-primary text-white border-0 text-[10px]">8-10 Seconds</Badge>
            <span className="text-xs font-semibold">Short Script</span>
            {shortScript && (
              <span className="text-[10px] text-muted-foreground ml-auto">
                {shortScript.wordCount || shortScript.fullScript.split(/\s+/).length} words
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => regenerateSingleScript?.(0, "short_form")}
              disabled={generatingScript}
              className="h-6 px-2 text-[10px] cursor-pointer hover:bg-primary/20"
            >
              <RotateCcw className="w-3 h-3 mr-1" /> {generatingScript ? "Regenerating..." : "Regenerate"}
            </Button>
          </div>
          <div className="p-3">
            <Textarea
              value={shortScript?.fullScript || ""}
              onChange={(e) => {
                setStructuredScripts((prev) => {
                  const updated = [...prev];
                  const index = updated.findIndex(s => s?.type === "short_form");
                  if (index >= 0) {
                    updated[index] = { ...updated[index], fullScript: e.target.value };
                  }
                  return updated;
                });
                setBatchScripts((bs) => {
                  const b = [...bs];
                  b[0] = e.target.value;
                  return b;
                });
              }}
              className="min-h-25 resize-none text-sm bg-background border-primary/10 focus-visible:ring-primary/30"
              placeholder="Short script (8-10 seconds)"
            />
            <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" /> Fast-paced, hook-heavy script for short-form video
            </p>
          </div>
        </div>
      )}

      {/* Long Script (45-60 seconds) */}
      {(longScript || (generatingScript && structuredScripts.length > 0)) && (
        <div className={`rounded-xl border transition-all overflow-hidden ${longScript ? 'border-border/50 bg-card/40' : 'border-border/30 bg-muted/10 opacity-50'}`}>
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30 bg-card/60">
            <Video className="w-3.5 h-3.5 text-primary" />
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">45-60 Seconds</Badge>
            <span className="text-xs font-semibold">Full Walkthrough Script</span>
            {longScript && (
              <span className="text-[10px] text-muted-foreground ml-auto">
                {longScript.wordCount || longScript.fullScript.split(/\s+/).length} words
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => regenerateSingleScript?.(1, "long_form")}
              disabled={generatingScript}
              className="h-6 px-2 text-[10px] cursor-pointer hover:bg-card-foreground/10"
            >
              <RotateCcw className="w-3 h-3 mr-1" /> {generatingScript ? "Regenerating..." : "Regenerate"}
            </Button>
          </div>
          <div className="p-3">
            <Textarea
              value={longScript?.fullScript || ""}
              onChange={(e) => {
                setStructuredScripts((prev) => {
                  const updated = [...prev];
                  const index = updated.findIndex(s => s?.type === "long_form");
                  if (index >= 0) {
                    updated[index] = { ...updated[index], fullScript: e.target.value };
                  }
                  return updated;
                });
                setBatchScripts((bs) => {
                  const b = [...bs];
                  b[1] = e.target.value;
                  return b;
                });
              }}
              className="min-h-37.5 resize-none text-sm bg-background border-border/50 focus-visible:ring-primary/20"
              placeholder="Full script (45-60 seconds)"
            />
            <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" /> Narrative script that references different angles naturally
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t border-border/50">
        <Button variant="outline" onClick={onBack} className="cursor-pointer">
          Back
        </Button>
        <div className="flex gap-3">
          {(shortScript || longScript) && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={retryScriptGeneration} 
              className="cursor-pointer text-xs gap-1.5 h-10 px-4"
              disabled={generatingScript}
            >
              <RotateCcw className={`w-3.5 h-3.5 ${generatingScript ? 'animate-spin' : ''}`} /> 
              Regenerate Both
            </Button>
          )}
          <Button 
            onClick={onGenerate} 
            disabled={!canGenerateFinalVideos || generating || generatingScript} 
            className="gradient-bg text-white shadow-lg cursor-pointer px-10 h-10 font-semibold"
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating Videos...</>
            ) : (
              <><Video className="w-4 h-4 mr-2" /> Generate Final Videos</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};