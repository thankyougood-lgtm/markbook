import type { Backup } from '../db/repositories/backup';

export function backupFileName(prefix: string, date = new Date()): string {
  const stamp = date.toISOString().replace(/[:.]/g, '-');
  return `${prefix}_${stamp}.json`;
}

/** A real file download, not server storage. Revocation is delayed for Safari. */
export function downloadBackup(backup: Backup, filename: string): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
