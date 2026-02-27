// src/client/src/context/AuthContext.jsx
// Gestion authentification.
// Les appels auth sont préfixés par le système actif extrait du pathname,
// car AuthContext est un Provider hors React Router (pas accès à useParams).

import React, { createContext, useState, useEffect, useContext } from 'react';
import { getSystemFromPath } from '../hooks/useSystem';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser]               = useState(null); // { character, isGM }
    const [accessToken, setAccessToken] = useState(null);
    const [loading, setLoading]         = useState(true);

    // Auto-refresh au montage
    useEffect(() => {
        refreshAccessToken();
    }, []);

    function authBase() {
        return `/api/${getSystemFromPath()}/auth`;
    }

    // ─── Login ───────────────────────────────────────────────────────────────

    const login = async (code, characterUrl) => {
        try {
            const response = await fetch(`${authBase()}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ code, characterUrl })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Login failed');
            }

            const data = await response.json();
            setAccessToken(data.accessToken);
            setUser({ character: data.character, isGM: data.character.id === -1 });
            localStorage.setItem('currentCharacterId', data.character.id);

            return data.character;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    // ─── Refresh ─────────────────────────────────────────────────────────────

    const refreshAccessToken = async () => {
        try {
            const response = await fetch(`${authBase()}/refresh`, {
                method: 'POST',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                setAccessToken(data.accessToken);
                await loadUserInfo(data.accessToken);
            } else {
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

    // ─── Me ──────────────────────────────────────────────────────────────────

    const loadUserInfo = async (token) => {
        try {
            const response = await fetch(`${authBase()}/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setUser({ character: data.character, isGM: data.character.id === -1 });
            }
        } catch (error) {
            console.error('Load user info error:', error);
        }
    };

    // ─── Logout ──────────────────────────────────────────────────────────────

    const logout = async () => {
        try {
            await fetch(`${authBase()}/logout`, { method: 'POST', credentials: 'include' });
        } catch (error) {
            console.error('Logout error:', error);
        }
        setUser(null);
        setAccessToken(null);
        localStorage.removeItem('currentCharacterId');
    };

    return (
        <AuthContext.Provider value={{ user, accessToken, loading, login, logout, refreshAccessToken }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};