import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Save, Edit, Upload, FileText, Image as ImageIcon, ExternalLink, Trash2, HardDrive, AlertTriangle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config';
import { usePermissions } from '../hooks/usePermissions';

interface LeaveType {
    id: number;
    nama: string;
    kuota: number;
    is_paid: boolean;
    is_attachment_required?: boolean | number;
}

interface KaryawanOption {
    id: number;
    nama: string;
    nik: string;
}

const LeaveFormPage = () => {
    const { theme, isDarkMode } = useTheme();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const location = useLocation();
    const { hasOperation, loading: permsLoading } = usePermissions();

    const isViewMode = location.pathname.includes('/izin/view/');
    const isEditMode = location.pathname.includes('/izin/edit/');

    const canView = hasOperation('leaves', 'view');
    const canAdd  = hasOperation('leaves', 'add');
    const canEdit = hasOperation('leaves', 'edit');
    const hasAccess = isViewMode ? canView : isEditMode ? canEdit : canAdd;

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || !!user.role_id;
    const token = localStorage.getItem('token');

    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
    const [karyawans, setKaryawans] = useState<KaryawanOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [storageProviderLabel, setStorageProviderLabel] = useState<string>('Garage HQ (S3)');

    const [applyForm, setApplyForm] = useState({
        jenis_cuti_id: '',
        start_date: '',
        end_date: '',
        reason: '',
        karyawan_id: '',
        status: 'APPROVED'
    });

    // Attachment state
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [existingAttachment, setExistingAttachment] = useState<{
        key: string | null;
        name: string | null;
        mime: string | null;
        provider: string | null;
    }>({ key: null, name: null, mime: null, provider: null });
    const [removeExistingAttachment, setRemoveExistingAttachment] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [typesRes, storageRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/api/leaves/types`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get(`${API_BASE_URL}/api/leaves/storage-status`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }).catch(() => ({ data: { provider: 'Garage HQ (S3)' } }))
                ]);

                setLeaveTypes(typesRes.data);
                if (storageRes.data?.provider) {
                    setStorageProviderLabel(storageRes.data.provider);
                }

                if (isAdmin) {
                    const karRes = await axios.get(`${API_BASE_URL}/api/karyawan`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setKaryawans(karRes.data);
                }

                if ((isEditMode || isViewMode) && id) {
                    const reqRes = await axios.get(`${API_BASE_URL}/api/leaves/requests/${id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const detail = reqRes.data;
                    setApplyForm({
                        jenis_cuti_id: detail.jenis_cuti_id ? String(detail.jenis_cuti_id) : '',
                        start_date: detail.start_date ? detail.start_date.substring(0, 10) : '',
                        end_date: detail.end_date ? detail.end_date.substring(0, 10) : '',
                        reason: detail.reason || '',
                        karyawan_id: detail.karyawan_id ? String(detail.karyawan_id) : '',
                        status: detail.status || 'APPROVED'
                    });
                    setExistingAttachment({
                        key: detail.attachment_key || null,
                        name: detail.attachment_name || null,
                        mime: detail.attachment_mime || null,
                        provider: detail.storage_provider || null
                    });
                }
            } catch (error) {
                console.error('Failed to load leave form data:', error);
                alert('Failed to load form data. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, isEditMode, isViewMode, isAdmin, token]);

    useEffect(() => {
        if (!selectedFile) {
            setPreviewUrl(null);
            return;
        }
        if (selectedFile.type.startsWith('image/')) {
            const objectUrl = URL.createObjectURL(selectedFile);
            setPreviewUrl(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        } else {
            setPreviewUrl(null);
        }
    }, [selectedFile]);

    const selectedLeaveType = leaveTypes.find(t => String(t.id) === String(applyForm.jenis_cuti_id));
    const isAttachmentRequired = Boolean(selectedLeaveType?.is_attachment_required);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                alert('Ukuran file maksimal 10 MB');
                return;
            }
            setSelectedFile(file);
            setRemoveExistingAttachment(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isViewMode || !hasAccess) return;

        if (isAdmin && !applyForm.karyawan_id) {
            alert('Silakan pilih karyawan terlebih dahulu.');
            return;
        }

        if (!applyForm.jenis_cuti_id) {
            alert('Silakan pilih jenis cuti / izin.');
            return;
        }

        // Validasi wajib upload bukti jika tipe cuti mengharuskan
        if (isAttachmentRequired) {
            const hasCurrentAttachment = selectedFile || (!removeExistingAttachment && existingAttachment.key);
            if (!hasCurrentAttachment) {
                alert(`Jenis cuti/izin "${selectedLeaveType?.nama}" mewajibkan Anda untuk mengunggah dokumen bukti / surat izin.`);
                return;
            }
        }

        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('karyawan_id', String(isAdmin ? applyForm.karyawan_id : user.id));
            formData.append('jenis_cuti_id', applyForm.jenis_cuti_id);
            formData.append('start_date', applyForm.start_date);
            formData.append('end_date', applyForm.end_date);
            formData.append('reason', applyForm.reason);
            formData.append('status', isAdmin ? (applyForm.status || 'APPROVED') : 'PENDING');

            if (selectedFile) {
                formData.append('attachment', selectedFile);
            }
            if (removeExistingAttachment) {
                formData.append('remove_attachment', 'true');
            }

            if (isEditMode && id) {
                await axios.put(
                    `${API_BASE_URL}/api/leaves/requests/${id}`,
                    formData,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'multipart/form-data'
                        }
                    }
                );
            } else {
                await axios.post(
                    `${API_BASE_URL}/api/leaves/apply`,
                    formData,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'multipart/form-data'
                        }
                    }
                );
            }
            navigate('/dashboard/izin');
        } catch (error: any) {
            console.error('Error submitting leave request:', error);
            alert(error.response?.data?.error || 'Failed to submit request');
        } finally {
            setSaving(false);
        }
    };

    const pageTitle = isViewMode
        ? 'Detail Leave Request'
        : isEditMode
            ? 'Edit Leave Request'
            : 'Apply for Leave';

    const pageSubTitle = isViewMode
        ? 'View employee leave or permission request details.'
        : isEditMode
            ? 'Update employee leave or permission request.'
            : 'Create a new leave or permission request.';

    const existingAttachmentUrl = id && existingAttachment.key
        ? `${API_BASE_URL}/api/leaves/requests/${id}/attachment?token=${token}`
        : null;

    const isExistingImage = existingAttachment.mime?.startsWith('image/') ||
        /\.(jpg|jpeg|png|webp)$/i.test(existingAttachment.name || '');

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <button
                    type="button"
                    onClick={() => navigate('/dashboard/izin')}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${isDarkMode ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Leave Requests
                </button>
                <div className="text-center">
                    <h1 className={`text-2xl font-bold ${theme.headingColor}`}>{pageTitle}</h1>
                    <p className={`${theme.subTextColor} text-sm`}>
                        {pageSubTitle}
                    </p>
                </div>
                <div />
            </div>

            <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-2xl p-6 shadow-sm transition-colors duration-300`}>
                {!permsLoading && !hasAccess ? (
                    <div className="text-center py-14 space-y-3">
                        <div className="text-amber-500 font-semibold text-lg">Akses Ditolak</div>
                        <p className={`text-sm ${theme.subTextColor}`}>
                            Role Anda tidak memiliki izin untuk mengakses halaman ini. Hubungi Administrator untuk mengatur hak akses pada Role Management.
                        </p>
                    </div>
                ) : loading ? (
                    <div className="text-center py-20 text-gray-500">Loading form data...</div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className={`grid gap-4 ${isAdmin ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
                            {isAdmin && (
                                <div>
                                    <label className={`block text-sm font-medium ${theme.subTextColor} mb-1`}>Pilih Karyawan</label>
                                    <select
                                        required
                                        disabled={isViewMode}
                                        value={applyForm.karyawan_id}
                                        onChange={e => setApplyForm({ ...applyForm, karyawan_id: e.target.value })}
                                        className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 focus:outline-none appearance-none ${isViewMode ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                        <option value="">Pilih Karyawan...</option>
                                        {karyawans.map(k => (
                                            <option key={k.id} value={k.id}>{k.nama} ({k.nik})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className={`block text-sm font-medium ${theme.subTextColor} mb-1`}>
                                    Leave Type
                                    {isAttachmentRequired && (
                                        <span className="text-[11px] font-bold text-amber-500 ml-2">
                                            (Wajib Lampiran)
                                        </span>
                                    )}
                                </label>
                                <select
                                    required
                                    disabled={isViewMode}
                                    value={applyForm.jenis_cuti_id}
                                    onChange={e => setApplyForm({ ...applyForm, jenis_cuti_id: e.target.value })}
                                    className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 focus:outline-none appearance-none ${isViewMode ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    <option value="">Select Type</option>
                                    {leaveTypes.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.nama} ({t.kuota} days){t.is_attachment_required ? ' — [Wajib Bukti]' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className={`block text-sm font-medium ${theme.subTextColor} mb-1`}>Start Date</label>
                                <input
                                    type="date"
                                    required
                                    disabled={isViewMode}
                                    value={applyForm.start_date}
                                    onChange={e => setApplyForm({ ...applyForm, start_date: e.target.value })}
                                    className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 focus:outline-none ${isViewMode ? 'opacity-70 cursor-not-allowed' : ''}`}
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium ${theme.subTextColor} mb-1`}>End Date</label>
                                <input
                                    type="date"
                                    required
                                    disabled={isViewMode}
                                    value={applyForm.end_date}
                                    onChange={e => setApplyForm({ ...applyForm, end_date: e.target.value })}
                                    className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 focus:outline-none ${isViewMode ? 'opacity-70 cursor-not-allowed' : ''}`}
                                />
                            </div>
                        </div>

                        {isAdmin && (isEditMode || isViewMode) && (
                            <div>
                                <label className={`block text-sm font-medium ${theme.subTextColor} mb-1`}>Status</label>
                                <select
                                    disabled={isViewMode}
                                    value={applyForm.status}
                                    onChange={e => setApplyForm({ ...applyForm, status: e.target.value })}
                                    className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 focus:outline-none appearance-none ${isViewMode ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    <option value="APPROVED">APPROVED</option>
                                    <option value="PENDING">PENDING</option>
                                    <option value="REJECTED">REJECTED</option>
                                </select>
                            </div>
                        )}

                        <div>
                            <label className={`block text-sm font-medium ${theme.subTextColor} mb-1`}>Reason</label>
                            <textarea
                                required
                                disabled={isViewMode}
                                value={applyForm.reason}
                                onChange={e => setApplyForm({ ...applyForm, reason: e.target.value })}
                                className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 focus:outline-none h-28 resize-none ${isViewMode ? 'opacity-70 cursor-not-allowed' : ''}`}
                                placeholder="Why do you need leave?"
                            />
                        </div>

                        {/* Lampiran Bukti / Surat Izin (Garage HQ Object Storage) */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className={`block text-sm font-medium ${theme.subTextColor}`}>
                                    Lampiran Bukti / Surat Izin{' '}
                                    {isAttachmentRequired ? (
                                        <span className="text-xs font-bold text-red-500 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full ml-1">
                                            * WAJIB DIUNGGAH
                                        </span>
                                    ) : (
                                        <span className="text-xs opacity-70">(Opsional — Foto JPG/PNG atau PDF, Maks. 10MB)</span>
                                    )}
                                </label>
                                <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${
                                    isDarkMode ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-indigo-50 text-indigo-600 border-indigo-200'
                                }`}>
                                    <HardDrive className="w-3 h-3" />
                                    {storageProviderLabel}
                                </span>
                            </div>

                            {/* Alert jika wajib lampiran */}
                            {isAttachmentRequired && !isViewMode && (
                                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                                    isDarkMode ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}>
                                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                                    <span>
                                        Jenis izin/cuti <strong>{selectedLeaveType?.nama}</strong> memerlukan bukti fisik (Surat Dokter, Surat Tugas, atau Dokumen Resmi). Form tidak dapat dikirim tanpa melampirkan file.
                                    </span>
                                </div>
                            )}

                            {/* Existing attachment display (for View & Edit mode) */}
                            {existingAttachment.key && !removeExistingAttachment && !selectedFile && (
                                <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-white/[0.02] border-white/10' : 'bg-gray-50 border-gray-200'} space-y-3`}>
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-indigo-500/15 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                                                {isExistingImage ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <div className={`text-sm font-medium ${theme.headingColor}`}>
                                                    {existingAttachment.name || 'Lampiran Bukti Izin'}
                                                </div>
                                                <div className={`text-xs ${theme.subTextColor}`}>
                                                    Tersimpan di {existingAttachment.provider === 'garage' ? 'Garage HQ S3' : 'Server Storage'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {existingAttachmentUrl && (
                                                <a
                                                    href={existingAttachmentUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                                        isDarkMode ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30' : 'bg-indigo-600 text-white hover:bg-indigo-500'
                                                    }`}
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                    Buka / Unduh
                                                </a>
                                            )}
                                            {!isViewMode && (
                                                <button
                                                    type="button"
                                                    onClick={() => setRemoveExistingAttachment(true)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    Hapus
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {isExistingImage && existingAttachmentUrl && (
                                        <div className="pt-2">
                                            <img
                                                src={existingAttachmentUrl}
                                                alt={existingAttachment.name || 'Preview Lampiran'}
                                                className="max-h-64 rounded-lg border border-white/10 object-contain"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {isViewMode && !existingAttachment.key && (
                                <div className={`p-4 rounded-xl border text-xs ${theme.subTextColor} ${isDarkMode ? 'bg-white/[0.01] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                                    Tidak ada file lampiran pada pengajuan cuti/izin ini.
                                </div>
                            )}

                            {/* Upload input (Create & Edit mode) */}
                            {!isViewMode && (
                                <div className="space-y-3">
                                    <label className={`flex flex-col items-center justify-center w-full p-5 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                                        isAttachmentRequired && !selectedFile && (!existingAttachment.key || removeExistingAttachment)
                                            ? (isDarkMode ? 'border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10' : 'border-amber-400 bg-amber-50/50 hover:bg-amber-100/50')
                                            : (isDarkMode ? 'border-white/15 bg-white/[0.02] hover:bg-white/[0.04]' : 'border-gray-300 bg-gray-50/70 hover:bg-gray-100/70')
                                    }`}>
                                        <div className="flex flex-col items-center justify-center text-center space-y-1.5">
                                            <Upload className={`w-6 h-6 ${isAttachmentRequired ? 'text-amber-500' : theme.subTextColor}`} />
                                            <div className={`text-sm font-medium ${theme.headingColor}`}>
                                                {selectedFile
                                                    ? selectedFile.name
                                                    : isAttachmentRequired
                                                        ? 'Klik untuk memilih file lampiran WAJIB (Surat Dokter / Bukti Fisik / PDF)'
                                                        : 'Klik untuk memilih file lampiran (Surat Dokter / Foto / PDF)'}
                                            </div>
                                            <p className={`text-xs ${theme.subTextColor}`}>
                                                {selectedFile
                                                    ? `${(selectedFile.size / 1024).toFixed(1)} KB — Klik untuk mengganti file`
                                                    : 'Format didukung: JPG, PNG, WEBP, PDF (Maks. 10 MB)'}
                                            </p>
                                        </div>
                                        <input
                                            type="file"
                                            accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                    </label>

                                    {selectedFile && (
                                        <div className="flex items-center justify-between text-xs px-1">
                                            <span className="text-emerald-500 font-medium">
                                                File siap diunggah ke {storageProviderLabel}: {selectedFile.name}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedFile(null)}
                                                className="text-red-400 hover:text-red-300 underline"
                                            >
                                                Batalkan pilihan file
                                            </button>
                                        </div>
                                    )}

                                    {previewUrl && (
                                        <div className="pt-1">
                                            <img
                                                src={previewUrl}
                                                alt="Preview Upload"
                                                className="max-h-56 rounded-lg border border-white/10 object-contain"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className={`flex flex-col gap-4 md:flex-row md:items-center md:justify-between pt-4 border-t ${theme.cardBorder}`}>
                            <button
                                type="button"
                                onClick={() => navigate('/dashboard/izin')}
                                className={`px-4 py-2 rounded-lg ${isDarkMode ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'} transition-colors`}
                            >
                                {isViewMode ? 'Back' : 'Cancel'}
                            </button>

                            {isViewMode ? (
                                canEdit && (
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/dashboard/izin/edit/${id}`)}
                                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-red-600 hover:bg-red-700'} transition-colors`}
                                    >
                                        <Edit className="w-4 h-4" />
                                        Edit Request
                                    </button>
                                )
                            ) : (
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-red-600 hover:bg-red-700'} transition-colors ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    <Save className="w-4 h-4" />
                                    {saving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Submit Request'}
                                </button>
                            )}
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default LeaveFormPage;
