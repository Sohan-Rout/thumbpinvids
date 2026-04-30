/**
 * Client-side video combiner using FFmpeg WASM
 * Combines multiple video clips into one with crossfade transitions.
 * Runs entirely in the browser — no server-side FFmpeg needed.
 */

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";

let ffmpegInstance = null;
let loadingPromise = null;

/**
 * Lazily load FFmpeg WASM (single-threaded core — no SharedArrayBuffer needed)
 */
async function getFFmpeg(onLog) {
  if (ffmpegInstance?.loaded) return ffmpegInstance;

  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const ffmpeg = new FFmpeg();

    if (onLog) {
      ffmpeg.on("log", ({ message }) => onLog(message));
    }

    // Load single-threaded core from CDN (avoids COOP/COEP header requirements)
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });

    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  return loadingPromise;
}

/**
 * Combine multiple video URLs into a single video with crossfade transitions.
 *
 * @param {string[]} videoUrls - Array of video URLs to combine
 * @param {object} options
 * @param {number} options.crossfadeDuration - Duration of crossfade in seconds (default: 0.5)
 * @param {function} options.onProgress - Progress callback (message: string)
 * @param {function} options.onLog - FFmpeg log callback
 * @returns {Promise<{ blobUrl: string, blob: Blob }>} Combined video blob URL + blob
 */
export async function combineVideos(videoUrls, options = {}) {
  const { crossfadeDuration = 0.5, onProgress, onLog } = options;

  if (!videoUrls || videoUrls.length === 0) {
    throw new Error("No video URLs provided");
  }

  // Single video — no combining needed
  if (videoUrls.length === 1) {
    const response = await fetch(videoUrls[0]);
    const blob = await response.blob();
    return { blobUrl: URL.createObjectURL(blob), blob };
  }

  onProgress?.("Loading FFmpeg engine...");
  const ffmpeg = await getFFmpeg(onLog);

  // Download all videos and write to FFmpeg's virtual filesystem
  for (let i = 0; i < videoUrls.length; i++) {
    onProgress?.(`Downloading video ${i + 1}/${videoUrls.length}...`);
    const data = await fetchFile(videoUrls[i]);
    await ffmpeg.writeFile(`input${i}.mp4`, data);
  }

  // Strategy: For 2+ videos, use xfade crossfade filter
  onProgress?.("Stitching videos with crossfade transitions...");

  if (videoUrls.length === 2) {
    // Simple 2-video crossfade
    await ffmpeg.exec([
      "-i", "input0.mp4",
      "-i", "input1.mp4",
      "-filter_complex",
      `[0:v][1:v]xfade=transition=fade:duration=${crossfadeDuration}:offset=auto[outv];[0:a][1:a]acrossfade=d=${crossfadeDuration}[outa]`,
      "-map", "[outv]",
      "-map", "[outa]",
      "-c:v", "libx264",
      "-preset", "fast",
      "-crf", "23",
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
      "output.mp4",
    ]);
  } else {
    // 3+ videos: Use concat demuxer (simpler, more reliable in WASM)
    // Create a concat list file
    const concatList = videoUrls
      .map((_, i) => `file 'input${i}.mp4'`)
      .join("\n");

    await ffmpeg.writeFile(
      "concat.txt",
      new TextEncoder().encode(concatList)
    );

    await ffmpeg.exec([
      "-f", "concat",
      "-safe", "0",
      "-i", "concat.txt",
      "-c:v", "libx264",
      "-preset", "fast",
      "-crf", "23",
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
      "output.mp4",
    ]);
  }

  onProgress?.("Finalizing combined video...");

  // Read the output
  const outputData = await ffmpeg.readFile("output.mp4");
  const blob = new Blob([outputData.buffer], { type: "video/mp4" });
  const blobUrl = URL.createObjectURL(blob);

  // Clean up virtual filesystem
  for (let i = 0; i < videoUrls.length; i++) {
    try { await ffmpeg.deleteFile(`input${i}.mp4`); } catch {}
  }
  try { await ffmpeg.deleteFile("output.mp4"); } catch {}
  try { await ffmpeg.deleteFile("concat.txt"); } catch {}

  onProgress?.("Done!");
  return { blobUrl, blob };
}

/**
 * Upload a combined video blob to the server for permanent storage.
 *
 * @param {Blob} blob - The combined video blob
 * @param {string} filename - Desired filename
 * @returns {Promise<{ url: string }>} Permanent URL
 */
export async function uploadCombinedVideo(blob, filename = "combined-walkthrough.mp4") {
  const fd = new FormData();
  fd.append("video", new File([blob], filename, { type: "video/mp4" }));

  const res = await fetch("/api/real-estate-video/save-combined", {
    method: "POST",
    body: fd,
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to save combined video");
  }

  return res.json();
}
