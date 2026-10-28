import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { Button, ListGroup, ListRow, Screen, Sheet, Text, TextField } from '@/components/ui';
import { BackupError } from '@/features/data/backupFormat';
import { exportBackup, lastBackupAt, pickBackup, restoreBackup, wipeEverything } from '@/features/data/backupService';
import { strings } from '@/i18n/strings';
import { formatShortDate, formatTime } from '@/lib/dates';
import { useLoader } from '@/lib/useLoader';
import { showSnackbar } from '@/stores/snackbarStore';

const d = strings.settings.data;

const when = (iso: string) => `${formatShortDate(new Date(iso))}, ${formatTime(new Date(iso))}`;

/** Configurações › Dados (seção 10.10, item 7): backup, restauração e apagar tudo. */
export default function DataSettingsScreen() {
  const last = useLoader(lastBackupAt);
  const [busy, setBusy] = useState<'export' | 'import' | 'wipe' | null>(null);
  const [wipeOpen, setWipeOpen] = useState(false);
  const [typed, setTyped] = useState('');

  const doExport = async () => {
    setBusy('export');
    try {
      await exportBackup();
      showSnackbar(d.exported);
      last.refresh();
    } catch {
      showSnackbar(strings.common.genericError);
    } finally {
      setBusy(null);
    }
  };

  const doImport = async () => {
    setBusy('import');
    try {
      const backup = await pickBackup();
      if (!backup) return;
      Alert.alert(d.replaceTitle, d.replaceMessage(when(backup.exportedAt)), [
        { text: strings.common.cancel, style: 'cancel' },
        {
          text: d.replace,
          style: 'destructive',
          onPress: async () => {
            await restoreBackup(backup);
            showSnackbar(d.imported);
            router.dismissTo('/');
          },
        },
      ]);
    } catch (e) {
      if (e instanceof BackupError) showSnackbar(e.problem === 'invalid' ? d.invalid : d.newer);
      else showSnackbar(strings.common.genericError);
    } finally {
      setBusy(null);
    }
  };

  const doWipe = async () => {
    setBusy('wipe');
    try {
      await wipeEverything();
      setWipeOpen(false);
      showSnackbar(d.wiped);
      router.dismissTo('/');
    } finally {
      setBusy(null);
    }
  };

  const lastLabel =
    last.state.status === 'success' && last.state.data ? d.lastBackup(when(last.state.data)) : d.neverBackedUp;

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: d.title }} />
      <ListGroup footer={lastLabel}>
        <ListRow icon="upload-cloud" title={d.export} subtitle={d.exportHint} onPress={busy ? undefined : () => void doExport()} />
        <ListRow
          icon="download-cloud"
          iconColor="target"
          title={d.import}
          subtitle={d.importHint}
          onPress={busy ? undefined : () => void doImport()}
        />
      </ListGroup>
      <ListGroup>
        <ListRow
          icon="trash-2"
          iconColor="danger"
          title={d.wipe}
          subtitle={d.wipeHint}
          onPress={() =>
            Alert.alert(d.wipeTitle, d.wipeHint, [
              { text: strings.common.cancel, style: 'cancel' },
              { text: d.continue, style: 'destructive', onPress: () => setWipeOpen(true) },
            ])
          }
        />
      </ListGroup>

      <Sheet visible={wipeOpen} onClose={() => setWipeOpen(false)} title={d.wipeTitle} snapPoints={['55%']}>
        <Text>{d.wipeMessage}</Text>
        <TextField label={d.wipeField} value={typed} onChangeText={setTyped} autoCapitalize="characters" autoCorrect={false} />
        <Button
          label={d.wipeConfirm}
          icon="trash-2"
          size="main"
          disabled={typed.trim() !== d.wipeWord}
          loading={busy === 'wipe'}
          onPress={() => void doWipe()}
        />
      </Sheet>
    </Screen>
  );
}
