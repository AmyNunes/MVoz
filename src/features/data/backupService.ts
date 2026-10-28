import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { clearApiKey } from '@/ai/keyStore';
import { dumpTables, replaceTables, schemaVersion, wipeAllTables } from '@/db/backupRepo';
import { readAllSettings, writeSetting } from '@/db/settingsRepo';
import { emitAppEvent } from '@/features/app/events';
import { deleteAllRecordingFiles } from '@/features/recordings/files';
import { strings } from '@/i18n/strings';
import { useProfile } from '@/stores/profileStore';
import { useSettings } from '@/stores/settingsStore';

import { backupFileName, buildBackupJson, parseBackup, stripSecrets, type Backup } from './backupFormat';

const LAST_BACKUP_KEY = 'lastBackupAt';

/** Exporta tudo para um JSON (sem a chave da IA, sem o cache e sem os áudios) e abre o "Compartilhar". */
export async function exportBackup(): Promise<void> {
  const json = buildBackupJson(stripSecrets(await dumpTables()), await schemaVersion());
  const file = new File(Paths.cache, backupFileName());
  if (file.exists) file.delete();
  file.create();
  file.write(json);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: strings.settings.data.shareTitle });
  await writeSetting(LAST_BACKUP_KEY, new Date().toISOString());
}

/** Escolhe e valida um arquivo de backup. `null` = a pessoa cancelou. */
export async function pickBackup(): Promise<Backup | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', '*/*'], copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.[0]) return null;
  const text = await new File(result.assets[0].uri).text();
  return parseBackup(text, await schemaVersion());
}

async function afterDataChange(): Promise<void> {
  await Promise.all([useSettings.getState().load(), useProfile.getState().load()]);
  emitAppEvent('dataReplaced');
}

/** "Substituir tudo?" → sim. */
export async function restoreBackup(backup: Backup): Promise<void> {
  await replaceTables(backup.tables);
  await afterDataChange();
}

/** "Apagar tudo": dados, configurações, gravações e a chave da IA (seção 13). */
export async function wipeEverything(): Promise<void> {
  await wipeAllTables();
  await clearApiKey();
  deleteAllRecordingFiles();
  await afterDataChange();
}

export async function lastBackupAt(): Promise<string | null> {
  const raw = (await readAllSettings())[LAST_BACKUP_KEY];
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return typeof value === 'string' ? value : null;
  } catch {
    return null;
  }
}
