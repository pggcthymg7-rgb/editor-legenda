import React, { useEffect, useState } from 'react';
import { fontDef } from '../../core/fonts';
import { FontPicker } from './FontPicker';
import type { Fill, TextStyle } from '../../core/types';

type Props = { style: TextStyle; onChange: (patch: Partial<TextStyle>) => void; sample?: string };

/** Aceita só cores simples (#hex / rgba) — vão para CSS inline. */
const safeColor = (c: string) => (/^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\))$/i.test(c.trim()) ? c.trim() : null);

const toHex = (c: string) => {
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  if (/^#[0-9a-f]{3}$/i.test(c)) return '#' + c.slice(1).replace(/./g, (x) => x + x);
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b] = m[1].split(',').map((x) => parseInt(x));
    return '#' + [r, g, b].map((n) => (n || 0).toString(16).padStart(2, '0')).join('');
  }
  return '#ffffff';
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Se a cor anterior era rgba(..., a) com alfa < 1, preserva o alfa ao escolher nova cor hex no seletor nativo. */
const applyHexKeepingAlpha = (hex: string, prev: string): string => {
  const m = prev.match(/^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)$/i);
  if (!m) return hex;
  const a = Number(m[1]);
  if (!Number.isFinite(a) || a >= 1) return hex;
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return `rgba(${r},${g},${b},${a})`;
};

const Num: React.FC<{ label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }> = ({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}) => {
  const [draft, setDraft] = useState<string | null>(null);
  useEffect(() => {
    setDraft((d) => (d !== null && d.trim() !== '' && Number(d) === value ? d : null));
  }, [value]);
  const commit = (raw: string | null) => {
    if (raw !== null && raw.trim() !== '') {
      const n = Number(raw);
      if (Number.isFinite(n)) onChange(clamp(n, min, max));
    }
    setDraft(null);
  };
  return (
    <label className="field">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(clamp(Number(e.target.value), min, max))} />
      <input
        type="number"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={draft ?? Number(value.toFixed(3))}
        onChange={(e) => {
          const raw = e.target.value;
          setDraft(raw);
          if (raw.trim() === '') return;
          const n = Number(raw);
          if (Number.isFinite(n) && n >= min && n <= max) onChange(n);
        }}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
    </label>
  );
};

const Color: React.FC<{ value: string; onChange: (v: string) => void; ariaLabel?: string }> = ({ value, onChange, ariaLabel = 'Cor' }) => (
  <input
    type="color"
    aria-label={ariaLabel}
    value={toHex(value)}
    onChange={(e) => {
      const next = safeColor(e.target.value);
      if (next) onChange(applyHexKeepingAlpha(next, value));
    }}
  />
);

export const StyleEditor: React.FC<Props> = ({ style, onChange, sample }) => {
  const fill = style.fill;
  const setFill = (f: Fill) => onChange({ fill: f });
  return (
    <div className="style-editor">
      <div className="field">
        <span>Fonte</span>
        <div className="field-wide">
          <FontPicker
            value={style.fontFamily}
            sample={sample}
            onChange={(k) => {
              // ajusta o peso para a faixa que a fonte tem
              const [lo, hi] = fontDef(k).weights;
              onChange({ fontFamily: k, fontWeight: Math.min(hi, Math.max(lo, style.fontWeight)) });
            }}
          />
        </div>
      </div>
      <Num label="Tamanho" value={style.fontSize} min={16} max={500} onChange={(v) => onChange({ fontSize: v })} />
      <Num
        label="Peso"
        value={style.fontWeight}
        min={fontDef(style.fontFamily).weights[0]}
        max={Math.max(fontDef(style.fontFamily).weights[1], fontDef(style.fontFamily).weights[0] + 1)}
        step={fontDef(style.fontFamily).weights[0] === fontDef(style.fontFamily).weights[1] ? 1 : 50}
        onChange={(v) => onChange({ fontWeight: v })}
      />
      <Num label="Espaçamento" value={style.letterSpacing} min={-0.15} max={0.5} step={0.01} onChange={(v) => onChange({ letterSpacing: v })} />
      <Num label="Opacidade" value={style.opacity} min={0} max={1} step={0.05} onChange={(v) => onChange({ opacity: v })} />
      <div className="row">
        <label>
          <input type="checkbox" checked={style.italic} onChange={(e) => onChange({ italic: e.target.checked })} /> Itálico
        </label>
        <label>
          <input type="checkbox" checked={style.uppercase} onChange={(e) => onChange({ uppercase: e.target.checked })} /> CAIXA ALTA
        </label>
      </div>

      <div className="sub">
        <div className="row">
          <strong>Cor</strong>
          <select
            value={fill.type}
            onChange={(e) =>
              setFill(
                e.target.value === 'solid'
                  ? { type: 'solid', color: fill.type === 'solid' ? fill.color : fill.colors[0] }
                  : { type: 'gradient', colors: fill.type === 'gradient' ? fill.colors : [fill.color, '#A98BFF'], angle: 180 },
              )
            }
          >
            <option value="solid">Sólida</option>
            <option value="gradient">Degradê</option>
          </select>
        </div>
        {fill.type === 'solid' ? (
          <Color value={fill.color} onChange={(c) => setFill({ type: 'solid', color: c })} />
        ) : (
          <>
            <div className="row">
              {fill.colors.map((c, i) => (
                <Color key={i} value={c} onChange={(v) => setFill({ ...fill, colors: fill.colors.map((x, j) => (j === i ? v : x)) })} />
              ))}
              {fill.colors.length < 5 && <button onClick={() => setFill({ ...fill, colors: [...fill.colors, '#ffffff'] })}>+</button>}
              {fill.colors.length > 2 && <button onClick={() => setFill({ ...fill, colors: fill.colors.slice(0, -1) })}>−</button>}
            </div>
            <Num label="Ângulo" value={fill.angle} min={0} max={360} onChange={(v) => setFill({ ...fill, angle: v })} />
          </>
        )}
      </div>

      <div className="sub">
        <label>
          <input
            type="checkbox"
            checked={!!style.glow}
            onChange={(e) => onChange({ glow: e.target.checked ? { color: '#FF3FD8', blur: 30 } : null })}
          />{' '}
          <strong>Brilho (glow)</strong>
        </label>
        {style.glow && (
          <div className="row">
            <Color value={style.glow.color} onChange={(c) => onChange({ glow: { ...style.glow!, color: c } })} />
            <Num label="Raio" value={style.glow.blur} min={0} max={100} onChange={(v) => onChange({ glow: { ...style.glow!, blur: v } })} />
          </div>
        )}
      </div>

      <div className="sub">
        <label>
          <input
            type="checkbox"
            checked={!!style.shadow}
            onChange={(e) => onChange({ shadow: e.target.checked ? { color: 'rgba(0,0,0,0.4)', blur: 18, x: 0, y: 4 } : null })}
          />{' '}
          <strong>Sombra</strong>
        </label>
        {style.shadow && (
          <>
            <Color value={style.shadow.color} onChange={(c) => onChange({ shadow: { ...style.shadow!, color: c } })} ariaLabel="Cor da sombra" />
            <Num label="Desfoque" value={style.shadow.blur} min={0} max={80} onChange={(v) => onChange({ shadow: { ...style.shadow!, blur: v } })} />
            <Num label="X" value={style.shadow.x} min={-40} max={40} onChange={(v) => onChange({ shadow: { ...style.shadow!, x: v } })} />
            <Num label="Y" value={style.shadow.y} min={-40} max={40} onChange={(v) => onChange({ shadow: { ...style.shadow!, y: v } })} />
          </>
        )}
      </div>

      <div className="sub">
        <label>
          <input
            type="checkbox"
            checked={!!style.box}
            onChange={(e) => onChange({ box: e.target.checked ? { color: '#000000', opacity: 0.6, padX: 0.25, padY: 0.08, radius: 0.18 } : null })}
          />{' '}
          <strong>Caixa de fundo</strong>
        </label>
        {style.box && (
          <>
            <Color value={style.box.color} onChange={(c) => onChange({ box: { ...style.box!, color: c } })} />
            <Num label="Opacidade" value={style.box.opacity} min={0} max={1} step={0.05} onChange={(v) => onChange({ box: { ...style.box!, opacity: v } })} />
            <Num label="Margem lados" value={style.box.padX} min={0} max={1} step={0.01} onChange={(v) => onChange({ box: { ...style.box!, padX: v } })} />
            <Num label="Margem alto" value={style.box.padY} min={0} max={0.6} step={0.01} onChange={(v) => onChange({ box: { ...style.box!, padY: v } })} />
            <Num label="Cantos" value={style.box.radius} min={0} max={0.6} step={0.01} onChange={(v) => onChange({ box: { ...style.box!, radius: v } })} />
          </>
        )}
      </div>

      <div className="sub">
        <label>
          <input
            type="checkbox"
            checked={!!style.stroke}
            onChange={(e) => onChange({ stroke: e.target.checked ? { color: '#000000', width: 3 } : null })}
          />{' '}
          <strong>Contorno</strong>
        </label>
        {style.stroke && (
          <div className="row">
            <Color value={style.stroke.color} onChange={(c) => onChange({ stroke: { ...style.stroke!, color: c } })} />
            <Num label="Espessura" value={style.stroke.width} min={0} max={20} step={0.5} onChange={(v) => onChange({ stroke: { ...style.stroke!, width: v } })} />
          </div>
        )}
      </div>
    </div>
  );
};
