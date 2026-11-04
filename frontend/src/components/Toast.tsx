import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

type Toast = {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

type ToastContextValue = {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  success: (msg: string, dur?: number) => void;
  error: (msg: string, dur?: number) => void;
  warning: (msg: string, dur?: number) => void;
  info: (msg: string, dur?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null)

let toastId = 0

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

const ICONS: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 size={18} className="text-green-500 shrink-0" />,
  error:   <XCircle     size={18} className="text-red-500 shrink-0" />,
  warning: <AlertCircle size={18} className="text-yellow-500 shrink-0" />,
  info:    <Info        size={18} className="text-blue-500 shrink-0" />,
}

const BG: Record<ToastType, string> = {
  success: 'border-l-green-500',
  error:   'border-l-red-500',
  warning: 'border-l-yellow-500',
  info:    'border-l-blue-500',
}

type ToastItemProps = {
  toast: Toast;
  onRemove: (id: number) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  useEffect(() => {
    const t = setTimeout(() => onRemove(toast.id), toast.duration ?? 4000)
    return () => clearTimeout(t)
  }, [toast.id, toast.duration, onRemove])

  return (
    <div
      className={`flex items-start gap-3 bg-white rounded-xl shadow-lg border border-gray-100 border-l-4 ${BG[toast.type] || BG.info} px-4 py-3 min-w-[280px] max-w-sm animate-slide-in`}
    >
      {ICONS[toast.type]}
      <p className="text-sm text-gray-800 flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-gray-400 hover:text-gray-600 transition shrink-0 mt-0.5"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type, duration }])
  }, [])

  const success = useCallback((msg: string, dur?: number) => toast(msg, 'success', dur), [toast])
  const error   = useCallback((msg: string, dur?: number) => toast(msg, 'error', dur), [toast])
  const warning = useCallback((msg: string, dur?: number) => toast(msg, 'warning', dur), [toast])
  const info    = useCallback((msg: string, dur?: number) => toast(msg, 'info', dur), [toast])

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onRemove={remove} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
