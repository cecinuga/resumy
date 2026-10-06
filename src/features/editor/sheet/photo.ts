import { RESUME_INK } from '../../resume/design/palette'

const MAX_PHOTO_BYTES = 15 * 1024 * 1024
/**
 * A small file can hold a huge image (30,000 × 30,000 px is 3.6 GB once
 * decoded), which crashes the tab on phones. 100 megapixels still lets
 * through photos from 50 and 64 MP phone cameras.
 */
const MAX_PHOTO_PIXELS = 100_000_000
/** Large enough for print at the size templates use, small enough for browser storage. */
const OUTPUT_SIZE = 480

const ascii = (bytes: Uint8Array, start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end))

/** JPEG, PNG or WebP, recognised by their leading bytes. */
export function isSupportedImage(bytes: Uint8Array): boolean {
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte)
  const webp = ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP'
  return jpeg || png || webp
}

/** The image's size, read without decoding its pixels (an image outside the page is decoded only when drawn). */
async function imageSize(file: Blob): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Unreadable image'))
      image.src = url
    })
    return { width: image.naturalWidth, height: image.naturalHeight }
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Turns a photo into a small square JPEG data URL: centered crop, white
 * behind transparent areas, EXIF orientation applied by the browser.
 */
export async function processPhoto(file: Blob): Promise<string> {
  if (file.size > MAX_PHOTO_BYTES) throw new Error('The photo is too large')
  if (!isSupportedImage(new Uint8Array(await file.slice(0, 12).arrayBuffer()))) {
    throw new Error('Unsupported image format')
  }
  const { width, height } = await imageSize(file)
  if (width * height > MAX_PHOTO_PIXELS) throw new Error('The photo is too large')
  const bitmap = await createImageBitmap(file)
  try {
    const side = Math.min(bitmap.width, bitmap.height)
    const size = Math.min(OUTPUT_SIZE, side)
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas is not available')
    context.fillStyle = RESUME_INK.paper
    context.fillRect(0, 0, size, size)
    context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
    return canvas.toDataURL('image/jpeg', 0.86)
  } finally {
    bitmap.close()
  }
}
