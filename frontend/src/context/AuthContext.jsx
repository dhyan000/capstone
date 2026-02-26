import { createContext, useContext, useEffect, useState } from 'react';
import { getMe } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
            getMe()
                .then((res) => setUser(res.data))
                .catch(() => {
                    localStorage.removeItem('access_token');
                    setUser(null);
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const loginUser = (token, userData) => {
        localStorage.setItem('access_token', token);
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        setUser(null);
    };

    const isAllowed = (...roles) => user && roles.includes(user.role);

    return (
        <AuthContext.Provider value={{ user, loading, loginUser, logout, isAllowed }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
