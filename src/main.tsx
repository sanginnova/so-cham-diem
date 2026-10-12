// Ensure window.fetch has both getter and setter across all browser runtimes
try {
  if (typeof window !== 'undefined' && window.fetch) {
    let _fetchRef = window.fetch.bind(window);
    Object.defineProperty(window, 'fetch', {
      get() {
        return _fetchRef;
      },
      set(fn) {
        _fetchRef = fn;
      },
      configurable: true,
      enumerable: true,
    });
  }
} catch {
  // ignore
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
