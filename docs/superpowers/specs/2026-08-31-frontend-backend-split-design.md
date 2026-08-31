# Sistema de fiado — separación frontend/backend + dashboard administrativo

## Contexto

La v1 (single-page, `localStorage`, sin backend) ya funciona y está aprobada: registro
de fiado por cliente con saldo calculado, y cierre de caja diario independiente. Vive en
6 archivos estáticos en la raíz del proyecto.

El usuario ahora quiere:

1. Separar frontend (React) y backend (Node/JS), con una API REST entre ambos.
2. Convertir la app en un **dashboard administrativo**: resumen general, gráficas de
   tendencia y reportes por rango de fechas, además de las 3 pantallas actuales.
3. Diseño moderno y **responsive real** (no solo "que no se rompa" en celular).
4. Trabajar con **Docker** (backend + frontend en contenedores).
5. Preparar el terreno para una **APK** más adelante (fase 2, fuera de este spec) —
   razón de peso para que el backend sea ya un servicio HTTP independiente: la futura
   app con Capacitor consumirá la misma API, no un backend embebido en el frontend.

Decisiones ya tomadas con el usuario (ver historial de brainstorming):

- Backend corre en un solo dispositivo/servidor (PC de la tienda o, más adelante, un VPS)
  — no multi-tenant, no multi-tienda. SQLite, no Postgres: hay un único flujo de
  escritura (el mostrador), sin necesidad de un motor concurrente pesado.
- Sin login por ahora (un solo usuario, el tendero/dueño). Se agrega cuando haya más de
  una persona con acceso remoto.
- La APK queda fuera de este spec — se hace en una fase 2 con Capacitor, reutilizando
  esta misma API.
- URL del backend configurable por variable de entorno, para no reescribir código al
  pasar de red local a un servidor en la nube.

## Enfoque

Monorepo con dos paquetes npm independientes:

```
DEMO/
├── backend/     Express + better-sqlite3, API REST, puerto 4000
├── frontend/    React + Vite + React Router, puerto 5173 (dev) / 8080 (nginx en Docker)
└── docker-compose.yml
```

Se descarta usar un solo contenedor que sirva API + estáticos (mezclaría de nuevo lo que
se pidió separar, y complica reusar la API desde la futura APK). Se descarta Postgres
(sobre-ingeniería para un solo punto de escritura; SQLite es un archivo, sin contenedor
ni configuración adicional).

## Modelo de datos (SQLite)

Mismo modelo que v1, ahora en tablas en vez de arreglos en `localStorage`:

```sql
CREATE TABLE clientes (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  telefono TEXT DEFAULT '',
  creado_en TEXT NOT NULL
);

CREATE TABLE movimientos (
  id TEXT PRIMARY KEY,
  cliente_id TEXT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('fiado', 'abono')),
  monto INTEGER NOT NULL CHECK (monto > 0),
  fecha TEXT NOT NULL
);

CREATE TABLE caja (
  id TEXT PRIMARY KEY,
  fecha TEXT NOT NULL,
  monto INTEGER NOT NULL CHECK (monto > 0),
  nota TEXT DEFAULT ''
);
```

`ON DELETE CASCADE` reemplaza el borrado manual de movimientos que hacía `app.js` v1 al
eliminar un cliente — la base de datos lo garantiza, no el código de la ruta.

Reglas que se mantienen igual que en v1 (`logic.js`, ya probado, se traslada tal cual al
backend):

- El saldo **nunca se guarda**: se calcula `Σ fiados − Σ abonos` en cada consulta.
- Montos siempre enteros positivos (pesos, sin decimales).
- `id`: `crypto.randomUUID()`, generado en cada capa que crea el registro.

## API REST (`backend/`)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/clientes` | Lista clientes con su saldo calculado |
| POST | `/api/clientes` | Crea cliente `{ nombre }` |
| DELETE | `/api/clientes/:id` | Elimina cliente y sus movimientos (cascade) |
| GET | `/api/clientes/:id/movimientos` | Historial de un cliente, más reciente primero |
| POST | `/api/movimientos` | Crea movimiento `{ clienteId, tipo, monto }`, fecha automática |
| DELETE | `/api/movimientos/:id` | Elimina un movimiento |
| GET | `/api/caja` | Historial de cierres de caja |
| POST | `/api/caja` | Crea cierre `{ monto, nota }`, fecha automática |
| GET | `/api/resumen` | Total fiado, # clientes con deuda, caja de hoy, top 5 deudores |
| GET | `/api/reportes?desde=&hasta=` | Movimientos y cajas en el rango, agregados por día (para gráficas) |

Errores: 400 con `{ error: "mensaje claro" }` en validaciones (monto inválido, cliente
inexistente); 404 si el recurso no existe; 500 solo ante fallo real de la base de datos.

## Frontend (`frontend/`)

React + Vite + React Router. Cliente HTTP delgado (`src/api.js`) que envuelve `fetch`
contra `import.meta.env.VITE_API_URL`, con manejo de errores centralizado (parsea
`{ error }` del backend y lo propaga como excepción legible).

Pantallas:

1. **Resumen** (nueva, pantalla de inicio) — tarjetas con total fiado, clientes que
   deben, caja de hoy; gráfica de tendencia (fiado vs. abonos, últimos 30 días); top
   deudores.
2. **Clientes** — buscador + lista con saldo, igual que v1.
3. **Cliente** — saldo grande, fiar/abonar, historial, igual que v1.
4. **Caja** — cierre diario + historial, igual que v1.
5. **Reportes** (nueva) — selector de rango de fechas, tabla de movimientos y cajas del
   rango, mismo componente de gráfica que Resumen pero acotado al rango elegido.

Layout de dashboard: navegación lateral en pantallas anchas, barra inferior en móvil —
responsive real vía CSS Grid/Flexbox con breakpoints, no solo reflow del layout de v1.
Construcción de la interfaz guiada por la skill `frontend-design` (dirección visual,
tipografía, evitar look "default") y por `dataviz` para las gráficas (paleta, ejes,
tooltips accesibles en claro/oscuro).

Estado del servidor mediante fetch + estado local de React (sin Redux/Zustand — 5
pantallas y datos que caben en memoria no justifican una librería de estado global).

## Docker

`docker-compose.yml`, dos servicios:

- **api**: `backend/Dockerfile` (Node), puerto 4000, volumen nombrado para
  `backend/data/fiado.db` (persiste aunque se recree el contenedor).
- **web**: build de producción de React servido por nginx (`frontend/Dockerfile`
  multi-stage: build con Node, sirve con nginx), puerto 8080. `VITE_API_URL` se inyecta
  en build-time vía `docker-compose.yml` (`args:` del build), configurable para apuntar
  a `localhost`, la IP de la red local, o un dominio futuro.

`docker compose up` levanta ambos; sin esto, `backend/` y `frontend/` también corren
sueltos en desarrollo (`npm run dev` en cada uno) sin depender de Docker.

## Manejo de errores

- Backend: middleware de validación por ruta, respuestas de error consistentes
  (`{ error }`), nunca deja pasar un `monto` no entero o ≤ 0 a la base de datos.
- Frontend: cada acción (crear, fiar, abonar, eliminar, cerrar caja) captura el error del
  fetch y lo muestra en un toast/banner dentro del dashboard — se elimina el `alert()`
  crudo de v1, no encaja con un dashboard moderno.

## Testing

- `backend/test.js` (Node `assert`, sin framework): la aritmética de saldos (portada de
  v1) más pruebas de los endpoints levantando el servidor Express en un puerto de
  pruebas y golpeándolo con `fetch`.
- Frontend: verificación manual en navegador (crear cliente → fiar → abonar → eliminar
  movimiento → ver resumen actualizado → generar reporte por rango). No se monta
  infraestructura de testing de componentes (Vitest/RTL) — el alcance no lo pide y el
  proyecto no la tiene hoy; queda anotada como candidata de v2 si el frontend crece.

## Migración desde v1

Los 6 archivos actuales (`logic.js`, `app.js`, `index.html`, `manifest.json`, `sw.js`,
`test.js`) se retiran de la raíz una vez el nuevo sistema esté funcionando y verificado
— dejan de tener rol: la lógica de `logic.js` pasa al backend, `app.js`/`index.html` se
reemplazan por `frontend/`. La PWA (`manifest.json`, `sw.js`) se reconstruye dentro de
`frontend/` en una iteración posterior si se decide mantener "instalar en pantalla de
inicio" mientras la APK (fase 2) no existe — no está en el alcance de este spec, que se
concentra en la separación front/back y el dashboard.

## Fuera de alcance (fases futuras)

APK con Capacitor · login/autenticación · multi-tienda · exportar respaldo/backup ·
testing automatizado de componentes React · PWA instalable del nuevo frontend.

## Verificación

1. `cd backend && node test.js` — pasa aritmética de saldos + pruebas de endpoints.
2. `docker compose up` — ambos contenedores arrancan; `api` responde en `:4000/api/resumen`,
   `web` sirve el dashboard en `:8080`.
3. Punta a punta en el dashboard: crear cliente → fiar 12.500 → fiar 3.000 → saldo
   $15.500 → abonar 10.000 → saldo $5.500 → eliminar el fiado de 3.000 → saldo $2.500 →
   el Resumen refleja el total actualizado.
4. Cerrar caja, confirmar que aparece en el historial y en Reportes al filtrar por hoy.
5. Reiniciar los contenedores (`docker compose restart`) — los datos siguen ahí (volumen
   persistente).
6. Redimensionar la ventana del navegador de escritorio a ancho de celular — el layout
   cambia a navegación inferior sin romperse, sin scroll horizontal.
