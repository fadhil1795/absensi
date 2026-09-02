import React, { createContext, useContext, useState, useEffect } from 'react';

type ThemeContextType = {
    isDarkMode: boolean;
    toggleTheme: () => void;
    theme: {
        bg: string;
        text: string;
        sidebarBg: string;
        sidebarText: string;
        sidebarHover: string;
        sidebarActive: string;
        sidebarBorder: string;
        headerBg: string;
        headerBorder: string;
        cardBg: string;
        cardBorder: string;
        headingColor: string;
        subTextColor: string;
        primary: string;
        // New tokens for elegant red-white
        accentGradient: string;
        accentBg: string;
        accentText: string;
        accentBorder: string;
        btnPrimary: string;
        btnPrimaryHover: string;
        inputBg: string;
        inputBorder: string;
        inputFocus: string;
    };
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('theme');
        return saved ? saved === 'dark' : false; // Default to light (red-white)
    });

    useEffect(() => {
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    const toggleTheme = () => setIsDarkMode(!isDarkMode);

    const theme = {
        // Core
        bg: isDarkMode ? 'bg-[#0f1117]' : 'bg-[#f8f6f4]',
        text: isDarkMode ? 'text-white' : 'text-gray-800',

        // Sidebar — Elegant dark red for light, deep dark for dark
        sidebarBg: isDarkMode ? 'bg-[#141519]' : 'bg-gradient-to-b from-[#8b1a1a] to-[#6b1010]',
        sidebarText: 'text-white',
        sidebarHover: 'hover:bg-white/10',
        sidebarActive: isDarkMode ? 'bg-red-600/90 text-white shadow-lg shadow-red-600/20' : 'bg-white/20 text-white shadow-lg shadow-black/10',
        sidebarBorder: isDarkMode ? 'border-r border-white/[0.06]' : 'border-none',

        // Header
        headerBg: isDarkMode ? 'bg-[#141519]/80 backdrop-blur-2xl' : 'bg-white/90 backdrop-blur-2xl',
        headerBorder: isDarkMode ? 'border-white/[0.06]' : 'border-red-100/60',

        // Cards
        cardBg: isDarkMode ? 'bg-[#1a1b23]' : 'bg-white',
        cardBorder: isDarkMode ? 'border-white/[0.06]' : 'border-red-100/50',

        // Text
        headingColor: isDarkMode ? 'text-white' : 'text-gray-900',
        subTextColor: isDarkMode ? 'text-gray-400' : 'text-gray-500',

        // Accents — Red-White palette
        primary: 'red',
        accentGradient: isDarkMode ? 'from-red-600 to-rose-500' : 'from-red-600 to-rose-500',
        accentBg: isDarkMode ? 'bg-red-500/10' : 'bg-red-50',
        accentText: isDarkMode ? 'text-red-400' : 'text-red-600',
        accentBorder: isDarkMode ? 'border-red-500/20' : 'border-red-200',

        // Buttons
        btnPrimary: 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-lg shadow-red-500/25',
        btnPrimaryHover: 'hover:shadow-red-500/40',

        // Inputs
        inputBg: isDarkMode ? 'bg-white/[0.04]' : 'bg-[#faf8f6]',
        inputBorder: isDarkMode ? 'border-white/[0.08] focus:border-red-500/40' : 'border-red-100 focus:border-red-300',
        inputFocus: isDarkMode ? 'focus:bg-white/[0.06]' : 'focus:bg-white',
    };

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleTheme, theme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
