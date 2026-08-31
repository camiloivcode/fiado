import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { formatearPesos } from '../format.js';
import { useToast } from '../components/Toast.jsx';

export default function Clientes() {
  const { mostrarError } = useToast();
  const [clientes, setClientes] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState('');

  async function cargar() {
    try {
      setClientes(await api.listarClientes());
    } catch (e) {
      mostrarError(e.message);
    }
  }

  useEffect(() => { cargar(); }, []);

  async function crearCliente(evento) {
    evento.preventDefault();
    const nombre = nombreNuevo.trim();
    if (!nombre) return;
    try {
      await api.crearCliente(nombre);
      setNombreNuevo('');
      setMostrarModal(false);
      cargar();
    } catch (e) {
      mostrarError(e.message);
    }
  }

  const filtrados = clientes
    .filter((c) => c.nombre.toLowerCase().includes(filtro.toLowerCase()))
    .sort((a, b) => b.saldo - a.saldo);

  return (
    <div className="pagina">
      <header className="pagina-cabecera">
        <h2>Clientes</h2>
        <button className="btn-primario" onClick={() => setMostrarModal(true)}>+ Cliente</button>
      </header>
      <input
        type="search"
        className="buscador"
        placeholder="Buscar cliente..."
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
      />
      <ul className="lista-clientes">
        {filtrados.map((c) => (
          <li key={c.id}>
            <Link to={`/clientes/${c.id}`} className="fila-cliente">
              <span className="nombre">{c.nombre}</span>
              <span className={`saldo ${c.saldo > 0 ? 'debe' : c.saldo < 0 ? 'favor' : ''}`}>
                {formatearPesos(Math.abs(c.saldo))}{c.saldo < 0 ? ' a favor' : ''}
              </span>
            </Link>
          </li>
        ))}
        {!filtrados.length && <li className="vacio">Sin clientes todavía.</li>}
      </ul>

      {mostrarModal && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setMostrarModal(false)}>
          <form className="dialogo" onSubmit={crearCliente}>
            <h2>Nuevo cliente</h2>
            <input
              type="text"
              autoFocus
              placeholder="Nombre"
              value={nombreNuevo}
              onChange={(e) => setNombreNuevo(e.target.value)}
              required
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
