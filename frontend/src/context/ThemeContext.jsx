import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('theme') || 'system';
    });

    useEffect(() => {
        const root = document.documentElement;
        const applyDark = () => root.classList.add('dark');
        const applyLight = () => root.classList.remove('dark');

        if (theme === 'dark') {
            applyDark();
        } else if (theme === 'light') {
            applyLight();
        } else {
            // system
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            mq.matches ? applyDark() : applyLight();
            const handler = (e) => (e.matches ? applyDark() : applyLight());
            mq.addEventListener('change', handler);
            return () => mq.removeEventListener('change', handler);
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => {
            const next = prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light';
            localStorage.setItem('theme', next);
            return next;
        });
    };

    const setThemeMode = (mode) => {
        localStorage.setItem('theme', mode);
        setTheme(mode);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setThemeMode }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
