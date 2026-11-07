import { useEffect, useRef, useState } from 'react';
import { Button } from '../components/Button';
import Sheet from '../components/Sheet';
import { usePreferences } from '../state/usePreferences';
import { setLang, type Lang } from '../i18n';
import { setTheme } from '../state/preferences';
import { getSelectedClassId, getSelectedSemester, setSelectedClassId, setSelectedSemester } from '../state/selection';
import { backupCounts, createBackup, restoreBackup, validateBackup, type Backup, type BackupPreferences } from '../db/repositories/backup';
import { backupFileName, downloadBackup } from '../settings/download';
import { APP_VERSION } from '../version';

type StorageState = 'checking' | 'granted' | 'not-granted' | 'unavailable';
const MAX_FILE_BYTES = 25 * 1024 * 1024;

export default function Settings({ onRestored, section }: { onRestored: () => void; section?: 'backup' | 'about' | null }) {
  const { tr, lang, theme } = usePreferences();
  const s = tr.settings;
  const [storage, setStorage] = useState<StorageState>('checking');
  const [storageBusy, setStorageBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [preview, setPreview] = useState<Backup | null>(null);
  const [busy, setBusy] = useState<'backup' | 'restore' | 'reading' | null>(null);
  const [usage, setUsage] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    void (async () => {
      try {
        if (!navigator.storage?.persisted) { if (mounted.current) setStorage('unavailable'); return; }
        const persisted = await navigator.storage.persisted();
        if (mounted.current) setStorage(persisted ? 'granted' : 'not-granted');
        if (navigator.storage.estimate) {
          const estimate = await navigator.storage.estimate();
          if (mounted.current) setUsage(estimate.usage ?? null);
        }
      } catch { if (mounted.current) setStorage('unavailable'); }
    })();
    return () => { mounted.current = false; };
  }, []);

  const preferences = (): BackupPreferences => ({ language: lang, theme, classId: getSelectedClassId(), semester: getSelectedSemester() });
  const saveBackup = async () => {
    if (busy) return;
    setBusy('backup');
    setMessage(null);
    try {
      const backup = await createBackup(preferences());
      downloadBackup(backup, backupFileName('MarkBook-backup'));
      setMessage({ kind: 'success', text: s.backupStarted });
    } catch { setMessage({ kind: 'error', text: s.backupFailed }); }
    finally { if (mounted.current) setBusy(null); }
  };

  useEffect(() => {
    if (section) document.getElementById(section)?.scrollIntoView({ block: 'start' });
  }, [section]);

  const readFile = async (file: File | undefined) => {
    if (!file || busy) return;
    setMessage(null);
    if (file.size > MAX_FILE_BYTES) { setMessage({ kind: 'error', text: s.fileTooLarge }); return; }
    setBusy('reading');
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const valid = validateBackup(parsed);
      setPreview(valid);
    } catch { setMessage({ kind: 'error', text: s.invalidFile }); }
    finally {
      if (mounted.current) setBusy(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const confirmRestore = async () => {
    if (!preview || busy) return;
    setBusy('restore');
    setMessage(null);
    try {
      // Safety export happens BEFORE the first destructive write. If it fails,
      // restoreBackup is never called. Keep the dialog open until completion.
      const safety = await createBackup(preferences());
      downloadBackup(safety, backupFileName('MarkBook-before-restore'));
      await restoreBackup(preview);
      const p = preview.preferences;
      setSelectedClassId(p.classId);
      setSelectedSemester(p.semester);
      setTheme(p.theme);
      setLang(p.language);
      setPreview(null);
      onRestored();
    } catch { setMessage({ kind: 'error', text: s.restoreFailed }); }
    finally { if (mounted.current) setBusy(null); }
  };

  const requestPersistence = async () => {
    if (!navigator.storage?.persist || storageBusy) return;
    setStorageBusy(true);
    try {
      const granted = await navigator.storage.persist();
      setStorage(granted ? 'granted' : 'not-granted');
      setMessage({ kind: granted ? 'success' : 'error', text: granted ? s.storageGranted : s.storageNotGranted });
    } catch { setMessage({ kind: 'error', text: s.storageNotGranted }); }
    finally { setStorageBusy(false); }
  };

  const storageLabel = storage === 'checking' ? s.checking : storage === 'granted' ? s.storageGranted : storage === 'not-granted' ? s.storageNotGranted : s.storageUnavailable;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-6 pt-3" data-testid="settings-page">
      <h1 className="text-xl font-semibold text-navy">{s.title}</h1>
      <p className="mt-1 text-xs text-muted">{s.subtitle}</p>
      {message && <p role={message.kind === 'error' ? 'alert' : 'status'} className={`mt-4 rounded-btn border bg-surface p-3 text-sm ${message.kind === 'error' ? 'border-danger text-danger' : 'border-success text-success'}`}>{message.text}</p>}

      <div className="mt-5 space-y-4">
        <section className="rounded-card bg-surface p-5 shadow-soft" aria-labelledby="appearance-heading">
          <h2 id="appearance-heading" className="text-sm font-semibold text-navy">{s.appearance}</h2>
          <div className="mt-3 flex min-h-[44px] items-center justify-between gap-4">
            <div><p className="text-sm font-medium text-navy">{s.darkMode}</p><p className="mt-1 text-xs text-muted">{s.darkModeBody}</p></div>
            <button type="button" role="switch" aria-checked={theme === 'dark'} aria-label={s.darkMode} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className={`relative h-11 w-16 shrink-0 rounded-pill p-1 ${theme === 'dark' ? 'bg-accent' : 'bg-line'}`}>
              <span className={`block h-9 w-9 rounded-full bg-surface shadow-soft transition-transform ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          <label className="mt-5 block text-sm font-medium text-navy" htmlFor="settings-language">{s.language}
            <select id="settings-language" value={lang} onChange={(e) => setLang(e.target.value as Lang)} className="mt-2 block min-h-[44px] w-full rounded-btn border border-line bg-surface px-3 text-sm text-navy">
              <option value="en">English</option><option value="am">አማርኛ</option><option value="om">Afan Oromo</option>
            </select>
          </label>
        </section>

        <section id="backup" className="rounded-card bg-surface p-5 shadow-soft" aria-labelledby="backup-heading">
          <h2 id="backup-heading" className="text-sm font-semibold text-navy">{s.backupTitle}</h2>
          <p className="mt-2 text-xs leading-relaxed text-muted">{s.backupBody}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => void saveBackup()} disabled={busy !== null}>{busy === 'backup' ? s.backingUp : s.downloadBackup}</Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={busy !== null}>{busy === 'reading' ? s.reading : s.chooseRestore}</Button>
          </div>
          <input ref={fileRef} type="file" accept=".json,application/json" aria-label={s.chooseRestore} className="hidden" onChange={(e) => void readFile(e.target.files?.[0])} />
          <p className="mt-3 text-xs text-muted">{s.restoreSafety}</p>
        </section>

        <section className="rounded-card bg-surface p-5 shadow-soft" aria-labelledby="storage-heading">
          <h2 id="storage-heading" className="text-sm font-semibold text-navy">{s.storageTitle}</h2>
          <p className={`mt-2 text-sm ${storage === 'granted' ? 'text-success' : 'text-muted'}`} role="status">{storageLabel}</p>
          {usage !== null && <p className="mt-1 text-xs text-muted">{s.storageUsed}: {(usage / (1024 * 1024)).toFixed(2)} MB</p>}
          <p className="mt-2 text-xs leading-relaxed text-muted">{s.storageBody}</p>
          {storage === 'not-granted' && <Button variant="secondary" className="mt-3" disabled={storageBusy} onClick={() => void requestPersistence()}>{s.requestStorage}</Button>}
        </section>

        <section id="about" className="rounded-card bg-surface p-5 shadow-soft" aria-labelledby="about-heading">
          <h2 id="about-heading" className="text-sm font-semibold text-navy">{s.about}</h2>
          <p className="mt-2 text-base font-semibold text-navy">{tr.appName}</p>
          <p className="mt-1 text-xs text-muted">{s.version}: {APP_VERSION}</p>
          <p className="mt-3 text-xs leading-relaxed text-muted">{s.offlineNote}</p>
        </section>
      </div>

      {preview && <Sheet title={s.previewTitle} onClose={() => { if (busy !== 'restore') setPreview(null); }}>
        <div className="max-h-[65vh] overflow-y-auto">
          <p className="text-xs text-muted">{s.previewBody}</p>
          <table className="mt-3 w-full text-sm" data-testid="restore-preview">
            <thead><tr className="border-b border-line text-xs text-muted"><th className="py-2 text-left">{s.table}</th><th className="py-2 text-right">{s.records}</th></tr></thead>
            <tbody>{backupCounts(preview).map(({ name, count }) => <tr key={name} className="border-b border-line text-navy"><td className="py-2">{s.tableNames[name]}</td><td className="py-2 text-right tabular-nums">{count}</td></tr>)}</tbody>
          </table>
          <p className="mt-4 rounded-btn bg-header-bg p-3 text-xs leading-relaxed text-navy">{s.replaceWarning}</p>
          {message?.kind === 'error' && <p role="alert" className="mt-3 text-sm text-danger">{message.text}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => void confirmRestore()} disabled={busy !== null}>{busy === 'restore' ? s.restoring : s.confirmRestore}</Button>
            <Button variant="secondary" onClick={() => setPreview(null)} disabled={busy === 'restore'}>{tr.common.cancel}</Button>
          </div>
        </div>
      </Sheet>}
    </div>
  );
}
