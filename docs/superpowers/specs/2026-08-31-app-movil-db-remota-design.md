# App móvil (APK) con base de datos remota compartida

## Contexto

Este spec **enmienda** las restricciones de
`docs/superpowers/specs/2026-08-31-frontend-backend-split-design.md`, líneas 21-30:
ese documento fijó "backend en un solo dispositivo, único flujo de escritura, SQLite no
Postgres" y "sin login, se agrega cuando haya más de una persona con acceso remoto"
(línea 25-26).

Esa condición se cumple ahora: el usuario quiere empaquetar el frontend actual como
**APK Android** e instalarla en varios dispositivos, todos leyendo y escribiendo contra
**la misma base de datos**, en la nube. Eso implica:

- Backend expuesto a Internet, no solo a la red local de la tienda.
- Múltiples escritores concurrentes (antes había uno: el mostrador).
- Necesidad real de autenticación — sin ella, cualquiera en Internet lee, escribe y
  borra los datos de la tienda.

El diseño visual y de interacción **no cambia** — se reutiliza tal cual, ya es
mobile-first (`frontend/src/styles/global.css`). Este spec cubre solo lo nuevo:
persistencia remota, auth, y el empaquetado nativo.

## Decisiones

| Tema | Decisión | Por qué |
|---|---|---|
| Empaquetado | **Capacitor** | Envuelve el React actual en WebView sin reescribir UI |
| Base de datos | **Postgres gestionado (Neon)** | `node:sqlite` es un archivo local; no hay forma segura de compartirlo entre procesos remotos. WAL de SQLite no funciona sobre red |
| Autenticación | **Usuarios con email + contraseña**, sesión por token opaco en DB | Revocable (roban un celular → se borra la sesión), sin dependencias nuevas (`node:crypto.scrypt`) |
| Hosting API | **Render free tier** | Backend queda stateless (la DB vive en Neon), deploy desde git |
| Sincronía multi-dispositivo | **Refrescar al recuperar el foco** (`visibilitychange`) | Cubre el caso real — dos celulares en el mismo mostrador — sin WebSocket ni cola offline |

## Modelo de datos

Mismo esquema lógico que hoy (`clientes`, `movimientos`, `caja`), migrado a Postgres con
tipos **deliberadamente conservadores**: `id TEXT PRIMARY KEY` (no `uuid`), fechas
`TEXT` ISO (no `timestamptz`) — así `backend/logic.js` (comparación de strings ISO,
`diaLocal`, `finDiaLocalISO`) no cambia una línea. Se agregan índices sobre
`movimientos.cliente_id`, `movimientos.fecha` y `caja.fecha`, ausentes hoy.

Dos tablas nuevas para auth:

```sql
CREATE TABLE usuarios (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  clave_hash TEXT NOT NULL,
  creado_en TEXT NOT NULL
);

CREATE TABLE sesiones (
  token_hash TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  creado_en TEXT NOT NULL,
  expira_en TEXT NOT NULL
);
```

No hay endpoint de registro público: un solo script CLI (`backend/crear-usuario.js`)
crea cuentas. La tienda no tiene autoservicio; un `/register` abierto sería otra puerta
de entrada anónima.

## Backend

- `backend/db.js` pasa de `node:sqlite` (síncrono) a `pg` (asíncrono, `Pool`). El objeto
  `queries` mantiene la misma forma (`.all/.get/.run`) para minimizar el cambio en los
  routers, que se vuelven `async`.
- `backend/auth.js` (nuevo): hash de contraseña con `crypto.scrypt` + `timingSafeEqual`,
  emisión y verificación de sesión, middleware `requerirAuth`.
- `backend/routes/auth.js` (nuevo): `POST /api/auth/login`, `POST /api/auth/logout`,
  `GET /api/auth/yo`. Rate limit de 5 intentos/15min por IP en login.
- Los 5 routers existentes (`clientes`, `movimientos`, `caja`, `resumen`, `reportes`)
  quedan detrás de `requerirAuth`, montado una sola vez en `server.js`. `/api/health`
  sigue público (lo usa el health check de Render).
- CORS deja de ser abierto (`cors()` sin opciones, hoy `*`) y se acota a los orígenes
  reales: `https://localhost` (Capacitor en Android), `http://localhost:5173` (dev).
- `backend/test.js` reemplaza el aislamiento por `DATA_DIR` (ya no aplica sin SQLite) por
  un schema Postgres temporal por corrida (`CREATE SCHEMA fiado_test_xxxx`, `search_path`,
  `DROP SCHEMA … CASCADE` al final). Mismo estilo: un archivo lineal con `node:assert`.

## Frontend

- `src/main.jsx`: `BrowserRouter` → `HashRouter` (imprescindible en WebView — sin
  servidor real detrás, un deep-link o recarga con `BrowserRouter` no resuelve).
- `src/sesion.js` (nuevo): único lugar que toca `localStorage` para el token.
- `src/api.js`: adjunta `Authorization: Bearer`; en `401` borra el token y recarga.
- `src/pages/Login.jsx` (nuevo), gating de tres estados en `App.jsx` (cargando / sin
  sesión / con sesión) — sin librería de estado global, consistente con el resto del
  proyecto.
- Ajustes de WebView sin cambio de diseño: `100vh` → `100dvh`, `viewport-fit=cover`,
  `theme-color` oscuro, fuentes auto-hospedadas (hoy dependen de Google Fonts, fallan
  offline), export CSV reescrito con `@capacitor/filesystem` + `@capacitor/share` (el
  `<a download>` sobre blob no funciona en WebView de Android), se quita el
  health-check por `setInterval` de 15s a favor de refresco en `visibilitychange`.

## Empaquetado (Capacitor)

`frontend/` gana `android/` (proyecto Gradle nativo) y las dependencias
`@capacitor/core`, `@capacitor/android`, `@capacitor/filesystem`, `@capacitor/share`.
`VITE_API_URL` se hornea en build time (ya era así con Docker) — apuntar la APK a otro
backend exige recompilar. El keystore de firma de release nunca se commitea.

## Despliegue

Neon (Postgres) + Render (API, free tier, duerme a los 15 min sin tráfico — ~30s de
arranque en frío, aceptado). El frontend no se despliega como sitio web: solo se
compila dentro de la APK.

## Fuera de alcance (a propósito)

Offline con cola de escritura, tiempo real (WebSocket/Realtime), roles y permisos,
multi-tienda, iOS, publicación en Play Store, mover las agregaciones de `resumen`/
`reportes` a SQL (`GROUP BY`) — hoy se calculan en memoria sobre el array completo de
movimientos; se revisita si el volumen de una tienda deja de ser trivial.

## Testing

Igual que el spec anterior: `backend/test.js` sigue siendo el único suite, ahora con
casos de auth (login válido/inválido, endpoint sin token, token inválido, logout). El
frontend sigue sin suite automatizada — verificación manual, ahora incluyendo login/
logout y el flujo de exportar CSV desde el WebView.

## Verificación

1. `cd backend && npm test` — pasa contra un Postgres de pruebas (schema temporal).
2. Login con credenciales válidas devuelve token; sin token, todos los endpoints de
   negocio responden 401.
3. Flujo completo en dos dispositivos: crear fiado en uno, recuperar el foco en el otro,
   confirmar que el saldo se actualiza.
4. Exportar CSV desde la APK abre el selector de compartir de Android.
5. `adb install` de la APK debug en un celular real, recorrido completo del dashboard.
