/**
 * Client-side video combiner using FFmpeg WASM
 * Combines multiple video clips into one with simple concatenation.
 * Runs entirely in the browser — no server-side FFmpeg needed.
 *
 * Fix: always create a fresh FFmpeg instance per call to avoid
 * virtual FS state corruption ("ErrnoError: FS error") across invocations.
 */

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";

/**
 * Load a fresh FFmpeg WASM instance (single-threaded core).
 * We do NOT cache the instance — a dirty FS causes ErrnoError on reuse.
 */
async function loadFreshFFmpeg(onLog) {
  const ffmpeg = new FFmpeg();

  if (onLog) {
    ffmpeg.on("log", ({ message }) => onLog(message));
  }

  // Single-threaded core from CDN — no COOP/COEP headers required
  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  return ffmpeg;
}

function isImageUrl(url) {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return /\.(jpg|jpeg|png|webp|gif)$/.test(clean);
}

/**
 * Parse a WAV buffer (Uint8Array) and return its duration in seconds.
 * Walks the RIFF chunk list to find the "data" chunk rather than assuming
 * a fixed 44-byte header — some WAV encoders insert extra chunks before data.
 */
function getWavDurationSeconds(data) {
  try {
    // fetchFile returns Uint8Array; wrap in DataView for typed reads
    const buf = data instanceof Uint8Array ? data : new Uint8Array(data);
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

    // Must start with "RIFF" ... "WAVE"
    const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
    const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
    if (riff !== "RIFF" || wave !== "WAVE") return null;

    // fmt chunk is always first — read audio params at known offsets
    const sampleRate   = view.getUint32(24, true);
    const channels     = view.getUint16(22, true);
    const bitsPerSample = view.getUint16(34, true);
    const bytesPerSec  = sampleRate * channels * (bitsPerSample / 8);
    if (bytesPerSec <= 0) return null;

    // Walk chunks starting after "WAVE" (offset 12)
    let offset = 12;
    while (offset + 8 <= view.byteLength) {
      const id   = String.fromCharCode(view.getUint8(offset), view.getUint8(offset+1), view.getUint8(offset+2), view.getUint8(offset+3));
      const size = view.getUint32(offset + 4, true);
      if (id === "data") {
        return size / bytesPerSec;
      }
      offset += 8 + size + (size & 1); // RIFF chunks are word-aligned
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Combine multiple video URLs into a single video.
 * If audioUrls[i] is provided for a clip, that audio is mixed into the clip
 * before concatenation (voiceover / TTS overlay).
 *
 * @param {string[]} videoUrls         - Array of video URLs to combine
 * @param {object}   options
 * @param {function} options.onProgress - Progress callback (message: string)
 * @param {function} options.onLog      - FFmpeg log callback
 * @param {number[]} options.durations  - Per-clip max duration (outpoint trimming)
 * @param {Array}    options.audioUrls  - Parallel audio URLs (null where no audio)
 * @returns {Promise<{ blobUrl: string, blob: Blob }>}
 */
export async function combineVideos(videoUrls, options = {}) {
  const { onProgress, onLog, durations, audioUrls } = options;
  const logs = [];

  const internalLog = (msg) => {
    logs.push(`[${new Date().toISOString()}] ${msg}`);
    if (onLog) onLog(msg);
    console.log("[VideoCombiner]", msg);
  };

  if (!videoUrls || videoUrls.length === 0) {
    throw new Error("No video URLs provided");
  }

  // Single video — mix audio if present, then return
  if (videoUrls.length === 1 && !audioUrls?.[0]) {
    onProgress?.("Fetching video...");
    internalLog(`Single video detected. Fetching ${videoUrls[0]}`);
    const response = await fetch(videoUrls[0]);
    if (!response.ok) throw new Error(`Failed to fetch video: ${response.status}`);
    const blob = await response.blob();
    return { blobUrl: URL.createObjectURL(blob), blob, logs };
  }

  onProgress?.("Loading FFmpeg engine...");
  internalLog("Initializing FFmpeg WASM...");

  // Fresh instance every time — prevents FS state corruption
  const ffmpeg = await loadFreshFFmpeg((msg) => {
    logs.push(`[FFMPEG] ${msg}`);
    if (onLog) onLog(msg);
  });

  try {
    // Download all clips/images into FFmpeg's virtual FS.
    // Image URLs (from uploaded property photos) are converted to looped video clips.
    for (let i = 0; i < videoUrls.length; i++) {
      onProgress?.(`Downloading clip ${i + 1} of ${videoUrls.length}...`);
      internalLog(`Downloading clip ${i + 1}: ${videoUrls[i]}`);
      try {
        const data = await fetchFile(videoUrls[i]);

        if (isImageUrl(videoUrls[i])) {
          // Property B-roll: uploaded photo → static looped video
          const ext = videoUrls[i].split("?")[0].split(".").pop().toLowerCase();
          const imgFile = `img${i}.${ext}`;
          await ffmpeg.writeFile(imgFile, data);

          const clipDuration = durations?.[i] || 5;
          internalLog(`Converting image ${i + 1} to ${clipDuration}s video...`);
          await ffmpeg.exec([
            "-loop", "1",
            "-framerate", "25",
            "-i", imgFile,
            "-t", String(clipDuration),
            "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-pix_fmt", "yuv420p",
            "-an",
            `input${i}.mp4`,
          ]);
          internalLog(`Image ${i + 1} converted to video.`);
        } else {
          await ffmpeg.writeFile(`input${i}.mp4`, data);
          internalLog(`Wrote input${i}.mp4 (${data.length || data.byteLength} bytes)`);
        }
      } catch (fetchErr) {
        internalLog(`CRITICAL: Failed to download clip ${i + 1}: ${fetchErr.message}`);
        throw new Error(`Failed to fetch clip ${i + 1}: ${fetchErr.message}`);
      }
    }

    // Download audio files and mix into each clip that has one.
    // We parse the WAV duration so FFmpeg trims each merged clip exactly to the
    // speech length — this prevents mid-word cuts when outpoint < audio length.
    const clipFiles = videoUrls.map((_, i) => `input${i}.mp4`);
    const mergedIndices = new Set();
    const hasAnyAudio = audioUrls?.some(Boolean);
    if (hasAnyAudio) {
      onProgress?.("Mixing voiceover into clips...");
      for (let i = 0; i < videoUrls.length; i++) {
        const audioUrl = audioUrls?.[i];
        if (!audioUrl) continue;
        try {
          internalLog(`Downloading audio for clip ${i + 1}: ${audioUrl}`);
          const audioData = await fetchFile(audioUrl);
          await ffmpeg.writeFile(`audio${i}.wav`, audioData);

          // Calculate exact audio duration from WAV header so we can trim precisely
          const audioDuration = getWavDurationSeconds(audioData);
          internalLog(`Clip ${i + 1} audio duration: ${audioDuration ?? "unknown"}s`);

          const trimArgs = audioDuration
            ? ["-t", audioDuration.toFixed(3)]
            : ["-shortest"];

          internalLog(`Mixing audio into clip ${i + 1}...`);
          await ffmpeg.exec([
            "-i", `input${i}.mp4`,
            "-i", `audio${i}.wav`,
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "128k",
            "-map", "0:v:0",
            "-map", "1:a:0",
            ...trimArgs,
            "-avoid_negative_ts", "make_zero",
            `merged${i}.mp4`,
          ]);
          clipFiles[i] = `merged${i}.mp4`;
          mergedIndices.add(i);
          internalLog(`Clip ${i + 1} audio mixed.`);
        } catch (audioErr) {
          internalLog(`Audio mix failed for clip ${i + 1}: ${audioErr.message}. Using silent clip.`);
        }
      }
    }

    // If only one clip (possibly after audio mix), return it directly
    if (videoUrls.length === 1) {
      const outputData = await ffmpeg.readFile(clipFiles[0]);
      const blob = new Blob([outputData.buffer], { type: "video/mp4" });
      return { blobUrl: URL.createObjectURL(blob), blob, logs };
    }

    onProgress?.("Concatenating clips...");
    internalLog("Creating concat list...");

    // Merged clips are already trimmed to exact audio duration — no outpoint needed.
    // Silent clips still use the beat duration_seconds as outpoint.
    const concatList = clipFiles.map((file, i) => {
      const lines = [`file '${file}'`];
      if (!mergedIndices.has(i) && durations?.[i]) lines.push(`outpoint ${durations[i]}`);
      return lines.join("\n");
    }).join("\n");
    await ffmpeg.writeFile("concat.txt", new TextEncoder().encode(concatList));
    internalLog("concat.txt content:\n" + concatList);

    // Concat with stream copy first (fast, no re-encoding)
    // If streams are incompatible, re-encode with libx264
    try {
      internalLog("Executing FFmpeg (stream copy mode)...");
      await ffmpeg.exec([
        "-f", "concat",
        "-safe", "0",
        "-i", "concat.txt",
        "-c", "copy",           // stream copy — fastest, no quality loss
        "-movflags", "+faststart",
        "output.mp4",
      ]);
      internalLog("Stream copy finished.");
    } catch (copyErr) {
      // Fallback: re-encode if stream copy fails (e.g. mismatched codecs)
      internalLog(`Stream copy failed: ${copyErr.message}. Falling back to re-encoding...`);
      onProgress?.("Re-encoding for compatibility...");
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
      internalLog("Re-encoding finished.");
    }

    onProgress?.("Finalizing combined video...");
    internalLog("Reading output.mp4 from virtual FS...");

    const outputData = await ffmpeg.readFile("output.mp4");
    const blob = new Blob([outputData.buffer], { type: "video/mp4" });
    const blobUrl = URL.createObjectURL(blob);

    internalLog(`Combination successful. Final size: ${blob.size} bytes`);
    onProgress?.("Done!");
    return { blobUrl, blob, logs };

  } catch (err) {
    internalLog(`CRITICAL ERROR: ${err.message}`);
    throw err;
  } finally {
    // Best-effort cleanup of the virtual FS
    internalLog("Cleaning up virtual FS...");
    for (let i = 0; i < videoUrls.length; i++) {
      try { await ffmpeg.deleteFile(`input${i}.mp4`); } catch {}
    }
    try { await ffmpeg.deleteFile("output.mp4"); } catch {}
    try { await ffmpeg.deleteFile("concat.txt"); } catch {}
    ffmpeg.terminate?.(); // If available in this version
  }
}

/**
 * Upload a combined video blob to the server for permanent storage.
 *
 * @param {Blob}   blob     - The combined video blob
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
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Server error: ${res.status}`);
  }

  return res.json();
}
