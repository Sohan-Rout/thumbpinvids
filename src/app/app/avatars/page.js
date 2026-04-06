"use client";

import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAvatarsAndVoices } from "@/hooks/use-avatars-voices";
import { toast } from "sonner";
import {
  Search,
  Upload,
  Eye,
  CheckCircle,
  Trash2,
  Loader2,
  ImagePlus,
  X,
  Sparkles,
  Wand2,
  Users as UsersIcon,
} from "lucide-react";
import { useHeygen } from "@/hooks/use-heygen";
import { useRouter } from "next/navigation";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function AvatarsPage() {
  const {
    avatars,
    customAvatars,
    libraryAvatars,
    loading: baseLoading,
    uploading,
    uploadAvatar,
    deleteAvatar,
    refetch: refetchBase,
  } = useAvatarsAndVoices();

  const { photoAvatars, loading: photoLoading, refreshAvatars } = useHeygen();
  const router = useRouter();

  const loading = baseLoading || photoLoading;

  const demoBugs = process.env.NEXT_PUBLIC_DEMO_BUGS === "true";

  const [search, setSearch] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [previewAvatar, setPreviewAvatar] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [avatarName, setAvatarName] = useState("");
  const [deleting, setDeleting] = useState(null);
  const fileInputRef = useRef(null);

  const filteredLibrary = libraryAvatars.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.ethnicity.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCustom = customAvatars.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase())
  );

  const isFullUrl = (url) => url && url.startsWith("http");

  // Specialized card for AI Photo Avatars
  function PhotoAvatarCard({ group }) {
    const avatar = group.avatar_list?.[0] || group;
    const isSelected = selectedAvatar?.id === group.group_id;

    return (
      <Card
        className={`group cursor-pointer border-border/50 hover:shadow-lg transition-all hover:-translate-y-1 overflow-hidden ${
          isSelected ? "ring-2 ring-primary border-primary" : ""
        }`}
        onClick={() => {
          setSelectedAvatar({
            id: group.group_id,
            name: group.name,
            image_url: avatar.image_url,
            is_photo_avatar: true,
            avatar_id: avatar.avatar_id
          });
        }}
      >
        <CardContent className="p-0">
          <div className="aspect-square bg-gradient-to-br from-purple-500/10 to-blue-500/10 relative flex items-center justify-center overflow-hidden">
            <img
              src={avatar.image_url || "/placeholder-avatar.png"}
              alt={group.name}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                size="sm"
                className="gradient-bg text-white h-8 px-3 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  // Pre-select and navigate to real estate video
                  router.push(`/app/real-estate-video?avatarId=${avatar.avatar_id}&mode=photo`);
                }}
              >
                <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                Use in Video
              </Button>
            </div>

            <div className="absolute top-2 left-2">
              <Badge className="bg-purple-600 text-white text-[10px] px-1.5 py-0.5 border-0">
                AI Generated
              </Badge>
            </div>

            {isSelected && (
              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
          <div className="p-3">
            <p className="text-sm font-medium truncate">{group.name || "Untitled"}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {group.avatar_list?.length || 1} Variations • Trained
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Invalid file type", {
        description: "Please use JPEG, PNG, or WebP images.",
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large", {
        description: "Maximum file size is 5MB.",
      });
      return;
    }

    setUploadFile(file);
    setUploadPreview(URL.createObjectURL(file));
    setAvatarName(file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "));
    setUploadModalOpen(true);
  }

  async function handleUpload() {
    if (!uploadFile) return;

    const result = await uploadAvatar(uploadFile, avatarName || "Custom Avatar");

    if (result.success) {
      toast.success("Avatar uploaded! 🎉", {
        description: `"${avatarName}" is now available in your avatar library.`,
      });
      closeUploadModal();
    } else {
      toast.error("Upload failed", {
        description: result.error,
      });
    }
  }

  function closeUploadModal() {
    setUploadModalOpen(false);
    setUploadFile(null);
    setUploadPreview(null);
    setAvatarName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDelete(avatar) {
    setDeleting(avatar.id);
    const result = await deleteAvatar(avatar.id);

    if (result.success) {
      toast.success("Avatar deleted", {
        description: `"${avatar.name}" has been removed.`,
      });
      if (selectedAvatar?.id === avatar.id) setSelectedAvatar(null);
      if (previewAvatar?.id === avatar.id) setPreviewAvatar(null);
    } else {
      toast.error("Delete failed", { description: result.error });
    }
    setDeleting(null);
  }

  // Render an avatar card
  function AvatarCard({ avatar, showDelete = false }) {
    return (
      <Card
        key={avatar.id}
        className={`group cursor-pointer border-border/50 hover:shadow-lg transition-all hover:-translate-y-1 overflow-hidden ${
          selectedAvatar?.id === avatar.id
            ? "ring-2 ring-primary border-primary"
            : ""
        }`}
        onClick={() => setSelectedAvatar(avatar)}
      >
        <CardContent className="p-0">
          {/* Avatar Image */}
          <div className="aspect-square bg-gradient-to-br from-primary/10 to-accent/10 relative flex items-center justify-center overflow-hidden">
            {isFullUrl(avatar.image_url) ? (
              <img
                src={avatar.image_url}
                alt={avatar.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl font-bold text-primary/40">
                {avatar.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </span>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center cursor-pointer hover:bg-white/30 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewAvatar(avatar);
                }}
              >
                <Eye className="w-4 h-4 text-white" />
              </button>
              {showDelete && (
                <button
                  className="w-8 h-8 rounded-full bg-red-500/30 backdrop-blur flex items-center justify-center cursor-pointer hover:bg-red-500/50 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(avatar);
                  }}
                  disabled={deleting === avatar.id}
                >
                  {deleting === avatar.id ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 text-white" />
                  )}
                </button>
              )}
            </div>

            {selectedAvatar?.id === avatar.id && (
              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
            )}

            {avatar.is_custom && (
              <div className="absolute top-2 left-2">
                <Badge className="bg-primary/80 text-white text-[10px] px-1.5 py-0.5 border-0">
                  Custom
                </Badge>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-3">
            <p className="text-sm font-medium truncate">{avatar.name}</p>
            <Badge variant="secondary" className="text-xs mt-1">
              {avatar.ethnicity}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading">
            Avatar Library
          </h1>
          <p className="text-muted-foreground mt-1">
            Choose from 20+ diverse Indian faces or upload your own
          </p>
        </div>
        <Button
          className="cursor-pointer gradient-bg text-white shadow-lg"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              {demoBugs ? "Upload Custom undefined" : "Upload Custom Avatar"}
            </>
          )}
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search avatars by name or ethnicity..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-0">
                <Skeleton className="aspect-square w-full" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-5 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Tabs defaultValue={customAvatars.length > 0 ? "all" : "library"} className="w-full">
          <TabsList>
            <TabsTrigger value="all" className="cursor-pointer">
              All ({avatars.length + photoAvatars.length})
            </TabsTrigger>
            {customAvatars.length > 0 && (
              <TabsTrigger value="custom" className="cursor-pointer">
                My Uploads ({customAvatars.length})
              </TabsTrigger>
            )}
            {photoAvatars.length > 0 && (
              <TabsTrigger value="photo" className="cursor-pointer">
                AI Photo Avatars ({photoAvatars.length})
              </TabsTrigger>
            )}
            <TabsTrigger value="library" className="cursor-pointer">
              Standard Library ({libraryAvatars.length})
            </TabsTrigger>
          </TabsList>

          {/* All Avatars */}
          <TabsContent value="all" className="mt-4">
            {/* Custom avatars first */}
            {filteredCustom.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                  My Uploaded Avatars
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filteredCustom.map((avatar) => (
                    <AvatarCard
                      key={avatar.id}
                      avatar={avatar}
                      showDelete={true}
                    />
                  ))}
                  {/* Upload placeholder card */}
                  <Card
                    className="border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer group"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <CardContent className="p-0 flex items-center justify-center aspect-square">
                      <div className="text-center space-y-2">
                        <ImagePlus className="w-8 h-8 text-muted-foreground mx-auto group-hover:text-primary transition-colors" />
                        <p className="text-xs text-muted-foreground font-medium">
                          Upload More
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* AI Photo Avatars */}
            {photoAvatars.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-3 h-3" />
                  AI Photo Avatars (HeyGen v2)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {photoAvatars.map((group) => (
                    <PhotoAvatarCard key={group.group_id} group={group} />
                  ))}
                </div>
              </div>
            )}

            {/* Library avatars */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                Standard Library
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredLibrary.map((avatar) => (
                  <AvatarCard key={avatar.id} avatar={avatar} />
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Photo Avatars Only */}
          <TabsContent value="photo" className="mt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {photoAvatars.map((group) => (
                <PhotoAvatarCard key={group.group_id} group={group} />
              ))}
            </div>
          </TabsContent>

          {/* Custom Avatars Only */}
          <TabsContent value="custom" className="mt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredCustom.map((avatar) => (
                <AvatarCard
                  key={avatar.id}
                  avatar={avatar}
                  showDelete={true}
                />
              ))}
              <Card
                className="border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                <CardContent className="p-0 flex items-center justify-center aspect-square">
                  <div className="text-center space-y-2">
                    <ImagePlus className="w-8 h-8 text-muted-foreground mx-auto group-hover:text-primary transition-colors" />
                    <p className="text-xs text-muted-foreground font-medium">
                      Upload New Avatar
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
            {filteredCustom.length === 0 && (
              <div className="text-center py-12">
                <ImagePlus className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  No custom avatars yet
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload your first avatar to get started
                </p>
                <Button
                  className="mt-4 cursor-pointer gradient-bg text-white"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Avatar
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Library Avatars Only */}
          <TabsContent value="library" className="mt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredLibrary.map((avatar) => (
                <AvatarCard key={avatar.id} avatar={avatar} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {!loading &&
        search &&
        filteredLibrary.length === 0 &&
        filteredCustom.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No avatars found matching &ldquo;{search}&rdquo;
            </p>
          </div>
        )}

      {/* Upload Preview Modal */}
      <Dialog open={uploadModalOpen} onOpenChange={(open) => !open && closeUploadModal()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Upload Custom Avatar</DialogTitle>
            <DialogDescription>
              This image will be used as your avatar face in video generation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Preview */}
            <div className="aspect-square rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center overflow-hidden relative">
              {uploadPreview ? (
                <img
                  src={uploadPreview}
                  alt="Upload preview"
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <ImagePlus className="w-12 h-12 text-muted-foreground" />
              )}
            </div>

            {/* Name input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Avatar Name</label>
              <Input
                placeholder="e.g., My Brand Face"
                value={avatarName}
                onChange={(e) => setAvatarName(e.target.value)}
                maxLength={50}
              />
            </div>

            {/* File info */}
            {uploadFile && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>File: {uploadFile.name}</p>
                <p>Size: {(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                <p>Type: {uploadFile.type}</p>
              </div>
            )}

            {/* Tips */}
            <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
              <p className="text-xs text-muted-foreground">
                💡 <strong>Tips for best results:</strong>
              </p>
              <ul className="text-xs text-muted-foreground mt-1 space-y-0.5 list-disc list-inside">
                <li>Use a clear, front-facing photo</li>
                <li>Good lighting, neutral background</li>
                <li>Face should be clearly visible</li>
                <li>Square aspect ratio works best (1:1)</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 cursor-pointer"
                onClick={closeUploadModal}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 gradient-bg text-white cursor-pointer shadow-lg"
                onClick={handleUpload}
                disabled={uploading || !uploadFile}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Avatar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        open={!!previewAvatar}
        onOpenChange={() => setPreviewAvatar(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{previewAvatar?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="aspect-square rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center overflow-hidden">
              {previewAvatar && isFullUrl(previewAvatar.image_url) ? (
                <img
                  src={previewAvatar.image_url}
                  alt={previewAvatar.name}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <span className="text-6xl font-bold text-primary/40">
                  {previewAvatar?.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")}
                </span>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Type</span>
                <span>
                  {previewAvatar?.is_custom ? (
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                      Custom Upload
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Library
                    </Badge>
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ethnicity</span>
                <span>{previewAvatar?.ethnicity}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Image</span>
                <span className="text-xs truncate max-w-[150px]">
                  {previewAvatar?.image_url &&
                  isFullUrl(previewAvatar.image_url)
                    ? "✅ Ready"
                    : "⚠️ Needs real image"}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              {previewAvatar?.is_custom && (
                <Button
                  variant="outline"
                  className="cursor-pointer text-destructive hover:text-destructive"
                  onClick={() => {
                    handleDelete(previewAvatar);
                    setPreviewAvatar(null);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              )}
              <Button
                className="flex-1 gradient-bg text-white cursor-pointer"
                onClick={() => {
                  setSelectedAvatar(previewAvatar);
                  setPreviewAvatar(null);
                }}
              >
                Select This Avatar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
