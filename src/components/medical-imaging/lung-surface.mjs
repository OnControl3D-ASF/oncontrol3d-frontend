import { Matrix4 } from "three"
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js"

export function prepareSurface(input) {
  const positions = input.getAttribute("position")
  if (!positions?.count) throw new Error("El modelo pulmonar está vacío.")
  for (let i = 0; i < positions.array.length; i++) {
    if (!Number.isFinite(positions.array[i])) throw new Error("El modelo contiene coordenadas inválidas.")
  }
  const geometry = input.clone()
  // STL repeats vertices per face. Merge positions before computing smooth normals;
  // this only changes shading, never the segmented anatomy.
  geometry.deleteAttribute("normal")
  const merged = mergeVertices(geometry, 0.0001)
  geometry.dispose()
  // LPS -> upright right-handed viewer: camera on +Z sees the anterior surface.
  merged.applyMatrix4(new Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1))
  merged.center()
  merged.computeVertexNormals()
  merged.computeBoundingBox()
  merged.computeBoundingSphere()
  return merged
}

export function cameraDistance(radius, aspect, fov) {
  const vertical = fov * Math.PI / 360
  const horizontal = Math.atan(Math.tan(vertical) * Math.max(aspect, 0.01))
  return radius / Math.sin(Math.min(vertical, horizontal)) * 1.15
}
