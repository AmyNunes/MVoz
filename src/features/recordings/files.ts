import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Arquivos das gravações (seção 7.5): WAV em `documentos/recordings/`. O banco guarda o caminho
 * relativo, para continuar válido se a pasta do app mudar.
 */
const FOLDER = 'recordings';

export function newRecordingFile(id: string): { file: File; relative: string } {
  new Directory(Paths.document, FOLDER).create({ intermediates: true, idempotent: true });
  const relative = `${FOLDER}/${id}.wav`;
  return { file: new File(Paths.document, relative), relative };
}

export function recordingFile(relative: string): File {
  return new File(Paths.document, relative);
}

/** Apaga o arquivo, se ainda existir. */
export function deleteRecordingFile(relative: string): void {
  const file = recordingFile(relative);
  if (file.exists) file.delete();
}

/** "Compartilhar": a única forma de o áudio sair do aparelho, sempre por escolha minha. */
export async function shareRecordingFile(relative: string, dialogTitle: string): Promise<void> {
  await Sharing.shareAsync(recordingFile(relative).uri, { mimeType: 'audio/wav', dialogTitle });
}

/** "Apagar tudo": apaga a pasta das gravações inteira. */
export function deleteAllRecordingFiles(): void {
  const folder = new Directory(Paths.document, FOLDER);
  if (folder.exists) folder.delete();
}
