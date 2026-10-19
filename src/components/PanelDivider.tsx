import { useRef } from 'react';

export function PanelDivider({ index }: { index: 0 | 1 }) {
  const drag = useRef<{ x: number; widths: number[] } | null>(null);
  function widths(element: HTMLElement) {
    return Array.from(element.parentElement!.children)
      .filter(child => child.matches('.sidebar, .network-workspace, .live-store-column'))
      .map(child => child.getBoundingClientRect().width);
  }
  function resize(element: HTMLElement, current: number[], delta: number) {
    const minimum = [200, 320, 280];
    const change = Math.max(minimum[index] - current[index], Math.min(current[index + 1] - minimum[index + 1], delta));
    const next = [...current];
    next[index] += change;
    next[index + 1] -= change;
    element.parentElement!.style.setProperty('--workspace-columns', `minmax(200px, ${next[0]}fr) 16px minmax(320px, ${next[1]}fr) 16px minmax(280px, ${next[2]}fr)`);
    element.setAttribute('aria-valuenow', String(Math.round(next[index] / (next[index] + next[index + 1]) * 100)));
  }
  return <div className="panel-divider" role="separator" aria-orientation="vertical" aria-label={index === 0 ? 'Resize controls and infrastructure' : 'Resize infrastructure and Nova Store'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={50} tabIndex={0}
    title="Drag to resize. Arrow keys adjust. Double-click to reset."
    onPointerDown={event => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { x: event.clientX, widths: widths(event.currentTarget) };
      event.currentTarget.classList.add('resizing');
    }}
    onPointerMove={event => { if (drag.current) resize(event.currentTarget, drag.current.widths, event.clientX - drag.current.x); }}
    onPointerUp={event => { drag.current = null; event.currentTarget.classList.remove('resizing'); }}
    onPointerCancel={event => { drag.current = null; event.currentTarget.classList.remove('resizing'); }}
    onDoubleClick={event => event.currentTarget.parentElement!.style.removeProperty('--workspace-columns')}
    onKeyDown={event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      resize(event.currentTarget, widths(event.currentTarget), event.key === 'ArrowRight' ? 20 : -20);
    }}><span /></div>;
}
