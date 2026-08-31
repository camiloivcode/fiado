export default function Sparkline({ datos, color = 'var(--acento)', className = '' }) {
  if (!datos || datos.length < 2) return null;

  const ancho = 100;
  const alto = 28;
  const max = Math.max(...datos, 1);
  const min = Math.min(...datos, 0);
  const rango = Math.max(1, max - min);
  const x = (i) => (i / (datos.length - 1)) * ancho;
  const y = (v) => alto - ((v - min) / rango) * alto;
  const puntos = datos.map((v, i) => `${x(i)},${y(v)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} className={`sparkline ${className}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={puntos} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
