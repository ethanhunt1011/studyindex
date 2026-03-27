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
