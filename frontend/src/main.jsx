import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
// i18n 초기화 — 반드시 App보다 먼저 import
import './lib/i18n.js';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
