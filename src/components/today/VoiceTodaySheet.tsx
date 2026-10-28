import { ChoiceList } from '@/components/guide/ChoiceList';
import { Sheet } from '@/components/ui';
import { strings } from '@/i18n/strings';

const v = strings.today.voice;

type Voice = 'good' | 'tired' | 'hoarse';

type Props = {
  visible: boolean;
  onClose: () => void;
  onAnswer: (voice: Voice) => void;
};

/** "Como está sua voz hoje?" antes do primeiro exercício (seção 10.1). */
export function VoiceTodaySheet({ visible, onClose, onAnswer }: Props) {
  return (
    <Sheet visible={visible} onClose={onClose} title={v.title}>
      <ChoiceList<Voice>
        accessibilityLabel={v.title}
        choices={[
          { value: 'good', label: v.good },
          { value: 'tired', label: v.tired },
          { value: 'hoarse', label: v.hoarse },
        ]}
        selected={[]}
        onToggle={onAnswer}
      />
    </Sheet>
  );
}
