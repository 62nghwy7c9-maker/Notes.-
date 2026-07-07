import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App.js';
import './shared/styles/index.css';

const container = document.getElementById('root');
if (!container) throw new Error('#root nicht gefunden.');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
