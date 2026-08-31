import { createContext, useCallback, useContext, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const mostrar = useCallback((texto, tipo) => {
    setToast({ texto, tipo });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const mostrarError = useCallback((texto) => mostrar(texto, 'error'), [mostrar]);
  const mostrarExito = useCallback((texto) => mostrar(texto, 'exito'), [mostrar]);

  return (
    <ToastContext.Provider value={{ mostrarError, mostrarExito }}>
      {children}
      {toast && (
        <div className={`toast toast-${toast.tipo}`} role="alert">
          {toast.tipo === 'error'
            ? <AlertCircle size={16} strokeWidth={2} aria-hidden="true" />
            : <CheckCircle2 size={16} strokeWidth={2} aria-hidden="true" />}
          {toast.texto}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
