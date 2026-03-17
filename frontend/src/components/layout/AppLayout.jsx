import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import { cn } from '../../lib/utils';

const PAGE_TITLES = {
    '/dashboard': 'Dashboard',
    '/documents': 'Documents',
    '/upload': 'Upload Document',
    '/ai-chat': 'AI Assistant',
    '/profile': 'Profile',
};

export default function AppLayout() {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const location = useLocation();
    const pageTitle = PAGE_TITLES[location.pathname] || '';

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-dark-bg">
            <Sidebar
                collapsed={collapsed}
                setCollapsed={setCollapsed}
                mobileOpen={mobileOpen}
                setMobileOpen={setMobileOpen}
            />

            <TopNavbar
                collapsed={collapsed}
                setMobileOpen={setMobileOpen}
                pageTitle={pageTitle}
            />

            {/* Main content — offset by sidebar width and navbar height */}
            <main
                className={cn(
                    'transition-all duration-250 pt-[60px]',
                    'lg:pl-[240px]',
                    collapsed && 'lg:pl-[64px]'
                )}
            >
                <div className="p-4 sm:p-6 max-w-7xl mx-auto animate-fade-in">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
