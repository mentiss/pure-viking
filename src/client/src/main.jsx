import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'
import AppRouter from './AppRouter'
import {SocketContextProvider} from "./context/SocketContext.jsx";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
      <SocketContextProvider>
        <AppRouter />
      </SocketContextProvider>
  </React.StrictMode>,
)
