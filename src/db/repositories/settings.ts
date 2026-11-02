import { db, type SettingRow } from '../schema';

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row: SettingRow | undefined = await db.settings.get(key);
  return row === undefined ? fallback : (row.value as T);
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value });
}
