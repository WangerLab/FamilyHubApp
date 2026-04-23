import React from 'react';
import ReactDOM from 'react-dom/client';
import '@/index.css';
import App from '@/App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Service worker disabled — app runs as standard website
// Kill-switch sw.js will deregister any previously installed SW on next visit
