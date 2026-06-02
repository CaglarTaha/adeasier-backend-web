import { mkdir } from "node:fs/promises";

// Binaries are overridable via env (also lets tests stub them).
const FFMPEG = process.env.FFMPEG_BIN ?? "ffmpeg";
const FFPROBE = process.env.FFPROBE_BIN ?? "ffprobe";

const PROCESSED_DIR = "uploads/processed";

// "/uploads/x.mp4" (public URL) -> "uploads/x.mp4" (cwd-relative path)
function toLocal(url: string): string {
  return url.replace(/^\//, "");
}

interface RunResult {
  code: number;
  stderr: string;
}

async function run(bin: string, args: string[]): Promise<RunResult> {
  try {
    const proc = Bun.spawn([bin, ...args], { stdout: "pipe", stderr: "pipe" });
    const stderr = await new Response(proc.stderr).text();
    const code = await proc.exited;
    return { code, stderr };
  } catch (e) {
    // binary missing / not executable
    return { code: -1, stderr: `spawn failed: ${(e as Error).message}` };
  }
}

// Raw video duration in seconds (null if probe unavailable).
async function probeDuration(path: string): Promise<number | null> {
  try {
    const proc = Bun.spawn(
      [FFPROBE, "-v", "error", "-show_entries", "format=duration",
       "-of", "default=nw=1:nk=1", path],
      { stdout: "pipe", stderr: "pipe" }
    );
    const out = await new Response(proc.stdout).text();
    await proc.exited;
    const d = parseFloat(out.trim());
    return Number.isFinite(d) ? d : null;
  } catch {
    return null;
  }
}

interface VideoMeta {
  width: number;
  height: number;
  fps: number;
}

// Raw video width/height/fps (sensible 9:16 defaults if probe unavailable).
async function probeVideo(path: string): Promise<VideoMeta> {
  const fallback: VideoMeta = { width: 1080, height: 1920, fps: 30 };
  try {
    const proc = Bun.spawn(
      [FFPROBE, "-v", "error", "-select_streams", "v:0", "-show_entries",
       "stream=width,height,r_frame_rate", "-of", "default=nw=1:nk=1", path],
      { stdout: "pipe", stderr: "pipe" }
    );
    const out = await new Response(proc.stdout).text();
    await proc.exited;
    const [w, h, rate] = out.trim().split("\n");
    const [num, den] = (rate ?? "30/1").split("/").map(Number);
    const fps = den ? Math.round(num / den) : 30;
    return {
      width: Number(w) || fallback.width,
      height: Number(h) || fallback.height,
      fps: fps || fallback.fps,
    };
  } catch {
    return fallback;
  }
}

/**
 * Render the sponsor overlay onto a raw 9:16 video and return the public URL
 * of the processed file. Throws on ffmpeg failure (caller marks job 'failed').
 *
 *  - logo:    PNG bindirilir, sağ-üst köşede son ~3 sn (overlay + enable).
 *  - endcard: end-card videosu ham videonun sonuna concat edilir
 *             (ham çözünürlük/fps'e scale; video-only — audio sadeleştirilir).
 *
 * 9:16 oranı korunur (ham video hiç ölçeklenmez).
 */
export async function renderOverlay(
  rawVideoUrl: string,
  assetUrl: string,
  assetType: "logo" | "endcard"
): Promise<string> {
  await mkdir(PROCESSED_DIR, { recursive: true });
  const rawPath = toLocal(rawVideoUrl);
  const assetPath = toLocal(assetUrl);
  const outRel = `${PROCESSED_DIR}/${crypto.randomUUID()}.mp4`;

  let args: string[];
  if (assetType === "logo") {
    const dur = await probeDuration(rawPath);
    const start = dur && dur > 3 ? (dur - 3).toFixed(2) : "0";
    // logo'yu sabit genişliğe ölçekle, sağ-üst köşeye 24px boşlukla bindir.
    const filter =
      `[1:v]scale=200:-1[lg];` +
      `[0:v][lg]overlay=W-w-24:24:enable='gte(t,${start})'`;
    args = ["-y", "-i", rawPath, "-i", assetPath,
      "-filter_complex", filter, "-c:a", "copy", outRel];
  } else {
    const v = await probeVideo(rawPath);
    const filter =
      `[0:v]fps=${v.fps},scale=${v.width}:${v.height},setsar=1[v0];` +
      `[1:v]fps=${v.fps},scale=${v.width}:${v.height},setsar=1[v1];` +
      `[v0][v1]concat=n=2:v=1:a=0[outv]`;
    args = ["-y", "-i", rawPath, "-i", assetPath,
      "-filter_complex", filter, "-map", "[outv]", outRel];
  }

  const { code, stderr } = await run(FFMPEG, args);
  if (code !== 0) {
    throw new Error(`ffmpeg exited ${code}: ${stderr.slice(-600)}`);
  }
  return `/${outRel}`;
}
