import { db, type SettingRow } from '../db'

export async function getSetting<T>(key: string, fallback?: T): Promise<T | undefined> {
  const value = await db.settings.get(key)
  return (value?.value as T | undefined) ?? fallback
}

export async function setSetting<T>(key: string, value: T): Promise<SettingRow> {
  const row: SettingRow = { key, value: value as SettingRow['value'] }
  await db.settings.put(row)
  return row
}

export async function removeSetting(key: string) {
  await db.settings.delete(key)
}

export async function storageStatus() {
  if (!('storage' in navigator)) {
    return { supported: false, persisted: false }
  }

  const storage = navigator.storage
  const persisted = await storage.persisted().catch(() => false)
  return { supported: typeof storage.persist === 'function', persisted }
}

export async function persistStorage() {
  if (!('storage' in navigator) || typeof navigator.storage.persist !== 'function') {
    return false
  }

  await navigator.storage.persist()
  return navigator.storage.persisted().catch(() => false)
}
