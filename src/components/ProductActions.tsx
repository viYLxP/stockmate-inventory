import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Product } from '../domain/types'
import { useI18n } from '../i18n/useI18n'
import { useInventory } from '../state/useInventory'
import { ConfirmDialog, Modal } from './Modal'
import { MovementForm } from './MovementForm'
import { ProductForm } from './ProductForm'
import { useToast } from './Toast'

type Dialog =
  | { kind: 'add' }
  | { kind: 'edit'; productId: string }
  | { kind: 'movement'; productId: string }
  | { kind: 'delete'; productId: string }
  | null

interface ProductActions {
  openAdd: () => void
  openEdit: (p: Product) => void
  openMovement: (p: Product) => void
  openDelete: (p: Product) => void
}

const ProductActionsContext = createContext<ProductActions | null>(null)

// eslint-disable-next-line react-refresh/only-export-components
export function useProductActions() {
  const ctx = useContext(ProductActionsContext)
  if (!ctx) throw new Error('useProductActions must be used inside <ProductActionsProvider>')
  return ctx
}

/** One place that owns the add/edit/stock/delete dialogs so any page can open them. */
export function ProductActionsProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const { products, deleteProduct } = useInventory()
  const { notify } = useToast()
  const [dialog, setDialog] = useState<Dialog>(null)
  const close = () => setDialog(null)

  const actions = useMemo<ProductActions>(
    () => ({
      openAdd: () => setDialog({ kind: 'add' }),
      openEdit: (p) => setDialog({ kind: 'edit', productId: p.id }),
      openMovement: (p) => setDialog({ kind: 'movement', productId: p.id }),
      openDelete: (p) => setDialog({ kind: 'delete', productId: p.id }),
    }),
    [],
  )

  const target = dialog && dialog.kind !== 'add' ? products.find((p) => p.id === dialog.productId) : undefined

  return (
    <ProductActionsContext.Provider value={actions}>
      {children}

      <Modal
        open={dialog?.kind === 'add' || (dialog?.kind === 'edit' && Boolean(target))}
        title={dialog?.kind === 'edit' ? t('products.editTitle') : t('products.addTitle')}
        onClose={close}
      >
        {dialog?.kind === 'add' && <ProductForm onDone={close} onCancel={close} />}
        {dialog?.kind === 'edit' && target && <ProductForm product={target} onDone={close} onCancel={close} />}
      </Modal>

      <Modal open={dialog?.kind === 'movement' && Boolean(target)} title={t('movement.title')} onClose={close}>
        {dialog?.kind === 'movement' && target && <MovementForm product={target} onDone={close} onCancel={close} />}
      </Modal>

      <ConfirmDialog
        open={dialog?.kind === 'delete' && Boolean(target)}
        title={t('products.deleteTitle')}
        body={target ? t('products.deleteBody', { name: target.name }) : ''}
        confirmLabel={t('common.delete')}
        onClose={close}
        onConfirm={() => {
          if (!target) return
          deleteProduct(target.id)
          notify('success', { key: 'products.deleted', params: { name: target.name } })
        }}
      />
    </ProductActionsContext.Provider>
  )
}
