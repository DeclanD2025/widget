import fs from 'node:fs/promises'
import path from 'node:path'
import * as tf from '@tensorflow/tfjs'

const OUT_DIR = path.resolve('public/models/vision')

const MODELS = [
  {
    id: 'movenet-lightning',
    source: 'https://tfhub.dev/google/tfjs-model/movenet/singlepose/lightning/4',
    fromTFHub: true,
  },
  {
    id: 'coco-ssd-lite',
    source: 'https://storage.googleapis.com/tfjs-models/savedmodel/ssdlite_mobilenet_v2/model.json',
    fromTFHub: false,
  },
]

async function exists(file) {
  try {
    await fs.access(file)
    return true
  } catch {
    return false
  }
}

function toArrayBuffer(data) {
  if (Array.isArray(data)) {
    const buffers = data.map((item) => Buffer.from(toArrayBuffer(item)))
    return Buffer.concat(buffers)
  }
  if (data instanceof ArrayBuffer) return data
  if (ArrayBuffer.isView(data)) {
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
  }
  if (data instanceof Buffer) {
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
  }
  throw new Error(`Unsupported weight data type: ${Object.prototype.toString.call(data)}`)
}

async function saveModelArtifacts(modelConfig) {
  const modelDir = path.join(OUT_DIR, modelConfig.id)
  const modelJson = path.join(modelDir, 'model.json')
  const weightsBin = path.join(modelDir, 'weights.bin')
  const metaJson = path.join(modelDir, 'garden-baller-model.json')

  if ((await exists(modelJson)) && (await exists(weightsBin)) && (await exists(metaJson))) {
    console.log(`Vision model already vendored: ${modelConfig.id}`)
    return
  }

  await fs.mkdir(modelDir, { recursive: true })
  console.log(`Loading ${modelConfig.id} from ${modelConfig.source}`)
  const model = await tf.loadGraphModel(modelConfig.source, { fromTFHub: modelConfig.fromTFHub })

  let artifacts
  await model.save(
    tf.io.withSaveHandler(async (savedArtifacts) => {
      artifacts = savedArtifacts
      return {
        modelArtifactsInfo: {
          dateSaved: new Date(),
          modelTopologyType: 'JSON',
          modelTopologyBytes: JSON.stringify(savedArtifacts.modelTopology ?? {}).length,
          weightSpecsBytes: JSON.stringify(savedArtifacts.weightSpecs ?? []).length,
          weightDataBytes: savedArtifacts.weightData?.byteLength ?? 0,
        },
      }
    }),
  )

  const weightData = artifacts?.weightData ?? model.artifacts?.weightData
  const weightSpecs = artifacts?.weightSpecs ?? model.artifacts?.weightSpecs
  const modelTopology = artifacts?.modelTopology ?? model.artifacts?.modelTopology

  if (!modelTopology || !weightSpecs || !weightData) {
    throw new Error(`Could not save artifacts for ${modelConfig.id}`)
  }

  await fs.writeFile(weightsBin, Buffer.from(toArrayBuffer(weightData)))
  await fs.writeFile(
    modelJson,
    JSON.stringify(
      {
        format: artifacts.format ?? 'graph-model',
        generatedBy: artifacts.generatedBy ?? 'TensorFlow.js',
        convertedBy: artifacts.convertedBy,
        modelTopology,
        weightsManifest: [
          {
            paths: ['weights.bin'],
            weights: weightSpecs,
          },
        ],
        signature: artifacts.signature ?? model.artifacts?.signature,
        userDefinedMetadata: artifacts.userDefinedMetadata ?? model.artifacts?.userDefinedMetadata,
      },
      null,
      2,
    ),
  )
  await fs.writeFile(
    metaJson,
    JSON.stringify(
      {
        id: modelConfig.id,
        source: modelConfig.source,
        fromTFHub: modelConfig.fromTFHub,
        vendoredAt: new Date().toISOString(),
        files: ['model.json', 'weights.bin'],
        purpose:
          modelConfig.id === 'movenet-lightning'
            ? 'Local MoveNet single-pose player tracking'
            : 'Local COCO-SSD person and sports-ball object detection',
      },
      null,
      2,
    ),
  )
  model.dispose()
  const stats = await fs.stat(weightsBin)
  console.log(`Saved ${modelConfig.id}: ${(stats.size / (1024 * 1024)).toFixed(1)} MB`)
}

await fs.mkdir(OUT_DIR, { recursive: true })
for (const model of MODELS) {
  await saveModelArtifacts(model)
}
