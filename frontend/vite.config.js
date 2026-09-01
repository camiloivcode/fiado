import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // rutas de assets relativas: necesario para servir desde el WebView de Capacitor
  server: { port: 5173, host: true },
});
