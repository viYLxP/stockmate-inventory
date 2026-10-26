import { useEffect, useId, useRef, type ReactNode } from 'react'
import { useI18n } from '../i18n/useI18n'
import { Icon } from './Icon'
import { LanguageSwitcher } from './LanguageSwitcher'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  size?: 'md' | 'sm'
}

/**
 * Built on the native <dialog> element: focus is trapped, Esc closes, and focus
 * returns to the opener. Content is not keyed by language, so switching language
 * while a form is open keeps what the user typed.
 */
export function Modal({ open, title, onClose, children, size = 'md' }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const { t } = useI18n()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={`modal modal--${size}`}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        // Click on the backdrop (the dialog element itself) closes.
        if (e.target === ref.current) onClose()
      }}
    >
      {open && (
        <div className="modal__panel">
          <header className="modal__header">
            <h2 id={titleId}>{title}</h2>
            <div className="modal__header-actions">
              {/* The page behind a modal is inert, so the dialog carries its own language switch. */}
              <LanguageSwitcher compact />
              <button type="button" className="icon-button" onClick={onClose} aria-label={t('common.close')}>
                <Icon name="close" />
              </button>
            </div>
          </header>
          {children}
        </div>
      )}
    </dialog>
  )
}

interface ConfirmProps {
  open: boolean
  title: string
  body: string
  confirmLabel: string
  tone?: 'danger' | 'primary'
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({ open, title, body, confirmLabel, tone = 'danger', onConfirm, onClose }: ConfirmProps) {
  const { t } = useI18n()
  return (
    <Modal open={open} title={title} onClose={onClose} size="sm">
      <div className="modal__body">
        <p>{body}</p>
      </div>
      <footer className="modal__footer">
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          {t('common.cancel')}
        </button>
        <button
          type="button"
          className={`btn ${tone === 'danger' ? 'btn--danger' : 'btn--primary'}`}
          onClick={() => {
            onConfirm()
            onClose()
          }}
          autoFocus
        >
          {confirmLabel}
        </button>
      </footer>
    </Modal>
  )
}
