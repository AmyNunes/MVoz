import { BackupError, backupFileName, buildBackupJson, parseBackup, stripSecrets } from '../backupFormat';

describe('backup', () => {
  const tables = { settings: [{ key: 'training', value: '{}' }, { key: 'apiKey', value: 'segredo' }], recordings: [{ id: 'r1' }] };

  it('ida e volta, sem nada parecido com chave', () => {
    const json = buildBackupJson(stripSecrets(tables), 6, new Date('2026-10-27T10:00:00Z'));
    expect(json).not.toMatch(/segredo/);
    const backup = parseBackup(json, 6);
    expect(backup.app).toBe('mvoz');
    expect(backup.tables.recordings).toEqual([{ id: 'r1' }]);
  });

  it('recusa arquivo inválido ou de versão mais nova', () => {
    expect(() => parseBackup('não é json', 6)).toThrow(BackupError);
    expect(() => parseBackup(JSON.stringify({ app: 'meu-ingles', format: 1, schemaVersion: 1, exportedAt: 'x', tables: {} }), 6)).toThrow(BackupError);
    const newer = buildBackupJson({}, 9);
    expect(() => parseBackup(newer, 6)).toThrow(expect.objectContaining({ problem: 'newerSchema' }));
  });

  it('nome do arquivo com a data', () => {
    expect(backupFileName(new Date('2026-10-27T10:00:00Z'))).toBe('mvoz-backup-2026-10-27.json');
  });
});
