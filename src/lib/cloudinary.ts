const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export interface CloudinaryUploadResult {
  public_id: string
  secure_url: string
  url: string
  duration?: number
  format: string
  resource_type: string
  thumbnail_url?: string
  width?: number
  height?: number
  bytes: number
}

export interface UploadProgress {
  loaded: number
  total: number
  percent: number
}

export async function uploadToCloudinary(
  file: File,
  resourceType: 'image' | 'video' = 'image',
  onProgress?: (progress: UploadProgress) => void
): Promise<CloudinaryUploadResult> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary credentials not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('resource_type', resourceType)

  if (resourceType === 'video') {
    formData.append('quality', 'auto')
    formData.append('fetch_format', 'auto')
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress({
          loaded: e.loaded,
          total: e.total,
          percent: Math.round((e.loaded / e.total) * 100),
        })
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const result = JSON.parse(xhr.responseText) as CloudinaryUploadResult
        resolve(result)
      } else {
        try {
          const err = JSON.parse(xhr.responseText)
          reject(new Error(err.error?.message ?? `Upload failed with status ${xhr.status}`))
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`))
        }
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')))
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')))

    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`)
    xhr.send(formData)
  })
}

export function getVideoThumbnail(publicId: string, cloudName = CLOUD_NAME): string {
  return `https://res.cloudinary.com/${cloudName}/video/upload/so_0,w_800,h_450,c_fill,q_auto,f_jpg/${publicId}.jpg`
}

export function getOptimizedVideoUrl(publicId: string, cloudName = CLOUD_NAME): string {
  return `https://res.cloudinary.com/${cloudName}/video/upload/q_auto,f_auto/${publicId}`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
