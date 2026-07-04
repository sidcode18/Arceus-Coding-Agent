export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

type Listener = (toasts: ToastData[]) => void;

let toasts: ToastData[] = [];
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l([...toasts]);
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  listener([...toasts]);
  return () => {
    listeners.delete(listener);
  };
}

export function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function push(type: ToastType, title: string, message?: string, duration = 4500) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  toasts = [...toasts, { id, type, title, message, duration }];
  emit();
  return id;
}

export const toast = {
  success: (title: string, message?: string) => push('success', title, message),
  error: (title: string, message?: string) => push('error', title, message, 7000),
  warning: (title: string, message?: string) => push('warning', title, message),
  info: (title: string, message?: string) => push('info', title, message),
};
