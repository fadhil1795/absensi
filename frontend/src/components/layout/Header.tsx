import { Menu, Bell, Search, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface HeaderProps {
    onMenuClick: () => void;
    user: any;
}

const Header = ({ onMenuClick, user }: HeaderProps) => {
    const { isDarkMode, toggleTheme, theme } = useTheme();

    return (
        <header className={`sticky top-0 z-30 flex h-16 w-full items-center gap-4 border-b ${theme.headerBorder} ${theme.headerBg} px-6 transition-all duration-300`}>
            <button
                onClick={onMenuClick}
                className={`lg:hidden ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'} transition-colors`}
            >
                <Menu className="w-5 h-5" />
            </button>

            <div className="flex flex-1 items-center gap-4">
                {/* Search */}
                <div className="hidden md:flex flex-1 max-w-md">
                    <div className="relative w-full group">
                        <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} transition-colors`} />
                        <input
                            type="text"
                            placeholder="Search..."
                            className={`w-full ${theme.inputBg} ${theme.inputBorder} ${theme.inputFocus} ${isDarkMode ? 'text-white placeholder:text-gray-500' : 'text-gray-800 placeholder:text-gray-400'} border rounded-xl py-2 pl-10 pr-4 text-sm outline-none transition-all duration-200`}
                        />
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className={`p-2 rounded-xl ${isDarkMode ? 'bg-white/[0.04] hover:bg-white/[0.08] text-gray-400' : 'bg-red-50 hover:bg-red-100 text-red-500'} transition-all duration-200`}
                    title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
                >
                    {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>

                {/* Notifications */}
                <button className={`relative p-2 rounded-xl ${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-white/[0.04]' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'} transition-all duration-200`}>
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-[#141519]"></span>
                </button>

                <div className={`h-7 w-px ${isDarkMode ? 'bg-white/[0.06]' : 'bg-red-100'} mx-1`}></div>

                {/* User */}
                <div className="flex items-center gap-3">
                    <div className="hidden md:block text-right">
                        <p className={`text-sm font-semibold ${theme.headingColor} leading-tight`}>{user?.nama || 'Admin'}</p>
                        <p className={`text-[11px] ${isDarkMode ? 'text-red-400/70' : 'text-red-500/70'} font-medium capitalize`}>
                            {user?.role_name || user?.role?.replace('_', ' ').toLowerCase() || 'User'}
                        </p>
                    </div>
                    <div className="h-9 w-9 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md shadow-red-500/20">
                        {user?.nama?.charAt(0).toUpperCase() || 'A'}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
