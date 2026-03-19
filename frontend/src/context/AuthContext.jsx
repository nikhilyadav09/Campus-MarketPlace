import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getCurrentUser, login as loginRequest, logout as logoutRequest, register as registerRequest } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getCurrentUser();
            setUser(data?.user || null);
        } catch (error) {
            console.error('Failed to restore auth session:', error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshUser();
    }, [refreshUser]);

    const login = useCallback(async (credentials) => {
        const data = await loginRequest(credentials);
        setUser(data?.user || null);
        return data?.user || null;
    }, []);

    const register = useCallback(async (payload) => {
        const data = await registerRequest(payload);
        setUser(data?.user || null);
        return data?.user || null;
    }, []);

    const logout = useCallback(async () => {
        await logoutRequest();
        setUser(null);
    }, []);

    const value = useMemo(() => ({
        user,
        loading,
        isAuthenticated: Boolean(user),
        login,
        register,
        logout,
        refreshUser,
    }), [user, loading, login, register, logout, refreshUser]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}