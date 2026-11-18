import assert from "node:assert/strict"
import test from "node:test"
import { BufferGeometry, Float32BufferAttribute, Vector3 } from "three"
import { STLLoader } from "three/addons/loaders/STLLoader.js"
import { cameraDistance, prepareSurface } from "./lung-surface.mjs"
import { surfaceUrl, publicViewerUrl } from "./lung-surface-url.mjs"

test("rewrites loopback VolView and imaging through the same public origin", () => {
  const source = "http://localhost:8042/volview/index.html?names=[lung_highlighted.mha]&urls=[http://localhost:8001/studies/demo/derived/lung-highlighted]"
  const result = new URL(publicViewerUrl(source, "https://demo.trycloudflare.com"))
  assert.equal(result.origin, "https://demo.trycloudflare.com")
  assert.equal(result.pathname, "/volview/index.html")
  assert.equal(result.searchParams.get("names"), "[lung_highlighted.mha]")
  assert.equal(result.searchParams.get("urls"), "[https://demo.trycloudflare.com/imaging/studies/demo/derived/lung-highlighted]")
  const local = new URL(publicViewerUrl(source, "http://localhost:3000"))
  assert.equal(local.origin, "http://localhost:3000")
  assert.ok(local.searchParams.get("urls").includes("http://localhost:3000/imaging/"))
})

test("rewrites only known loopback hosts and preserves external sources and names", () => {
  const source = "http://127.0.0.1:8042/volview/index.html?names=[one.mha,two.mha,three.mha]&urls=" + encodeURIComponent("[http://[::1]:8001/studies/demo/derived/lung-volume,https://images.example.test/a.mha,http://localhost:80010/unchanged]")
  const result = new URL(publicViewerUrl(source, "https://public.test"))
  assert.equal(result.searchParams.get("names"), "[one.mha,two.mha,three.mha]")
  assert.equal(result.searchParams.get("urls"), "[https://public.test/imaging/studies/demo/derived/lung-volume,https://images.example.test/a.mha,http://localhost:80010/unchanged]")
  assert.equal(new URL(publicViewerUrl(source.replace("127.0.0.1", "[::1]"), "https://public.test")).origin, "https://public.test")
  for (const outer of ["https://orthanc.example.test/volview/index.html", "http://localhost:8043/volview/index.html", "http://localhost:8042/not-volview/index.html"]) {
    const url = `${outer}?urls=[http://localhost:8001/studies/demo/derived/lung-volume]`
    assert.equal(publicViewerUrl(url, "https://public.test"), url)
  }
})

test("keeps same-origin VolView links relative to the serving host", () => {
  const relative = "/volview/index.html?names=[s_lung_highlighted.mha]&urls=[/imaging/studies/s/derived/lung-highlighted?v%3D1]"
  assert.equal(publicViewerUrl(relative, "https://oncontrol.example.test"), relative)
  assert.equal(
    surfaceUrl("s", "", "/imaging/studies/s/derived/lung-volume", false, "https://oncontrol.example.test"),
    "https://oncontrol.example.test/imaging/studies/s/derived/lung-surface",
  )
})

test("uses the local imaging proxy and a configurable production origin", () => {
  assert.equal(surfaceUrl("study", "", "http://unused/derived/lung-volume", true), "/imaging/studies/study/derived/lung-surface")
  assert.equal(surfaceUrl("study", "https://images.test/", "", false), "https://images.test/studies/study/derived/lung-surface")
  assert.equal(surfaceUrl("study", "", "https://images.test/studies/study/derived/lung-volume", false), "https://images.test/studies/study/derived/lung-surface")
  assert.throws(() => surfaceUrl("study", "", "", false), /imágenes/)
})

test("resolves a relative lung volume URL against the browser origin", () => {
  assert.equal(
    surfaceUrl("study", "", "/imaging/studies/study/derived/lung-volume?v=1", false, "https://app.test"),
    "https://app.test/imaging/studies/study/derived/lung-surface",
  )
})

test("never fetches a non lung-volume URL as an STL surface", () => {
  for (const volume of ["https://images.test/studies/study/derived/other", "ftp://images.test/lung-volume", "http://[bad"]) {
    assert.throws(() => surfaceUrl("study", "", volume, false, "https://app.test"), /imágenes/)
  }
})

test("maps LPS to a right-handed upright frame without mirroring", () => {
  const geometry = new BufferGeometry()
  geometry.setAttribute("position", new Float32BufferAttribute([0, 0, 0, 4, 0, 0, 0, 6, 0, 0, 0, 8], 3))
  geometry.setIndex([0, 2, 1, 0, 1, 3, 0, 3, 2, 1, 2, 3])
  const result = prepareSurface(geometry)
  assert.deepEqual(result.boundingBox.getSize(new Vector3()).toArray(), [4, 8, 6])
  assert.deepEqual(result.boundingBox.getCenter(new Vector3()).toArray(), [0, 0, 0])
  const p = result.getAttribute("position")
  assert.equal(p.getX(2) - p.getX(0), 4)
  assert.equal(p.getY(3) - p.getY(0), 8)
  assert.equal(p.getZ(1) - p.getZ(0), -6)
  result.dispose()
})

test("fits the full sphere at portrait and landscape aspect ratios", () => {
  assert.ok(cameraDistance(100, 1, 40) > 100 / Math.sin(20 * Math.PI / 180))
  assert.ok(cameraDistance(100, 0.5, 40) > cameraDistance(100, 2, 40))
})

test("rejects empty or non-finite model coordinates", () => {
  assert.throws(() => prepareSurface(new BufferGeometry()), /vacío/)
  const geometry = new BufferGeometry()
  geometry.setAttribute("position", new Float32BufferAttribute([NaN, 0, 0], 3))
  assert.throws(() => prepareSurface(geometry), /inválidas/)
})

test("loads STL faces and welds shared vertices for smooth shading without deformation", () => {
  const stl = new ArrayBuffer(84 + 2 * 50)
  const view = new DataView(stl)
  view.setUint32(80, 2, true)
  const faces = [[0, 0, 0, 4, 0, 0, 0, 6, 0], [0, 0, 0, 0, 0, 8, 4, 0, 0]]
  faces.forEach((face, i) => face.forEach((coordinate, j) => view.setFloat32(84 + i * 50 + 12 + j * 4, coordinate, true)))
  const source = new STLLoader().parse(stl)
  const result = prepareSurface(source)
  assert.equal(source.getAttribute("position").count, 6)
  assert.equal(result.getAttribute("position").count, 4)
  assert.deepEqual(result.boundingBox.getSize(new Vector3()).toArray(), [4, 8, 6])
  assert.ok(Array.from(result.getAttribute("normal").array).every(Number.isFinite))
  source.dispose()
  result.dispose()
})
