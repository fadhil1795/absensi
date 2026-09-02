import { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Clock, AlertCircle, Calendar } from 'lucide-react';
import { API_BASE_URL } from '../config';

const AturanAbsensi = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        jam_masuk: '08:00',
        min_jam_kerja: 8,
        toleransi_keterlambatan: 0,
        jam_pulang: '17:00' // Display only or auto-updated
    });

    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    // Assuming Instansi Admin mainly uses this.
    // If Super Admin, they might need to select an instansi first, but for now assuming direct access if we implement /dashboard/aturan

    // For Super Admin accessing this page, we might need a selector or default to their "own" (which is null usually).
    // The request implies "Mengatur aturan absensi per instansi", so strictly per-instansi.
    // If user is Super Admin, maybe we shouldn't show this unless they manage a specific instansi, or we need an instansi selector.
    // However, the current backend `GET /api/instansi` returns ALL for Super Admin and Single for Instansi Admin.
    // If Super Admin, this page should probably be skipped or allow selecting one.
    // Let's implement for Instansi Admin (User) context first, assuming they edit THEIR rules.

    const instansiId = user.instansi_id;

    useEffect(() => {
        if (!instansiId) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/api/instansi`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                // If Super Admin, response is array. If Instansi Admin using /api/instansi (modified previously to return single object if not super admin? Wait, my code said "return res.json(instansis[0] || null)" for non-super admin).
                // Let's verify what the backend returns.
                // Backend: using `req.user.role` to decide.
                // If I am Instansi Admin: returns Object.
                // If I am Super Admin: returns Array.

                let data = response.data;
                if (Array.isArray(data)) {
                    // Super Admin context: This page might need a selector.
                    // For MVP simplicity, create a selector if role is SUPER_ADMIN.
                    // BUT, I'll focus on the simple case for now or just pick the first one?
                    // Better: If Super Admin, show "Select Instansi to Edit Rules" (out of scope for quick fix, but I can reuse the logic).
                    // Actually, let's just create a simple "My Instansi" rules editor.
                    data = null; // Super Admin doesn't have "own" instansi usually.
                }

                if (data) {
                    setFormData({
                        jam_masuk: data.jam_masuk ? data.jam_masuk.substring(0, 5) : '08:00',
                        min_jam_kerja: data.min_jam_kerja || 8,
                        toleransi_keterlambatan: data.toleransi_keterlambatan || 0,
                        jam_pulang: data.jam_pulang ? data.jam_pulang.substring(0, 5) : '17:00'
                    });
                }
                setLoading(false);
            } catch (error) {
                console.error('Error fetching settings:', error);
                setLoading(false);
            }
        };

        if (user.role !== 'SUPER_ADMIN') {
            fetchData();
        } else {
            setLoading(false);
        }

    }, [instansiId, token]);

    // Recalculate Jam Pulang on change
    useEffect(() => {
        const [h, m] = formData.jam_masuk.split(':').map(Number);
        if (!isNaN(h)) {
            const endH = (h + parseInt(formData.min_jam_kerja as any)) % 24;
            const p = (n: number) => n.toString().padStart(2, '0');
            setFormData(prev => ({ ...prev, jam_pulang: `${p(endH)}:${p(m)}` }));
        }
    }, [formData.jam_masuk, formData.min_jam_kerja]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await axios.put(`${API_BASE_URL}/api/instansi/${instansiId}`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Settings saved successfully!');
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (user.role === 'SUPER_ADMIN') {
        return <div className="p-6 text-gray-400">Super Admins should edit rules via the Instansi Management page.</div>;
    }

    if (loading) return <div className="p-6 text-gray-400">Loading settings...</div>;

    if (!instansiId) return <div className="p-6 text-gray-400">No Instansi associated with this account.</div>;

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Aturan Absensi</h1>
                <p className="text-gray-400">Configure attendance rules for {user.nama || 'your instansi'}.</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-gray-900 border border-white/10 rounded-xl p-6 space-y-6">

                {/* Jam Masuk */}
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Jam Masuk</label>
                    <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-indigo-500" />
                        <input
                            type="time"
                            required
                            value={formData.jam_masuk}
                            onChange={(e) => setFormData({ ...formData, jam_masuk: e.target.value })}
                            className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-white/10 focus:border-indigo-500 focus:outline-none w-full max-w-xs"
                        />
                    </div>
                </div>

                {/* Toleransi */}
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Toleransi Keterlambatan (Menit)</label>
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-orange-500" />
                        <input
                            type="number"
                            min="0"
                            required
                            value={formData.toleransi_keterlambatan}
                            onChange={(e) => setFormData({ ...formData, toleransi_keterlambatan: parseInt(e.target.value) })}
                            className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-white/10 focus:border-indigo-500 focus:outline-none w-full max-w-xs"
                        />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Grace period before considered "Late".</p>
                </div>

                {/* Min Jam Kerja */}
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Minimal Jam Kerja (Jam)</label>
                    <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-emerald-500" />
                        <input
                            type="number"
                            min="1"
                            max="24"
                            required
                            value={formData.min_jam_kerja}
                            onChange={(e) => setFormData({ ...formData, min_jam_kerja: parseInt(e.target.value) })}
                            className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-white/10 focus:border-indigo-500 focus:outline-none w-full max-w-xs"
                        />
                    </div>
                </div>

                {/* Jam Pulang (Read Only) */}
                <div className="pt-4 border-t border-white/10">
                    <label className="block text-sm font-medium text-gray-400 mb-2">Jam Pulang Minimum (Auto)</label>
                    <div className="text-xl font-mono text-white bg-white/5 inline-block px-4 py-2 rounded-lg">
                        {formData.jam_pulang}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Calculated from Jam Masuk + Min Jam Kerja.</p>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>

            </form>
        </div>
    );
};

export default AturanAbsensi;
