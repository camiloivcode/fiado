import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [mensaje, setMensaje] = useState(null);

  const mostrarError = useCallback((texto) => {
    setMensaje(texto);
    setTimeout(() => setMensaje(null), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ mostrarError }}>
      {children}
      {mensaje && (
        <div className="toast toast-error" role="alert">
          {mensaje}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
