// context/AuthContext.jsx - Gestion authentification
import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // { character, isGM }
    const [accessToken, setAccessToken] = useState(null);
    const [loading, setLoading] = useState(true);

    // Auto-refresh au montage
    useEffect(() => {
        refreshAccessToken();
    }, []);

    /**
     * Login avec code + URL
     */
    const login = async (code, characterUrl) => {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // Envoyer cookies
                body: JSON.stringify({ code, characterUrl })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Login failed');
            }

            const data = await response.json();
            setAccessToken(data.accessToken);
            setUser({
                character: data.character,
                isGM: data.character.id === -1
            });

            // Sauvegarder dans localStorage pour persistance
            localStorage.setItem('currentCharacterId', data.character.id);

            return data.character;

        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    /**
     * Refresh access token via refresh token (cookie)
     */
    const refreshAccessToken = async () => {
        try {
            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                setAccessToken(data.accessToken);

                // Charger infos utilisateur
                await loadUserInfo(data.accessToken);
            } else {
                // Pas de refresh token valide
                setUser(null);
                setAccessToken(null);
            }

        } catch (error) {
            console.error('Refresh error:', error);
            setUser(null);
            setAccessToken(null);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Charger les infos utilisateur depuis /api/auth/me
     */
    const loadUserInfo = async (token) => {
        try {
            const response = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setUser({
                    character: data.character,
                    isGM: data.character.id === -1
                });
            }

        } catch (error) {
            console.error('Load user info error:', error);
        }
    };

    /**
     * Logout
     */
    const logout = async () => {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            console.error('Logout error:', error);
        }

        setUser(null);
        setAccessToken(null);
        localStorage.removeItem('currentCharacterId');
    };

    return (
        <AuthContext.Provider value={{
            user,
            accessToken,
            loading,
            login,
            logout,
            refreshAccessToken
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};