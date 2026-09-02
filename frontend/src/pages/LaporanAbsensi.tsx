import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Download, Search, Filter, X, RefreshCcw } from 'lucide-react';
import { format, isValid } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config';

interface AttendanceSummary {
    id: string;
    tanggal: string;
    karyawan_nama: string;
    karyawan_nik: string;
    jabatan: string;
    departemen: string;
    jam_masuk: string;
    jam_keluar: string;
    jam_kerja: string;
    status: string; // 'Hadir', 'Belum Pulang', 'Absen', 'Terlambat'
    terlambat_menit: number;
    pulang_cepat_menit: number;
}

interface Instansi {
    id: number;
    nama: string;
}

const LaporanAbsensi = () => {
    const { theme, isDarkMode } = useTheme();
    const [data, setData] = useState<AttendanceSummary[]>([]);
    const [instansis, setInstansis] = useState<Instansi[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedInstansi, setSelectedInstansi] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isSuperAdmin = user.role === 'SUPER_ADMIN';

    // Fetch Instansi for dropdown
    useEffect(() => {
        if (isSuperAdmin) {
            axios.get(`${API_BASE_URL}/api/instansi`, {
                headers: { Authorization: `Bearer ${token}` }
            }).then(res => setInstansis(res.data))
                .catch(err => console.error(err));
        }
    }, [isSuperAdmin, token]);

    const fetchSummary = async () => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            if (selectedInstansi) params.append('instansi_id', selectedInstansi);

            console.log('Fetching summary with params:', params.toString());

            const response = await axios.get(`${API_BASE_URL}/api/absensi/summary?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Summary response:', response.data);
            setData(response.data);
            if (response.data.length === 0) {
                console.log('Summary returned 0 results.');
            }
        } catch (error) {
            console.error('Error fetching summary:', error);
            setError('Failed to load data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSummary();
    }, [startDate, endDate, selectedInstansi]);

    // Client-side filtering for search
    const filteredData = data.filter(item =>
        (item.karyawan_nama && item.karyawan_nama.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.karyawan_nik && item.karyawan_nik.includes(searchQuery)) ||
        (item.departemen && item.departemen.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const getCatatan = (row: AttendanceSummary) => {
        const notes = [];
        if (row.terlambat_menit > 0) notes.push(`Terlambat ${row.terlambat_menit} menit`);
        if (row.jam_masuk && !row.jam_keluar) notes.push('Belum Absen Pulang');
        if (!row.jam_masuk && row.jam_keluar) notes.push('Belum Absen Masuk');
        if (row.pulang_cepat_menit > 0) notes.push('Pulang Cepat');
        return notes.length > 0 ? notes.join(', ') : '-';
    };

    const handleExportExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(filteredData.map(item => ({
            'Nama Karyawan': item.karyawan_nama,
            'NIK': item.karyawan_nik,
            'Departemen': item.departemen,
            'Tanggal': formatDate(item.tanggal),
            'Jam Masuk': item.jam_masuk,
            'Jam Pulang': item.jam_keluar,
            'Jam Kerja': item.jam_kerja,
            'Status': item.status,
            'Catatan': getCatatan(item),
            'Terlambat (Menit)': item.terlambat_menit || 0
        })));

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Absensi");
        XLSX.writeFile(workbook, `Laporan_Absensi_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    };

    const handleExportPDF = () => {
        const doc = new jsPDF() as any;

        doc.setFontSize(18);
        doc.text("Laporan Absensi", 14, 20);

        doc.setFontSize(10);
        doc.text(`Generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 28);
        if (startDate && endDate) {
            doc.text(`Periode: ${format(new Date(startDate), 'dd/MM/yyyy')} - ${format(new Date(endDate), 'dd/MM/yyyy')}`, 14, 34);
        }

        const tableColumn = ["Nama", "Departemen", "Tanggal", "Jam Masuk", "Jam Pulang", "Durasi", "Status", "Catatan"];
        const tableRows = filteredData.map(item => [
            item.karyawan_nama,
            item.departemen,
            formatDate(item.tanggal),
            item.jam_masuk,
            item.jam_keluar,
            item.jam_kerja,
            item.status,
            getCatatan(item)
        ]);

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [22, 163, 74] } // Emerald-600 color match
        });

        doc.save(`Laporan_Absensi_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    };

    // Helper for Status Badge
    const getStatusBadge = (status: string) => {
        let styles = isDarkMode ? "bg-gray-500/10 text-gray-400" : "bg-gray-100 text-gray-600 border border-gray-200";

        if (status === 'Hadir') {
            styles = isDarkMode ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-emerald-100 text-emerald-700 border border-emerald-200";
        } else if (status === 'Terlambat') {
            styles = isDarkMode ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-red-100 text-red-700 border border-red-200";
        } else if (status === 'Alpha') {
            styles = isDarkMode ? "bg-red-700/10 text-red-500 border border-red-700/20" : "bg-red-200 text-red-800 border border-red-300";
        }

        return (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${styles}`}>
                {status}
            </span>
        );
    };

    // Helper for date formatting
    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        // Check if strictly YYYY-MM-DD (length 10)
        if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            const [y, m, d] = dateString.split('-');
            return `${d}/${m}/${y}`;
        }

        try {
            const date = new Date(dateString);
            return isValid(date) ? format(date, 'dd/MM/yyyy') : dateString;
        } catch (e) {
            return dateString;
        }
    };

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Reset page when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, startDate, endDate, selectedInstansi]);

    // Slice data for current page
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    // --- ALPHA GENERATION ---
    const handleGenerateAlpha = async () => {
        if (!confirm('Generate Alpha for selected date? This will mark all absent employees as "Alpha".')) return;
        const targetDate = startDate || format(new Date(), 'yyyy-MM-dd'); // Default to today if no filter
        try {
            await axios.post('${API_BASE_URL}/api/absensi/generate-alpha',
                { date: targetDate, instansi_id: selectedInstansi },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert('Alpha records generated successfully');
            fetchSummary();
        } catch (error: any) {
            console.error(error);
            alert('Failed to generate alpha: ' + (error.response?.data?.details || error.message));
        }
    };

    // --- DELETE LOGIC ---
    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this record?')) return;
        try {
            await axios.delete(`${API_BASE_URL}/api/absensi/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchSummary();
        } catch (error: any) {
            alert('Delete failed');
        }
    };

    const navigate = useNavigate();

    const handleEditClick = (item: AttendanceSummary) => {
        navigate(`/dashboard/laporan/edit/${item.id}`);
    };

    return (
        <div className="space-y-6">
            <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl p-6 space-y-6 transition-colors duration-300`}>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1"></div>
                    <div className="flex gap-3">
                        <button
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors font-medium text-sm"
                            onClick={handleGenerateAlpha}
                        >
                            <RefreshCcw className="w-4 h-4" /> Generate Alpha
                        </button>
                        <button
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors font-medium text-sm"
                            onClick={handleExportPDF}
                        >
                            <Download className="w-4 h-4" /> Export PDF
                        </button>
                        <button
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium text-sm"
                            onClick={handleExportExcel}
                        >
                            <Download className="w-4 h-4" /> Export Excel
                        </button>
                    </div>
                </div>

                {/* Search and Filter Bar */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme.subTextColor}`} />
                        <input
                            type="text"
                            placeholder="Search by Name, NIK, or Dept"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full ${isDarkMode ? 'bg-[#1A1D21] text-white' : 'bg-gray-50 text-gray-900'} pl-10 pr-10 py-2.5 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 focus:outline-none placeholder:text-gray-500`}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <Filter className={`w-4 h-4 ${theme.subTextColor} cursor-pointer hover:${theme.headingColor} transition-colors`} />
                            {filteredData.length > 0 && <span className={`text-[10px] ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'} px-1.5 rounded-full`}>{filteredData.length}</span>}
                        </div>
                    </div>
                </div>

                {/* Active Filters Display */}
                {(startDate || endDate) && (
                    <div className="flex flex-wrap gap-2 text-sm">
                        <span className={`${theme.subTextColor} py-1`}>Active filters:</span>
                        {startDate && (
                            <span className={`flex items-center gap-1 ${isDarkMode ? 'bg-gray-800 text-blue-400' : 'bg-gray-100 text-blue-600'} px-3 py-1 rounded-md border ${isDarkMode ? 'border-blue-500/20' : 'border-blue-200'}`}>
                                Dari: {formatDate(startDate)}
                                <button onClick={() => setStartDate('')} className="hover:opacity-75 ml-1"><X className="w-3 h-3" /></button>
                            </span>
                        )}
                        {endDate && (
                            <span className={`flex items-center gap-1 ${isDarkMode ? 'bg-gray-800 text-blue-400' : 'bg-gray-100 text-blue-600'} px-3 py-1 rounded-md border ${isDarkMode ? 'border-blue-500/20' : 'border-blue-200'}`}>
                                Sampai: {formatDate(endDate)}
                                <button onClick={() => setEndDate('')} className="hover:opacity-75 ml-1"><X className="w-3 h-3" /></button>
                            </span>
                        )}
                        <button onClick={() => { setStartDate(''); setEndDate(''); }} className={`${theme.subTextColor} hover:${theme.headingColor} text-xs py-1 px-2`}>Clear all</button>
                    </div>
                )}

                {/* Advanced Filter Inputs */}
                <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 pb-2 border-b ${theme.cardBorder}`}>
                    <div>
                        <label className={`text-xs ${theme.subTextColor} mb-1 block`}>Date Range</label>
                        <div className="flex gap-2">
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={`w-full ${isDarkMode ? 'bg-[#1A1D21] text-gray-300' : 'bg-gray-50 text-gray-900'} border ${theme.cardBorder} rounded px-2 py-1 text-sm outline-none`} />
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={`w-full ${isDarkMode ? 'bg-[#1A1D21] text-gray-300' : 'bg-gray-50 text-gray-900'} border ${theme.cardBorder} rounded px-2 py-1 text-sm outline-none`} />
                        </div>
                    </div>
                    {isSuperAdmin && (
                        <div>
                            <label className={`text-xs ${theme.subTextColor} mb-1 block`}>Instansi</label>
                            <select value={selectedInstansi} onChange={e => setSelectedInstansi(e.target.value)} className={`w-full ${isDarkMode ? 'bg-[#1A1D21] text-gray-300' : 'bg-gray-50 text-gray-900'} border ${theme.cardBorder} rounded px-2 py-1.5 text-sm outline-none`}>
                                <option value="">All Instances</option>
                                {instansis.map(i => <option key={i.id} value={i.id}>{i.nama}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="flex items-end">
                        <button onClick={fetchSummary} className={`text-xs flex items-center gap-1 ${theme.subTextColor} hover:${theme.headingColor} transition-colors`}>
                            <RefreshCcw className="w-3 h-3" /> Refresh Data
                        </button>
                    </div>
                </div>


                {/* Table */}
                <div className="overflow-x-auto min-h-[300px]">
                    {error ? (
                        <div className="flex flex-col items-center justify-center py-12 text-red-400">
                            <p>{error}</p>
                            <button onClick={fetchSummary} className="mt-2 text-sm underline hover:text-red-300">Retry</button>
                        </div>
                    ) : (
                        <table className="w-full text-left whitespace-nowrap">
                            <thead className={`${theme.subTextColor} text-xs font-medium border-b ${theme.cardBorder}`}>
                                <tr>
                                    <th className="px-4 py-3 font-normal">Nama Karyawan</th>
                                    <th className="px-4 py-3 font-normal">Departemen</th>
                                    <th className="px-4 py-3 font-normal">Tanggal</th>
                                    <th className="px-4 py-3 font-normal">Jam Masuk</th>
                                    <th className="px-4 py-3 font-normal">Jam Pulang</th>
                                    <th className="px-4 py-3 font-normal">Jam Kerja</th>
                                    <th className="px-4 py-3 font-normal">Status</th>
                                    <th className="px-4 py-3 font-normal">Catatan</th>
                                    <th className="px-4 py-3 font-normal text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-200'} text-sm`}>
                                {loading ? (
                                    <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500">Loading data...</td></tr>
                                ) : filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                                            No attendance records found
                                            {searchQuery && <p className="text-xs mt-1">Try clearing your search query</p>}
                                        </td>
                                    </tr>
                                ) : (
                                    currentItems.map((row) => (
                                        <tr key={row.id} className={`${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'} transition-colors group`}>
                                            <td className={`px-4 py-3 ${theme.headingColor} font-medium`}>
                                                {row.karyawan_nama}
                                                <div className="text-[10px] text-gray-500">{row.karyawan_nik}</div>
                                            </td>
                                            <td className={`px-4 py-3 ${theme.subTextColor}`}>{row.departemen || '-'}</td>
                                            <td className={`px-4 py-3 ${theme.subTextColor}`}>{formatDate(row.tanggal)}</td>
                                            <td className={`px-4 py-3 ${theme.headingColor} font-mono`}>{row.jam_masuk || '-'}</td>
                                            <td className={`px-4 py-3 ${theme.headingColor} font-mono`}>{row.jam_keluar || '-'}</td>
                                            <td className={`px-4 py-3 ${theme.subTextColor}`}>{row.jam_kerja || '-'}</td>
                                            <td className="px-4 py-3">
                                                {getStatusBadge(row.status)}
                                            </td>
                                            <td className={`px-4 py-3 ${theme.subTextColor} text-xs`}>
                                                {getCatatan(row)}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-2 text-xs">
                                                    <button onClick={() => handleEditClick(row)} className={`text-blue-400 hover:text-blue-300 ${isDarkMode ? 'bg-blue-500/10' : 'bg-blue-100/50'} px-2 py-1 rounded`}>
                                                        Edit
                                                    </button>
                                                    <button onClick={() => handleDelete(row.id)} className={`text-red-400 hover:text-red-300 ${isDarkMode ? 'bg-red-500/10' : 'bg-red-100/50'} px-2 py-1 rounded`}>
                                                        Del
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer Pagination (ACTIVE) */}
                <div className={`flex justify-between items-center text-sm ${theme.subTextColor} pt-2 border-t ${theme.cardBorder}`}>
                    <span>
                        Showing {filteredData.length > 0 ? indexOfFirstItem + 1 : 0} to {Math.min(indexOfLastItem, filteredData.length)} of {filteredData.length} results
                    </span>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            {/* Page Navigation */}
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className={`p-1 rounded ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-200'} disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {'<'}
                            </button>
                            <span className={`text-xs ${theme.headingColor}`}>Page {currentPage} of {totalPages || 1}</span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className={`p-1 rounded ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-200'} disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {'>'}
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <span>Per page</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => {
                                    setItemsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className={`bg-${isDarkMode ? '[#1A1D21]' : 'gray-50'} border ${theme.cardBorder} rounded px-2 py-1 text-xs ${theme.headingColor} outline-none`}
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    </div>
                </div>

            </div>

        </div>
    );
};

export default LaporanAbsensi;
