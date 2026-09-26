package com.fiado.app;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.net.URLEncoder;

@CapacitorPlugin(name = "WhatsAppDirect")
public class WhatsAppDirectPlugin extends Plugin {

    @PluginMethod
    public void abrirChat(PluginCall call) {
        String telefono = call.getString("telefono", "");
        String texto = call.getString("texto", "");
        String rutaArchivo = call.getString("rutaArchivo", "");

        if (telefono == null || telefono.trim().isEmpty()) {
            call.reject("telefono_vacio", "El número de teléfono es obligatorio.");
            return;
        }

        String telLimpio = telefono.replaceAll("\\D", "");
        if (telLimpio.isEmpty()) {
            call.reject("telefono_invalido", "El número de teléfono no contiene dígitos válidos.");
            return;
        }

        String numFinal = telLimpio.startsWith("57") ? telLimpio : "57" + telLimpio;

        PackageManager pm = getContext().getPackageManager();
        boolean tieneWhatsapp = false;
        String paquete = "com.whatsapp";

        try {
            pm.getPackageInfo("com.whatsapp", PackageManager.GET_ACTIVITIES);
            tieneWhatsapp = true;
            paquete = "com.whatsapp";
        } catch (Exception e1) {
            try {
                pm.getPackageInfo("com.whatsapp.w4b", PackageManager.GET_ACTIVITIES);
                tieneWhatsapp = true;
                paquete = "com.whatsapp.w4b";
            } catch (Exception e2) {
                tieneWhatsapp = false;
            }
        }

        if (!tieneWhatsapp) {
            call.reject("whatsapp_no_instalado", "WhatsApp no está instalado en este dispositivo.");
            return;
        }

        // Intento 1: Si hay imagen generada, intentar enviar directo a ese chat de WhatsApp con la imagen
        if (rutaArchivo != null && !rutaArchivo.trim().isEmpty()) {
            try {
                String pathLimpio = rutaArchivo.replaceFirst("^file://", "");
                File archivo = new File(pathLimpio);
                if (archivo.exists() && archivo.length() > 0) {
                    Uri contentUri = FileProvider.getUriForFile(
                        getContext(),
                        getContext().getPackageName() + ".fileprovider",
                        archivo
                    );

                    Intent sendIntent = new Intent(Intent.ACTION_SEND);
                    sendIntent.setType("image/png");
                    sendIntent.setPackage(paquete);
                    sendIntent.putExtra("jid", numFinal + "@s.whatsapp.net");
                    sendIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                    if (texto != null && !texto.isEmpty()) {
                        sendIntent.putExtra(Intent.EXTRA_TEXT, texto);
                    }
                    sendIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    sendIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

                    getContext().startActivity(sendIntent);

                    JSObject ret = new JSObject();
                    ret.put("exito", true);
                    ret.put("metodo", "imagen_directa");
                    call.resolve(ret);
                    return;
                }
            } catch (Exception ex) {
                // Fallback inmediato al chat directo con texto
            }
        }

        // Intento 2: Abrir directamente la conversación de WhatsApp con ese número y el texto listo
        try {
            String textoCodificado = URLEncoder.encode(texto != null ? texto : "", "UTF-8");
            Uri uriChat = Uri.parse("https://api.whatsapp.com/send?phone=" + numFinal + "&text=" + textoCodificado);

            Intent chatIntent = new Intent(Intent.ACTION_VIEW, uriChat);
            chatIntent.setPackage(paquete);
            chatIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            getContext().startActivity(chatIntent);

            JSObject ret = new JSObject();
            ret.put("exito", true);
            ret.put("metodo", "chat_directo");
            call.resolve(ret);
        } catch (Exception exFinal) {
            call.reject("error_whatsapp", "No se pudo abrir WhatsApp: " + exFinal.getMessage());
        }
    }
}
