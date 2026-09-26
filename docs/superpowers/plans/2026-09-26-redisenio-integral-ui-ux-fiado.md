# Plan de Implementación: Rediseño Integral UI/UX & Nuevas Funcionalidades (Fiado)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar integralmente Fiado en una aplicación de nivel Fintech/POS moderna, atractiva e intuitiva, agregando descripción detallada de productos al fiar, límites de crédito (cupos), tiques digitales para WhatsApp, nueva sección de Cobranzas, nueva sección de Ajustes de la tienda y un modal flotante global para fiar rápido.

**Architecture:** 
- **Base de datos (Neon)**: Migraciones no destructivas para soportar `descripcion` en movimientos, `limite_credito` en clientes y perfil de tienda (`telefono`, `nequi`) en usuarios.
- **Frontend (React + Vite + Capacitor)**: Reemplazo completo del sistema de estilos `global.css` con diseño contemporáneo (paleta Fintech, micro-sombras, componentes con esquinas suaves de 14-16px, timeline de transacciones, modal global flotante, bottom nav con pastilla activa).
- **Integraciones**: Mensajes y recibos formateados con estética de tique para WhatsApp (`wa.me`).

**Tech Stack:** Node.js (Express, pg, crypto), React 18, React Router 6, Lucide React, Capacitor (Android WebView), Vanilla CSS con variables de diseño estructuradas.

**Spec / Requirements:**
1. Rediseño visual radical: eliminar la apariencia básica; implementar estilo Fintech contemporáneo (similar a Nu/Square/Stripe) con tipografía Plus Jakarta Sans, números tabulares, tarjetas elevadas y botones táctiles premium (>48px).
2. Descripción de productos en fiados: permitir registrar qué lleva el cliente con sugerencias rápidas de tienda de barrio y texto libre.
3. Comprobantes digitales: generar recibos de fiado y abono con detalle para compartir por WhatsApp.
4. Límite de crédito (cupo): asignar cupo por cliente y alertar con barra de progreso cuando se aproxime o se exceda.
5. Nueva sección de Cobranzas: panel con clientes en mora y recordatorios directos en un clic con datos de pago (Nequi).
6. Nueva sección de Ajustes: personalización del negocio (nombre, WhatsApp, Nequi/Daviplata para cobros).
7. Modal flotante global "Fiar Rápido": registrar un fiado desde cualquier pantalla sin navegar a clientes.

---

## Estructura de Archivos a Modificar y Crear

```text
backend/
├── db.js                     # Migraciones: descripcion en movimientos, limite_credito en clientes, perfil en usuarios
├── routes/movimientos.js      # Soporte de campo descripcion en POST /api/movimientos
├── routes/clientes.js         # Soporte de limiteCredito en POST y PATCH
├── routes/auth.js             # Endpoints GET /api/auth/perfil y PATCH /api/auth/perfil

frontend/src/
├── styles/global.css          # REESTRUCTURACIÓN TOTAL del sistema de diseño (tokens, botones, tarjetas, timeline, bottom-sheet)
├── api.js                     # Métodos para descripcion, limiteCredito, perfil y cobros
├── components/
│   ├── Layout.jsx             # Rediseño con FAB flotante, botón +Fiar global y navegación actualizada
│   ├── ModalFiarRapido.jsx    # NUEVO: Modal global para fiar rápido desde cualquier pantalla
│   ├── ComprobanteModal.jsx   # NUEVO: Tique digital compartible por WhatsApp
│   ├── BarraCupo.jsx          # NUEVO: Indicador visual de uso de cupo de crédito
├── pages/
│   ├── Resumen.jsx            # Rediseño Dashboard Fintech (gráficas, tarjetas elevadas, accesos directos)
│   ├── Clientes.jsx           # Rediseño con medidores de cupo, búsqueda y filtros
│   ├── Cliente.jsx            # Rediseño: Timeline de movimientos (no tabla), descripción de productos, recibos
│   ├── Caja.jsx               # Rediseño: TPV de mostrador con calculadora física de gaveta
│   ├── Reportes.jsx           # Rediseño: KPIs financieros y análisis de flujo de caja
│   ├── Cobranzas.jsx          # NUEVA PANTALLA: Gestión de cartera vencida y recordatorios masivos
│   ├── Ajustes.jsx            # NUEVA PANTALLA: Configuración de la tienda, Nequi y preferencias
```

---

## Tareas de Implementación

### Tarea 1: Base de Datos y Backend (Neon + API)
**Objetivo:** Permitir guardar la descripción de productos en cada fiado, el límite de crédito en cada cliente, y los datos del negocio (Nequi/WhatsApp) en el perfil.

**Archivos:**
- Modificar: `backend/db.js`
- Modificar: `backend/routes/movimientos.js`
- Modificar: `backend/routes/clientes.js`
- Modificar: `backend/routes/auth.js`

- [ ] **Paso 1.1**: En `backend/db.js`, agregar las columnas `descripcion` a `movimientos`, `limite_credito` a `clientes`, y `telefono`, `nequi` a `usuarios` mediante sentencias `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
- [ ] **Paso 1.2**: Actualizar la query `crearMovimiento` para recibir `$5: descripcion`, y actualizar `mapMovimiento` para devolver `descripcion`.
- [ ] **Paso 1.3**: Actualizar `queries.crearCliente` y `queries.actualizarCliente` para persistir `limite_credito`.
- [ ] **Paso 1.4**: En `backend/routes/movimientos.js`, recibir `descripcion` opcional (string sanitizado, máx 300 caracteres) y guardarlo al fiar o abonar.
- [ ] **Paso 1.5**: En `backend/routes/clientes.js`, aceptar y devolver `limiteCredito`.
- [ ] **Paso 1.6**: En `backend/routes/auth.js`, implementar `PATCH /api/auth/perfil` para actualizar el nombre de la tienda, teléfono y cuenta Nequi.
- [ ] **Paso 1.7**: Verificar la sintaxis de backend con `node -c backend/server.js`.

---

### Tarea 2: Nuevo Sistema de Diseño Global (`global.css`)
**Objetivo:** Reemplazar los estilos planos por una estética contemporánea de alto impacto inspirada en aplicaciones Fintech modernas.

**Archivos:**
- Modificar: `frontend/src/styles/global.css`

- [ ] **Paso 2.1**: Definir los tokens de diseño de la nueva paleta:
  - Canvas de fondo: `#f4f6fb` (suave y limpio).
  - Superficies: `#ffffff` con radios de `16px`.
  - Sombras suaves: `box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04)`.
  - Bordes de alta definición: `1px solid rgba(15, 23, 42, 0.08)`.
  - Primarios: Azul cobalto `#2563eb` y Obsidiana `#0a0d14`.
  - Estados financieros: Verde menta `#059669` (Abonos/Caja) y Rojo cereza `#dc2626` (Fiados/Deuda).
- [ ] **Paso 2.2**: Estilos de Botones y Controles Táctiles:
  - Botón primario con gradiente sutil y micro-elevación.
  - Efectos `:active { transform: scale(0.97); }` en todos los elementos interactivos.
  - Botón flotante FAB para móvil (`.fab-fiar`).
  - Chips de selección rápida (`.chip-tag`) con bordes redondeados y estados activos vibrantes.
- [ ] **Paso 2.3**: Estilos para el Timeline de Transacciones (`.timeline-movimientos`, `.timeline-item`, `.timeline-icono`, `.timeline-detalle`).
- [ ] **Paso 2.4**: Estilos para el Comprobante Digital con estética de tique térmico (`.ticket-recibo`, `.ticket-corte`, `.ticket-fila`).
- [ ] **Paso 2.5**: Estilos de Barra de Cupo (`.barra-cupo-track`, `.barra-cupo-fill`).
- [ ] **Paso 2.6**: Estilos para la barra inferior móvil y header superior con badges modernos.

---

### Tarea 3: Componentes Nuevos Clave
**Objetivo:** Crear los componentes interactivos reutilizables que enriquecen la UX.

**Archivos:**
- Crear: `frontend/src/components/ModalFiarRapido.jsx`
- Crear: `frontend/src/components/ComprobanteModal.jsx`
- Crear: `frontend/src/components/BarraCupo.jsx`
- Modificar: `frontend/src/api.js`

- [ ] **Paso 3.1**: Actualizar `frontend/src/api.js` para soportar `descripcion` en `crearMovimiento(clienteId, tipo, monto, descripcion)`, `limiteCredito` en `crearCliente` y `editarCliente`, y los métodos `obtenerPerfil()` y `actualizarPerfil(datos)`.
- [ ] **Paso 3.2**: Crear `BarraCupo.jsx`: muestra el cupo utilizado, disponible y el porcentaje con cambio dinámico de color (verde < 75%, naranja < 100%, rojo >= 100%).
- [ ] **Paso 3.3**: Crear `ComprobanteModal.jsx`: ventana emergente con diseño de recibo digital que muestra la tienda, cliente, fecha/hora, detalle de productos, monto y nuevo saldo, con botón para compartirlo directamente en WhatsApp.
- [ ] **Paso 3.4**: Crear `ModalFiarRapido.jsx`: modal que permite seleccionar el cliente (con buscador), digitar el monto, elegir o escribir productos (`2 Leches`, `Pan`, `Huevos`, etc.), y confirmar el fiado en segundos desde cualquier pantalla.

---

### Tarea 4: Nuevas Secciones (Cobranzas y Ajustes)
**Objetivo:** Agregar las dos nuevas secciones solicitadas para potenciar la app.

**Archivos:**
- Crear: `frontend/src/pages/Cobranzas.jsx`
- Crear: `frontend/src/pages/Ajustes.jsx`
- Modificar: `frontend/src/components/Layout.jsx`
- Modificar: `frontend/src/App.jsx` (o donde se definan las rutas)

- [ ] **Paso 4.1**: Crear `Cobranzas.jsx`:
  - Panel superior con métricas: Cartera total vencida, clientes en mora (>30 días) y clientes que excedieron su cupo.
  - Listado de deudores con selector de filtro (Mora >30 días, Cupo excedido, Todos).
  - Botón de acción rápida en cada fila: *"Recordar por WhatsApp"* con texto automático que incluye el número de Nequi de la tienda.
- [ ] **Paso 4.2**: Crear `Ajustes.jsx`:
  - Formulario de perfil de la tienda: Nombre del negocio, teléfono de atención, número Nequi/Daviplata para recibir abonos.
  - Opciones de respaldo: botón para exportar todos los datos a CSV/JSON.
  - Información de la sesión y versión de la APK.
- [ ] **Paso 4.3**: Actualizar `Layout.jsx` y el enrutador para incluir los nuevos accesos en el Sidebar y Bottom Nav (`Cobranzas` y `Ajustes`), además de integrar el botón flotante FAB `+ Fiar` y el modal global `ModalFiarRapido`.

---

### Tarea 5: Rediseño Radical de Pantallas Existentes
**Objetivo:** Transformar Resumen, Clientes, Detalle de Cliente, Caja y Reportes al nuevo diseño.

**Archivos:**
- Modificar: `frontend/src/pages/Resumen.jsx`
- Modificar: `frontend/src/pages/Clientes.jsx`
- Modificar: `frontend/src/pages/Cliente.jsx`
- Modificar: `frontend/src/pages/Caja.jsx`
- Modificar: `frontend/src/pages/Reportes.jsx`

- [ ] **Paso 5.1**: Rediseñar `Resumen.jsx`:
  - Tarjetas financieras elevadas con micro-gradientes y métricas de salud de cartera.
  - Botones de acción rápida: *Fiar*, *Nuevo Cliente*, *Arqueo de Caja*, *Cobrar*.
  - Gráfico de tendencias estilizado con tooltips y estadísticas claras.
- [ ] **Paso 5.2**: Rediseñar `Clientes.jsx`:
  - Tarjetas de cliente con avatar con iniciales coloridas, indicador de cupo (`BarraCupo`), saldo grande y botón directo de WhatsApp.
  - Modal de nuevo cliente con campos de Nombre, Teléfono y Cupo Máximo opcional.
- [ ] **Paso 5.3**: Rediseñar `Cliente.jsx` (Libreta de Fiados):
  - Cabecera hero con saldo total, cupo disponible y botones de acción rápida.
  - Modal de Fiar con campo de **descripción de productos** y etiquetas rápidas.
  - Reemplazo de la tabla por un **Timeline de Movimientos** moderno con iconos, badge de producto, hora exacta y botón para generar el tique digital de cada compra.
- [ ] **Paso 5.4**: Rediseñar `Caja.jsx`:
  - Selector de arqueo visual y calculadora de billetes con aspecto de caja registradora táctil.
- [ ] **Paso 5.5**: Rediseñar `Reportes.jsx`:
  - Flujo de caja visual, resumen contable y botones rápidos de consulta.

---

### Tarea 6: Verificación, Despliegue en Render y Compilación de la Nueva APK
**Objetivo:** Comprobar la ausencia de errores, subir a producción en Render y compilar la APK final instalable.

**Archivos:**
- `frontend/android/app/build/outputs/apk/debug/app-debug.apk`
- `frontend/fiado.apk`

- [ ] **Paso 6.1**: Ejecutar `npm run build` en `frontend/` y asegurar 0 advertencias o errores.
- [ ] **Paso 6.2**: Sincronizar Capacitor con `npm run apk`.
- [ ] **Paso 6.3**: Ejecutar `git add .`, commit y `git push origin main` para que Render actualice el backend con las nuevas tablas y endpoints.
- [ ] **Paso 6.4**: Compilar el APK con `./gradlew assembleDebug` y verificar que el archivo `fiado.apk` quede generado y listo para instalar.
