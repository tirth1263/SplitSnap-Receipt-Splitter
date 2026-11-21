import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

// Tiny persistence layer. Everything is best-effort: if storage is blocked
// (private browsing, etc.) the app still works, it just forgets.

async function get(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

async function set(key: string, value: string | null) {
  try {
    if (value === null) await AsyncStorage.removeItem(key);
    else await AsyncStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

const KEYS = {
  deviceId: 'splitsnap.deviceId',
  apiKey: 'splitsnap.anthropicKey',
  usage: 'splitsnap.usage',
};

/** Anonymous per-install ID, used by the server to enforce free-scan limits. */
export async function getDeviceId(): Promise<string> {
  const existing = await get(KEYS.deviceId);
  if (existing) return existing;
  const id = Crypto.randomUUID();
  await set(KEYS.deviceId, id);
  return id;
}

export const getApiKey = () => get(KEYS.apiKey);
export const setApiKey = (key: string | null) => set(KEYS.apiKey, key && key.trim() ? key.trim() : null);

export const FREE_SCANS_PER_MONTH = 5;

function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Local mirror of the monthly scan count (the server is the source of truth when deployed). */
export async function getScansUsedThisMonth(): Promise<number> {
  const raw = await get(KEYS.usage);
  if (!raw) return 0;
  try {
    const parsed = JSON.parse(raw) as { month: string; count: number };
    return parsed.month === monthKey() ? parsed.count : 0;
  } catch {
    return 0;
  }
}

export async function setScansUsedThisMonth(count: number) {
  await set(KEYS.usage, JSON.stringify({ month: monthKey(), count }));
}
