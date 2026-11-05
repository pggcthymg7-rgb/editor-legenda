import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FONT_CATEGORIES, FONTS, fontCss, fontDef, type FontCategory, type FontKey } from '../../core/fonts';

type Props = { value: string; onChange: (key: FontKey) => void; sample?: string };

/** Seletor visual: cada fonte aparece escrita nela mesma, com busca e categorias. */
export const FontPicker: React.FC<Props> = ({ value, onChange, sample }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<FontCategory | 'all'>('all');
  const ref = useRef<HTMLDivElement>(null);
  const current = fontDef(value);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', esc);
    };
  }, [open]);

  const list = useMemo(
    () =>
      FONTS.filter((f) => (cat === 'all' || f.category === cat) && f.name.toLowerCase().includes(q.trim().toLowerCase())),
    [q, cat],
  );

  return (
    <div className="fontpicker" ref={ref}>
      <button
        type="button"
        className="fontpicker-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{ fontFamily: fontCss(current.key) }}
      >
        {current.name}
        <span aria-hidden="true" className="caret">
          ▾
        </span>
      </button>
      {open && (
        <div className="fontpicker-pop" role="dialog" aria-label="Escolher fonte">
          <input className="text" placeholder="Buscar fonte…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus aria-label="Buscar fonte" />
          <div className="chips" role="tablist">
            <button type="button" className={cat === 'all' ? 'on' : ''} onClick={() => setCat('all')}>
              Todas ({FONTS.length})
            </button>
            {FONT_CATEGORIES.map((c) => (
              <button type="button" key={c.id} className={cat === c.id ? 'on' : ''} onClick={() => setCat(c.id)}>
                {c.label}
              </button>
            ))}
          </div>
          <ul className="fontpicker-list" role="listbox" aria-label="Fontes">
            {list.map((f) => (
              <li key={f.key}>
                <button
                  type="button"
                  role="option"
                  aria-selected={f.key === value}
                  className={f.key === value ? 'on' : ''}
                  onClick={() => {
                    onChange(f.key);
                    setOpen(false);
                  }}
                >
                  <span className="fp-sample" style={{ fontFamily: fontCss(f.key), fontWeight: Math.min(f.weights[1], 700) }}>
                    {sample?.trim() || f.name}
                  </span>
                  <span className="fp-name">{f.name}</span>
                </button>
              </li>
            ))}
            {list.length === 0 && <li className="muted">Nenhuma fonte com esse nome.</li>}
          </ul>
        </div>
      )}
    </div>
  );
};
