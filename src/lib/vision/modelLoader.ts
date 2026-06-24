import type { ModelStatus, PerformanceMode } from './types'

export type PoseDetector = import('@tensorflow-models/pose-detection').PoseDetector
export type CocoModel = import('@tensorflow-models/coco-ssd').ObjectDetection

export interface VisionModels {
  pose?: PoseDetector
  object?: CocoModel
  status: ModelStatus
}

export interface VisionOfflinePackStatus {
  ready: boolean
  poseReady: boolean
  objectReady: boolean
  checkedAt: string
}

let modelPromise: Promise<VisionModels> | null = null
let cachedModels: VisionModels | null = null

const baseUrl = '/'
const localPoseModelUrl = `${baseUrl}models/vision/movenet-lightning/model.json`
const localObjectModelUrl = `${baseUrl}models/vision/coco-ssd-lite/model.json`
const remotePoseModelUrl = 'https://tfhub.dev/google/tfjs-model/movenet/singlepose/lightning/4'
const remoteObjectModelUrl = 'https://storage.googleapis.com/tfjs-models/savedmodel/ssdlite_mobilenet_v2/model.json'

function disabledStatus(): ModelStatus {
  return {
    pose: 'disabled',
    object: 'disabled',
    offlinePack: 'unknown',
  }
}

export function shouldUseModels(mode: PerformanceMode): boolean {
  return mode !== 'lightweight'
}

export async function loadVisionModels(mode: PerformanceMode): Promise<VisionModels> {
  if (!shouldUseModels(mode)) {
    return { status: disabledStatus() }
  }
  if (cachedModels) return cachedModels
  if (modelPromise) return modelPromise

  modelPromise = (async () => {
    const offlinePack = await checkVisionOfflinePack()
    const status: ModelStatus = {
      pose: 'loading',
      object: 'loading',
      offlinePack: offlinePack.ready ? 'ready' : offlinePack.poseReady || offlinePack.objectReady ? 'partial' : 'missing',
    }
    try {
      const [tf, poseDetection, cocoSsd] = await Promise.all([
        import('@tensorflow/tfjs'),
        import('@tensorflow-models/pose-detection'),
        import('@tensorflow-models/coco-ssd'),
      ])

      try {
        await tf.setBackend('webgl')
      } catch {
        await tf.setBackend('cpu')
      }
      await tf.ready()
      status.backend = tf.getBackend()

      const pose = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        enableSmoothing: true,
        modelUrl: offlinePack.poseReady ? localPoseModelUrl : remotePoseModelUrl,
      })
      status.pose = 'ready'

      const object = await cocoSsd.load({
        base: 'lite_mobilenet_v2',
        modelUrl: offlinePack.objectReady ? localObjectModelUrl : remoteObjectModelUrl,
      })
      status.object = 'ready'

      cachedModels = { pose, object, status }
      return cachedModels
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Vision models failed to load'
      cachedModels = {
        status: {
          ...status,
          pose: status.pose === 'ready' ? 'ready' : 'failed',
          object: status.object === 'ready' ? 'ready' : 'failed',
          error: message,
        },
      }
      return cachedModels
    }
  })()

  return modelPromise
}

export function disposeVisionModels(): void {
  cachedModels?.pose?.dispose()
  cachedModels = null
  modelPromise = null
}

export async function checkVisionOfflinePack(): Promise<VisionOfflinePackStatus> {
  const [poseReady, objectReady] = await Promise.all([modelFileAvailable(localPoseModelUrl), modelFileAvailable(localObjectModelUrl)])
  return {
    ready: poseReady && objectReady,
    poseReady,
    objectReady,
    checkedAt: new Date().toISOString(),
  }
}

async function modelFileAvailable(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { cache: 'force-cache' })
    return response.ok
  } catch {
    return false
  }
}
