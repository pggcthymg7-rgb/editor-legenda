# 🎨 Design System Mobile — Editor de Legendas (`refactor/mobile-capcut-ux`)

Direção visual oficial para o **iPhone PWA** baseada nos 11 prints de referência do **CapCut Mobile** (`Claude outputs/REFERENCIA_CAPCUT.md`) e nas regras de acessibilidade e toque (`ui-ux-pro-max` + `web-design-guidelines`).

---

## 1. Escopo e Isolamento
- **Escopo estrito**: Todas as variáveis e regras abaixo vivem dentro de `.mobile-root` (incluindo os portais do `vaul` renderizados via prop `container` dentro de `.mobile-root`).
- **Desktop intocado**: O layout desktop (`.editor` em `src/app/App.tsx`) e os modelos de legenda renderizados (`src/remotion/**`, `PRESETS`) permanecem 100% inalterados.

---

## 2. Paleta de Cores (CapCut Dark Studio — Contraste WCAG AA >= 4.5:1)

| Token CSS | Valor | Papel na Interface (Fidelidade CapCut) | Contraste c/ Fundo |
|---|---|---|---|
| `--mob-bg` | `#0B0C10` | Fundo principal do editor e palco do monitor | — |
| `--mob-surface` | `#15171E` | Faixas da timeline, cabeçalho e barra de ferramentas raiz | — |
| `--mob-elevated` | `rgba(24, 27, 36, 0.94)` | Bottom sheets (Vaul), modais e popovers com `blur(20px)` | — |
| `--mob-card` | `#1E212B` | Cartões de modelo, células de mídia e inputs | — |
| `--mob-border` | `rgba(255, 255, 255, 0.10)` | Divisórias sutis de 1px | — |
| `--mob-border-strong` | `rgba(255, 255, 255, 0.22)` | Bordas de campos ativos e alças | — |
| `--mob-text` | `#F8FAFC` | Texto principal e ícones ativos | `18.2 : 1` (AAA) |
| `--mob-text-muted` | `#9CA3AF` | Rótulos secundários e dicas | `7.5 : 1` (AAA) |
| `--mob-cyan` | `#00D4EB` | CTA Primário CapCut ("Exportar", "Gerar", "Adicionar", "Feito") | `11.4 : 1` c/ `#041B1E` |
| `--mob-cyan-ink` | `#041B1E` | Texto sobre botões `--mob-cyan` | `11.4 : 1` (AAA) |
| `--mob-clip` | `#C2410C` | Pílula da faixa de Legendas (laranja CapCut — Prints 5 e 6) | `5.1 : 1` c/ `#FFFFFF` |
| `--mob-clip-sel` | `#EA580C` | Pílula selecionada com borda branca e alças de aparar | — |
| `--mob-word` | `#312E81` | Pílula da faixa de Palavras individuais | — |
| `--mob-playhead` | `#FFFFFF` | Agulha central vertical fixa no centro da timeline | `19.4 : 1` |
| `--mob-danger` | `#EF4444` | Ações destrutivas (Excluir legenda / Apagar projeto) | — |

---

## 3. Tipografia & Escala
- **UI & Controles (`--mob-font-sans`)**: `'Inter Variable', Inter, -apple-system, BlinkMacSystemFont, sans-serif`
- **Títulos & Sheets (`--mob-font-display`)**: `'Outfit Variable', Outfit, 'Inter Variable', sans-serif`
- **Timecode & Régua**: `font-variant-numeric: tabular-nums`, `11px`–`12px` `ui-monospace, 'SF Mono', monospace`
- **Inputs no iOS**: `font-size: 16px` mínimo em `<input>`, `<textarea>` e `<select>` para impedir auto-zoom do Safari iOS.

---

## 4. Geometria, Toque e Safe-Area (iPhone)
- **Alvos de toque mínimos**: `44px × 44px` em todos os botões da barra, alças de aparar da timeline e 4 alças do preview (`X`, `Lápis`, `Copiar`, `Girar`).
- **Safe-Area**: `viewport-fit=cover` ativo; topo respeita `env(safe-area-inset-top)` e rodapé/sheets respeitam `env(safe-area-inset-bottom)`.
- **Curva de animação**: `cubic-bezier(0.32, 0.72, 0, 1)` (curva nativa iOS sheet/spring).
