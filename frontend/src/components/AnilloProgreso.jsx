export default function AnilloProgreso({ porcentaje, color = 'var(--acento)', tamano = 84, grosor = 10 }) {
  const radio = (tamano - grosor) / 2;
  const circunferencia = 2 * Math.PI * radio;
  const fraccion = Math.min(1, Math.max(0, porcentaje));
  const offset = circunferencia * (1 - fraccion);

  return (
    <svg
      width={tamano} height={tamano} viewBox={`0 0 ${tamano} ${tamano}`}
      role="img" aria-label={`${Math.round(fraccion * 100)}% cobrado`}
    >
      <circle cx={tamano / 2} cy={tamano / 2} r={radio} fill="none" stroke="var(--borde)" strokeWidth={grosor} />
      <circle
        cx={tamano / 2} cy={tamano / 2} r={radio} fill="none" stroke={color} strokeWidth={grosor}
        strokeDasharray={circunferencia} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${tamano / 2} ${tamano / 2})`}
        className="anillo-arco"
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="anillo-texto">
        {Math.round(fraccion * 100)}%
      </text>
    </svg>
  );
}
