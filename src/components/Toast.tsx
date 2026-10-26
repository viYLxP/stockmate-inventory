import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { FieldError } from '../domain/inventory'
import { useI18n } from '../i18n/useI18n'
import { Icon } from './Icon'

type ToastTone = 'success' | 'error' | 'info'
interface Toast extends FieldError {
  id: number
  tone: ToastTone
}

interface ToastContextValue {
  notify: (tone: ToastTone, message: FieldError) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

/** Toasts keep a translation key, not a string, so they re-render in the new language if it changes. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), [])
  const notify = useCallback((tone: ToastTone, message: FieldError) => {
    const id = nextId.current++
    setToasts((list) => [...list.slice(-3), { id, tone, ...message }])
  }, [])

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="toast-viewport" role="region" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const { t } = useI18n()
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), toast.tone === 'error' ? 8000 : 4500)
    return () => window.clearTimeout(timer)
  }, [toast.id, toast.tone, onDismiss])

  return (
    <div className={`toast toast--${toast.tone}`} role={toast.tone === 'error' ? 'alert' : 'status'}>
      <Icon name={toast.tone === 'error' ? 'alert' : toast.tone === 'success' ? 'check' : 'info'} />
      <p>{t(toast.key, toast.params)}</p>
      <button type="button" className="icon-button" onClick={() => onDismiss(toast.id)} aria-label={t('common.close')}>
        <Icon name="close" />
      </button>
    </div>
  )
}
