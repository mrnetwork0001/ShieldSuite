import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { ScanResult, PaymentReceipt } from "./types.js";
import { logger } from "./logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_DIR = path.resolve(__dirname, "../data");
const DB_FILE = path.join(DB_DIR, "database.json");

export interface DatabaseState {
  totalLifetimeScans: number;
  scans: ScanResult[];
  verifiedPayments?: Record<string, PaymentReceipt>;
  activeNonces?: Record<string, { nonce: string; createdAt: number }>;
}

// ─── Database Initialize ─────────────────────────────────────────────────────

export async function loadDatabase(): Promise<DatabaseState> {
  try {
    await fs.mkdir(DB_DIR, { recursive: true });

    try {
      const data = await fs.readFile(DB_FILE, "utf-8");
      if (data.trim() === "") throw new Error("Empty file");
      const parsed = JSON.parse(data) as DatabaseState;
      if (!parsed.verifiedPayments) parsed.verifiedPayments = {};
      if (!parsed.activeNonces) parsed.activeNonces = {};
      logger.info(`[DB] Loaded ${parsed.scans.length} scans from disk.`);
      return parsed;
    } catch (err: any) {
      if (err.code !== "ENOENT") {
        logger.warn(`[DB] Database file corrupt or unreadable, starting fresh.`);
      } else {
        logger.info(`[DB] No existing database found. Starting fresh.`);
      }
      return { totalLifetimeScans: 0, scans: [], verifiedPayments: {}, activeNonces: {} };
    }
  } catch (err: any) {
    logger.error(`[DB] Failed to initialize database: ${err.message}`);
    return { totalLifetimeScans: 0, scans: [], verifiedPayments: {}, activeNonces: {} };
  }
}

// ─── Database Persist ────────────────────────────────────────────────────────

let isWriting = false;
let pendingWrite = false;

/** Set state and trigger background write */
export async function saveDatabase(state: DatabaseState): Promise<void> {
  // If already writing, just mark pending and return; prevents concurrency locks
  if (isWriting) {
    pendingWrite = true;
    return;
  }
  isWriting = true;

  try {
    const jsonStr = JSON.stringify(state, null, 2);
    // Write to a temporary file then rename for atomic safety
    const tempFile = `${DB_FILE}.tmp`;
    await fs.writeFile(tempFile, jsonStr, "utf-8");
    await fs.rename(tempFile, DB_FILE);
  } catch (err: any) {
    logger.error(`[DB] Failed to save database: ${err.message}`);
  } finally {
    isWriting = false;
    // If another save was fired while we were writing, run again
    if (pendingWrite) {
      pendingWrite = false;
      saveDatabase(state).catch(() => {});
    }
  }
}
