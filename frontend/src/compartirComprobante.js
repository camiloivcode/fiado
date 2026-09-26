import { Capacitor, registerPlugin } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { toPng } from 'html-to-image';

const WhatsAppDirect = registerPlugin('WhatsAppDirect');

/**
 * Abre directamente el chat de WhatsApp con el número del cliente
 * llevando el mensaje pre-cargado (con los datos del cobro y número Nequi/Bre-B).
 */
export async function abrirChatWhatsAppDirecto(telefonoCliente, textoMensaje = '', rutaArchivo = '') {
  const telLimpio = (telefonoCliente || '').replace(/\D/g, '');
  if (!telLimpio) return false;

  const numFinal = telLimpio.startsWith('57') ? telLimpio : `57${telLimpio}`;

  // 1. Si estamos en Android nativo (Capacitor), usar el plugin nativo WhatsAppDirect
  if (Capacitor.isNativePlatform()) {
    try {
      await WhatsAppDirect.abrirChat({
        telefono: numFinal,
        texto: textoMensaje,
        rutaArchivo: rutaArchivo || '',
      });
      return true;
    } catch (err) {
      console.warn('Fallo WhatsAppDirect nativo, intentando intent URL directa:', err);
      // Fallback intentando abrir la URL directa api.whatsapp.com
      const url = `https://api.whatsapp.com/send?phone=${numFinal}&text=${encodeURIComponent(textoMensaje)}`;
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();
      return true;
    }
  }

  // 2. Si es Navegador Web / PWA:
  const url = `https://api.whatsapp.com/send?phone=${numFinal}&text=${encodeURIComponent(textoMensaje)}`;
  const win = window.open(url, '_blank');
  if (!win) {
    window.location.href = url;
  }
  return true;
}

/**
 * Genera una imagen PNG a partir de un nodo HTML del ticket térmico
 * y la envía directamente al chat de WhatsApp de esa persona con el mensaje de texto.
 */
export async function compartirFacturaConImagen({
  nodoElemento,
  titulo,
  textoMensaje,
  nombreArchivo = 'factura_fiado.png',
  telefonoCliente = '',
}) {
  if (!nodoElemento) {
    throw new Error('No se encontró el elemento del comprobante');
  }

  // 1. Generar PNG de alta definición
  let dataUrl = '';
  try {
    dataUrl = await toPng(nodoElemento, {
      pixelRatio: 2.5,
      cacheBust: true,
      backgroundColor: '#ffffff',
    });
  } catch (err) {
    console.warn('No se pudo renderizar PNG, continuando con texto:', err);
  }

  let archivoUri = '';

  // 2. Guardar imagen en caché si estamos en nativo
  if (Capacitor.isNativePlatform() && dataUrl) {
    try {
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
      const archivoGuardado = await Filesystem.writeFile({
        path: nombreArchivo,
        data: base64Data,
        directory: Directory.Cache,
      });
      archivoUri = archivoGuardado.uri;
    } catch (e) {
      console.warn('No se pudo guardar imagen en caché:', e);
    }
  }

  // 3. Copiar texto al portapapeles por comodidad del usuario
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(textoMensaje);
    }
  } catch {}

  // 4. Si tiene número de teléfono, ENVIAR DIRECTO AL CHAT DE ESE NÚMERO
  if (telefonoCliente) {
    return await abrirChatWhatsAppDirecto(telefonoCliente, textoMensaje, archivoUri);
  }

  // 5. Si no tiene teléfono y es nativo, abrir Share Sheet como último recurso
  if (Capacitor.isNativePlatform() && archivoUri) {
    await Share.share({
      title: titulo || 'Factura Fiado',
      text: textoMensaje,
      files: [archivoUri],
      dialogTitle: 'Enviar por WhatsApp',
    });
    return { exito: true, metodo: 'share_nativo' };
  }

  // Fallback web sin teléfono especificado
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(textoMensaje)}`, '_blank');
  return { exito: true, metodo: 'web_abierto' };
}

/**
 * Permite descargar la imagen del ticket directamente al dispositivo.
 */
export async function descargarImagenFactura(nodoElemento, nombreArchivo = 'factura.png') {
  if (!nodoElemento) return;

  const dataUrl = await toPng(nodoElemento, {
    pixelRatio: 2.5,
    cacheBust: true,
    backgroundColor: '#ffffff',
  });

  if (Capacitor.isNativePlatform()) {
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    const archivoGuardado = await Filesystem.writeFile({
      path: nombreArchivo,
      data: base64Data,
      directory: Directory.Documents,
    });

    await Share.share({
      title: 'Guardar factura',
      files: [archivoGuardado.uri],
      dialogTitle: 'Guardar o enviar imagen',
    });
    return;
  }

  const enlace = document.createElement('a');
  enlace.href = dataUrl;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
}
