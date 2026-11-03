export type DiaryImage = {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
};
export async function prepareDiaryImage(file: File): Promise<DiaryImage> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw Error("Choose a PNG, JPEG or WebP image.");
  if (file.size > 10 * 1024 * 1024)
    throw Error("Choose an image smaller than 10 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    for (const size of [1024, 768, 512]) {
      const scale = Math.min(1, size / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw Error("Image processing is unavailable.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const src = canvas.toDataURL("image/webp", 0.72);
      if (src.length <= 240000) {
        const width = Math.min(450, (700 * bitmap.width) / bitmap.height),
          height = (width * bitmap.height) / bitmap.width;
        return { id: crypto.randomUUID(), src, x: 100, y: 200, width, height };
      }
    }
    throw Error("This image is too detailed. Choose a smaller image.");
  } finally {
    bitmap.close();
  }
}
