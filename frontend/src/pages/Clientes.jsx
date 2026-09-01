import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, UsersRound, UserPlus, Clock, ChevronLeft, ChevronRight, Rows3 } from 'lucide-react';
import { api } from '../api.js';
import { formatearPesos, claseAvatar } from '../format.js';
import { useToast } from '../components/Toast.jsx';
import useRefrescarAlEnfocar from '../useRefrescarAlEnfocar.js';

const DIAS_ALERTA = 30;
const POR_PAGINA = 10;

function diasSinActividad(ultimaActividad) {
  if (!ultimaActividad) return null;
  return Math.floor((Date.now() - new Date(ultimaActividad).getTime()) / 86_400_000);
}

export default function Clientes() {
  const navigate = useNavigate();
  const { mostrarError, mostrarExito } = useToast();
  const [clientes, setClientes] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [pagina, setPagina] = useState(1);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [compacta, setCompacta] = useState(() => localStorage.getItem('densidadCompacta') === '1');

  function alternarDensidad() {
    setCompacta((actual) => {
      const nuevo = !actual;
      localStorage.setItem('densidadCompacta', nuevo ? '1' : '0');
      return nuevo;
    });
  }

  async function cargar() {
    try {
      setClientes(await api.listarClientes());
    } catch (e) {
      mostrarError(e.message);
    }
  }

  useEffect(() => { cargar(); }, []);
  useRefrescarAlEnfocar(cargar);

  async function crearCliente(evento) {
    evento.preventDefault();
    const nombre = nombreNuevo.trim();
    if (!nombre) return;
    try {
      await api.crearCliente(nombre);
      setNombreNuevo('');
      setMostrarModal(false);
      mostrarExito('Cliente creado');
      cargar();
    } catch (e) {
      mostrarError(e.message);
    }
  }

  const filtrados = clientes
    .filter((c) => c.nombre.toLowerCase().includes(filtro.toLowerCase()))
    .sort((a, b) => b.saldo - a.saldo);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const paginados = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  function buscar(valor) {
    setFiltro(valor);
    setPagina(1);
  }

  return (
    <div className="pagina">
      <header className="pagina-cabecera" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn-primario" onClick={() => setMostrarModal(true)}>
          <Plus size={18} strokeWidth={2} aria-hidden="true" /> Cliente
        </button>
      </header>
      <div className="buscador-envoltura">
        <Search className="buscador-icono" size={18} strokeWidth={1.75} aria-hidden="true" />
        <input
          type="search"
          className="buscador"
          placeholder="Buscar cliente..."
          value={filtro}
          onChange={(e) => buscar(e.target.value)}
        />
      </div>

      {filtrados.length > 0 && (
        <section className="panel">
          <div className="panel-cabecera" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secundario" onClick={alternarDensidad}>
              <Rows3 size={15} strokeWidth={2} aria-hidden="true" /> {compacta ? 'Vista normal' : 'Vista compacta'}
            </button>
          </div>
          <div className="panel-cuerpo sin-relleno">
            <div className="tabla-reporte-wrap">
              <table className={`tabla-reporte tabla-clientes ${compacta ? 'compacta' : ''}`}>
                <thead>
                  <tr><th>Cliente</th><th>Estado</th><th className="col-monto">Saldo</th></tr>
                </thead>
                <tbody>
                  {paginados.map((c) => {
                    const estado = c.saldo > 0 ? 'debe' : c.saldo < 0 ? 'favor' : 'neutro';
                    const dias = diasSinActividad(c.ultimaActividad);
                    const debeHaceRato = estado === 'debe' && dias !== null && dias >= DIAS_ALERTA;
                    const ir = () => navigate(`/clientes/${c.id}`);
                    return (
                      <tr
                        key={c.id}
                        tabIndex={0}
                        onClick={ir}
                        onKeyDown={(e) => e.key === 'Enter' && ir()}
                      >
                        <td>
                          <div className="celda-cliente">
                            <span className={`avatar ${claseAvatar(c.nombre)}`} aria-hidden="true">{c.nombre.slice(0, 2).toUpperCase()}</span>
                            <span className="nombre">{c.nombre}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`pill pill-${estado}`}>
                            {estado === 'debe' ? 'Debe' : estado === 'favor' ? 'A favor' : 'Al día'}
                          </span>
                          {debeHaceRato && (
                            <span className="pill pill-alerta" title={`Sin abonos ni compras hace ${dias} días`}>
                              <Clock size={11} strokeWidth={2} aria-hidden="true" /> {dias}d
                            </span>
                          )}
                        </td>
                        <td className="col-monto">
                          <span className={`saldo ${estado}`}>{formatearPesos(Math.abs(c.saldo))}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {totalPaginas > 1 && (
            <div className="paginador">
              <button
                type="button"
                className="btn-secundario"
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={paginaActual === 1}
              >
                <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" /> Anterior
              </button>
              <span className="paginador-texto">Página {paginaActual} de {totalPaginas}</span>
              <button
                type="button"
                className="btn-secundario"
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={paginaActual === totalPaginas}
              >
                Siguiente <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          )}
        </section>
      )}
      {!filtrados.length && (
        <div className="vacio">
          <UsersRound className="icono" size={32} strokeWidth={1.5} aria-hidden="true" />
          Sin clientes todavía.
        </div>
      )}

      {mostrarModal && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setMostrarModal(false)}>
          <form className="dialogo" onSubmit={crearCliente}>
            <div className="dialogo-cabecera">
              <span className="dialogo-icono" aria-hidden="true">
                <UserPlus size={20} strokeWidth={2} />
              </span>
              <h2>Nuevo cliente</h2>
            </div>
            <input
              type="text"
              autoFocus
              placeholder="Nombre"
              value={nombreNuevo}
              onChange={(e) => setNombreNuevo(e.target.value)}
              required
              style={{ textAlign: 'left', fontSize: 15 }}
            />
            <div className="dialogo-acciones">
              <button type="button" onClick={() => setMostrarModal(false)}>Cancelar</button>
              <button type="submit">Guardar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
