import type { CoachHint } from '@/components/ui';
import { strings } from '@/i18n/strings';

const c = strings.coach;

type Guide = { title: string; motion: 'swipe' | 'tap' | 'hold'; hints: CoachHint[] };

/** Guias de gesto da primeira visita (seção 6): cada gesto e a alternativa visível. */
export const COACH_MARKS = {
  meter: {
    title: c.meter.title,
    motion: 'tap',
    hints: [
      { icon: 'pause', text: c.meter.tap },
      { icon: 'move', text: c.meter.drag },
      { icon: 'sliders', text: c.meter.buttons },
    ],
  },
  player: {
    title: c.player.title,
    motion: 'tap',
    hints: [
      { icon: 'clock', text: c.player.doubleTap },
      { icon: 'more-horizontal', text: c.player.menu },
    ],
  },
  session: {
    title: c.session.title,
    motion: 'swipe',
    hints: [
      { icon: 'arrow-left', text: c.session.left },
      { icon: 'arrow-right', text: c.session.right },
      { icon: 'chevrons-right', text: c.session.arrows },
    ],
  },
  routines: {
    title: c.routines.title,
    motion: 'swipe',
    hints: [
      { icon: 'arrow-left', text: c.routines.left },
      { icon: 'arrow-right', text: c.routines.right },
      { icon: 'more-vertical', text: c.routines.menu },
    ],
  },
  recordings: {
    title: c.recordings.title,
    motion: 'swipe',
    hints: [
      { icon: 'arrow-left', text: c.recordings.left },
      { icon: 'arrow-right', text: c.recordings.right },
      { icon: 'check-square', text: c.recordings.hold },
      { icon: 'more-vertical', text: c.recordings.menu },
    ],
  },
  editor: {
    title: c.editor.title,
    motion: 'hold',
    hints: [
      { icon: 'menu', text: c.editor.drag },
      { icon: 'more-vertical', text: c.editor.menu },
    ],
  },
} satisfies Record<string, Guide>;

export type CoachKey = keyof typeof COACH_MARKS;
