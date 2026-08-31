export function formatearPesos(valor) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor);
}

const COLORES_AVATAR = 6;

export function claseAvatar(nombre) {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) hash = (hash * 31 + nombre.charCodeAt(i)) | 0;
  return `avatar-${Math.abs(hash) % COLORES_AVATAR}`;
}
