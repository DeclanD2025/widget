import { confidenceClass } from '../../lib/vision/confidence'
import { goalMouthPolygon } from '../../lib/vision/goalTracker'
import type { CalibrationProfile, GoalCalibration, Point2D, TrackingConfidence, VisionEngineState } from '../../lib/vision/types'

interface OverlayDraft {
  goal: GoalCalibration
  groundPlane: Point2D[]
  activeTapLabel?: string
  profile?: CalibrationProfile
}

function drawPoint(ctx: CanvasRenderingContext2D, point: Point2D, label: string, colour: string): void {
  ctx.beginPath()
  ctx.arc(point.x, point.y, 7, 0, Math.PI * 2)
  ctx.fillStyle = colour
  ctx.fill()
  ctx.lineWidth = 3
  ctx.strokeStyle = 'rgba(5, 7, 5, 0.8)'
  ctx.stroke()
  ctx.font = '700 13px system-ui'
  ctx.fillStyle = '#f8fafc'
  ctx.fillText(label, point.x + 10, point.y - 10)
}

function drawPolyline(ctx: CanvasRenderingContext2D, points: Point2D[], colour: string, close = false): void {
  if (points.length < 2) return
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (const point of points.slice(1)) ctx.lineTo(point.x, point.y)
  if (close) ctx.closePath()
  ctx.lineWidth = 3
  ctx.strokeStyle = colour
  ctx.stroke()
}

export function drawVisionOverlay(canvas: HTMLCanvasElement, state: VisionEngineState, draft: OverlayDraft): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.save()

  const goalMouth = goalMouthPolygon(state.goal)
  if (goalMouth.length >= 4) {
    ctx.fillStyle = 'rgba(31, 209, 122, 0.08)'
    ctx.beginPath()
    ctx.moveTo(goalMouth[0].x, goalMouth[0].y)
    for (const point of goalMouth.slice(1)) ctx.lineTo(point.x, point.y)
    ctx.closePath()
    ctx.fill()
    drawPolyline(ctx, goalMouth, 'rgba(31, 209, 122, 0.95)', true)
  }

  if (draft.groundPlane.length > 1) {
    ctx.setLineDash([12, 8])
    drawPolyline(ctx, draft.groundPlane, 'rgba(244, 201, 93, 0.86)', draft.groundPlane.length === 4)
    ctx.setLineDash([])
  }
  draft.groundPlane.forEach((point, index) => drawPoint(ctx, point, `G${index + 1}`, '#f4c95d'))

  const goalPoints = [
    ['LB', draft.goal.leftPostBase],
    ['RB', draft.goal.rightPostBase],
    ['LT', draft.goal.leftPostTop],
    ['RT', draft.goal.rightPostTop],
    ['C', draft.goal.centre],
  ] as const
  goalPoints.forEach(([label, point]) => {
    if (point) drawPoint(ctx, point, label, '#1fd17a')
  })
  Object.entries(draft.goal.targetZones).forEach(([label, point]) => {
    if (point) drawPoint(ctx, point, label.replace(/[a-z]/g, '').slice(0, 2) || 'T', '#60a5fa')
  })

  if (state.player) {
    const { box, confidence, keypoints, footPosition } = state.player
    ctx.lineWidth = 4
    ctx.strokeStyle = confidence.band === 'high' ? '#1fd17a' : confidence.band === 'medium' ? '#f4c95d' : '#fb923c'
    ctx.strokeRect(box.x, box.y, box.width, box.height)
    ctx.font = '800 16px system-ui'
    ctx.fillStyle = ctx.strokeStyle
    ctx.fillText(state.player.selectedByUser ? 'Tracking Caiden' : 'Player candidate', box.x, Math.max(18, box.y - 8))

    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    keypoints.forEach((kp) => {
      ctx.beginPath()
      ctx.arc(kp.x, kp.y, 3.5, 0, Math.PI * 2)
      ctx.fill()
    })
    if (footPosition) drawPoint(ctx, footPosition, 'feet', '#ffffff')
  }

  if (state.ball) {
    const trail = state.ball.trail
    if (trail.length > 1) {
      ctx.beginPath()
      trail.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y)
        else ctx.lineTo(point.x, point.y)
      })
      ctx.lineWidth = 4
      ctx.strokeStyle = 'rgba(244, 201, 93, 0.9)'
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.arc(state.ball.center.x, state.ball.center.y, Math.max(8, state.ball.radius + 5), 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(244, 201, 93, 0.22)'
    ctx.fill()
    ctx.lineWidth = 4
    ctx.strokeStyle = '#f4c95d'
    ctx.stroke()
    ctx.font = '800 15px system-ui'
    ctx.fillStyle = '#f8fafc'
    ctx.fillText(`${Math.round(state.ball.speedPxPerSec)} px/s`, state.ball.center.x + 14, state.ball.center.y - 14)
  }

  if (state.lastShot?.ballTrail.length) {
    drawPolyline(ctx, state.lastShot.ballTrail, 'rgba(96, 165, 250, 0.92)')
    drawPoint(ctx, state.lastShot.startPosition, 'start', '#60a5fa')
    drawPoint(ctx, state.lastShot.endPosition, 'end', '#f87171')
  }

  ctx.font = '700 13px system-ui'
  ctx.fillStyle = 'rgba(5, 7, 5, 0.65)'
  ctx.fillRect(10, 10, 150, 30)
  ctx.fillStyle = '#d1fae5'
  ctx.fillText(`${Math.round(state.debug.fps)} FPS · ${state.debug.processingMode}`, 18, 30)

  if (draft.activeTapLabel) {
    ctx.fillStyle = 'rgba(5, 7, 5, 0.74)'
    ctx.fillRect(10, canvas.height - 42, Math.min(canvas.width - 20, 280), 30)
    ctx.fillStyle = '#ffffff'
    ctx.fillText(draft.activeTapLabel, 18, canvas.height - 22)
  }

  ctx.restore()
}

export function ConfidencePill({ label, score }: { label: string; score: TrackingConfidence }) {
  return (
    <span className={`rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold uppercase ${confidenceClass(score)}`}>
      {label} {Math.round(score.score * 100)}%
    </span>
  )
}
