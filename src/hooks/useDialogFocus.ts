import { useEffect, useRef } from 'react';

export function useDialogFocus() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () => Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]') ?? []);
    focusable()[0]?.focus();
    function trap(event: KeyboardEvent) {
      if (event.key !== 'Tab') return;
      const items = focusable();
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    const dialog = ref.current;
    dialog?.addEventListener('keydown', trap);
    return () => {
      document.body.style.overflow = overflow;
      dialog?.removeEventListener('keydown', trap);
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  return ref;
}
