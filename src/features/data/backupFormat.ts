import { z } from 'zod';

export const BACKUP_APP = 'mvoz';
export const BACKUP_FORMAT = 1;

export const backupSchema = z.object({
  app: z.literal(BACKUP_APP),
  format: z.number().int(),
  /** `PRAGMA user_version` de quem exportou. */
  schemaVersion: z.number().int(),
  exportedAt: z.string(),
  tables: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
});
export type Backup = z.infer<typeof backupSchema>;

export type BackupProblem = 'invalid' | 'newerFormat' | 'newerSchema';

export class BackupError extends Error {
  constructor(readonly problem: BackupProblem) {
    super(problem);
    this.name = 'BackupError';
  }
}

export function buildBackupJson(tables: Backup['tables'], schemaVersion: number, now = new Date()): string {
  const backup: Backup = { app: BACKUP_APP, format: BACKUP_FORMAT, schemaVersion, exportedAt: now.toISOString(), tables };
  return JSON.stringify(backup);
}

/**
 * Valida um arquivo de backup antes de importar (seção 13).
 * Backup de um app mais novo que este não é importado.
 */
export function parseBackup(text: string, currentSchema: number): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('invalid');
  }
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) throw new BackupError('invalid');
  if (parsed.data.format > BACKUP_FORMAT) throw new BackupError('newerFormat');
  if (parsed.data.schemaVersion > currentSchema) throw new BackupError('newerSchema');
  return parsed.data;
}

/** Garante que nada parecido com a chave da IA vá para o arquivo. */
export function stripSecrets(tables: Backup['tables']): Backup['tables'] {
  const out: Backup['tables'] = {};
  for (const [name, rows] of Object.entries(tables)) {
    out[name] = rows.filter((row) => !(name === 'settings' && /key|secret|token/i.test(String(row.key ?? ''))));
  }
  return out;
}

export function backupFileName(now = new Date()): string {
  const d = now.toISOString().slice(0, 10);
  return `mvoz-backup-${d}.json`;
}
