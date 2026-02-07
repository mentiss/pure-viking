import React, {createContext, useContext, useState, useEffect} from "react";
import {io} from "socket.io-client";

const SocketContext = createContext();

export const SocketContextProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);

    const socketUrl = import.meta.env.PROD
        ? undefined  // En prod, on laisse vide pour que socket.io utilise l'hôte actuel
        : "http://localhost:3001"; // En dev, on force le port du serveur Node

    useEffect(() => {
        console.log('[SocketContextProvider] Mounting, creating socket...');
        const newSocket = io(socketUrl,{
            transports: ['websocket'],
            reconnection: true,
            reconnectionDelay: 1000
        });

        newSocket.on('connect', () => {
            console.log('[SocketContextProvider] Socket connected:', newSocket.id);
        });

        newSocket.on('disconnect', (reason) => {
            console.log('[SocketContextProvider] Socket disconnected:', reason);
        });

        setSocket(newSocket);

        return () => {
            if(newSocket) {
                newSocket.disconnect();
                console.log('[SocketContextProvider] disconnected');
            }
        }
    }, []);

    console.log('[SocketContextProvider] Rendering, socket:', socket ? socket.id : 'null');

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    )
};

export const useSocket = () => useContext(SocketContext);