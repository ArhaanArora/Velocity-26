import { useRef, useState } from 'react';
import type { ComponentKind } from '../components/Sidebar';

interface Drag { kind: ComponentKind; startX: number; startY: number; x: number; y: number; active: boolean }

// Pointer capture gives mouse, touch, and pen the same fixed-slot drag behavior.
export function useComponentDrag(onAdd: (kind: ComponentKind) => void) {
  const current = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const [drag, setDrag] = useState<Drag | null>(null);
  function clearHighlights() { document.querySelectorAll('.pointer-drop-target').forEach(element => element.classList.remove('pointer-drop-target')); }
  function cancel() { current.current = null; setDrag(null); clearHighlights(); }
  return {
    drag,
    consumeClick: () => { if (!suppressClick.current) return false; suppressClick.current = false; return true; },
    handlers: (kind: ComponentKind, disabled: boolean) => ({
      onDragStart: (event: React.DragEvent) => event.preventDefault(),
      onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
        suppressClick.current = false;
        if (disabled || event.button !== 0) return;
        current.current = { kind, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, active: false };
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      onPointerMove: (event: React.PointerEvent<HTMLButtonElement>) => {
        const value = current.current;
        if (!value) return;
        const active = value.active || Math.hypot(event.clientX - value.startX, event.clientY - value.startY) > 7;
        current.current = { ...value, x: event.clientX, y: event.clientY, active };
        if (!active) return;
        setDrag(current.current);
        clearHighlights();
        const slot = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-drop-slot]');
        if (slot?.getAttribute('data-drop-slot') === kind) slot.classList.add('pointer-drop-target');
      },
      onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => {
        const value = current.current;
        if (value?.active) {
          suppressClick.current = true;
          const slot = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-drop-slot]');
          if (slot?.getAttribute('data-drop-slot') === kind) onAdd(kind);
        }
        cancel();
      },
      onPointerCancel: cancel,
      onLostPointerCapture: cancel,
    }),
  };
}
