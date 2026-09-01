const CLAVE = 'fiado_token';

export function leerToken() {
  return localStorage.getItem(CLAVE);
}

export function guardarToken(token) {
  localStorage.setItem(CLAVE, token);
}

export function borrarToken() {
  localStorage.removeItem(CLAVE);
}
