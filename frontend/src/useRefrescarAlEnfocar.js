import { useEffect, useRef } from 'react';

// Sincronía entre dispositivos: sin WebSocket ni polling, se refresca al volver
// el foco a la pestaña/app (p. ej. al cambiar de app y regresar en Android).
export default function useRefrescarAlEnfocar(cargar) {
  const cargarRef = useRef(cargar);
  cargarRef.current = cargar;

  useEffect(() => {
    function alEnfocar() {
      if (document.visibilityState === 'visible') cargarRef.current();
    }
    document.addEventListener('visibilitychange', alEnfocar);
    return () => document.removeEventListener('visibilitychange', alEnfocar);
  }, []);
}
