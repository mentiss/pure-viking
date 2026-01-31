import React, {createContext, useContext, useState, useEffect} from "react";
import {io} from "socket.io-client";

const SocketContext = createContext();

export const SocketContextProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);

    const socketUrl = import.meta.env.PROD
        ? undefined  // En prod, on laisse vide pour que socket.io utilise l'hôte actuel
        : "http://localhost:3001"; // En dev, on force le port du serveur Node

    useEffect(() => {
        const newSocket = io(socketUrl,{
            transports: ['websocket'],
            reconnection: true,
            reconnectionDelay: 1000
        });

        setSocket(newSocket);

        return () => {
            if(newSocket) {
                newSocket.disconnect();
                console.log('[SocketContextProvider] disconnected');
            }
        }
    }, []);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    )
};

export const useSocket = () => useContext(SocketContext);