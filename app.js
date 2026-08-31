import {
  validarMonto,
  parsearMonto,
  formatearPesos,
  saldoCliente,
  totalFiado,
  ordenarPorFechaDesc,
} from './logic.js';

const KEY_CLIENTES = 'fiado.clientes';
const KEY_MOVIMIENTOS = 'fiado.movimientos';
const KEY_CAJA = 'fiado.caja';

// ponytail: techo ~5MB de localStorage (~50.000 movimientos). Si se llega ahí, migrar a IndexedDB.
function leer(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    alert('No se pudo leer la información guardada. Revisa el almacenamiento del navegador.');
    return [];
  }
}

function escribir(key, valor) {
  try {
    localStorage.setItem(key, JSON.stringify(valor));
  } catch (e) {
    alert('No se pudo guardar. El navegador bloqueó el almacenamiento local.');
  }
}

let clientes = leer(KEY_CLIENTES);
let movimientos = leer(KEY_MOVIMIENTOS);
let caja = leer(KEY_CAJA);

let pantalla = { nombre: 'clientes' }; // { nombre: 'clientes' | 'cliente' | 'caja', clienteId? }
let dialogo = null; // { tipo: 'fiado' | 'abono', clienteId } | null

const app = document.getElementById('app');

function guardarTodo() {
  escribir(KEY_CLIENTES, clientes);
  escribir(KEY_MOVIMIENTOS, movimientos);
  escribir(KEY_CAJA, caja);
}

function ir(nuevaPantalla) {
  pantalla = nuevaPantalla;
  render();
}

function escapar(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

// --- Pantalla: lista de clientes ---

function vistaClientes(filtro = '') {
  const totalDeuda = totalFiado(clientes, movimientos);
  const filtrados = clientes
    .filter((c) => c.nombre.toLowerCase().includes(filtro.toLowerCase()))
    .map((c) => ({ ...c, saldo: saldoCliente(c.id, movimientos) }))
    .sort((a, b) => b.saldo - a.saldo);

  const filas = filtrados
    .map(
      (c) => `
      <li class="fila-cliente" data-id="${c.id}">
        <span class="nombre">${escapar(c.nombre)}</span>
        <span class="saldo ${c.saldo > 0 ? 'debe' : c.saldo < 0 ? 'favor' : ''}">${formatearPesos(Math.abs(c.saldo))}${c.saldo < 0 ? ' a favor' : ''}</span>
      </li>`
    )
    .join('');

  return `
    <header class="cabecera">
      <div class="total-deuda">
        <span>Total fiado</span>
        <strong>${formatearPesos(totalDeuda)}</strong>
      </div>
      <nav class="tabs">
        <button class="tab activo" data-ir="clientes">Clientes</button>
        <button class="tab" data-ir="caja">Caja</button>
      </nav>
    </header>
    <div class="buscador">
      <input type="search" id="buscar-cliente" placeholder="Buscar cliente..." value="${escapar(filtro)}" />
    </div>
    <ul class="lista-clientes">
      ${filas || '<li class="vacio">Sin clientes todavía.</li>'}
    </ul>
    <button class="fab" id="btn-nuevo-cliente">+ Cliente</button>
  `;
}

// --- Pantalla: detalle de cliente ---

function vistaCliente(clienteId) {
  const cliente = clientes.find((c) => c.id === clienteId);
  if (!cliente) {
    ir({ nombre: 'clientes' });
    return '';
  }
  const saldo = saldoCliente(clienteId, movimientos);
  const historial = ordenarPorFechaDesc(movimientos.filter((m) => m.clienteId === clienteId));

  const filas = historial
    .map((m) => {
      const fecha = new Date(m.fecha);
      const fechaTexto = fecha.toLocaleString('es-CO', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
      return `
      <li class="fila-mov" data-id="${m.id}">
        <span class="tipo ${m.tipo}">${m.tipo === 'fiado' ? 'Fió' : 'Abonó'}</span>
        <span class="monto">${formatearPesos(m.monto)}</span>
        <span class="fecha">${fechaTexto}</span>
        <button class="btn-borrar" data-borrar-mov="${m.id}" aria-label="Eliminar">✕</button>
      </li>`;
    })
    .join('');

  return `
    <header class="cabecera">
      <button class="btn-volver" data-ir="clientes">← Clientes</button>
      <h1>${escapar(cliente.nombre)}</h1>
    </header>
    <div class="saldo-grande ${saldo > 0 ? 'debe' : saldo < 0 ? 'favor' : ''}">
      ${formatearPesos(Math.abs(saldo))}${saldo < 0 ? '<small>a favor</small>' : saldo === 0 ? '<small>al día</small>' : '<small>debe</small>'}
    </div>
    <div class="acciones">
      <button class="btn-fiar" id="btn-fiar">Fiar</button>
      <button class="btn-abonar" id="btn-abonar">Abonar</button>
    </div>
    <ul class="historial">
      ${filas || '<li class="vacio">Sin movimientos todavía.</li>'}
    </ul>
    <button class="btn-eliminar-cliente" id="btn-eliminar-cliente">Eliminar cliente</button>
  `;
}

// --- Pantalla: caja ---

function vistaCaja() {
  const historial = ordenarPorFechaDesc(caja);
  const filas = historial
    .map((c) => {
      const fecha = new Date(c.fecha);
      const fechaTexto = fecha.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      return `
      <li class="fila-caja">
        <span class="fecha">${fechaTexto}</span>
        <span class="monto">${formatearPesos(c.monto)}</span>
        <span class="nota">${escapar(c.nota || '')}</span>
      </li>`;
    })
    .join('');

  return `
    <header class="cabecera">
      <nav class="tabs">
        <button class="tab" data-ir="clientes">Clientes</button>
        <button class="tab activo" data-ir="caja">Caja</button>
      </nav>
    </header>
    <form id="form-caja" class="form-caja">
      <label for="monto-caja">Plata en caja hoy</label>
      <input type="text" inputmode="numeric" id="monto-caja" placeholder="0" required />
      <label for="nota-caja">Nota (opcional)</label>
      <input type="text" id="nota-caja" placeholder="Ej: faltó cambio" />
      <button type="submit">Guardar cierre del día</button>
    </form>
    <ul class="historial-caja">
      ${filas || '<li class="vacio">Sin cierres todavía.</li>'}
    </ul>
  `;
}

// --- Diálogo fiar/abonar ---

function vistaDialogo() {
  if (!dialogo) return '';
  const titulo = dialogo.tipo === 'fiado' ? 'Fiar' : 'Abonar';
  return `
    <div class="overlay" id="overlay">
      <form id="form-dialogo" class="dialogo">
        <h2>${titulo}</h2>
        <input type="text" inputmode="numeric" id="monto-dialogo" placeholder="0" autofocus required />
        <div class="dialogo-acciones">
          <button type="button" id="btn-cancelar-dialogo">Cancelar</button>
          <button type="submit">Guardar</button>
        </div>
      </form>
    </div>
  `;
}

// --- Render principal ---

function render() {
  let html;
  if (pantalla.nombre === 'clientes') {
    html = vistaClientes(pantalla.filtro || '');
  } else if (pantalla.nombre === 'cliente') {
    html = vistaCliente(pantalla.clienteId);
  } else {
    html = vistaCaja();
  }
  app.innerHTML = html + vistaDialogo();
  conectarEventos();
}

function conectarEventos() {
  app.querySelectorAll('[data-ir]').forEach((el) => {
    el.addEventListener('click', () => ir({ nombre: el.dataset.ir }));
  });

  const buscar = document.getElementById('buscar-cliente');
  if (buscar) {
    buscar.addEventListener('input', () => {
      pantalla = { nombre: 'clientes', filtro: buscar.value };
      render();
      const input = document.getElementById('buscar-cliente');
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });
  }

  const btnNuevoCliente = document.getElementById('btn-nuevo-cliente');
  if (btnNuevoCliente) {
    btnNuevoCliente.addEventListener('click', () => {
      const nombre = prompt('Nombre del cliente:');
      if (!nombre || !nombre.trim()) return;
      const existe = clientes.some((c) => c.nombre.toLowerCase() === nombre.trim().toLowerCase());
      if (existe && !confirm(`Ya existe un cliente con ese nombre. ¿Crear otro igual?`)) return;
      const nuevo = { id: crypto.randomUUID(), nombre: nombre.trim(), telefono: '', creadoEn: new Date().toISOString() };
      clientes.push(nuevo);
      guardarTodo();
      ir({ nombre: 'cliente', clienteId: nuevo.id });
    });
  }

  app.querySelectorAll('.fila-cliente').forEach((el) => {
    el.addEventListener('click', () => ir({ nombre: 'cliente', clienteId: el.dataset.id }));
  });

  const btnFiar = document.getElementById('btn-fiar');
  if (btnFiar) {
    btnFiar.addEventListener('click', () => {
      dialogo = { tipo: 'fiado', clienteId: pantalla.clienteId };
      render();
    });
  }

  const btnAbonar = document.getElementById('btn-abonar');
  if (btnAbonar) {
    btnAbonar.addEventListener('click', () => {
      dialogo = { tipo: 'abono', clienteId: pantalla.clienteId };
      render();
    });
  }

  const btnEliminarCliente = document.getElementById('btn-eliminar-cliente');
  if (btnEliminarCliente) {
    btnEliminarCliente.addEventListener('click', () => {
      const cliente = clientes.find((c) => c.id === pantalla.clienteId);
      if (!cliente) return;
      if (!confirm(`¿Eliminar a ${cliente.nombre}? Se borra todo su historial.`)) return;
      clientes = clientes.filter((c) => c.id !== cliente.id);
      movimientos = movimientos.filter((m) => m.clienteId !== cliente.id);
      guardarTodo();
      ir({ nombre: 'clientes' });
    });
  }

  app.querySelectorAll('[data-borrar-mov]').forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.dataset.borrarMov;
      if (!confirm('¿Eliminar este movimiento?')) return;
      movimientos = movimientos.filter((m) => m.id !== id);
      guardarTodo();
      render();
    });
  });

  const formCaja = document.getElementById('form-caja');
  if (formCaja) {
    formCaja.addEventListener('submit', (e) => {
      e.preventDefault();
      const montoInput = document.getElementById('monto-caja');
      const notaInput = document.getElementById('nota-caja');
      const monto = parsearMonto(montoInput.value);
      if (!validarMonto(monto)) {
        alert('Ingresa un monto válido, mayor a cero.');
        return;
      }
      caja.push({ id: crypto.randomUUID(), fecha: new Date().toISOString(), monto, nota: notaInput.value.trim() });
      guardarTodo();
      render();
    });
  }

  const overlay = document.getElementById('overlay');
  const btnCancelarDialogo = document.getElementById('btn-cancelar-dialogo');
  if (btnCancelarDialogo) {
    btnCancelarDialogo.addEventListener('click', () => {
      dialogo = null;
      render();
    });
  }
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        dialogo = null;
        render();
      }
    });
  }

  const formDialogo = document.getElementById('form-dialogo');
  if (formDialogo) {
    formDialogo.addEventListener('submit', (e) => {
      e.preventDefault();
      const montoInput = document.getElementById('monto-dialogo');
      const monto = parsearMonto(montoInput.value);
      if (!validarMonto(monto)) {
        alert('Ingresa un monto válido, mayor a cero.');
        return;
      }
      movimientos.push({
        id: crypto.randomUUID(),
        clienteId: dialogo.clienteId,
        tipo: dialogo.tipo,
        monto,
        fecha: new Date().toISOString(),
      });
      guardarTodo();
      dialogo = null;
      render();
    });
  }
}

render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
