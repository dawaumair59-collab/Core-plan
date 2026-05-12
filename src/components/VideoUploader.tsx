import { useState, useRef, useCallback } from 'react'
import { uploadToCloudinary, getVideoThumbnail, formatFileSize, type UploadProgress } from '../lib/cloudinary'
import type { CloudinaryUploadResult } from '../lib/cloudinary'

interface Props {
  onUploadComplete: (result: CloudinaryUploadResult) => void
  existingVideoUrl?: string | null
  existingThumbnailUrl?: string | null
}

export default function VideoUploader({ onUploadComplete, existingVideoUrl, existingThumbnailUrl }: Props) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(existingVideoUrl ?? null)
  const [thumbnail, setThumbnail] = useState<string | null>(existingThumbnailUrl ?? null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('video/')) {
      setError('Please select a video file (MP4, MOV, WebM)')
      return
    }
    if (file.size > 500 * 1024 * 1024) {
      setError('Video must be under 500 MB')
      return
    }

    setError(null)
    setUploading(true)
    setProgress({ loaded: 0, total: file.size, percent: 0 })

    // Local preview while uploading
    const localUrl = URL.createObjectURL(file)
    setPreview(localUrl)

    try {
      const result = await uploadToCloudinary(file, 'video', (p) => setProgress(p))
      const thumbUrl = getVideoThumbnail(result.public_id)
      setThumbnail(thumbUrl)
      setPreview(result.secure_url)
      onUploadComplete(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed')
      setPreview(null)
    } finally {
      setUploading(false)
      setProgress(null)
    }
  }, [onUploadComplete])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="space-y-3">
      {preview ? (
        <div className="relative rounded-xl overflow-hidden bg-black aspect-video group">
          <video
            src={preview}
            poster={thumbnail ?? undefined}
            className="w-full h-full object-cover"
            controls
            playsInline
          />
          {uploading && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3">
              <div className="text-white font-semibold text-sm">
                Uploading {progress?.percent ?? 0}%
              </div>
              <div className="w-48 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress?.percent ?? 0}%` }}
                />
              </div>
              <div className="text-zinc-400 text-xs">
                {formatFileSize(progress?.loaded ?? 0)} / {formatFileSize(progress?.total ?? 0)}
              </div>
            </div>
          )}
          {!uploading && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                onClick={() => inputRef.current?.click()}
                className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 backdrop-blur border border-white/20 transition-colors"
              >
                Replace video
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          className={`relative rounded-xl border-2 border-dashed transition-all cursor-pointer aspect-video flex flex-col items-center justify-center gap-3 ${
            dragging
              ? 'border-orange-500 bg-orange-500/5 scale-[1.01]'
              : 'border-zinc-700 hover:border-zinc-500 bg-zinc-900/50'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center text-2xl">🎬</div>
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-300">Drop video here or <span className="text-orange-400">browse</span></p>
            <p className="text-xs text-zinc-500 mt-1">MP4, MOV, WebM • Max 500 MB</p>
            <p className="text-xs text-zinc-600 mt-0.5">Auto-compressed via Cloudinary</p>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-3 py-2">
          {error}
        </div>
      )}
    </div>
  )
}
