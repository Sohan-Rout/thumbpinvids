const fs = require('fs');
let code = fs.readFileSync('src/app/app/real-estate-video/page.js', 'utf8');

code = code.replace(
  'import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";',
  'import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";\nimport { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";'
);

code = code.replace(
  'const [propertyBrief, setPropertyBrief] = useState({',
  'const [propertyDrawerOpen, setPropertyDrawerOpen] = useState(false);\n  const [propertyBrief, setPropertyBrief] = useState({'
);

const oldPropertyBriefCode = `
          {/* Property brief / questionnaire */}
          <div className="rounded-xl border border-border/50 p-4 bg-card/50 space-y-3">
            <h3 className="text-sm font-semibold">Property Brief (for AI script)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                placeholder="Location (e.g., Gurgaon Sector 49)"
                value={propertyBrief.location}
                onChange={(e) => setPropertyBrief((p) => ({ ...p, location: e.target.value }))}
              />
              <Input
                placeholder="Property type (e.g., 3BHK apartment)"
                value={propertyBrief.propertyType}
                onChange={(e) => setPropertyBrief((p) => ({ ...p, propertyType: e.target.value }))}
              />
              <Input
                placeholder="Price (e.g., ₹1.2 Cr)"
                value={propertyBrief.price}
                onChange={(e) => setPropertyBrief((p) => ({ ...p, price: e.target.value }))}
              />
              <Input
                placeholder="Bedrooms (e.g., 3)"
                value={propertyBrief.bedrooms}
                onChange={(e) => setPropertyBrief((p) => ({ ...p, bedrooms: e.target.value }))}
              />
              <Input
                placeholder="Bathrooms (e.g., 2)"
                value={propertyBrief.bathrooms}
                onChange={(e) => setPropertyBrief((p) => ({ ...p, bathrooms: e.target.value }))}
              />
              <Input
                placeholder="Area/size (e.g., 1650 sq ft)"
                value={propertyBrief.area}
                onChange={(e) => setPropertyBrief((p) => ({ ...p, area: e.target.value }))}
              />
            </div>
            <Textarea
              placeholder="Key features (e.g., floor-to-ceiling windows, park view, modular kitchen)"
              className="min-h-20 resize-none text-sm"
              value={propertyBrief.keyFeatures}
              onChange={(e) => setPropertyBrief((p) => ({ ...p, keyFeatures: e.target.value }))}
            />
            <Textarea
              placeholder="Amenities (e.g., gym, pool, clubhouse, parking)"
              className="min-h-20 resize-none text-sm"
              value={propertyBrief.amenities}
              onChange={(e) => setPropertyBrief((p) => ({ ...p, amenities: e.target.value }))}
            />

            <div className="flex gap-2 flex-wrap">
              {LANGUAGES.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setScriptLanguage(l.id)}
                  className={\`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer \${
                    scriptLanguage === l.id ? "gradient-bg text-white" : "border border-border text-muted-foreground hover:border-primary/40"
                  }\`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2 flex-wrap">
              {TONES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setScriptTone(t.id)}
                  className={\`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer \${
                    scriptTone === t.id ? "gradient-bg text-white" : "border border-border text-muted-foreground hover:border-primary/40"
                  }\`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={allowEmotionTags} onCheckedChange={setAllowEmotionTags} />
              <span className="text-xs text-muted-foreground">Allow emotion tags like {{happy}} or {{sad}}</span>
            </div>

            <Button
              onClick={handleGenerateScript}
              disabled={generatingScript}
              className="w-full cursor-pointer gradient-bg text-white"
            >
              {generatingScript ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4 mr-2" />
              )}
              {generatingScript ? "Writing Script..." : "Generate AI Script"}
            </Button>
          </div>`;

const newPropertyBriefCode = `
          {/* Property brief / questionnaire drawer */}
          <div className="rounded-xl border border-border/50 p-4 bg-card/50 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">AI Script Generator</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Fill in property details to auto-generate a professional script.</p>
              </div>
              <Button onClick={() => setPropertyDrawerOpen(true)} variant="outline" size="sm" className="h-8 gap-2 cursor-pointer">
                <Building2 className="w-3.5 h-3.5 text-primary" /> Edit Details
              </Button>
            </div>
            
            <div className="flex items-center gap-4 mt-1">
              <div className="flex-1 space-y-2">
                <Label className="text-xs">Language</Label>
                <div className="flex gap-2 flex-wrap">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => setScriptLanguage(l.id)}
                      className={\`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer \${
                        scriptLanguage === l.id ? "gradient-bg text-white" : "border border-border text-muted-foreground hover:border-primary/40"
                      }\`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex-1 space-y-2">
                <Label className="text-xs">Tone</Label>
                <div className="flex gap-2 flex-wrap">
                  {TONES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setScriptTone(t.id)}
                      className={\`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer \${
                        scriptTone === t.id ? "gradient-bg text-white" : "border border-border text-muted-foreground hover:border-primary/40"
                      }\`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-1">
              <Switch checked={allowEmotionTags} onCheckedChange={setAllowEmotionTags} />
              <span className="text-xs text-muted-foreground">Allow emotion tags like {{happy}} or {{sad}}</span>
            </div>

            <Button
              onClick={handleGenerateScript}
              disabled={generatingScript}
              className="w-full mt-2 cursor-pointer gradient-bg text-white shadow-md"
            >
              {generatingScript ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4 mr-2" />
              )}
              {generatingScript ? "Writing Script..." : "Generate AI Script"}
            </Button>
          </div>

          <Sheet open={propertyDrawerOpen} onOpenChange={setPropertyDrawerOpen}>
            <SheetContent side="right" className="overflow-y-auto w-full sm:max-w-md">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 text-base">
                  <Building2 className="w-4 h-4 text-primary" /> Property Details
                </SheetTitle>
                <SheetDescription className="text-xs">
                  Provide details to generate a highly accurate, tailored script.
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-4 pb-12">
                <div className="space-y-1">
                  <Label className="text-xs">Location</Label>
                  <Input
                    placeholder="e.g., Gurgaon Sector 49"
                    value={propertyBrief.location}
                    onChange={(e) => setPropertyBrief((p) => ({ ...p, location: e.target.value }))}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Property Type</Label>
                    <Input
                      placeholder="e.g., 3BHK apartment"
                      value={propertyBrief.propertyType}
                      onChange={(e) => setPropertyBrief((p) => ({ ...p, propertyType: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Price</Label>
                    <Input
                      placeholder="e.g., ₹1.2 Cr"
                      value={propertyBrief.price}
                      onChange={(e) => setPropertyBrief((p) => ({ ...p, price: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Bedrooms</Label>
                    <Input
                      placeholder="e.g., 3"
                      value={propertyBrief.bedrooms}
                      onChange={(e) => setPropertyBrief((p) => ({ ...p, bedrooms: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Bathrooms</Label>
                    <Input
                      placeholder="e.g., 2"
                      value={propertyBrief.bathrooms}
                      onChange={(e) => setPropertyBrief((p) => ({ ...p, bathrooms: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs">Area / Size</Label>
                    <Input
                      placeholder="e.g., 1650 sq ft"
                      value={propertyBrief.area}
                      onChange={(e) => setPropertyBrief((p) => ({ ...p, area: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Key Features</Label>
                  <Textarea
                    placeholder="e.g., floor-to-ceiling windows, park view, modular kitchen"
                    className="min-h-24 resize-none text-sm"
                    value={propertyBrief.keyFeatures}
                    onChange={(e) => setPropertyBrief((p) => ({ ...p, keyFeatures: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Amenities</Label>
                  <Textarea
                    placeholder="e.g., gym, pool, clubhouse, parking"
                    className="min-h-24 resize-none text-sm"
                    value={propertyBrief.amenities}
                    onChange={(e) => setPropertyBrief((p) => ({ ...p, amenities: e.target.value }))}
                  />
                </div>

                <Button 
                  onClick={() => setPropertyDrawerOpen(false)} 
                  className="w-full mt-4 cursor-pointer"
                >
                  Save Details
                </Button>
              </div>
            </SheetContent>
          </Sheet>`;

code = code.replace(oldPropertyBriefCode, newPropertyBriefCode);

// Add Label to imports from @/components/ui/label if not present
if (!code.includes('import { Label } from "@/components/ui/label"')) {
  code = code.replace(
    'import { Input } from "@/components/ui/input";',
    'import { Input } from "@/components/ui/input";\nimport { Label } from "@/components/ui/label";'
  );
}

fs.writeFileSync('src/app/app/real-estate-video/page.js', code);
