import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Override console.error to suppress Vite websocket errors
const originalConsoleError = console.error;
console.error = (...args) => {
  const msg = args.map(a => String(a)).join(' ');
  if (msg.includes('WebSocket') || msg.includes('websocket') || msg.includes('[vite] failed to connect') || msg.includes('closed without opened')) return;
  originalConsoleError(...args);
};

// Global error handler for debugging in Logcat
window.addEventListener('error', (event) => {
  const msg = event.error?.message || event.message || '';
  if (msg.includes('WebSocket') || msg.includes('websocket') || msg.includes('closed without opened')) {
    event.preventDefault(); // Prevent browser from logging it
    return;
  }
  originalConsoleError('Global Error:', msg);
  if (event.error?.stack) originalConsoleError('Stack Trace:', event.error.stack);
});

window.addEventListener('unhandledrejection', (event) => {
  let reasonStr = '';
  try {
    reasonStr = event.reason ? (event.reason.message || event.reason.error || JSON.stringify(event.reason) || String(event.reason)) : '';
  } catch (e) {
    reasonStr = String(event.reason);
  }
  if (reasonStr.includes('WebSocket') || reasonStr.includes('websocket') || reasonStr.includes('closed without opened')) {
    event.preventDefault(); // Prevent browser from logging it
    return;
  }
  originalConsoleError('Unhandled Promise Rejection:', event.reason);
});

// Restore saved accent color before first render so there's no flash of default olive
try {
  const savedAccent = localStorage.getItem('si_accent');
  if (savedAccent && savedAccent.toUpperCase() !== '#5A5A40') {
    const hex = savedAccent;
    const darken = (h: string, f: number) =>
      '#' + [1,3,5].map(i => Math.min(255, Math.round(parseInt(h.slice(i,i+2),16)*f)).toString(16).padStart(2,'0')).join('');
    const alpha = (h: string, a: number) => h + Math.round(a*255).toString(16).padStart(2,'0');
    const d1 = darken(hex, 0.82), d2 = darken(hex, 0.70);
    const style = document.createElement('style');
    style.id = 'si-accent-style';
    style.textContent = `
      .bg-\\[\\#5A5A40\\]{background-color:${hex}!important}
      .bg-\\[\\#5A5A40\\]\\/5{background-color:${alpha(hex,0.05)}!important}
      .bg-\\[\\#5A5A40\\]\\/8{background-color:${alpha(hex,0.08)}!important}
      .bg-\\[\\#5A5A40\\]\\/10{background-color:${alpha(hex,0.10)}!important}
      .bg-\\[\\#5A5A40\\]\\/20{background-color:${alpha(hex,0.20)}!important}
      .bg-\\[\\#5A5A40\\]\\/40{background-color:${alpha(hex,0.40)}!important}
      .text-\\[\\#5A5A40\\]{color:${hex}!important}
      .text-\\[\\#5A5A40\\]\\/20{color:${alpha(hex,0.20)}!important}
      .text-\\[\\#5A5A40\\]\\/30{color:${alpha(hex,0.30)}!important}
      .text-\\[\\#5A5A40\\]\\/40{color:${alpha(hex,0.40)}!important}
      .text-\\[\\#5A5A40\\]\\/50{color:${alpha(hex,0.50)}!important}
      .text-\\[\\#5A5A40\\]\\/60{color:${alpha(hex,0.60)}!important}
      .text-\\[\\#5A5A40\\]\\/70{color:${alpha(hex,0.70)}!important}
      .border-\\[\\#5A5A40\\]{border-color:${hex}!important}
      .border-\\[\\#5A5A40\\]\\/10{border-color:${alpha(hex,0.10)}!important}
      .border-\\[\\#5A5A40\\]\\/20{border-color:${alpha(hex,0.20)}!important}
      .border-\\[\\#5A5A40\\]\\/40{border-color:${alpha(hex,0.40)}!important}
      .border-\\[\\#5A5A40\\]\\/50{border-color:${alpha(hex,0.50)}!important}
      .from-\\[\\#5A5A40\\]{--tw-gradient-from:${hex}!important}
      .from-\\[\\#5A5A40\\]\\/5{--tw-gradient-from:${alpha(hex,0.05)}!important}
      .from-\\[\\#5A5A40\\]\\/10{--tw-gradient-from:${alpha(hex,0.10)}!important}
      .to-\\[\\#5A5A40\\]{--tw-gradient-to:${hex}!important}
      .to-\\[\\#5A5A40\\]\\/5{--tw-gradient-to:${alpha(hex,0.05)}!important}
      .shadow-\\[\\#5A5A40\\]\\/20{--tw-shadow-color:${alpha(hex,0.20)}!important}
      .shadow-\\[\\#5A5A40\\]\\/25{--tw-shadow-color:${alpha(hex,0.25)}!important}
      .shadow-\\[\\#5A5A40\\]\\/30{--tw-shadow-color:${alpha(hex,0.30)}!important}
      .ring-\\[\\#5A5A40\\]{--tw-ring-color:${hex}!important}
      .ring-\\[\\#5A5A40\\]\\/10{--tw-ring-color:${alpha(hex,0.10)}!important}
      .ring-\\[\\#5A5A40\\]\\/20{--tw-ring-color:${alpha(hex,0.20)}!important}
      .ring-\\[\\#5A5A40\\]\\/30{--tw-ring-color:${alpha(hex,0.30)}!important}
      .hover\\:bg-\\[\\#4A4A30\\]:hover{background-color:${d1}!important}
      .to-\\[\\#4A4A30\\]{--tw-gradient-to:${d1}!important}
      .bg-\\[\\#4A4A30\\]{background-color:${d1}!important}
      .bg-\\[\\#3F3F2D\\]{background-color:${d2}!important}
      .to-\\[\\#3F3F2D\\]{--tw-gradient-to:${d2}!important}
    `;
    document.head.appendChild(style);
  }
} catch {}

console.log('App is starting...');

// Set appStarted flag as soon as script execution begins to notify fail-safe
// @ts-ignore
window.appStarted = true;

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  console.log('App rendered successfully');
} catch (error) {
  console.error('Critical Error during App initialization:', error);
  // Display error on screen if possible
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; color: red; font-family: sans-serif;">
        <h1>App failed to start</h1>
        <p>${error instanceof Error ? error.message : String(error)}</p>
      </div>
    `;
  }
}
