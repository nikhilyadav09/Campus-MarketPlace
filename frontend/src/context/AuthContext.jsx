import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getCurrentUser, logout as logoutRequest, updateProfile as updateProfileRequest } from '../api/auth';

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

    const updateProfile = useCallback(async (payload) => {
        const data = await updateProfileRequest(payload);
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
        updateProfile,
        logout,
        refreshUser,
    }), [user, loading, updateProfile, logout, refreshUser]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}