import { useRef, useState } from 'react';
import { importProgress, readAllProgress } from '../db/actions';
import { BackupError, MAX_BACKUP_BYTES, backupFileName, buildBackup, describeBackup, parseBackup, type Backup } from '../db/backup';

/** Descargar e importar una copia del progreso (todo vive solo en este navegador). */
export function BackupPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Backup | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function download() {
    setError('');
    const backup = buildBackup(await readAllProgress());
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFileName();
    a.click();
    URL.revokeObjectURL(url);
    setMessage(`Copia descargada: ${describeBackup(backup)}.`);
  }

  async function choose(file: File | undefined) {
    setMessage('');
    setError('');
    setPending(null);
    if (!file) return;
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new BackupError('El fichero es demasiado grande para ser una copia de Sign.');
      setPending(parseBackup(await file.text()));
    } catch (e) {
      setError(e instanceof BackupError ? e.message : 'No se pudo leer el fichero. Vuelve a intentarlo.');
    } finally {
      if (fileRef.current) fileRef.current.value = ''; // permite elegir el mismo fichero otra vez
    }
  }

  async function confirmImport() {
    if (!pending) return;
    setBusy(true);
    try {
      await importProgress(pending);
      setMessage('Copia importada y combinada con el progreso de este dispositivo.');
      setPending(null);
    } catch {
      setError('No se pudo guardar la copia en este navegador. No se ha cambiado nada; vuelve a intentarlo.');
    } finally {
      setBusy(false);
    }
  }

  const exportedOn = pending?.exportedAt
    ? new Date(pending.exportedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return (
    <section className="backup" aria-labelledby="backup-title">
      <h2 id="backup-title">Tu progreso</h2>
      <p className="muted">
        Se guarda solo en este navegador. Descarga una copia para pasarlo a otro dispositivo o no perderlo si
        borras los datos del navegador.
      </p>
      <div className="actions">
        <button type="button" className="button" onClick={download}>Descargar copia</button>
        <button type="button" className="button" onClick={() => fileRef.current?.click()}>Importar copia…</button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="visually-hidden"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => void choose(e.target.files?.[0])}
        />
      </div>

      {pending && (
        <div className="backup-confirm">
          <p>
            Copia{exportedOn && <> del {exportedOn}</>}: {describeBackup(pending)}. Se combinará con lo que ya hay
            aquí, sin borrar nada: de cada signo se queda el repaso más reciente.
          </p>
          <div className="actions">
            <button type="button" className="button primary" disabled={busy} onClick={confirmImport} autoFocus>
              Importar y combinar
            </button>
            <button type="button" className="button" disabled={busy} onClick={() => setPending(null)}>Cancelar</button>
          </div>
        </div>
      )}
      <p role="status" className="backup-status">{message}</p>
      <p role="alert" className="backup-error">{error}</p>
    </section>
  );
}
