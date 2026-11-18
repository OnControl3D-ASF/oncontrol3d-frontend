"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, RotateCcw } from "lucide-react"
import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { STLLoader } from "three/addons/loaders/STLLoader.js"
import { Button } from "@/components/ui/button"
import { cameraDistance, prepareSurface } from "./lung-surface.mjs"

export default function SolidLungViewer({ url }: { url: string }) {
  const host = useRef<HTMLDivElement>(null)
  const reset = useRef<(() => void) | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [message, setMessage] = useState("")
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const container = host.current
    if (!container) return
    const target = container
    const abort = new AbortController()
    let renderer: THREE.WebGLRenderer | undefined
    let controls: OrbitControls | undefined
    let geometry: THREE.BufferGeometry | undefined
    let material: THREE.MeshStandardMaterial | undefined
    let observer: ResizeObserver | undefined
    let cancelled = false
    let onContextLost: ((event: Event) => void) | undefined
    setStatus("loading")
    setMessage("")

    async function load() {
      try {
        const response = await fetch(url, { signal: abort.signal })
        if (!response.ok) {
          throw new Error(`No se pudo generar la superficie (HTTP ${response.status}). Podés usar VolView como alternativa.`)
        }
        const data = await response.arrayBuffer()
        if (cancelled) return
        const source = new STLLoader().parse(data)
        try { geometry = prepareSurface(source) } finally { source.dispose() }
        const radius = geometry.boundingSphere?.radius ?? 0
        if (!radius) throw new Error("La superficie pulmonar no tiene un tamaño válido.")

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        renderer.outputColorSpace = THREE.SRGBColorSpace
        renderer.domElement.setAttribute("aria-label", "Modelo sólido de la máscara pulmonar: arrastrá para rotar y usá la rueda para acercar")
        renderer.domElement.setAttribute("role", "img")
        target.appendChild(renderer.domElement)
        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(40, 1, radius / 100, radius * 20)
        scene.add(new THREE.HemisphereLight(0xeaf5ff, 0x352635, 2.1))
        const key = new THREE.DirectionalLight(0xffe9df, 3)
        key.position.set(-radius * 2, radius * 3, radius * 4)
        scene.add(key)
        const rim = new THREE.DirectionalLight(0x9dcfff, 2)
        rim.position.set(radius * 3, radius, -radius * 2)
        scene.add(rim)
        material = new THREE.MeshStandardMaterial({ color: 0xdca2a8, roughness: 0.65, metalness: 0, side: THREE.DoubleSide })
        scene.add(new THREE.Mesh(geometry, material))
        controls = new OrbitControls(camera, renderer.domElement)
        controls.minDistance = radius * 1.1
        controls.maxDistance = radius * 12
        controls.enablePan = true
        controls.enableDamping = false
        const render = () => { if (!cancelled) renderer?.render(scene, camera) }
        controls.addEventListener("change", render)
        const fit = () => {
          camera.position.set(0, 0, cameraDistance(radius, camera.aspect, camera.fov))
          controls?.target.set(0, 0, 0)
          controls?.update()
          render()
        }
        reset.current = fit
        let framed = false
        // Frame the model once; later resizes keep the user's rotation and zoom.
        const resize = () => {
          const { width, height } = target.getBoundingClientRect()
          camera.aspect = Math.max(width, 1) / Math.max(height, 1)
          camera.updateProjectionMatrix()
          renderer?.setSize(width, height)
          if (framed) return render()
          framed = true
          fit()
        }
        observer = new ResizeObserver(resize)
        observer.observe(target)
        onContextLost = (event) => {
          event.preventDefault()
          if (!cancelled) {
            setMessage("Se perdió el contexto gráfico. Reintentá o abrí VolView.")
            setStatus("error")
          }
        }
        renderer.domElement.addEventListener("webglcontextlost", onContextLost)
        resize()
        setStatus("ready")
      } catch (error) {
        if (cancelled) return
        setMessage(error instanceof Error ? error.message : "No se pudo abrir el modelo sólido.")
        setStatus("error")
      }
    }
    void load()
    return () => {
      cancelled = true
      abort.abort()
      reset.current = null
      observer?.disconnect()
      controls?.dispose()
      geometry?.dispose()
      material?.dispose()
      if (renderer) {
        if (onContextLost) renderer.domElement.removeEventListener("webglcontextlost", onContextLost)
        renderer.dispose()
        renderer.forceContextLoss()
        renderer.domElement.remove()
      }
    }
  }, [url, attempt])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <p className="text-xs text-muted-foreground">Arrastrá para rotar · Rueda para acercar · Botón derecho para desplazar</p>
        <Button type="button" variant="outline" size="sm" onClick={() => reset.current?.()} disabled={status !== "ready"}>
          <RotateCcw className="mr-2 h-4 w-4" /> Restablecer vista
        </Button>
      </div>
      <div className="relative h-[560px] min-h-[360px] bg-[radial-gradient(ellipse_at_center,#293644_0%,#111820_75%)]">
        <div ref={host} className="h-full w-full" />
        {status === "loading" && (
          <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-slate-100">
            <Loader2 className="h-7 w-7 animate-spin" />
            <p>Preparando superficie pulmonar… La primera vez puede tardar un minuto.</p>
          </div>
        )}
        {status === "error" && (
          <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950/90 px-6 text-center text-slate-100">
            <p>{message}</p>
            <Button type="button" variant="outline" className="text-foreground" onClick={() => setAttempt((value) => value + 1)}>Reintentar modelo sólido</Button>
          </div>
        )}
      </div>
      <p className="border-t px-4 py-3 text-xs text-muted-foreground">Superficie de la máscara segmentada; no representa tejido interno ni detección de tumores. Visualización referencial, no diagnóstica.</p>
    </div>
  )
}
