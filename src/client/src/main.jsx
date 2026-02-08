import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'
import AppRouter from './AppRouter'
import {SocketContextProvider} from "./context/SocketContext.jsx";
import {AuthProvider} from "./context/AuthContext.jsx";
import {SessionProvider} from "./context/SessionContext.jsx";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
      <AuthProvider>
          <SocketContextProvider>
              <SessionProvider>
                <AppRouter />
              </SessionProvider>
          </SocketContextProvider>
      </AuthProvider>
  </React.StrictMode>,
)
