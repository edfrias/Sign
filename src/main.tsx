import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { LanguageProvider } from './state/LanguageContext';
import './fonts.css';
import './styles.css';

registerSW({ immediate: true });

if (import.meta.env.DEV) void import('./dev/axeDev').then((m) => m.startAxe());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>,
);
