import { randomUUID } from "node:crypto";
import { HttpError } from "./errors.ts";

export const mediaLimits = {
  maxFiles: 3,
  maxFileBytes: 8 * 1024 * 1024,
  maxTotalBytes: 16 * 1024 * 1024,
  types: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
    "video/webm",
  ],
};
export type Attachment = {
  id: string;
  name: string;
  type: string;
  size: number;
};
export type SavedMedia = Attachment & { data: Buffer };

function matchesType(type: string, data: Buffer) {
  switch (type) {
    case "image/png":
      return (
        data.length >= 8 &&
        data
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      );
    case "image/jpeg":
      return (
        data.length >= 3 &&
        data[0] === 255 &&
        data[1] === 216 &&
        data[2] === 255
      );
    case "image/webp":
      return (
        data.length >= 12 &&
        data.toString("ascii", 0, 4) === "RIFF" &&
        data.toString("ascii", 8, 12) === "WEBP"
      );
    case "image/gif":
      return ["GIF87a", "GIF89a"].includes(data.toString("ascii", 0, 6));
    case "video/mp4":
      return data.length >= 12 && data.toString("ascii", 4, 8) === "ftyp";
    case "video/webm":
      return (
        data.length >= 4 &&
        data.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163]))
      );
    default:
      return false;
  }
}

export function requireAttachments(value: unknown): SavedMedia[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > mediaLimits.maxFiles)
    throw new HttpError(400, "Attach up to 3 photos or videos.");
  let total = 0;
  return value.map((input) => {
    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      typeof input.name !== "string" ||
      !input.name.trim() ||
      input.name.length > 120 ||
      !mediaLimits.types.includes(input.type) ||
      typeof input.data !== "string"
    )
      throw new HttpError(
        400,
        "Invalid attachment. Use JPEG, PNG, WebP, GIF, MP4 or WebM.",
      );
    if (input.data.length > Math.ceil(mediaLimits.maxFileBytes / 3) * 4)
      throw new HttpError(413, "Each attachment must be at most 8 MiB.");
    const data = Buffer.from(input.data, "base64");
    if (
      !data.length ||
      data.toString("base64") !== input.data ||
      !matchesType(input.type, data)
    )
      throw new HttpError(
        400,
        "Attachment content does not match its file type.",
      );
    total += data.length;
    if (
      data.length > mediaLimits.maxFileBytes ||
      total > mediaLimits.maxTotalBytes
    )
      throw new HttpError(
        413,
        "Attachments must be at most 8 MiB each and 16 MiB in total.",
      );
    return {
      id: randomUUID(),
      name: input.name.trim(),
      type: input.type,
      size: data.length,
      data,
    };
  });
}
