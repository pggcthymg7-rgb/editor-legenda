import '@fontsource-variable/inter';
import '@fontsource-variable/outfit';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

// Não roda dentro de iframe de outro site (clickjacking); a PWA estática não manda X-Frame-Options.
if (window.top !== window.self) {
  document.body.textContent = 'Abra o Editor de Legendas diretamente.';
  throw new Error('iframe bloqueado');
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
