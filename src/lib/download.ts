/** Saves a blob to the user's device under the given file name. */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.rel = 'noopener'
  document.body.append(link)
  link.click()
  link.remove()
  // Some browsers read the URL asynchronously; revoke it once they are done.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
