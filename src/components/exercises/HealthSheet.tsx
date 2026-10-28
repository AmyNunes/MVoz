import { Notice, Sheet, Text } from '@/components/ui';
import { strings } from '@/i18n/strings';

import { BulletList } from './StepList';

const h = strings.health;

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Título no lugar do padrão (ex.: no "Senti dor · parar"). */
  title?: string;
};

/** Sinais para parar e quando procurar ajuda (seções 14.2 e 14.3). */
export function HealthSheet({ visible, onClose, title = h.stopTitle }: Props) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title} snapPoints={['70%', '95%']}>
      <BulletList items={h.stopSigns} />
      <Text color="textMuted">{h.persist}</Text>
      <Text variant="heading" accessibilityRole="header">
        {h.helpTitle}
      </Text>
      <BulletList items={h.help} />
      <Notice>{h.disclaimer}</Notice>
    </Sheet>
  );
}
