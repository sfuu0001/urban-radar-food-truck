import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    if (!e.message || e.message === 'Script error.' || e.message.includes('Script error')) {
      e.preventDefault();
      return true;
    }
  });

  window.addEventListener('unhandledrejection', (e) => {
    if (!e.reason || e.reason === 'Script error.' || e.reason?.message === 'Script error.') {
      e.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
