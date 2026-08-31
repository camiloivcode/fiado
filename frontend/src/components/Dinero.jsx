import { formatearPesos } from '../format.js';

export default function Dinero({ valor }) {
  const texto = formatearPesos(valor);
  const separador = texto.indexOf(' ');
  if (separador === -1) return texto;
  return (
    <>
      <span className="dinero-simbolo">{texto.slice(0, separador)}</span>
      {texto.slice(separador + 1)}
    </>
  );
}
