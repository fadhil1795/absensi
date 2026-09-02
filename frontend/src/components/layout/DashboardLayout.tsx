import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useTheme } from '../../context/ThemeContext';

const DashboardLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();
    const { theme } = useTheme();

    // Get user from local storage
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // Close sidebar on route change (mobile)
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [location.pathname]);

    return (
        <div className={`min-h-screen ${theme.bg} ${theme.text} font-sans selection:bg-${theme.primary}-500/30 transition-colors duration-300`}>
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                role={user.role || 'GUEST'}
            />

            <div className="lg:pl-72 flex flex-col min-h-screen transition-all duration-300">
                <Header
                    onMenuClick={() => setIsSidebarOpen(true)}
                    user={user}
                />

                <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden">
                    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
