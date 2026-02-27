import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'
import AppRouter from './AppRouter'
import {SocketContextProvider} from "./context/SocketContext.jsx";
import {AuthProvider} from "./context/AuthContext.jsx";
import {SessionProvider} from "./context/SessionContext.jsx";
import {SystemsProvider} from "./context/SystemsContext.jsx";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
      <SystemsProvider>
          <AuthProvider>
              <SocketContextProvider>
                  <SessionProvider>
                    <AppRouter />
                  </SessionProvider>
              </SocketContextProvider>
          </AuthProvider>
      </SystemsProvider>
  </React.StrictMode>,
)
