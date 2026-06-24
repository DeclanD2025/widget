import { Camera, CameraOff, Maximize2 } from 'lucide-react'
import type { RefObject } from 'react'
import type { CameraFailure } from '../../lib/vision/camera'
import type { Point2D } from '../../lib/vision/types'

interface Props {
  running: boolean
  videoRef: RefObject<HTMLVideoElement>
  canvasRef: RefObject<HTMLCanvasElement>
  onStart: () => void
  onStop: () => void
  onTap: (point: Point2D) => void
  cameraError?: { error: CameraFailure; message: string }
}

export default function VisionCamera({ running, videoRef, canvasRef, onStart, onStop, onTap, cameraError }: Props) {
  function handlePointer(event: React.PointerEvent<HTMLDivElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height
    onTap({ x, y })
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-card">
      <div className="relative aspect-[9/16] max-h-[76vh] w-full bg-base-900 md:aspect-video">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-contain"
          playsInline
          muted
          autoPlay
        />
        <div className="absolute inset-0 touch-none" onPointerDown={handlePointer}>
          <canvas ref={canvasRef} className="h-full w-full object-contain" />
        </div>

        {!running && (
          <div className="absolute inset-0 grid place-items-center bg-base-900/86 px-5 text-center">
            <div>
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-glow/15 text-emerald-glow">
                <Camera size={32} />
              </div>
              <h2 className="mt-4 text-3xl font-extrabold">GARDEN BALLER VISION</h2>
              <p className="mt-2 text-sm font-semibold text-white/55">
                Local camera analytics for shooting practice.
              </p>
              {cameraError && <p className="mt-3 rounded-xl border border-red-300/25 bg-red-500/10 p-3 text-sm text-red-100">{cameraError.message}</p>}
              <button onClick={onStart} className="btn-emerald mt-5 px-5 py-4 text-lg font-extrabold uppercase">
                <Camera size={20} /> Start Vision
              </button>
            </div>
          </div>
        )}

        <div className="absolute right-3 top-3 flex gap-2">
          <button
            onClick={() => {
              const el = videoRef.current?.parentElement
              if (el?.requestFullscreen) el.requestFullscreen().catch(() => {})
            }}
            className="btn-ghost h-10 w-10 bg-black/50"
            aria-label="Fullscreen"
          >
            <Maximize2 size={17} />
          </button>
          {running && (
            <button onClick={onStop} className="btn-ghost h-10 w-10 bg-black/50" aria-label="Stop Vision">
              <CameraOff size={17} />
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
