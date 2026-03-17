import { Menu, Sun, Moon, Monitor, Bell } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const themeIcons = { light: Sun, dark: Moon, system: Monitor };

export default function TopNavbar({ collapsed, setMobileOpen, pageTitle }) {
    const { theme, toggleTheme } = useTheme();
    const { user } = useAuth();
    const ThemeIcon = themeIcons[theme] || Monitor;

    return (
        <header
            className="fixed top-0 right-0 z-20 h-[60px]
                        bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl
                        border-b flex items-center justify-between px-4 gap-4
                        transition-[left] duration-250"
            style={{
                left: collapsed ? '64px' : '240px',
                borderBottomColor: '#ddd5ca',
                borderBottomWidth: '1.5px',
            }}
        >
            {/* Gradient underline accent */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] opacity-70 pointer-events-none"
                style={{ background: 'linear-gradient(90deg, #f97316, #3b82f6)' }} />

            {/* Mobile menu button – shown only on <lg */}
            <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden btn-ghost !px-2 !py-2"
                aria-label="Open menu"
            >
                <Menu className="w-5 h-5" />
            </button>

            {/* Page title */}
            {pageTitle && (
                <h2 className="hidden sm:block text-sm font-bold text-slate-800 dark:text-slate-200 flex-1">
                    {pageTitle}
                </h2>
            )}
            {!pageTitle && <div className="flex-1" />}

            {/* Right actions */}
            <div className="flex items-center gap-1">
                <button onClick={toggleTheme} className="btn-ghost !px-2 !py-2"
                    title={`Theme: ${theme}`} aria-label="Toggle theme">
                    <ThemeIcon className="w-4 h-4" />
                </button>

                <button className="btn-ghost !px-2 !py-2 relative" aria-label="Notifications">
                    <Bell className="w-4 h-4" />
                    <span
                        className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2 border-white dark:border-dark-surface animate-pulse"
                        style={{ background: '#f97316' }}
                    />
                </button>

                <div className="flex items-center gap-2 ml-1 pl-3 border-l"
                    style={{ borderColor: '#ddd5ca' }}>
                    <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm"
                        style={{ background: 'linear-gradient(135deg, #f97316, #3b82f6)' }}
                    >
                        {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="hidden md:block">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight max-w-[120px] truncate">
                            {user?.full_name || user?.email}
                        </p>
                        <p className="text-[10px] text-slate-400 capitalize">{user?.role}</p>
                    </div>
                </div>
            </div>
        </header>
    );
}
