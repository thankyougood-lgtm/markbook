import { db, type SettingRow } from '../db'
import { ETHIOPIAN_GRADE_BANDS, type GradeBand } from '../../lib/grades'

const KEY_TEACHER_NAME = 'teacherName'
const KEY_GRADE_BANDS = 'gradeBands'

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

// ─── Teacher name ───────────────────────────────────────────────────────
export async function getTeacherName(): Promise<string> {
  const v = await getSetting<string>(KEY_TEACHER_NAME, '')
  return v ?? ''
}

export async function setTeacherName(name: string): Promise<void> {
  await setSetting(KEY_TEACHER_NAME, name.trim())
}

// ─── Grade bands ────────────────────────────────────────────────────────
export async function getGradeBands(): Promise<GradeBand[]> {
  const v = await getSetting<GradeBand[]>(KEY_GRADE_BANDS)
  if (Array.isArray(v) && v.length > 0) return v
  return ETHIOPIAN_GRADE_BANDS
}

export async function setGradeBands(bands: GradeBand[]): Promise<void> {
  await setSetting(KEY_GRADE_BANDS, bands)
}

// ─── Storage ────────────────────────────────────────────────────────────
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
