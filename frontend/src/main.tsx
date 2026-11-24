import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { SessionGate } from './components/layout/SessionGate';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <SessionGate>
        <App />
      </SessionGate>
    </BrowserRouter>
  </React.StrictMode>
);
