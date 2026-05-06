"use client";
import { useState, useRef } from "react";
import { X, ImagePlus, MapPin, Building2 } from "lucide-react";

export default function MultiImageUploadBox({ images, onAdd, onRemove, maxImages = 3 }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleFiles(files) {
    const valid = Array.from(files).filter((f) => f.type.startsWith("image/"));
    valid.forEach((f) => {
      if (images.length < maxImages) onAdd(f);
    });
  }

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-900">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-sm font-bold text-gray-900 tracking-tight">Property Images</span>
            <p className="text-xs text-gray-500 mt-0.5">
              Upload 1-{maxImages} high-quality images
            </p>
          </div>
        </div>
        
        {/* Custom Badge for Count */}
        <div className="px-2.5 py-1 rounded-full border border-gray-200 bg-white text-[11px] font-semibold text-gray-900">
          {images.length} / {maxImages}
        </div>
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div
          className={`grid gap-4 ${
            images.length === 1
              ? "grid-cols-1 max-w-xs mx-auto"
              : images.length === 2
              ? "grid-cols-2"
              : "grid-cols-3"
          }`}
        >
          {images.map((img, i) => (
            <div
              key={i}
              className="relative group rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 aspect-[4/3]"
            >
              <img
                src={URL.createObjectURL(img)}
                alt={`Property ${i + 1}`}
                className="w-full h-full object-cover"
              />
              
              {/* Delete Button */}
              <button
                onClick={() => onRemove(i)}
                className="absolute top-2 right-2 w-7 h-7 bg-black/80 backdrop-blur-md rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-black"
              >
                <X className="w-3.5 h-3.5 text-white" />
              </button>

              {/* Badge */}
              <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2.5 py-1 bg-black/80 backdrop-blur-md rounded-md text-white border border-white/10 shadow-sm">
                <MapPin className="w-3 h-3" />
                <span className="text-[10px] font-medium tracking-wide">Property {i + 1}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dropzone */}
      {images.length < maxImages && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`
            relative w-full rounded-xl border-2 border-dashed p-8 flex flex-col items-center justify-center gap-3 transition-all duration-300 cursor-pointer select-none
            ${
              isDragging
                ? "border-gray-900 bg-gray-50 scale-[0.99]"
                : "border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50/50"
            }
          `}
        >
          {/* Icon with subtle background */}
          <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isDragging ? "bg-gray-200 text-gray-900" : "bg-gray-50 text-gray-400"}`}>
            <ImagePlus className={`w-6 h-6 transition-transform ${isDragging ? "scale-110" : ""}`} />
          </div>

          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-gray-900">
              {images.length === 0 ? "Click to upload or drag and drop" : "Add more images"}
            </p>
            <p className="text-xs text-gray-500">
              PNG, JPG or WEBP (max. 5MB each)
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) handleFiles(e.target.files);
            }}
          />
        </div>
      )}
    </div>
  );
}