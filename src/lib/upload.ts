import { mkdir } from "node:fs/promises";
import { extname } from "node:path";
import { badRequest } from "../middleware/error";

const UPLOAD_ROOT = "uploads";

// Map common mime types -> extension when the filename has none.
const MIME_EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
};

function pickExtension(file: File): string {
  const fromName = extname(file.name || "");
  if (fromName) return fromName.toLowerCase();
  return MIME_EXT[file.type] ?? "";
}

/**
 * Persist an uploaded File under uploads/<subdir> with a uuid filename and
 * return its public URL path (served by serveStatic at /uploads/*).
 *
 * @param subdir optional subdirectory under uploads/ (e.g. "processed")
 */
export async function saveUpload(
  file: File,
  subdir = ""
): Promise<string> {
  if (!(file instanceof File) || file.size === 0) {
    throw badRequest("Empty or invalid file upload", "invalid_file");
  }
  const ext = pickExtension(file);
  const name = `${crypto.randomUUID()}${ext}`;
  const dir = subdir ? `${UPLOAD_ROOT}/${subdir}` : UPLOAD_ROOT;
  await mkdir(dir, { recursive: true });
  const relPath = `${dir}/${name}`;
  await Bun.write(relPath, file);
  return `/${relPath}`; // e.g. /uploads/<uuid>.png
}
