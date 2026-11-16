// Small JPEG thumbnail as a data URL, stored inside the entry itself
// (~10-20 KB). Private to the user, no third-party image host needed.
export async function makeThumbnail(file, size = 160, quality = 0.7) {
  const bitmap = await createImageBitmap(file);
  // Centre-crop to a square, then scale down.
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  canvas.getContext("2d").drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
  bitmap.close?.();
  return canvas.toDataURL("image/jpeg", quality);
}
