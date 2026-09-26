import { useRef, useState } from 'react';
import { Receipt, X, MessageCircle, Calendar, ShoppingBag, Download, Check, Sparkles } from 'lucide-react';
import { formatearPesos } from '../format.js';
import { useToast } from './Toast.jsx';
import { compartirFacturaConImagen, descargarImagenFactura } from '../compartirComprobante.js';

export default function ComprobanteModal({ movimiento, cliente, tienda, onClose }) {
  const { mostrarExito, mostrarError } = useToast();
  const ticketRef = useRef(null);
  const [enviando, setEnviando] = useState(false);

  if (!movimiento || !cliente) return null;

  const esFiado = movimiento.tipo === 'fiado';
  const fechaObj = new Date(movimiento.fecha);
  const fechaStr = fechaObj.toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const horaStr = fechaObj.toLocaleTimeString('es-CO', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  const nombreTienda = tienda?.nombre || 'Mi Tienda';
  const numeroNequi = tienda?.nequi ? tienda.nequi.trim() : '';
  const numeroSoloDigitos = numeroNequi.replace(/\D/g, '') || numeroNequi;

  function construirTextoCaption() {
    return (
      `🧾 *COMPROBANTE DE ${esFiado ? 'COMPRA (FIADO)' : 'ABONO'}*\n` +
      `🏪 *${nombreTienda}*\n\n` +
      `👤 *Cliente:* ${cliente.nombre}\n` +
      `📅 *Fecha:* ${fechaStr} - ${horaStr}\n` +
      `${movimiento.descripcion ? `📦 *Detalle:* ${movimiento.descripcion}\n` : ''}` +
      `💰 *Valor ${esFiado ? 'fiado' : 'abonado'}:* ${formatearPesos(movimiento.monto)}\n` +
      `📊 *Saldo total actual:* ${formatearPesos(cliente.saldo)}\n\n` +
      (numeroSoloDigitos ?
        `📲 *Para pagar por NEQUI o BRE-B (No Daviplata):*\n` +
        `${numeroSoloDigitos}\n` +
        `_(Mantén presionado el número para copiar y pegar en tu Nequi o Bre-B)_\n\n`
        : '') +
      `¡Muchas gracias por su preferencia!`
    );
  }

  async function handleCompartirWhatsApp() {
    if (!ticketRef.current || enviando) return;
    setEnviando(true);
    try {
      const nombreArchivo = `recibo_${cliente.nombre.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.png`;
      const textoMensaje = construirTextoCaption();

      await compartirFacturaConImagen({
        nodoElemento: ticketRef.current,
        titulo: `Recibo ${nombreTienda} - ${cliente.nombre}`,
        textoMensaje,
        nombreArchivo,
        telefonoCliente: cliente.telefono,
      });

      mostrarExito('¡Comprobante generado con éxito!');
    } catch (err) {
      console.error(err);
      mostrarError('No se pudo generar la imagen del comprobante');
    } finally {
      setEnviando(false);
    }
  }

  async function handleDescargarImagen() {
    if (!ticketRef.current || enviando) return;
    try {
      const nombreArchivo = `recibo_${cliente.nombre.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.png`;
      await descargarImagenFactura(ticketRef.current, nombreArchivo);
      mostrarExito('Imagen descargada');
    } catch (err) {
      console.error(err);
      mostrarError('Error al descargar la imagen');
    }
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="comprobante-dialogo">
        <button className="btn-cerrar-modal" onClick={onClose} aria-label="Cerrar comprobante">
          <X size={18} strokeWidth={2} />
        </button>

        {/* Diseño tipo Tique Térmico Digital */}
        <div className="tique-contenedor" ref={ticketRef}>
          <div className="tique-cabecera">
            <span className="tique-icono-marca">
              <Receipt size={22} strokeWidth={2} />
            </span>
            <h3 className="tique-tienda">{nombreTienda}</h3>
            {tienda?.telefono && (
              <span className="tique-telefono-tienda">Tel: {tienda.telefono}</span>
            )}
            <span className={`tique-tipo-badge ${esFiado ? 'fiado' : 'abono'}`}>
              {esFiado ? 'Tique de Fiado' : 'Tique de Abono'}
            </span>
          </div>

          <div className="tique-divisor-punteado" />

          <div className="tique-filas">
            <div className="tique-fila">
              <span className="tique-clave">Cliente</span>
              <strong className="tique-valor">{cliente.nombre}</strong>
            </div>
            <div className="tique-fila">
              <span className="tique-clave">Fecha y Hora</span>
              <span className="tique-valor">{fechaStr}, {horaStr}</span>
            </div>

            {movimiento.descripcion && (
              <div className="tique-seccion-detalle">
                <span className="tique-clave" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ShoppingBag size={12} strokeWidth={2} /> Detalle de lo llevado:
                </span>
                <p className="tique-texto-descripcion">{movimiento.descripcion}</p>
              </div>
            )}

            <div className="tique-fila tique-total-fila">
              <span className="tique-clave">Monto {esFiado ? 'Fiado' : 'Abonado'}</span>
              <strong className={`tique-monto-grande ${esFiado ? 'fiado' : 'abono'}`}>
                {esFiado ? '+' : '-'}{formatearPesos(movimiento.monto)}
              </strong>
            </div>

            <div className="tique-fila tique-saldo-fila">
              <span className="tique-clave">Saldo Total Actual</span>
              <strong className="tique-saldo-valor">{formatearPesos(cliente.saldo)}</strong>
            </div>
          </div>

          {/* Caja destacada para pago Nequi / Bre-B */}
          {numeroNequi && (
            <div className="tique-caja-pago">
              <div className="tique-pago-encabezado">
                <span className="tique-pago-titulo">TRANSFERENCIAS NEQUI / BRE-B</span>
                <span className="tique-pago-alerta">(No Daviplata)</span>
              </div>
              <div className="tique-pago-numero-box">
                <span className="tique-pago-etiqueta">Número para abonos:</span>
                <strong className="tique-pago-numero">{numeroNequi}</strong>
              </div>
              <span className="tique-pago-indicacion">Copia este número para transferir desde tu app</span>
            </div>
          )}

          <div className="tique-pie-agradecimiento">
            ¡Muchas gracias por su preferencia!
          </div>

          <div className="tique-borde-zigzag" />
        </div>

        {/* Acciones */}
        <div className="comprobante-acciones">
          <button
            type="button"
            className="btn-whatsapp-comprobante"
            onClick={handleCompartirWhatsApp}
            disabled={enviando}
          >
            <MessageCircle size={18} strokeWidth={2.5} />
            <span>{enviando ? 'Generando imagen...' : 'Enviar por WhatsApp con Imagen'}</span>
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn-secundario"
              onClick={handleDescargarImagen}
              disabled={enviando}
              style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <Download size={15} /> Descargar Imagen
            </button>
            <button
              type="button"
              className="btn-secundario"
              onClick={onClose}
              disabled={enviando}
              style={{ flex: 1 }}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
