import { db } from '../../db/db'
import type { CalibrationProfile, ShotEvent, VisionRecordingRecord, VisionRecordingSummary, VisionShotSummary } from './types'

const ACTIVE_PROFILE_KEY = 'gb-vision-active-profile'

export function shotToSummary(shot: ShotEvent): VisionShotSummary {
  return {
    id: shot.id,
    timestamp: shot.timestamp,
    outcome: shot.outcome,
    qualityScore: shot.metrics.quality.score,
    powerScore: shot.metrics.power.score,
    accuracyScore: shot.metrics.accuracy.score,
    curveScore: shot.metrics.curve.score,
    speedKmh: shot.metrics.speed.kmh,
    speedPxPerSec: shot.metrics.speed.pixelsPerSecond,
    peakSpeedPxPerSec: shot.raw.peakSpeedPxPerSec,
    averageSpeedPxPerSec: shot.raw.averageSpeedPxPerSec,
    powerLabel: shot.metrics.power.label,
    accuracyLabel: shot.metrics.accuracy.label,
    curveDirection: shot.metrics.curve.direction,
    confidenceScore: shot.confidence.score,
    distanceMetres: shot.metrics.distance.metres,
    distancePixels: shot.metrics.distance.pixels,
    drillSessionId: shot.drillSessionId,
  }
}

export async function saveCalibrationProfile(profile: CalibrationProfile): Promise<void> {
  await db.visionCalibrations.put(profile)
  try {
    localStorage.setItem(ACTIVE_PROFILE_KEY, profile.id)
  } catch {
    // Storage may be disabled in private browsing; Dexie remains the source of truth.
  }
}

export async function loadCalibrationProfiles(): Promise<CalibrationProfile[]> {
  return db.visionCalibrations.orderBy('updatedAt').reverse().toArray()
}

export async function loadActiveCalibrationProfile(): Promise<CalibrationProfile | undefined> {
  let activeId: string | null = null
  try {
    activeId = localStorage.getItem(ACTIVE_PROFILE_KEY)
  } catch {
    activeId = null
  }
  if (activeId) {
    const active = await db.visionCalibrations.get(activeId)
    if (active) return active
  }
  return db.visionCalibrations.orderBy('updatedAt').last()
}

export async function saveShotSummary(shot: ShotEvent): Promise<VisionShotSummary> {
  const summary = shotToSummary(shot)
  await db.visionShots.put(summary)
  return summary
}

export async function loadRecentShots(limit = 24): Promise<VisionShotSummary[]> {
  return db.visionShots.orderBy('timestamp').reverse().limit(limit).toArray()
}

export async function clearVisionShots(): Promise<void> {
  await db.visionShots.clear()
}

export async function saveVisionRecording(input: {
  video: Blob
  startedAt: string
  durationMs: number
  shotCount: number
}): Promise<VisionRecordingSummary> {
  const record: VisionRecordingRecord = {
    id: `recording-${Date.now()}`,
    timestamp: input.startedAt,
    durationMs: input.durationMs,
    sizeBytes: input.video.size,
    mimeType: input.video.type || 'video/webm',
    shotCount: input.shotCount,
    video: input.video,
  }
  await db.visionRecordings.put(record)
  const { video: _video, ...summary } = record
  return summary
}

export async function loadRecentRecordings(limit = 8): Promise<VisionRecordingSummary[]> {
  const records = await db.visionRecordings.orderBy('timestamp').reverse().limit(limit).toArray()
  return records.map(({ video: _video, ...summary }) => summary)
}

export async function loadRecordingBlob(id: string): Promise<Blob | undefined> {
  return (await db.visionRecordings.get(id))?.video
}

export async function deleteVisionRecording(id: string): Promise<void> {
  await db.visionRecordings.delete(id)
}
