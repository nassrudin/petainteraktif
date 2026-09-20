import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { SafeApplication } from './components/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SafeApplication>
      <App />
    </SafeApplication>
  </React.StrictMode>
);
