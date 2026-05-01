import { useMemo, useRef, type KeyboardEvent } from "react";

type ImeAwareKeyboardEvent = KeyboardEvent<HTMLElement>;

export function useImeSafeHandlers() {
  const composingRef = useRef(false);

  return useMemo(
    () => ({
      onCompositionStart() {
        composingRef.current = true;
      },
      onCompositionEnd() {
        composingRef.current = false;
      },
      onKeyDownCapture(event: ImeAwareKeyboardEvent) {
        if (event.key !== "Enter") {
          return;
        }
        const nativeEvent = event.nativeEvent as unknown as KeyboardEvent & { isComposing?: boolean; keyCode?: number };
        if (composingRef.current || nativeEvent.isComposing || nativeEvent.keyCode === 229) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
    }),
    [],
  );
}
