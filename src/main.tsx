import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { PopupProvider } from './context/PopupContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PopupProvider>
      <App />
    </PopupProvider>
  </StrictMode>,
);
