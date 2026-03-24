import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger'
}: ConfirmationModalProps) {
  const variantColors = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white',
    info: 'bg-indigo-600 hover:bg-indigo-700 text-white'
  };

  const iconColors = {
    danger: 'text-red-600 bg-red-50',
    warning: 'text-amber-500 bg-amber-50',
    info: 'text-indigo-600 bg-indigo-50'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 overflow-hidden"
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-2xl ${iconColors[variant]}`}>
                <AlertTriangle size={24} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h2 className="text-xl font-bold text-slate-900">{title}</h2>
                  <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                    <X size={20} />
                  </button>
                </div>
                <p className="text-slate-500 mt-2 text-sm leading-relaxed">{message}</p>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`flex-1 px-4 py-3 rounded-xl font-bold transition-all shadow-lg ${variantColors[variant]}`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
