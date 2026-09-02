import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Building2, UserCircle, Mail, MapPin, Phone, ArrowLeft, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { API_BASE_URL } from '../config';

const RegisterPage = () => {
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [formData, setFormData] = useState({
        kode: '',
        nama_instansi: '',
        alamat: '',
        telepon: '',
        email: '',
        username: '',
        password: '',
        nama_admin: '',
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await axios.post(`${API_BASE_URL}/api/auth/register`, formData);
            navigate('/login');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Theme Colors matching LoginPage
    const theme = {
        bg: isDarkMode ? 'bg-gray-900' : 'bg-gray-50',
        text: isDarkMode ? 'text-white' : 'text-gray-900',
        textMuted: isDarkMode ? 'text-gray-400' : 'text-gray-500',
        primary: isDarkMode ? 'indigo' : 'red', // Following the convention set in LoginPage
        accentText: isDarkMode ? 'text-indigo-400' : 'text-red-600',
        inputBg: isDarkMode ? 'bg-white/5' : 'bg-white',
        inputBorder: isDarkMode ? 'border-white/10' : 'border-gray-200',
        inputText: isDarkMode ? 'text-white' : 'text-gray-900',
        buttonBg: isDarkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-red-600 hover:bg-red-700',
        leftSideBg: isDarkMode ? 'bg-indigo-950' : 'bg-red-900',
        gradient1: isDarkMode ? 'from-purple-600/30' : 'from-red-600/30',
        gradient2: isDarkMode ? 'from-indigo-600/20' : 'from-orange-600/20',
    };

    return (
        <div className={`flex min-h-screen ${theme.bg} ${theme.text} overflow-hidden font-sans transition-colors duration-300`}>
            {/* Theme Toggle Button */}
            <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all text-gray-500 dark:text-gray-300 shadow-sm"
            >
                {isDarkMode ? '☀️' : '🌙'}
            </button>

            {/* Left Side - Visual & Branding */}
            <div className={`hidden lg:flex lg:w-1/3 xl:w-5/12 relative ${theme.leftSideBg} flex-col justify-between p-12 overflow-hidden transition-colors duration-500 border-r ${isDarkMode ? 'border-white/5' : 'border-red-800/20'}`}>
                <div className="absolute inset-0 z-0">
                    <div className={`absolute top-0 -left-1/4 w-full h-full bg-gradient-to-br ${theme.gradient1} to-blue-600/10 blur-3xl rounded-full`}></div>
                    <div className={`absolute bottom-0 -right-1/4 w-full h-full bg-gradient-to-tl ${theme.gradient2} to-teal-400/10 blur-3xl rounded-full`}></div>
                </div>

                <div className="relative z-10">
                    <Link to="/login" className="inline-flex items-center text-sm text-white/70 hover:text-white transition-colors mb-8 bg-white/10 px-4 py-2 rounded-full backdrop-blur-md border border-white/10">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
                    </Link>
                    
                    <div className="flex items-center gap-3 mb-6">
                        <img src={isDarkMode ? "/logo.png" : "/logo-tranparan.jpg"} alt="Logo" className="w-20 h-20 object-contain" />
                    </div>

                    <h2 className="text-4xl font-extrabold mb-4 leading-tight text-white">
                        Start your <br />
                        <span className={theme.accentText}>journey</span> today.
                    </h2>
                    <p className="text-white/80 text-base leading-relaxed max-w-sm mb-12">
                        Create your organization instance and start managing attendance efficiently with our Advanced Dashboard Management System.
                    </p>

                    <div className="space-y-6">
                        <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-red-500/20 text-red-300'}`}>
                                <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-white">Full Control</h4>
                                <p className="text-sm text-gray-300 mt-0.5">Manage multiple machines and employees globally.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-orange-500/20 text-orange-300'}`}>
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-white">Real-time Analytics</h4>
                                <p className="text-sm text-gray-300 mt-0.5">Get insights into attendance patterns instantly.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 text-sm text-white/50 mt-12">
                    © 2026 ADMS Inc. All rights reserved.
                </div>
            </div>

            {/* Right Side - Form */}
            <div className={`w-full lg:w-2/3 xl:w-7/12 flex flex-col p-6 sm:p-10 lg:p-12 relative z-20 ${isDarkMode ? 'bg-black/95' : 'bg-white'} overflow-y-auto`}>
                <div className="absolute inset-0 overflow-hidden lg:hidden z-0">
                    <div className={`absolute -top-24 -right-24 w-96 h-96 ${isDarkMode ? 'bg-purple-600/20' : 'bg-red-500/10'} blur-[100px] rounded-full`}></div>
                </div>

                <div className="w-full max-w-2xl mx-auto relative z-10">
                    <div className="flex items-center justify-between mb-8 lg:hidden">
                        <Link to="/login" className={`p-2 rounded-full ${isDarkMode ? 'bg-white/5 text-gray-400 border-white/10' : 'bg-gray-100 text-gray-600 border-gray-200'} border`}>
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <img src={isDarkMode ? "/logo.png" : "/logo-tranparan.jpg"} alt="Logo" className="w-12 h-12 object-contain" />
                    </div>

                    <div className="mb-10 text-center lg:text-left">
                        <h2 className={`text-3xl font-bold tracking-tight ${theme.text}`}>Create Account</h2>
                        <p className={`mt-2 text-sm ${theme.textMuted}`}>Fill in your organization and admin details</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm mb-8 flex items-start animate-in fade-in slide-in-from-top-1">
                            <span className="mr-2">⚠️</span> {error}
                        </div>
                    )}

                    <form onSubmit={handleRegister} className="space-y-10">
                        {/* Section 1: Organization Data */}
                        <div className="space-y-6">
                            <div className={`flex items-center gap-3 pb-3 border-b ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                                <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-indigo-500/10' : 'bg-red-50'}`}>
                                    <Building2 className={`w-5 h-5 ${theme.accentText}`} />
                                </div>
                                <h3 className={`text-sm font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>Organization Details</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className={`text-xs font-semibold ${theme.textMuted} uppercase tracking-wider`}>Kode Instansi *</label>
                                    <input name="kode" onChange={handleChange} required className={`w-full ${theme.inputBg} border ${theme.inputBorder} rounded-xl px-4 py-3 ${theme.inputText} text-sm focus:ring-2 focus:ring-${theme.primary}-500/50 focus:border-${theme.primary}-500 outline-none transition-all placeholder:text-gray-500`} placeholder="e.g. ADMS-001" disabled={isLoading} />
                                </div>
                                <div className="space-y-2">
                                    <label className={`text-xs font-semibold ${theme.textMuted} uppercase tracking-wider`}>Nama Instansi *</label>
                                    <input name="nama_instansi" onChange={handleChange} required className={`w-full ${theme.inputBg} border ${theme.inputBorder} rounded-xl px-4 py-3 ${theme.inputText} text-sm focus:ring-2 focus:ring-${theme.primary}-500/50 focus:border-${theme.primary}-500 outline-none transition-all placeholder:text-gray-500`} placeholder="Company Name" disabled={isLoading} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className={`text-xs font-semibold ${theme.textMuted} uppercase tracking-wider`}>Email (Optional)</label>
                                    <div className="relative group">
                                        <Mail className={`w-4 h-4 absolute left-3.5 top-3.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} group-focus-within:${theme.accentText} transition-colors`} />
                                        <input name="email" type="email" onChange={handleChange} className={`w-full ${theme.inputBg} border ${theme.inputBorder} rounded-xl pl-10 pr-4 py-3 ${theme.inputText} text-sm focus:ring-2 focus:ring-${theme.primary}-500/50 focus:border-${theme.primary}-500 outline-none transition-all placeholder:text-gray-500`} placeholder="corp@company.com" disabled={isLoading} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className={`text-xs font-semibold ${theme.textMuted} uppercase tracking-wider`}>Telepon (Optional)</label>
                                    <div className="relative group">
                                        <Phone className={`w-4 h-4 absolute left-3.5 top-3.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} group-focus-within:${theme.accentText} transition-colors`} />
                                        <input name="telepon" type="tel" onChange={handleChange} className={`w-full ${theme.inputBg} border ${theme.inputBorder} rounded-xl pl-10 pr-4 py-3 ${theme.inputText} text-sm focus:ring-2 focus:ring-${theme.primary}-500/50 focus:border-${theme.primary}-500 outline-none transition-all placeholder:text-gray-500`} placeholder="+62..." disabled={isLoading} />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className={`text-xs font-semibold ${theme.textMuted} uppercase tracking-wider`}>Alamat (Optional)</label>
                                <div className="relative group">
                                    <MapPin className={`w-4 h-4 absolute left-3.5 top-3.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} group-focus-within:${theme.accentText} transition-colors`} />
                                    <input name="alamat" onChange={handleChange} className={`w-full ${theme.inputBg} border ${theme.inputBorder} rounded-xl pl-10 pr-4 py-3 ${theme.inputText} text-sm focus:ring-2 focus:ring-${theme.primary}-500/50 focus:border-${theme.primary}-500 outline-none transition-all placeholder:text-gray-500`} placeholder="Full Office Address" disabled={isLoading} />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Admin Data */}
                        <div className="space-y-6">
                            <div className={`flex items-center gap-3 pb-3 border-b ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                                <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-purple-500/10' : 'bg-red-50'}`}>
                                    <UserCircle className={`w-5 h-5 ${theme.accentText}`} />
                                </div>
                                <h3 className={`text-sm font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>Admin Account</h3>
                            </div>

                            <div className="space-y-2">
                                <label className={`text-xs font-semibold ${theme.textMuted} uppercase tracking-wider`}>Full Name *</label>
                                <input name="nama_admin" onChange={handleChange} required className={`w-full ${theme.inputBg} border ${theme.inputBorder} rounded-xl px-4 py-3 ${theme.inputText} text-sm focus:ring-2 focus:ring-${theme.primary}-500/50 focus:border-${theme.primary}-500 outline-none transition-all placeholder:text-gray-500`} placeholder="Your Full Name" disabled={isLoading} />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className={`text-xs font-semibold ${theme.textMuted} uppercase tracking-wider`}>Username *</label>
                                    <input name="username" onChange={handleChange} required className={`w-full ${theme.inputBg} border ${theme.inputBorder} rounded-xl px-4 py-3 ${theme.inputText} text-sm focus:ring-2 focus:ring-${theme.primary}-500/50 focus:border-${theme.primary}-500 outline-none transition-all placeholder:text-gray-500`} placeholder="admin_user" disabled={isLoading} />
                                </div>
                                <div className="space-y-2">
                                    <label className={`text-xs font-semibold ${theme.textMuted} uppercase tracking-wider`}>Password *</label>
                                    <input name="password" type="password" onChange={handleChange} required className={`w-full ${theme.inputBg} border ${theme.inputBorder} rounded-xl px-4 py-3 ${theme.inputText} text-sm focus:ring-2 focus:ring-${theme.primary}-500/50 focus:border-${theme.primary}-500 outline-none transition-all placeholder:text-gray-500`} placeholder="••••••••" disabled={isLoading} />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full flex items-center justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg shadow-${theme.primary}-600/20 text-sm font-bold text-white ${theme.buttonBg} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-${theme.primary}-500 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed group`}
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                ) : (
                                    <>
                                        Create Account <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                        
                        <div className="text-center mt-6">
                            <p className={`text-sm ${theme.textMuted}`}>
                                Already have an account?{' '}
                                <Link to="/login" className={`font-medium ${theme.accentText} hover:opacity-80 transition-colors`}>
                                    Sign In
                                </Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
