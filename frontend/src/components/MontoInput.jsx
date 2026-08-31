import { useRef } from 'react';

function soloDigitos(texto) {
  return texto.replace(/\D/g, '');
}

function formatearEntero(digitos) {
  return digitos ? Number(digitos).toLocaleString('es-CO') : '';
}

export default function MontoInput({ value, onChange, ...props }) {
  const ref = useRef(null);

  function manejarCambio(evento) {
    const crudo = soloDigitos(evento.target.value);
    const digitosAntesDelCursor = soloDigitos(evento.target.value.slice(0, evento.target.selectionStart)).length;

    onChange(crudo);

    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      const formateado = formatearEntero(crudo);
      let contados = 0;
      let posicion = formateado.length;
      for (let i = 0; i < formateado.length; i++) {
        if (/\d/.test(formateado[i])) contados++;
        if (contados === digitosAntesDelCursor) {
          posicion = i + 1;
          break;
        }
      }
      el.setSelectionRange(posicion, posicion);
    });
  }

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      value={formatearEntero(value)}
      onChange={manejarCambio}
      {...props}
    />
  );
}
