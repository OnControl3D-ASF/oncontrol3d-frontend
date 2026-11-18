export function surfaceUrl(studyId, origin, lungVolumeUrl, local, browserOrigin = undefined) {
  const path = `/studies/${encodeURIComponent(studyId)}/derived/lung-surface`
  if (origin.trim()) return `${origin.trim().replace(/\/$/, "")}${path}`
  if (local) return `/imaging${path}`
  // Derive the surface from the volume URL only when it really is the lung-volume
  // endpoint; anything else would download a NIfTI/other file as if it were STL.
  const url = URL.canParse(lungVolumeUrl, browserOrigin) ? new URL(lungVolumeUrl, browserOrigin) : null
  if (url && ["https:", "http:"].includes(url.protocol) && /\/lung-volume$/.test(url.pathname)) {
    url.pathname = url.pathname.replace(/\/lung-volume$/, "/lung-surface")
    url.search = ""
    return url.toString()
  }
  throw new Error("Configurá la URL del servicio de imágenes para el modelo sólido.")
}

// A public demo must never send another browser to this machine's localhost.
// Rewrite only the known local services; deployed external origins stay intact.
export function publicViewerUrl(viewerUrl, browserOrigin) {
  // Same-origin paths (AKS gateway/Ingress) already resolve against the serving host.
  if (!URL.canParse(viewerUrl)) return viewerUrl
  const url = new URL(viewerUrl)
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
      url.port !== "8042" || !/^\/volview(?:\/|$)/.test(url.pathname)) return viewerUrl
  const origin = new URL(browserOrigin).origin
  const query = url.search.replace(/([?&]urls=)([^&]*)/g, (_, key, value) => {
    const sources = new URLSearchParams(`urls=${value}`).get("urls")
    const rewritten = sources.replace(/(^|[\[,])(\s*)https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]):8001(?=\/|,|\]|$)/g, `$1$2${origin}/imaging`)
    return key + encodeURIComponent(rewritten).replace(/%5B/g, "[").replace(/%5D/g, "]")
  })
  return `${origin}${url.pathname}${query}${url.hash}`
}
