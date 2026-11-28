/**
 * Detects an image format from the file's own bytes (its signature), never
 * from the browser's MIME type or the filename. Only JPEG, PNG and WebP are
 * accepted. A signature check proves the file starts like an image; the
 * file is then stored and served with the detected type, so it is always
 * delivered as an image.
 */

export type ImageFormat = "jpeg" | "png" | "webp";

export const IMAGE_CONTENT_TYPES: Record<ImageFormat, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function startsWith(bytes: Uint8Array, signature: readonly number[], at = 0) {
  return signature.every((b, i) => bytes[at + i] === b);
}

const ascii = (text: string) => Array.from(text, (c) => c.charCodeAt(0));

export function detectImageFormat(bytes: Uint8Array): ImageFormat | null {
  // JPEG: SOI marker followed by another marker.
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpeg";
  if (startsWith(bytes, PNG_SIGNATURE)) return "png";
  // WebP: "RIFF" <4-byte size> "WEBP".
  if (
    bytes.length >= 12 &&
    startsWith(bytes, ascii("RIFF")) &&
    startsWith(bytes, ascii("WEBP"), 8)
  ) {
    return "webp";
  }
  return null;
}
