import { useLayoutEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ImagePlus, MapPin, RotateCcw, Check, Sparkles } from 'lucide-react'
import Page from '../components/Page'
import GardenOverlay from '../components/GardenOverlay'
import { DrillIcon } from '../components/icons'
import { db, type Garden as GardenRec, type Point } from '../db/db'
import { GARDEN_LAYOUTS } from '../data/gardenLayouts'
import { DRILL_BY_ID } from '../data/drills'
import { flattenTransform } from '../lib/homography'

const CORNER_NAMES = ['Far-left', 'Far-right', 'Near-right', 'Near-left']
const SAMPLE_SRC = '/garden-sample.png'
const SAMPLE_CORNERS_NORM: Point[] = [
  { x: 0.30, y: 0.55 },
  { x: 0.70, y: 0.52 },
  { x: 0.90, y: 0.92 },
  { x: 0.16, y: 0.96 },
]

const LAYOUT_DRILLS = Object.keys(GARDEN_LAYOUTS)

export default function Garden() {
  const saved = useLiveQuery(() => db.garden.get('garden'), [])
  const [params] = useSearchParams()

  // Working state for the tagging flow.
  const [tagging, setTagging] = useState(false)
  const [src, setSrc] = useState<string | null>(null)
  const [corners, setCorners] = useState<Point[]>([])
  const [drillId, setDrillId] = useState(params.get('drill') && GARDEN_LAYOUTS[params.get('drill')!] ? params.get('drill')! : 'cone-slalom')

  const imgRef = useRef<HTMLImageElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const [boxW, setBoxW] = useState(0)
  const fileInput = useRef<HTMLInputElement>(null)

  useLayoutEffect(() => {
    const measure = () => boxRef.current && setBoxW(boxRef.current.clientWidth)
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  })

  // If the sample was chosen, preset its corners once the image has a displayed size.
  const [pendingSample, setPendingSample] = useState(false)

  function startUpload(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      setSrc(reader.result as string)
      setCorners([])
      setPendingSample(false)
      setTagging(true)
    }
    reader.readAsDataURL(file)
  }

  function startSample() {
    setSrc(SAMPLE_SRC)
    setCorners([])
    setPendingSample(true)
    setTagging(true)
  }

  function onImgLoad() {
    if (pendingSample && imgRef.current) {
      const w = imgRef.current.clientWidth
      const h = imgRef.current.clientHeight
      setCorners(SAMPLE_CORNERS_NORM.map((c) => ({ x: c.x * w, y: c.y * h })))
      setPendingSample(false)
    }
  }

  function tap(e: React.MouseEvent) {
    if (!imgRef.current) return
    const rect = imgRef.current.getBoundingClientRect()
    const p = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    setCorners((prev) => (prev.length >= 4 ? [p] : [...prev, p]))
  }

  async function saveGarden() {
    if (!src || corners.length !== 4 || !imgRef.current) return
    const rec: GardenRec = {
      id: 'garden',
      imageDataUrl: src,
      corners: corners as [Point, Point, Point, Point],
      dispW: imgRef.current.clientWidth,
      dispH: imgRef.current.clientHeight,
      savedAt: new Date().toISOString(),
    }
    await db.garden.put(rec)
    setTagging(false)
    setSrc(null)
    setCorners([])
  }

  // ---------- Tagging view ----------
  if (tagging && src) {
    const next = CORNER_NAMES[corners.length] ?? 'Done'
    return (
      <Page title="Mark your pitch" kicker="Tap the 4 grass corners" back>
        <div className="card mb-3 flex items-center gap-3 p-3 text-sm">
          <span className="num grid h-8 w-8 place-items-center rounded-full bg-emerald-glow font-bold text-base-900">
            {Math.min(corners.length + 1, 4)}
          </span>
          <span className="text-white/80">
            {corners.length < 4 ? <>Tap the <b>{next}</b> corner of the grass</> : 'All 4 corners set — looking good!'}
          </span>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-white/10">
          <img ref={imgRef} src={src} onLoad={onImgLoad} onClick={tap} className="block w-full select-none" alt="Your garden" />
          <svg className="pointer-events-none absolute inset-0 h-full w-full">
            {corners.length > 1 && (
              <polygon
                points={corners.map((c) => `${c.x},${c.y}`).join(' ')}
                fill="rgba(31,209,122,0.18)"
                stroke="#1fd17a"
                strokeWidth={2}
              />
            )}
            {corners.map((c, i) => (
              <g key={i}>
                <circle cx={c.x} cy={c.y} r={11} fill="#1fd17a" stroke="#04110a" strokeWidth={2} />
                <text x={c.x} y={c.y + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill="#04110a">{i + 1}</text>
              </g>
            ))}
          </svg>
        </div>

        <div className="mt-4 flex gap-3">
          <button onClick={() => setCorners([])} className="btn-ghost flex-1 py-4 text-lg"><RotateCcw size={18} /> Reset</button>
          <button onClick={saveGarden} disabled={corners.length !== 4} className="btn-emerald flex-1 py-4 text-lg disabled:opacity-40"><Check size={18} /> Save pitch</button>
        </div>
      </Page>
    )
  }

  // ---------- Empty state ----------
  if (!saved) {
    return (
      <Page title="My Garden" kicker="Your real pitch" back>
        <div className="card card-hi flex flex-col items-center gap-3 p-6 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-glow/15 text-emerald-glow"><MapPin size={32} /></span>
          <h2 className="text-2xl font-extrabold">Turn your garden into a pitch</h2>
          <p className="text-white/60">
            Take a photo from an upstairs window, tap the four corners of the grass, and Garden Baller flattens it into a top-down pitch with drill maps drawn on it.
          </p>
        </div>

        <button onClick={startSample} className="btn-primary mt-4 w-full py-4 text-lg"><Sparkles size={18} /> Try the sample garden</button>
        <button onClick={() => fileInput.current?.click()} className="btn-ghost mt-3 w-full py-4 text-lg"><ImagePlus size={18} /> Use my own photo</button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && startUpload(e.target.files[0])}
        />
      </Page>
    )
  }

  // ---------- Pitch view with overlays ----------
  const W = boxW
  const H = Math.round(boxW * 0.64)
  const transform = W ? flattenTransform(saved.corners, W, H) : ''
  const layout = GARDEN_LAYOUTS[drillId]
  const drill = DRILL_BY_ID[drillId]

  return (
    <Page title="My Garden" kicker="Top-down pitch" back>
      <div ref={boxRef} className="relative overflow-hidden rounded-2xl border border-white/10 bg-base-700" style={{ height: H }}>
        {W > 0 && (
          <>
            <img
              src={saved.imageDataUrl}
              alt="Flattened garden"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: saved.dispW,
                height: saved.dispH,
                transform,
                transformOrigin: '0 0',
              }}
            />
            <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/20" />
            {layout && <GardenOverlay layout={layout} w={W} h={H} />}
          </>
        )}
      </div>

      {layout && (
        <div className="card mt-3 flex items-start gap-3 p-3 text-sm">
          <DrillIcon drillId={drillId} size={20} className="mt-0.5 shrink-0 text-emerald-glow" />
          <div>
            <div className="font-bold">{drill?.name}</div>
            <div className="text-white/60">{layout.tip}</div>
          </div>
        </div>
      )}

      <h2 className="mb-2 mt-4 label">Show a drill on the pitch</h2>
      <div className="flex flex-wrap gap-2">
        {LAYOUT_DRILLS.map((id) => (
          <button
            key={id}
            onClick={() => setDrillId(id)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
              id === drillId ? 'border-emerald-glow bg-emerald-glow/15 text-emerald-glow' : 'border-white/10 bg-white/5 text-white/70'
            }`}
          >
            <DrillIcon drillId={id} size={15} /> {DRILL_BY_ID[id]?.name}
          </button>
        ))}
      </div>

      <div className="mt-4 flex gap-3">
        <button onClick={() => { setSrc(saved.imageDataUrl); setCorners(saved.corners); setTagging(true) }} className="btn-ghost flex-1 py-3"><RotateCcw size={16} /> Re-mark corners</button>
        <button onClick={() => fileInput.current?.click()} className="btn-ghost flex-1 py-3"><ImagePlus size={16} /> New photo</button>
        <input ref={fileInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && startUpload(e.target.files[0])} />
      </div>
    </Page>
  )
}
