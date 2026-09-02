import db from '../db';
import { rekapService } from '../services/rekapService';
import { RowDataPacket } from 'mysql2';

const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

let hasStarted = false;
let startupTimer: NodeJS.Timeout | null = null;
let intervalTimer: NodeJS.Timeout | null = null;

export function startAutoSync() {
    if (hasStarted) {
        console.log('[Scheduler] AutoSync Rekap Scheduler already started.');
        return;
    }

    hasStarted = true;
    console.log(`[Scheduler] AutoSync Rekap Scheduler initialized. Environment: ${process.env.NODE_ENV || 'development'}`);

    if (process.env.AUTO_REKAP_SYNC_ENABLED === 'false') {
        console.log('[Scheduler] AutoSync is disabled by AUTO_REKAP_SYNC_ENABLED=false');
        return;
    }

    // Run sync immediately on startup after a short delay to avoid database lock during startup migrations.
    startupTimer = setTimeout(() => {
        void runSync();
    }, 5000);

    // Then run every 1 hour (3600000 ms).
    intervalTimer = setInterval(() => {
        void runSync();
    }, 3600000);
}

export async function triggerAutoSyncNow() {
    await runSync();
}

async function runSync() {
    try {
        console.log('[Scheduler] Running auto-sync...');
        
        // 1. Get all active instansi IDs
        const [instansi] = await db.query<RowDataPacket[]>('SELECT id FROM instansi');
        if (instansi.length === 0) {
            console.log('[Scheduler] No instansi found.');
            return;
        }

        // 2. Define date range: yesterday and today (local time)
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        const todayStr = formatDate(today);
        const yesterdayStr = formatDate(yesterday);

        console.log(`[Scheduler] Syncing date range: ${yesterdayStr} to ${todayStr}`);

        for (const inst of instansi) {
            try {
                const count = await rekapService.processRekapRange(inst.id, yesterdayStr, todayStr);
                console.log(`[Scheduler] Instansi ID ${inst.id}: Synced ${count} records.`);
            } catch (err) {
                console.error(`[Scheduler] Error syncing Instansi ID ${inst.id}:`, err);
            }
        }
        console.log('[Scheduler] Auto-sync completed.');
    } catch (error) {
        console.error('[Scheduler] Critical error in runSync:', error);
    }
}
