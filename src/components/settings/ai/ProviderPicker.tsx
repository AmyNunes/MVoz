import { View } from 'react-native';

import { Card, Chip } from '@/components/ui';
import { PROVIDER_IDS, PROVIDERS, type ProviderId } from '@/ai/providers';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

type Props = {
  value: ProviderId;
  onChange: (provider: ProviderId) => void;
};

export function ProviderPicker({ value, onChange }: Props) {
  const styles = useStyles();

  return (
    <Card title={strings.settings.ai.provider}>
      <View style={styles.chips}>
        {PROVIDER_IDS.map((id) => (
          <Chip
            key={id}
            label={PROVIDERS[id].label}
            selected={id === value}
            onPress={() => id !== value && onChange(id)}
          />
        ))}
      </View>
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
}));
