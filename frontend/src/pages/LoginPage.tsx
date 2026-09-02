import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { User, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../config';

const LoginPage = () => {
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
                username,
                password,
            });
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    // Theme Colors
    const theme = {
        bg: isDarkMode ? 'bg-gray-900' : 'bg-gray-50',
        text: isDarkMode ? 'text-white' : 'text-gray-900',
        textMuted: isDarkMode ? 'text-gray-400' : 'text-gray-500',
        primary: isDarkMode ? 'indigo' : 'red', // Requested Red for Light Mode
        accentText: isDarkMode ? 'text-indigo-400' : 'text-red-600',
        inputBg: isDarkMode ? 'bg-white/5' : 'bg-white',
        inputBorder: isDarkMode ? 'border-white/10' : 'border-gray-200',
        inputText: isDarkMode ? 'text-white' : 'text-gray-900',
        buttonBg: isDarkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-red-600 hover:bg-red-700',
        leftSideBg: isDarkMode ? 'bg-indigo-950' : 'bg-red-900', // Dark Red for branding side in Light Mode
        gradient1: isDarkMode ? 'from-purple-600/30' : 'from-red-600/30',
        gradient2: isDarkMode ? 'from-indigo-600/20' : 'from-orange-600/20',
    };

    return (
        <div className={`flex min-h-screen ${theme.bg} ${theme.text} overflow-hidden font-sans transition-colors duration-300`}>
            {/* Theme Toggle Button */}
            <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all text-gray-500 dark:text-gray-300"
            >
                {isDarkMode ? '☀️' : '🌙'}
            </button>

            {/* Left Side - Visual & Branding */}
            <div className={`hidden lg:flex lg:w-1/2 relative ${theme.leftSideBg} items-center justify-center p-12 overflow-hidden transition-colors duration-500`}>
                <div className="absolute inset-0 z-0">
                    <div className={`absolute top-0 -left-1/4 w-full h-full bg-gradient-to-br ${theme.gradient1} to-blue-600/10 blur-3xl rounded-full`}></div>
                    <div className={`absolute bottom-0 -right-1/4 w-full h-full bg-gradient-to-tl ${theme.gradient2} to-teal-400/10 blur-3xl rounded-full`}></div>
                </div>

                <div className="relative z-10 max-w-xl">
                    <div className="flex items-center gap-3 mb-8">
                        <img src={isDarkMode ? "/logo.png" : "/logo-tranparan.jpg"} alt="Logo" className="w-32 h-32 object-contain" />
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-200">Attendance Management</h1>
                    </div>

                    <h2 className="text-5xl font-extrabold mb-6 leading-tight text-white">
                        Manage your <br />
                        <span className={isDarkMode ? 'text-indigo-400' : 'text-red-400'}>Perpenas</span> <br />
                        Efficiently.
                    </h2>

                    <p className="text-lg text-white/80 mb-8 max-w-md">
                        Advanced Dashboard Management System for modern attendance tracking.
                        Real-time monitoring, comprehensive reports, and seamless integration.
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                            <h3 className="font-semibold text-white mb-1">Real-time Tracking</h3>
                            <p className="text-sm text-gray-300">Monitor attendance as it happens with live updates.</p>
                        </div>
                        <div className="p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                            <h3 className="font-semibold text-white mb-1">Secure Data</h3>
                            <p className="text-sm text-gray-300">Enterprise-grade security for your employee data.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className={`w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative z-20 ${isDarkMode ? 'bg-black/95' : 'bg-white'}`}>
                <div className="absolute inset-0 overflow-hidden lg:hidden">
                    <div className={`absolute -top-24 -right-24 w-96 h-96 ${isDarkMode ? 'bg-purple-600/20' : 'bg-red-500/10'} blur-[100px] rounded-full`}></div>
                </div>

                <div className="w-full max-w-md space-y-8 relative z-10">
                    <div className="text-center lg:text-left">
                        <h2 className={`text-3xl font-bold tracking-tight ${theme.text}`}>Sign In</h2>
                        <p className={`mt-2 text-sm ${theme.textMuted}`}>
                            Welcome back! Please enter your details.
                        </p>
                    </div>

                    <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm flex items-start animate-in fade-in slide-in-from-top-1">
                                <span className="mr-2">⚠️</span> {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1.5`} htmlFor="username">Username</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User className={`h-5 w-5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} group-focus-within:${theme.accentText} transition-colors`} />
                                    </div>
                                    <input
                                        id="username"
                                        name="username"
                                        type="text"
                                        required
                                        className={`block w-full pl-10 pr-3 py-3 ${theme.inputBg} border ${theme.inputBorder} rounded-xl ${theme.inputText} placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-200 ${isDarkMode ? 'focus:ring-indigo-500/50 focus:border-indigo-500' : 'focus:ring-red-500/50 focus:border-red-500'}`}
                                        placeholder="Enter your username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1.5`} htmlFor="password">Password</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className={`h-5 w-5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} group-focus-within:${theme.accentText} transition-colors`} />
                                    </div>
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        required
                                        className={`block w-full pl-10 pr-3 py-3 ${theme.inputBg} border ${theme.inputBorder} rounded-xl ${theme.inputText} placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-200 ${isDarkMode ? 'focus:ring-indigo-500/50 focus:border-indigo-500' : 'focus:ring-red-500/50 focus:border-red-500'}`}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center">
                                <input id="remember-me" name="remember-me" type="checkbox" className={`h-4 w-4 rounded border-gray-600 ${isDarkMode ? 'bg-gray-700 text-indigo-600 focus:ring-indigo-500' : 'bg-gray-100 text-red-600 focus:ring-red-500'}`} />
                                <label htmlFor="remember-me" className={`ml-2 block ${theme.textMuted}`}>Remember me</label>
                            </div>
                            <div className="text-sm">
                                <a href="#" className={`font-medium ${theme.accentText} hover:opacity-80`}>Forgot password?</a>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white ${theme.buttonBg} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed group ${isDarkMode ? 'focus:ring-indigo-500' : 'focus:ring-red-500'}`}
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            ) : (
                                <>
                                    Sign In <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className={`text-sm ${theme.textMuted}`}>
                            New organization?{' '}
                            <Link to="/register" className={`font-medium ${theme.accentText} hover:opacity-80 transition-colors`}>
                                Create an account
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
