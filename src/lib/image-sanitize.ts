export type SupportedImageMime = "image/jpeg" | "image/png" | "image/webp";

/**
 * Inspects binary magic headers rather than trusting browser MIME type or file extension.
 */
export function detectMagicImageMime(buf: Buffer): SupportedImageMime | null {
  if (buf.length < 12) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "image/png";
  }

  // WEBP: "RIFF" .... "WEBP"
  if (
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

/**
 * Validates magic bytes, strips EXIF/GPS metadata, and re-encodes to JPEG using sharp.
 */
export async function sanitizeDeliveryImage(
  rawBuffer: Buffer
): Promise<{ cleanBuffer: Buffer; mimeType: "image/jpeg" } | null> {
  const detected = detectMagicImageMime(rawBuffer);
  if (!detected) return null;

  try {
    const sharpMod = await import("sharp");
    const sharpFn = sharpMod.default;
    const cleanBuffer = await sharpFn(rawBuffer)
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();

    return { cleanBuffer, mimeType: "image/jpeg" };
  } catch {
    return null;
  }
}
