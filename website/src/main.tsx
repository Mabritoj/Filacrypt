import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './lib/amplify';
import { reloadOnceForChunkError } from './utils/chunkReload';

// Vite's production preload helper reports a failed chunk/CSS download here
// before the import even rejects. Reload once (guarded against loops); if it
// returns false, let the error propagate to the ErrorBoundary's message.
window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnceForChunkError()) event.preventDefault();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
