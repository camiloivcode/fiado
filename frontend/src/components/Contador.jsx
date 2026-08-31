import { useEffect, useRef, useState } from 'react';

function easeOutExpo(t) {
  return t === 1 ? 1 : 1 - 2 ** (-10 * t);
}

export default function Contador({ valor, formatear = String, duracion = 1200 }) {
  const [mostrado, setMostrado] = useState(0);
  const frameRef = useRef(null);

  useEffect(() => {
    const prefiereReducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefiereReducido) {
      setMostrado(valor);
      return;
    }
    const origen = 0;
    const destino = valor;
    let inicio = null;

    function tick(marca) {
      if (inicio === null) inicio = marca;
      const progreso = Math.min(1, (marca - inicio) / duracion);
      setMostrado(Math.round(origen + (destino - origen) * easeOutExpo(progreso)));
      if (progreso < 1) frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);

  return formatear(mostrado);
}
