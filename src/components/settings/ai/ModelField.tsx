import { useState } from 'react';
import { View } from 'react-native';

import { listModels, toAIError } from '@/ai/client';
import { Button, Chip, Notice, Text, TextField } from '@/components/ui';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

const s = strings.settings.ai;
const MAX_SHOWN = 12;

type ListState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; models: string[] };

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  onPick: (v: string) => void;
  /** Salva o que estiver pendente antes de consultar o provedor. */
  beforeFetch: () => Promise<void>;
};

/** Campo do modelo com "Escolher da lista": busca os modelos e filtra pelo que você digita. */
export function ModelField({ value, onChangeText, onPick, beforeFetch }: Props) {
  const styles = useStyles();
  const [list, setList] = useState<ListState>({ status: 'idle' });

  const fetchModels = async () => {
    setList({ status: 'loading' });
    try {
      await beforeFetch();
      setList({ status: 'ready', models: await listModels() });
    } catch (error) {
      setList({ status: 'error', message: toAIError(error).messagePt });
    }
  };

  const query = value.trim().toLowerCase();
  const matches =
    list.status === 'ready'
      ? list.models.filter((m) => m.toLowerCase().includes(query)).slice(0, MAX_SHOWN)
      : [];

  return (
    <View style={styles.wrapper}>
      <TextField
        label={s.model}
        value={value}
        onChangeText={onChangeText}
        placeholder={s.modelPlaceholder}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {list.status !== 'ready' && (
        <Button
          label={list.status === 'loading' ? s.loadingModels : s.chooseModel}
          icon="list"
          variant="secondary"
          loading={list.status === 'loading'}
          onPress={fetchModels}
        />
      )}
      {list.status === 'error' && <Notice tone="error">{list.message}</Notice>}
      {list.status === 'ready' && (
        <View style={styles.results}>
          <Text variant="caption" color="textMuted">
            {matches.length ? s.modelsFound(list.models.length) : s.noModelMatch}
          </Text>
          <View style={styles.chips}>
            {matches.map((m) => (
              <Chip
                key={m}
                label={m}
                selected={m === value.trim()}
                onPress={() => {
                  onPick(m);
                  setList({ status: 'idle' });
                }}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrapper: { gap: t.spacing.md },
  results: { gap: t.spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
}));
