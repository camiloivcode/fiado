import { Receipt, Share2, X, Check, MessageCircle, Calendar, User, ShoppingBag } from 'lucide-react';
import { formatearPesos } from '../format.js';
import { useToast } from './Toast.jsx';

export default function ComprobanteModal({ movimiento, cliente, tienda, onClose }) {
  const { mostrarExito } = useToast();
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
  const nequiTienda = tienda?.nequi ? `\n💳 Nequi/Daviplata para abonos: ${tienda.nequi}` : '';

  // Formato para enviar por WhatsApp
  const textoWhatsApp = encodeURIComponent(
    `🧾 *COMPROBANTE DE ${esFiado ? 'FIADO' : 'ABONO'}*\n` +
    `🏪 *${nombreTienda}*\n` +
    `--------------------------------\n` +
    `👤 *Cliente:* ${cliente.nombre}\n` +
    `📅 *Fecha:* ${fechaStr} - ${horaStr}\n` +
    `${movimiento.descripcion ? `📦 *Detalle:* ${movimiento.descripcion}\n` : ''}` +
    `💰 *Valor ${esFiado ? 'Fiado' : 'Abonado'}:* ${formatearPesos(movimiento.monto)}\n` +
    `--------------------------------\n` +
    `📊 *Nuevo Saldo Total:* ${formatearPesos(Math.max(0, cliente.saldo))}\n` +
    `${nequiTienda}\n\n` +
    `¡Gracias por tu confianza!`
  );

  const telefonoLimpio = (cliente.telefono || '').replace(/\D/g, '');
  const urlWhatsApp = telefonoLimpio
    ? `https://wa.me/${telefonoLimpio.startsWith('57') ? telefonoLimpio : `57${telefonoLimpio}`}?text=${textoWhatsApp}`
    : `https://wa.me/?text=${textoWhatsApp}`;

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="comprobante-dialogo">
        <button className="btn-cerrar-modal" onClick={onClose} aria-label="Cerrar comprobante">
          <X size={18} strokeWidth={2} />
        </button>

        {/* Diseño tipo Tique Térmico */}
        <div className="tique-contenedor">
          <div className="tique-cabecera">
            <span className="tique-icono-marca">
              <Receipt size={22} strokeWidth={2} />
            </span>
            <h3 className="tique-tienda">{nombreTienda}</h3>
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

          {tienda?.nequi && (
            <div className="tique-pie-nequi">
              <span>Para transferencias Nequi: <strong>{tienda.nequi}</strong></span>
            </div>
          )}

          <div className="tique-borde-zigzag" />
        </div>

        {/* Acciones */}
        <div className="comprobante-acciones">
          <a
            href={urlWhatsApp}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp-comprobante"
          >
            <MessageCircle size={18} strokeWidth={2} /> Compartir por WhatsApp
          </a>
          <button type="button" className="btn-secundario" onClick={onClose}>
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
