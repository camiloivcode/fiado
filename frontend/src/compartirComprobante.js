import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { toPng } from 'html-to-image';

/**
 * Genera una imagen PNG a partir de un nodo HTML del ticket térmico
 * y la comparte a través de WhatsApp / Share sheet con el mensaje de texto
 * (incluyendo el número de Nequi / Bre-B) como pie de foto.
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

  // 1. Generar PNG de alta definición (2.5x pixelRatio)
  const dataUrl = await toPng(nodoElemento, {
    pixelRatio: 2.5,
    cacheBust: true,
    backgroundColor: '#ffffff',
  });

  // 2. Si corre en Android nativo (Capacitor)
  if (Capacitor.isNativePlatform()) {
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    const archivoGuardado = await Filesystem.writeFile({
      path: nombreArchivo,
      data: base64Data,
      directory: Directory.Cache,
    });

    await Share.share({
      title: titulo || 'Factura Fiado',
      text: textoMensaje,
      files: [archivoGuardado.uri],
      dialogTitle: 'Enviar por WhatsApp',
    });

    return { exito: true, metodo: 'nativo' };
  }

  // 3. Si corre en Navegador Web que soporte compartir archivos
  const respuesta = await fetch(dataUrl);
  const blob = await respuesta.blob();
  const archivo = new File([blob], nombreArchivo, { type: 'image/png' });

  if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [archivo] })) {
    await navigator.share({
      title: titulo || 'Factura Fiado',
      text: textoMensaje,
      files: [archivo],
    });
    return { exito: true, metodo: 'web-share' };
  }

  // 4. Fallback para navegador web sin soporte de adjuntos directos:
  // Descarga el PNG en la máquina y abre WhatsApp con el texto y el número listo
  const enlace = document.createElement('a');
  enlace.href = dataUrl;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();

  const telLimpio = (telefonoCliente || '').replace(/\D/g, '');
  const urlWhatsApp = telLimpio
    ? `https://wa.me/${telLimpio.startsWith('57') ? telLimpio : `57${telLimpio}`}?text=${encodeURIComponent(textoMensaje)}`
    : `https://wa.me/?text=${encodeURIComponent(textoMensaje)}`;

  window.open(urlWhatsApp, '_blank');
  return { exito: true, metodo: 'descarga-fallback' };
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
