import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useRef } from 'react';

/**
 * Liga um `BottomSheetModal` a um `visible`.
 *
 * Cuidado com o @gorhom/bottom-sheet: `dismiss()` numa folha que nunca abriu deixa
 * ela presa em "fechando", e o `present()` seguinte não mostra nada. Por isso só
 * pedimos para fechar o que foi aberto, e lembramos quando a folha fecha sozinha
 * (arrastar para baixo, X, Voltar).
 */
export function useModalSheet(visible: boolean, onDismissed: () => void) {
  const ref = useRef<BottomSheetModal>(null);
  const shown = useRef(false);

  useEffect(() => {
    if (visible && !shown.current) {
      shown.current = true;
      ref.current?.present();
    } else if (!visible && shown.current) {
      shown.current = false;
      ref.current?.dismiss();
    }
  }, [visible]);

  const onDismiss = () => {
    shown.current = false;
    onDismissed();
  };

  const dismiss = useCallback(() => ref.current?.dismiss(), []);

  return { ref, onDismiss, dismiss };
}
