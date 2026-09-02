import dotenv from 'dotenv';
dotenv.config({ override: true });

console.log('>>> INDEX.TS STARTING (Restart Triggered) <<<');
import express from 'express';
import path from 'path';

import cors from 'cors';
import authRoutes from './routes/authRoutes';
import instansiRoutes from './routes/instansiRoutes';
// import mesinRoutes from './routes/mesinRoutes';
import karyawanRoutes from './routes/karyawanRoutes';
import absensiRoutes from './routes/absensiRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import departemenRoutes from './routes/departemenRoutes';
import shiftRoutes from './routes/shiftRoutes';
import leaveRoutes from './routes/leaveRoutes';
import mesinRoutes from './routes/mesinRoutes';
import adminRoutes from './routes/adminRoutes';
import rekapRoutes from './routes/rekapRoutes';
import holidayRoutes from './routes/holidayRoutes';
import auditRoutes from './routes/auditRoutes';
import roleRoutes from './routes/roleRoutes';
import workdayRoutes from './routes/workdayRoutes';
// import mobileAuthRoutes from './routes/mobileAuthRoutes';
// import mobileAttendanceRoutes from './routes/mobileAttendanceRoutes';
// import mobileInfoRoutes from './routes/mobileInfoRoutes'; // New import
// import mobileEmployeeRoutes from './routes/mobileEmployeeRoutes'; // New import
// import mobileUserRoutes from './routes/mobileUserRoutes';
// import informationRoutes from './routes/informationRoutes';
import scheduleRoutes from './routes/scheduleRoutes';
import { startAutoSync } from './utils/scheduler';
import * as fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: ['http://localhost:5173', 'https://attendance-management-phi-henna.vercel.app'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());
// Serve uploads statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));


// GLOBAL DEBUG LOGGING
app.use((req, res, next) => {
    console.log(`[INCOMING] ${req.method} ${req.url}`);
    next();
});

// Routes
app.use('/api/auth', authRoutes);
// app.use('/api/mobile/auth', mobileAuthRoutes);
// app.use('/api/mobile/attendance', mobileAttendanceRoutes);
// app.use('/api/mobile', mobileInfoRoutes); // Schedule, Announcements
// app.use('/api/mobile', mobileEmployeeRoutes); // Leaves, Overtime, Profile (mounted at root /api/mobile so paths match /leaves, etc.)
// Wait, user asked for:
// /api/leaves
// /api/overtime
// /api/profile
// /api/schedule
// /api/announcements
// These are slightly inconsistent in the user prompt. 
// "Employee Services" -> /api/leaves, /api/overtime, /api/profile
// "Information" -> /api/schedule, /api/announcements
// So I should mount them at /api directly or create separate mounts.
// Prompt:
// POST /api/leaves
// GET /api/overtime
// PUT /api/profile
// GET /api/schedule
// GET /api/announcements

// So I will mount them directly to /api


app.use('/api/instansi', instansiRoutes);
app.use('/api/karyawan', karyawanRoutes);
app.use('/api/absensi', absensiRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/mesin', mesinRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/rekap', rekapRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/departemen', departemenRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/work-days', workdayRoutes);
// app.use('/api/mobile-users', mobileUserRoutes);
// app.use('/api/information', informationRoutes);

// app.get('/', (req, res) => {
//     res.send('ADMS Server is running');
// });

// app.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}`);
// });

app.get('/', (req, res) => {
    res.send('ADMS Server is running on Vercel');
});
startAutoSync();

// KODE LAMA (Hanya jalan jika DIJALANKAN MANUAL, bukan di Vercel)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}
// PENTING UNTUK VERCEL
export default app;