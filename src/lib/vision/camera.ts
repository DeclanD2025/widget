export type CameraFailure =
  | 'unsupported'
  | 'insecure-context'
  | 'permission-denied'
  | 'not-found'
  | 'unknown'

export interface CameraResult {
  stream?: MediaStream
  error?: CameraFailure
  message?: string
}

export function isCameraSupported(): boolean {
  return Boolean(navigator.mediaDevices?.getUserMedia)
}

export function isSecureCameraContext(): boolean {
  return window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
}

export async function requestVisionStream(): Promise<CameraResult> {
  if (!isCameraSupported()) {
    return { error: 'unsupported', message: 'This browser does not support camera capture.' }
  }
  if (!isSecureCameraContext()) {
    return { error: 'insecure-context', message: 'Camera needs HTTPS or localhost.' }
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    })
    return { stream }
  } catch (error) {
    const err = error as DOMException
    if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
      return { error: 'permission-denied', message: 'Camera permission was denied.' }
    }
    if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') {
      return { error: 'not-found', message: 'No suitable camera was found.' }
    }
    return { error: 'unknown', message: err.message || 'Camera could not start.' }
  }
}

export function stopVisionStream(stream?: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop())
}

export function syncCanvasToVideo(video: HTMLVideoElement, canvas: HTMLCanvasElement): boolean {
  const width = video.videoWidth || video.clientWidth
  const height = video.videoHeight || video.clientHeight
  if (!width || !height) return false
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }
  return true
}
