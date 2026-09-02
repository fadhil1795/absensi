import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import InstansiManagement from './pages/InstansiManagement';
import AdminManagement from './pages/AdminManagement';
import KaryawanManagement from './pages/KaryawanManagement';
import KaryawanFormPage from './pages/KaryawanFormPage';
import LaporanAbsensi from './pages/LaporanAbsensi';
import LaporanAbsensiForm from './pages/LaporanAbsensiForm';
import RekapAbsensiForm from './pages/RekapAbsensiForm';
import ShiftManagement from './pages/ShiftManagement';
import MesinManagement from './pages/MesinManagement';
import DepartemenManagement from './pages/DepartemenManagement';
import LeaveManagement from './pages/LeaveManagement';
import HolidayManagement from './pages/HolidayManagement';
import RekapAbsensi from './pages/RekapAbsensi';
import RealtimeAbsensi from './pages/RealtimeAbsensi';
import AuditLog from './pages/AuditLog';
import AttendancePage from './pages/AttendancePage';
import InformationManagement from './pages/InformationManagement';
import ScheduleManagement from './pages/ScheduleManagement';
import MobileUserManagement from './pages/MobileUserManagement';
import RoleManagement from './pages/RoleManagement';
import WorkdaySettings from './pages/WorkdaySettings';

import React from 'react';
import DashboardLayout from './components/layout/DashboardLayout';
import { ThemeProvider } from './context/ThemeContext';

// Simple Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<SuperAdminDashboard />} />
            <Route path="instansi" element={<InstansiManagement />} />
            <Route path="admins" element={<AdminManagement />} />
            <Route path="karyawan" element={<KaryawanManagement />} />
            <Route path="karyawan/new" element={<KaryawanFormPage />} />
            <Route path="karyawan/edit/:id" element={<KaryawanFormPage />} />
            <Route path="mesin" element={<MesinManagement />} />
            <Route path="departemen" element={<DepartemenManagement />} />
            <Route path="shifts" element={<ShiftManagement />} />
            <Route path="laporan" element={<LaporanAbsensi />} />
            <Route path="laporan/edit/:id" element={<LaporanAbsensiForm />} />
            <Route path="rekap" element={<RekapAbsensi />} />
            <Route path="rekap/edit/:id" element={<RekapAbsensiForm />} />
            <Route path="realtime" element={<RealtimeAbsensi />} />
            <Route path="audit-logs" element={<AuditLog />} />
            <Route path="izin" element={<LeaveManagement />} />
            <Route path="holidays" element={<HolidayManagement />} />
            <Route path="information" element={<InformationManagement />} />
            <Route path="schedule" element={<ScheduleManagement />} />
            <Route path="mobile-users" element={<MobileUserManagement />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="roles" element={<RoleManagement />} />
            <Route path="work-days" element={<WorkdaySettings />} />
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
