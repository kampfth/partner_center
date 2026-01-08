import * as React from 'react'

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 5000

type ToastType = 'default' | 'success' | 'error' | 'warning'

export type Toast = {
  id: string
  title?: string
  description?: string
  type?: ToastType
}

type ToastAction =
  | { type: 'ADD_TOAST'; toast: Toast }
  | { type: 'REMOVE_TOAST'; id: string }
  | { type: 'DISMISS_TOAST'; id: string }

interface ToastState {
  toasts: Toast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (id: string, dispatch: React.Dispatch<ToastAction>) => {
  if (toastTimeouts.has(id)) return

  const timeout = setTimeout(() => {
    toastTimeouts.delete(id)
    dispatch({ type: 'REMOVE_TOAST', id })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(id, timeout)
}

const reducer = (state: ToastState, action: ToastAction): ToastState => {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }
    case 'DISMISS_TOAST':
    case 'REMOVE_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.id),
      }
    default:
      return state
  }
}

let count = 0
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ToastContextType = {
  toasts: Toast[]
  toast: (props: Omit<Toast, 'id'>) => void
  dismiss: (id: string) => void
}

const ToastContext = React.createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, { toasts: [] })

  React.useEffect(() => {
    state.toasts.forEach((toast) => {
      addToRemoveQueue(toast.id, dispatch)
    })
  }, [state.toasts])

  const toast = React.useCallback((props: Omit<Toast, 'id'>) => {
    const id = genId()
    dispatch({ type: 'ADD_TOAST', toast: { ...props, id } })
  }, [])

  const dismiss = React.useCallback((id: string) => {
    dispatch({ type: 'DISMISS_TOAST', id })
  }, [])

  return (
    <ToastContext.Provider value={{ toasts: state.toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
