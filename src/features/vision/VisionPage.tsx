import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ShieldCheck, Sparkles } from 'lucide-react'
import VisionCamera from './VisionCamera'
import VisionControls, { type VisionTapMode } from './VisionControls'
import VisionCalibrationPanel from './VisionCalibrationPanel'
import VisionMetricsPanel from './VisionMetricsPanel'
import VisionRawStatsPanel from './VisionRawStatsPanel'
import VisionRecordingPanel from './VisionRecordingPanel'
import VisionOfflinePanel from './VisionOfflinePanel'
import VisionShotHistory from './VisionShotHistory'
import VisionDebugPanel from './VisionDebugPanel'
import { buildCalibrationProfile, buildPitchCalibration, createCameraCalibration, createEmptyGoalCalibration } from '../../lib/vision/calibration'
import { requestVisionStream, stopVisionStream, syncCanvasToVideo, type CameraFailure } from '../../lib/vision/camera'
import { DetectionEngine } from '../../lib/vision/detectionEngine'
import { goalTrackFromProfile } from '../../lib/vision/goalTracker'
import { checkVisionOfflinePack, disposeVisionModels, type VisionOfflinePackStatus } from '../../lib/vision/modelLoader'
import { BallTracker } from '../../lib/vision/ballTracker'
import { PlayerTracker } from '../../lib/vision/playerTracker'
import { ShotDetector } from '../../lib/vision/shotDetector'
import { EMPTY_AUTO_SETUP_STATE, SessionAutoSetup } from '../../lib/vision/sessionAutoSetup'
import {
  deleteVisionRecording,
  loadActiveCalibrationProfile,
  loadRecentRecordings,
  loadRecentShots,
  loadRecordingBlob,
  saveCalibrationProfile,
  saveShotSummary,
  saveVisionRecording,
} from '../../lib/vision/storage'
import type {
  CalibrationProfile,
  GoalCalibration,
  KnownMeasurement,
  PerformanceMode,
  Point2D,
  ShotEvent,
  VisionDebugInfo,
  VisionEngineState,
  VisionRecordingSummary,
  VisionFrame,
  VisionShotSummary,
} from '../../lib/vision/types'
import { drawVisionOverlay } from './VisionOverlay'

function initialDebug(mode: PerformanceMode): VisionDebugInfo {
  return {
    fps: 0,
    frameSize: { width: 0, height: 0 },
    modelStatus: { pose: 'idle', object: 'idle' },
    detectionsPerFrame: 0,
    playerLostCount: 0,
    ballLostCount: 0,
    calibrationCompleteness: 0,
    shotDetectorState: 'idle',
    processingMode: mode,
    rawCoordinates: {},
    confidence: { player: 0, ball: 0, goal: 0, shot: 0 },
    messages: [],
  }
}

function tapLabel(mode: VisionTapMode): string {
  switch (mode) {
    case 'none':
      return ''
    case 'select-player':
      return 'Place player lock'
    case 'lock-ball':
      return 'Place ball lock'
    case 'ground-plane':
      return 'Place garden corner'
    case 'goal-leftPostBase':
      return 'Place left post base'
    case 'goal-rightPostBase':
      return 'Place right post base'
    case 'goal-leftPostTop':
      return 'Place left post top'
    case 'goal-rightPostTop':
      return 'Place right post top'
    case 'goal-centre':
      return 'Place goal centre'
    case 'goal-box':
      return 'Place one goal corner'
    case 'target-bottomLeft':
      return 'Place bottom-left target'
    case 'target-bottomRight':
      return 'Place bottom-right target'
    case 'target-topLeft':
      return 'Place top-left target'
    case 'target-topRight':
      return 'Place top-right target'
    case 'target-centre':
      return 'Place centre target'
  }
}

function goalFromBox(a: Point2D, b: Point2D): GoalCalibration {
  const left = Math.min(a.x, b.x)
  const right = Math.max(a.x, b.x)
  const top = Math.min(a.y, b.y)
  const bottom = Math.max(a.y, b.y)
  const width = right - left
  const height = bottom - top
  return {
    leftPostBase: { x: left, y: bottom },
    rightPostBase: { x: right, y: bottom },
    leftPostTop: { x: left, y: top },
    rightPostTop: { x: right, y: top },
    centre: { x: left + width / 2, y: top + height / 2 },
    targetZones: {
      bottomLeft: { x: left + width * 0.2, y: bottom - height * 0.18 },
      bottomRight: { x: right - width * 0.2, y: bottom - height * 0.18 },
      topLeft: { x: left + width * 0.2, y: top + height * 0.2 },
      topRight: { x: right - width * 0.2, y: top + height * 0.2 },
      centre: { x: left + width / 2, y: top + height / 2 },
    },
  }
}

function goalWithTap(goal: GoalCalibration, mode: VisionTapMode, point: Point2D): GoalCalibration {
  switch (mode) {
    case 'goal-leftPostBase':
      return { ...goal, leftPostBase: point }
    case 'goal-rightPostBase':
      return { ...goal, rightPostBase: point }
    case 'goal-leftPostTop':
      return { ...goal, leftPostTop: point }
    case 'goal-rightPostTop':
      return { ...goal, rightPostTop: point }
    case 'goal-centre':
      return { ...goal, centre: point }
    case 'target-bottomLeft':
      return { ...goal, targetZones: { ...goal.targetZones, bottomLeft: point } }
    case 'target-bottomRight':
      return { ...goal, targetZones: { ...goal.targetZones, bottomRight: point } }
    case 'target-topLeft':
      return { ...goal, targetZones: { ...goal.targetZones, topLeft: point } }
    case 'target-topRight':
      return { ...goal, targetZones: { ...goal.targetZones, topRight: point } }
    case 'target-centre':
      return { ...goal, targetZones: { ...goal.targetZones, centre: point } }
    default:
      return goal
  }
}

function buildKnownMeasurement(goal: GoalCalibration, groundPlane: Point2D[], metresText: string): KnownMeasurement | undefined {
  const metres = Number.parseFloat(metresText)
  if (!Number.isFinite(metres) || metres <= 0) return undefined
  const imagePointA = goal.leftPostBase ?? groundPlane[0]
  const imagePointB = goal.rightPostBase ?? groundPlane[1]
  if (!imagePointA || !imagePointB) return undefined
  return { label: goal.leftPostBase && goal.rightPostBase ? 'Goal width' : 'Known garden distance', metres, imagePointA, imagePointB }
}

export default function VisionPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>()
  const runningRef = useRef(false)
  const frameIndexRef = useRef(0)
  const lastUiRef = useRef(0)
  const lastFrameTimeRef = useRef(0)
  const fpsRef = useRef(0)
  const stateRef = useRef<VisionEngineState>()
  const recorderRef = useRef<MediaRecorder>()
  const recordingChunksRef = useRef<Blob[]>([])
  const recordingStartedAtRef = useRef('')
  const recordingStartTimeRef = useRef(0)
  const recordingShotCountRef = useRef(0)
  const recordingRef = useRef(false)

  const detectionRef = useRef<DetectionEngine>()
  const playerTrackerRef = useRef<PlayerTracker>()
  const ballTrackerRef = useRef<BallTracker>()
  const shotDetectorRef = useRef<ShotDetector>()
  const autoSetupRef = useRef<SessionAutoSetup>()

  const [running, setRunning] = useState(false)
  const [mode, setMode] = useState<PerformanceMode>('balanced')
  const [tapMode, setTapMode] = useState<VisionTapMode>('none')
  const [cameraError, setCameraError] = useState<{ error: CameraFailure; message: string }>()
  const [engineState, setEngineState] = useState<VisionEngineState>()
  const [autoSetupState, setAutoSetupState] = useState(EMPTY_AUTO_SETUP_STATE)
  const [lastShot, setLastShot] = useState<ShotEvent>()
  const [shots, setShots] = useState<VisionShotSummary[]>([])
  const [recordings, setRecordings] = useState<VisionRecordingSummary[]>([])
  const [recording, setRecording] = useState(false)
  const [recordingStatus, setRecordingStatus] = useState('Recording is off. Clips stay on this device only.')
  const [offlinePack, setOfflinePack] = useState<VisionOfflinePackStatus>()
  const [profile, setProfile] = useState<CalibrationProfile>()
  const [goal, setGoal] = useState<GoalCalibration>(() => createEmptyGoalCalibration())
  const [groundPlane, setGroundPlane] = useState<Point2D[]>([])
  const [profileName, setProfileName] = useState('Garden goal')
  const [knownMetres, setKnownMetres] = useState('3.66')
  const [fixedIpad, setFixedIpad] = useState(true)
  const [goalBoxAnchor, setGoalBoxAnchor] = useState<Point2D>()

  const modeRef = useRef(mode)
  const profileRef = useRef(profile)
  const goalRef = useRef(goal)
  const groundRef = useRef(groundPlane)
  const knownMetresRef = useRef(knownMetres)
  const fixedIpadRef = useRef(fixedIpad)
  const tapModeRef = useRef(tapMode)
  const goalBoxAnchorRef = useRef(goalBoxAnchor)

  useEffect(() => {
    modeRef.current = mode
    profileRef.current = profile
    goalRef.current = goal
    groundRef.current = groundPlane
    knownMetresRef.current = knownMetres
    fixedIpadRef.current = fixedIpad
    tapModeRef.current = tapMode
    goalBoxAnchorRef.current = goalBoxAnchor
  }, [mode, profile, goal, groundPlane, knownMetres, fixedIpad, tapMode, goalBoxAnchor])

  useEffect(() => {
    detectionRef.current = new DetectionEngine()
    playerTrackerRef.current = new PlayerTracker()
    ballTrackerRef.current = new BallTracker()
    shotDetectorRef.current = new ShotDetector()
    autoSetupRef.current = new SessionAutoSetup()

    checkVisionOfflinePack().then(setOfflinePack).catch(() => {})

    Promise.all([loadActiveCalibrationProfile(), loadRecentShots(), loadRecentRecordings()]).then(([loadedProfile, recentShots, recentRecordings]) => {
      setShots(recentShots)
      setRecordings(recentRecordings)
      if (!loadedProfile) return
      setProfile(loadedProfile)
      setGoal(loadedProfile.goal)
      setGroundPlane(loadedProfile.pitch.groundPlane)
      setProfileName(loadedProfile.name)
      setKnownMetres(loadedProfile.pitch.knownMeasurement?.metres.toString() ?? '3.66')
      setFixedIpad(loadedProfile.camera.fixedIpadMode)
    })

    return () => {
      runningRef.current = false
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
      stopVisionStream(streamRef.current)
      disposeVisionModels()
    }
  }, [])

  const recordingSupported = typeof window !== 'undefined' && 'MediaRecorder' in window

  function preferredRecordingMimeType(): string {
    if (!recordingSupported) return ''
    const options = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4']
    return options.find((option) => MediaRecorder.isTypeSupported(option)) ?? ''
  }

  const startLocalRecording = useCallback(() => {
    const stream = streamRef.current
    if (!stream || !recordingSupported) {
      setRecordingStatus('Local video recording is not supported in this browser.')
      return
    }
    if (recorderRef.current?.state === 'recording') return

    const mimeType = preferredRecordingMimeType()
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    recordingChunksRef.current = []
    recordingStartedAtRef.current = new Date().toISOString()
    recordingStartTimeRef.current = performance.now()
    recordingShotCountRef.current = 0
    recordingRef.current = true

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) recordingChunksRef.current.push(event.data)
    }
    recorder.onerror = () => {
      recordingRef.current = false
      setRecording(false)
      setRecordingStatus('Recording stopped because the browser reported an error.')
    }
    recorder.onstop = () => {
      const chunks = recordingChunksRef.current
      const type = mimeType || chunks[0]?.type || 'video/webm'
      const video = new Blob(chunks, { type })
      const durationMs = Math.max(0, performance.now() - recordingStartTimeRef.current)
      const startedAt = recordingStartedAtRef.current || new Date().toISOString()
      const shotCount = recordingShotCountRef.current
      recordingRef.current = false
      setRecording(false)

      if (!video.size) {
        setRecordingStatus('Recording stopped, but no video data was saved.')
        return
      }

      saveVisionRecording({ video, startedAt, durationMs, shotCount })
        .then((summary) => {
          setRecordings((current) => [summary, ...current.filter((item) => item.id !== summary.id)].slice(0, 8))
          setRecordingStatus(`Saved local clip: ${Math.round(video.size / 1024)} KB, ${shotCount} shots.`)
        })
        .catch(() => setRecordingStatus('Recording finished, but the clip could not be saved.'))
    }

    recorderRef.current = recorder
    recorder.start(1500)
    setRecording(true)
    setRecordingStatus('Recording video locally. Nothing is uploaded.')
  }, [recordingSupported])

  const stopLocalRecording = useCallback(() => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive') return
    setRecordingStatus('Saving local clip...')
    recorder.stop()
  }, [])

  const toggleRecording = useCallback(() => {
    if (recordingRef.current) stopLocalRecording()
    else startLocalRecording()
  }, [startLocalRecording, stopLocalRecording])

  const buildCurrentProfile = useCallback((frame: Pick<VisionFrame, 'width' | 'height'>): CalibrationProfile | undefined => {
    const currentGoal = goalRef.current
    const currentGround = groundRef.current
    const measurement = buildKnownMeasurement(currentGoal, currentGround, knownMetresRef.current)
    if (!currentGoal.leftPostBase && !currentGoal.rightPostBase && currentGround.length === 0) return profileRef.current
    return buildCalibrationProfile({
      id: profileRef.current?.id ?? 'draft-vision-profile',
      name: profileName,
      goal: currentGoal,
      pitch: buildPitchCalibration(currentGround, measurement),
      camera: createCameraCalibration(frame.width, frame.height),
      createdAt: profileRef.current?.createdAt,
    })
  }, [profileName])

  const stopVision = useCallback(() => {
    if (recordingRef.current) stopLocalRecording()
    runningRef.current = false
    setRunning(false)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    stopVisionStream(streamRef.current)
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    disposeVisionModels()
  }, [stopLocalRecording])

  const runLoop = useCallback(async () => {
    if (!runningRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    const detection = detectionRef.current
    const playerTracker = playerTrackerRef.current
    const ballTracker = ballTrackerRef.current
    const shotDetector = shotDetectorRef.current
    const autoSetup = autoSetupRef.current
    if (!video || !canvas || !detection || !playerTracker || !ballTracker || !shotDetector || !autoSetup) return

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && syncCanvasToVideo(video, canvas)) {
      const now = performance.now()
      const width = canvas.width
      const height = canvas.height
      const frame: VisionFrame = { index: frameIndexRef.current++, timestamp: now, width, height }
      const dt = lastFrameTimeRef.current ? now - lastFrameTimeRef.current : 0
      lastFrameTimeRef.current = now
      if (dt > 0) fpsRef.current = fpsRef.current ? fpsRef.current * 0.82 + (1000 / dt) * 0.18 : 1000 / dt

      const currentProfile = buildCurrentProfile(frame)
      const goalTrack = goalTrackFromProfile(currentProfile)
      const detectionResult = await detection.detect(video, frame, modeRef.current)
      const setupBeforeTracking = autoSetup.update({
        detections: detectionResult.detections,
        frame,
        player: stateRef.current?.player,
        ball: stateRef.current?.ball,
        goal: goalTrack,
      })
      if (setupBeforeTracking.playerLock) {
        playerTracker.lockToDetection(setupBeforeTracking.playerLock)
      }
      const ball = ballTracker.update(detectionResult.detections, frame)
      const player = playerTracker.update(detectionResult.detections, frame, ball)
      const setupState = autoSetup.describe({ player, ball, goal: goalTrack })
      const completedShot = shotDetector.update({ ball, player, goal: goalTrack, profile: currentProfile, frame })

      if (completedShot) {
        if (recordingRef.current) recordingShotCountRef.current += 1
        setLastShot(completedShot)
        saveShotSummary(completedShot)
          .then((summary) => setShots((current) => [summary, ...current.filter((shot) => shot.id !== summary.id)].slice(0, 32)))
          .catch(() => {})
      }

      const warnings = [
        setupState.player.status === 'blocked' ? setupState.player.message : '',
        setupState.goal.status === 'needs-manual' ? setupState.goal.message : '',
        ball?.state === 'lost' ? 'Camera lost the ball.' : '',
        player?.state === 'lost' ? 'Player tracking is weak.' : '',
        currentProfile?.camera.fixedIpadMode && detectionResult.detections.filter((detectionItem) => detectionItem.source === 'motion').length >= 4
          ? 'Fixed iPad mode: lots of motion detected. Check the iPad is still.'
          : '',
        detectionResult.modelStatus.error ? detectionResult.modelStatus.error : '',
      ].filter(Boolean)

      const debug: VisionDebugInfo = {
        fps: fpsRef.current,
        frameSize: { width, height },
        modelStatus: detectionResult.modelStatus,
        detectionsPerFrame: detectionResult.detections.length,
        playerLostCount: player?.lostFrames ?? 0,
        ballLostCount: ball?.lostFrames ?? 0,
        calibrationCompleteness: currentProfile?.completeness ?? 0,
        shotDetectorState: shotDetector.state,
        processingMode: modeRef.current,
        rawCoordinates: {
          player: player?.center,
          ball: ball?.center,
          goal: goalTrack.outline,
        },
        confidence: {
          player: player?.confidence.score ?? 0,
          ball: ball?.confidence.score ?? 0,
          goal: goalTrack.confidence.score,
          shot: completedShot?.confidence.score ?? stateRef.current?.debug.confidence.shot ?? 0,
        },
        messages: warnings.slice(0, 3),
      }

      const nextState: VisionEngineState = {
        frame,
        detections: detectionResult.detections,
        player,
        ball,
        goal: goalTrack,
        autoSetup: setupState,
        lastShot: completedShot ?? lastShot,
        debug,
        warnings,
      }
      stateRef.current = nextState
      drawVisionOverlay(canvas, nextState, {
        goal: goalRef.current,
        groundPlane: groundRef.current,
        activeTapLabel:
          tapModeRef.current === 'none'
            ? undefined
            : tapModeRef.current === 'goal-box' && goalBoxAnchorRef.current
              ? 'Place opposite goal corner'
              : tapLabel(tapModeRef.current),
        profile: currentProfile,
      })

      if (now - lastUiRef.current > 150 || completedShot) {
        lastUiRef.current = now
        setEngineState(nextState)
        setAutoSetupState(setupState)
      }
    }

    rafRef.current = requestAnimationFrame(() => {
      runLoop().catch(() => {
        runningRef.current = false
        setRunning(false)
      })
    })
  }, [buildCurrentProfile, lastShot])

  const startVision = useCallback(async () => {
    const result = await requestVisionStream()
    if (!result.stream) {
      setCameraError({ error: result.error ?? 'unknown', message: result.message ?? 'Camera could not start.' })
      return
    }
    setCameraError(undefined)
    streamRef.current = result.stream
    const video = videoRef.current
    if (video) {
      video.srcObject = result.stream
      await video.play().catch(() => {})
    }
    detectionRef.current?.reset()
    playerTrackerRef.current = new PlayerTracker()
    ballTrackerRef.current = new BallTracker()
    shotDetectorRef.current = new ShotDetector()
    autoSetupRef.current = new SessionAutoSetup()
    setAutoSetupState(EMPTY_AUTO_SETUP_STATE)
    setTapMode('none')
    runningRef.current = true
    setRunning(true)
    frameIndexRef.current = 0
    lastFrameTimeRef.current = 0
    fpsRef.current = 0
    rafRef.current = requestAnimationFrame(() => {
      runLoop().catch(() => setCameraError({ error: 'unknown', message: 'Vision loop stopped unexpectedly.' }))
    })
  }, [runLoop])

  const handleTap = useCallback((point: Point2D) => {
    const currentMode = tapModeRef.current
    const frame = stateRef.current?.frame ?? { index: 0, timestamp: performance.now(), width: canvasRef.current?.width ?? 720, height: canvasRef.current?.height ?? 1280 }
    if (currentMode === 'none') return
    if (currentMode === 'select-player') {
      playerTrackerRef.current?.selectAt(point, stateRef.current?.detections ?? [])
      return
    }
    if (currentMode === 'lock-ball') {
      ballTrackerRef.current?.lockAt(point, frame)
      return
    }
    if (currentMode === 'ground-plane') {
      setGroundPlane((current) => [...(current.length >= 4 ? [] : current), point].slice(0, 4))
      return
    }
    if (currentMode === 'goal-box') {
      if (!goalBoxAnchor) {
        setGoalBoxAnchor(point)
        return
      }
      setGoal(goalFromBox(goalBoxAnchor, point))
      setGoalBoxAnchor(undefined)
      setTapMode('none')
      return
    }
    setGoal((current) => goalWithTap(current, currentMode, point))
  }, [goalBoxAnchor])

  const saveCalibration = useCallback(() => {
    const frame = stateRef.current?.frame ?? { width: canvasRef.current?.width ?? 0, height: canvasRef.current?.height ?? 0 }
    const measurement = buildKnownMeasurement(goal, groundPlane, knownMetres)
    const nextProfile = buildCalibrationProfile({
      id: profile?.id,
      name: profileName,
      goal,
      pitch: buildPitchCalibration(groundPlane, measurement),
      camera: { ...createCameraCalibration(frame.width, frame.height), fixedIpadMode: fixedIpad },
      createdAt: profile?.createdAt,
    })
    saveCalibrationProfile(nextProfile)
      .then(() => setProfile(nextProfile))
      .catch(() => setCameraError({ error: 'unknown', message: 'Calibration could not be saved.' }))
  }, [fixedIpad, goal, groundPlane, knownMetres, profile, profileName])

  const manualShot = useCallback(() => {
    const frame = stateRef.current?.frame
    if (!frame) return
    shotDetectorRef.current?.manualMark(stateRef.current?.ball, stateRef.current?.player, frame)
  }, [])

  const resetBall = useCallback(() => {
    ballTrackerRef.current?.clearManualLock()
  }, [])

  const openRecording = useCallback((recordingToOpen: VisionRecordingSummary) => {
    loadRecordingBlob(recordingToOpen.id)
      .then((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank', 'noopener,noreferrer')
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
      })
      .catch(() => setRecordingStatus('Could not open that local clip.'))
  }, [])

  const downloadRecording = useCallback((recordingToDownload: VisionRecordingSummary) => {
    loadRecordingBlob(recordingToDownload.id)
      .then((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `garden-baller-vision-${recordingToDownload.timestamp.slice(0, 19).replace(/[:T]/g, '-')}.webm`
        document.body.append(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
      })
      .catch(() => setRecordingStatus('Could not download that local clip.'))
  }, [])

  const deleteRecording = useCallback((recordingToDelete: VisionRecordingSummary) => {
    deleteVisionRecording(recordingToDelete.id)
      .then(() => {
        setRecordings((current) => current.filter((item) => item.id !== recordingToDelete.id))
        setRecordingStatus('Local clip deleted.')
      })
      .catch(() => setRecordingStatus('Could not delete that local clip.'))
  }, [])

  const refreshOfflinePack = useCallback(() => {
    checkVisionOfflinePack().then(setOfflinePack).catch(() => {})
  }, [])

  return (
    <div className="safe-top px-3 pb-6 md:px-5">
      <header className="mb-3 flex items-center justify-between gap-3">
        <Link to="/" className="btn-ghost h-10 w-10" aria-label="Back">
          <ChevronLeft size={22} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="label">Football analytics cockpit</div>
          <h1 className="truncate text-3xl font-extrabold leading-none md:text-4xl">GARDEN BALLER VISION</h1>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-emerald-glow/20 bg-emerald-glow/10 px-3 py-2 text-xs font-bold text-emerald-glow sm:flex">
          <ShieldCheck size={15} /> Local only
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <div className="space-y-3">
          <VisionCamera
            running={running}
            videoRef={videoRef}
            canvasRef={canvasRef}
            onStart={startVision}
            onStop={stopVision}
            onTap={handleTap}
            cameraError={cameraError}
          />
          <div className="grid gap-3 lg:grid-cols-[0.86fr_1.14fr]">
            <VisionControls
              running={running}
              mode={mode}
              tapMode={tapMode}
              onModeChange={setMode}
              onTapModeChange={setTapMode}
              onManualShot={manualShot}
              onResetBall={resetBall}
              recording={recording}
              recordingSupported={recordingSupported}
              onToggleRecording={toggleRecording}
            />
            <div className="card card-hi flex items-start gap-3 p-3 text-sm font-semibold text-white/58">
              <Sparkles size={18} className="mt-0.5 shrink-0 text-gold" />
              <p>
                Uses local camera frames, browser models, motion tracking and calibration. No raw video, images, audio, face data or cloud uploads are stored.
              </p>
            </div>
          </div>
        </div>

        <aside className="space-y-3">
          <VisionMetricsPanel state={engineState} autoSetup={engineState?.autoSetup ?? autoSetupState} lastShot={lastShot} shots={shots} />
          <VisionOfflinePanel status={offlinePack} onRefresh={refreshOfflinePack} />
          <VisionRawStatsPanel shots={shots} />
          <VisionCalibrationPanel
            goal={goal}
            groundPlane={groundPlane}
            profileName={profileName}
            knownMetres={knownMetres}
            fixedIpad={fixedIpad}
            mode={mode}
            tapMode={tapMode}
            onTapModeChange={setTapMode}
            onGoalChange={setGoal}
            onGroundChange={setGroundPlane}
            onProfileNameChange={setProfileName}
            onKnownMetresChange={setKnownMetres}
            onFixedIpadChange={setFixedIpad}
            onSave={saveCalibration}
          />
          <VisionRecordingPanel
            recordings={recordings}
            recordingStatus={recordingStatus}
            onOpen={openRecording}
            onDownload={downloadRecording}
            onDelete={deleteRecording}
          />
          <VisionShotHistory shots={shots} />
          <VisionDebugPanel debug={engineState?.debug ?? initialDebug(mode)} />
        </aside>
      </div>
    </div>
  )
}
