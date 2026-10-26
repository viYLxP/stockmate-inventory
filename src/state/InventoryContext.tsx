import { createContext, useCallback, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import { useToast } from '../components/Toast'
import { buildMovement, newId, type MovementResult, type ProductInput } from '../domain/inventory'
import { loadInventory, saveInventory } from '../domain/storage'
import type { InventoryData, MovementReason, MovementType, Product } from '../domain/types'

type Action =
  | { type: 'add'; product: Product }
  | { type: 'update'; id: string; input: ProductInput; now: string }
  | { type: 'delete'; id: string }
  | { type: 'movement'; productId: string; draft: MovementDraftInput; result: MovementResult; now: string }
  | { type: 'replace'; data: InventoryData }

interface MovementDraftInput {
  type: MovementType
  reason: MovementReason
  note: string
}

function reducer(state: InventoryData, action: Action): InventoryData {
  switch (action.type) {
    case 'add': {
      const p = action.product
      const movements =
        p.quantity > 0
          ? [
              buildMovement(p, { type: 'in', reason: 'initial', note: '' }, { change: p.quantity, balanceAfter: p.quantity }, p.createdAt),
              ...state.movements,
            ]
          : state.movements
      return { products: [p, ...state.products], movements }
    }
    case 'update':
      return {
        ...state,
        // Quantity only changes through stock movements, so it is never taken from the edit form.
        products: state.products.map((p) =>
          p.id === action.id ? { ...p, ...action.input, quantity: p.quantity, updatedAt: action.now } : p,
        ),
      }
    case 'delete':
      return { ...state, products: state.products.filter((p) => p.id !== action.id) }
    case 'movement': {
      const product = state.products.find((p) => p.id === action.productId)
      if (!product) return state
      // Recompute against current stock so a stale form can never drive stock negative.
      const balanceAfter = product.quantity + action.result.change
      if (balanceAfter < 0) return state
      const updated = { ...product, quantity: balanceAfter, updatedAt: action.now }
      const movement = buildMovement(updated, action.draft, { change: action.result.change, balanceAfter }, action.now)
      return {
        products: state.products.map((p) => (p.id === product.id ? updated : p)),
        movements: [movement, ...state.movements],
      }
    }
    case 'replace':
      return action.data
  }
}

interface InventoryContextValue extends InventoryData {
  addProduct: (input: ProductInput) => Product
  updateProduct: (id: string, input: ProductInput) => void
  deleteProduct: (id: string) => void
  recordMovement: (productId: string, draft: MovementDraftInput, result: MovementResult) => void
  replaceAll: (data: InventoryData) => void
}

// eslint-disable-next-line react-refresh/only-export-components
export const InventoryContext = createContext<InventoryContextValue | null>(null)

export function InventoryProvider({ children }: { children: ReactNode }) {
  const { notify } = useToast()
  const initial = useRef<ReturnType<typeof loadInventory> | null>(null)
  if (initial.current === null) initial.current = loadInventory()
  const [state, dispatch] = useReducer(reducer, initial.current.data)
  const firstRender = useRef(true)

  useEffect(() => {
    if (initial.current?.status === 'corrupt') notify('error', { key: 'errors.loadFailed' })
  }, [notify])

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    if (!saveInventory(state)) notify('error', { key: 'errors.saveFailed' })
  }, [state, notify])

  const addProduct = useCallback((input: ProductInput) => {
    const now = new Date().toISOString()
    const product: Product = { ...input, id: newId(), createdAt: now, updatedAt: now }
    dispatch({ type: 'add', product })
    return product
  }, [])

  const value = useMemo<InventoryContextValue>(
    () => ({
      ...state,
      addProduct,
      updateProduct: (id, input) => dispatch({ type: 'update', id, input, now: new Date().toISOString() }),
      deleteProduct: (id) => dispatch({ type: 'delete', id }),
      recordMovement: (productId, draft, result) =>
        dispatch({ type: 'movement', productId, draft, result, now: new Date().toISOString() }),
      replaceAll: (data) => dispatch({ type: 'replace', data }),
    }),
    [state, addProduct],
  )

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>
}
