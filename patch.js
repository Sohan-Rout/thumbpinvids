const fs = require('fs');
let code = fs.readFileSync('src/app/app/assets/page.js', 'utf8');

const previewModal = `
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
`;

code = code.replace('{/* Upload Modal */}', previewModal + '\n      {/* Upload Modal */}');
code = code.replace('onClick={() => setSelectedAsset(asset)}', 'onClick={() => { setSelectedAsset(asset); if (isVideo) setPreviewAsset(asset); }}');

fs.writeFileSync('src/app/app/assets/page.js', code);
