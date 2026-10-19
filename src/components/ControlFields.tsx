import { useId } from 'react';
import type { CSSProperties } from 'react';

export function RangeField({ label, ariaLabel, value, min = 0, max, step = 1, unit, description, disabled, onChange }: {
  label: string; ariaLabel?: string; value: number; min?: number; max: number; step?: number;
  unit: string; description: string; disabled?: boolean; onChange: (value: number) => void;
}) {
  const id = useId();
  return <label className="range-field">
    <span className="range-label"><span>{label}</span><strong>{value.toLocaleString()}<small> {unit}</small></strong></span>
    <input type="range" aria-label={ariaLabel ?? label} aria-describedby={id} min={min} max={max} step={step} value={value} disabled={disabled}
      onChange={event => onChange(Number(event.target.value))} style={{ '--range-fill': `${(value - min) / (max - min) * 100}%` } as CSSProperties} />
    <span id={id} className="field-description">{description}</span>
  </label>;
}

export function ToggleField({ label, enabled, disabled, onChange }: { label: string; enabled: boolean; disabled?: boolean; onChange: () => void }) {
  return <button className={`toggle-row ${enabled ? 'enabled' : ''}`} role="switch" aria-checked={enabled} disabled={disabled} onClick={onChange}>
    <span>{label}</span><span className="toggle"><i /></span>
  </button>;
}

export function ServerStepper({ count, disabled, onChange }: { count: number; disabled?: boolean; onChange: (count: number) => void }) {
  return <div className="count-field"><span>Servers</span><div className="stepper">
    <button aria-label="Remove one server" disabled={disabled || count <= 1} onClick={() => onChange(count - 1)}>−</button>
    <output aria-label="Server count">{count}</output>
    <button aria-label="Add one server" disabled={disabled || count >= 6} onClick={() => onChange(count + 1)}>+</button>
  </div></div>;
}
