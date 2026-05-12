import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import QRCodeGenerator from './QRCodeGenerator'

interface Props {
  restaurantName: string
  slug: string
  onClose: () => void
}

export default function QRModal({ restaurantName, slug, onClose }: Props) {
  const [visible, setVisible] = useState(true)

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
          <motion.div
            className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            transition={{ type: 'spring', bounce: 0.3 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <div>
                <h2 className="font-bold text-lg text-white">QR Code</h2>
                <p className="text-xs text-zinc-500 mt-0.5">{restaurantName}</p>
              </div>
              <button
                onClick={handleClose}
                className="w-9 h-9 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <QRCodeGenerator slug={slug} restaurantName={restaurantName} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
