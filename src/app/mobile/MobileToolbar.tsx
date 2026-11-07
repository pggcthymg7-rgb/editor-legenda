import {
  Box,
  ChevronsLeft,
  Copy,
  Layers,
  ListOrdered,
  Palette,
  Pencil,
  Replace,
  RotateCcw,
  Scissors,
  Sparkles,
  Trash2,
  Type,
  UserRound,
  Wand2,
} from 'lucide-react';
import React from 'react';
import type { Phrase, Word } from '../../core/types';
import type { Selection } from '../components/Timeline';
import type { InspectorTab } from './MobileInspectorSheet';

export type MobileActiveSheet =
  | null
  | 'auto-captions'
  | 'inspector'
  | 'frases'
  | 'buscar'
  | 'pessoa'
  | 'camera3d'
  | 'export';

export type MobileToolbarProps = {
  selection: Selection;
  selectedPhrase: Phrase | null;
  selectedWord: Word | null;
  activeSheet: MobileActiveSheet;
  inspectorTab: InspectorTab;
  onOpenSheet: (sheet: MobileActiveSheet, tab?: InspectorTab) => void;
  onClearSelection: () => void;
  onBackToPhrase: () => void;
  onAddAtPlayhead: () => void;
  onSplitAtPlayhead: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleBehindPerson: () => void;
  onSplitAtWord: () => void;
  onCycleWordRole: () => void;
  onResetWord: () => void;
};

type ToolButtonProps = {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

const ToolButton: React.FC<ToolButtonProps> = ({
  icon,
  label,
  active,
  danger,
  disabled,
  onClick,
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={`shrink-0 flex flex-col items-center justify-center gap-1 px-2.5 py-1.5 min-w-[62px] min-h-[54px] rounded-xl transition-colors disabled:opacity-40 ${
      danger
        ? 'text-[#EF4444] hover:bg-[#EF4444]/10'
        : active
          ? 'text-[#00D4EB] bg-[#00D4EB]/10'
          : 'text-[#F8FAFC]/90 hover:bg-white/[0.06]'
    }`}
  >
    {icon}
    <span className="text-[10px] font-medium leading-tight whitespace-nowrap">{label}</span>
  </button>
);

export const MobileToolbar: React.FC<MobileToolbarProps> = ({
  selection,
  selectedPhrase,
  selectedWord,
  activeSheet,
  inspectorTab,
  onOpenSheet,
  onClearSelection,
  onBackToPhrase,
  onAddAtPlayhead,
  onSplitAtPlayhead,
  onDuplicate,
  onDelete,
  onToggleBehindPerson,
  onSplitAtWord,
  onCycleWordRole,
  onResetWord,
}) => {
  // Estado 3: Palavra Selecionada
  if (selection.phraseId && selection.wordId && selectedWord) {
    return (
      <nav
        className="flex items-center h-[62px] px-1.5 bg-[#15171E] border-t border-white/[0.08] shrink-0"
        role="toolbar"
        aria-label="Ferramentas da palavra selecionada"
      >
        <button
          type="button"
          onClick={onBackToPhrase}
          className="shrink-0 w-11 h-11 mr-1 rounded-xl bg-[#1E212B] border border-white/10 flex items-center justify-center text-white"
          aria-label="Voltar para ferramentas da frase"
          title="Voltar para frase"
        >
          <ChevronsLeft size={18} aria-hidden="true" />
        </button>
        <div
          className="flex-1 flex items-center gap-0.5 overflow-x-auto no-scrollbar"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <ToolButton
            icon={<Pencil size={18} aria-hidden="true" />}
            label="Editar palavra"
            active={activeSheet === 'inspector' && inspectorTab === 'palavra'}
            onClick={() => onOpenSheet('inspector', 'palavra')}
          />
          <ToolButton
            icon={<Sparkles size={18} aria-hidden="true" />}
            label={`Papel: ${selectedWord.role === 'key' ? 'Destaque' : selectedWord.role === 'small' ? 'Ligação' : 'Normal'}`}
            onClick={onCycleWordRole}
          />
          <ToolButton
            icon={<Scissors size={18} aria-hidden="true" />}
            label="Dividir aqui"
            onClick={onSplitAtWord}
          />
          <ToolButton
            icon={<RotateCcw size={18} aria-hidden="true" />}
            label="Resetar"
            onClick={onResetWord}
          />
        </div>
      </nav>
    );
  }

  // Estado 2: Frase Selecionada (Estilo CapCut Print 3)
  if (selection.phraseId && selectedPhrase) {
    return (
      <nav
        className="flex items-center h-[62px] px-1.5 bg-[#15171E] border-t border-white/[0.08] shrink-0"
        role="toolbar"
        aria-label="Ferramentas da legenda selecionada"
      >
        <button
          type="button"
          onClick={onClearSelection}
          className="shrink-0 w-11 h-11 mr-1 rounded-xl bg-[#1E212B] border border-white/10 flex items-center justify-center text-white"
          aria-label="Voltar para ferramentas principais"
          title="Voltar"
        >
          <ChevronsLeft size={18} aria-hidden="true" />
        </button>
        <div
          className="flex-1 flex items-center gap-0.5 overflow-x-auto no-scrollbar"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <ToolButton
            icon={<Pencil size={18} aria-hidden="true" />}
            label="Editar"
            active={activeSheet === 'inspector' && inspectorTab === 'modelos'}
            onClick={() => onOpenSheet('inspector', 'modelos')}
          />
          <ToolButton
            icon={<Palette size={18} aria-hidden="true" />}
            label="Estilo"
            active={activeSheet === 'inspector' && inspectorTab === 'estilos'}
            onClick={() => onOpenSheet('inspector', 'estilos')}
          />
          <ToolButton
            icon={<Type size={18} aria-hidden="true" />}
            label="Fontes"
            active={activeSheet === 'inspector' && inspectorTab === 'fontes'}
            onClick={() => onOpenSheet('inspector', 'fontes')}
          />
          <ToolButton
            icon={<Sparkles size={18} aria-hidden="true" />}
            label="Animação"
            active={activeSheet === 'inspector' && inspectorTab === 'animacoes'}
            onClick={() => onOpenSheet('inspector', 'animacoes')}
          />
          <ToolButton
            icon={<Scissors size={18} aria-hidden="true" />}
            label="Dividir"
            disabled={selectedPhrase.words.length < 2}
            onClick={onSplitAtPlayhead}
          />
          <ToolButton
            icon={<Copy size={18} aria-hidden="true" />}
            label="Duplicar"
            onClick={onDuplicate}
          />
          <ToolButton
            icon={<ListOrdered size={18} aria-hidden="true" />}
            label="Palavras"
            active={activeSheet === 'inspector' && inspectorTab === 'palavra'}
            onClick={() => onOpenSheet('inspector', 'palavra')}
          />
          <ToolButton
            icon={<UserRound size={18} aria-hidden="true" />}
            label={selectedPhrase.behind ? 'Na frente' : 'Atrás pessoa'}
            active={!!selectedPhrase.behind}
            onClick={onToggleBehindPerson}
          />
          <ToolButton
            icon={<Trash2 size={18} aria-hidden="true" />}
            label="Excluir"
            danger
            onClick={onDelete}
          />
        </div>
      </nav>
    );
  }

  // Estado 1: Raiz (Nenhuma legenda selecionada)
  return (
    <nav
      className="flex items-center h-[62px] px-2 bg-[#15171E] border-t border-white/[0.08] shrink-0"
      role="toolbar"
      aria-label="Ferramentas principais"
    >
      <div
        className="flex-1 flex items-center justify-around gap-0.5 overflow-x-auto no-scrollbar"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <ToolButton
          icon={<Wand2 size={18} aria-hidden="true" />}
          label="Legendas IA"
          active={activeSheet === 'auto-captions'}
          onClick={() => onOpenSheet('auto-captions')}
        />
        <ToolButton
          icon={<Type size={18} aria-hidden="true" />}
          label="+ Texto"
          onClick={() => {
            onAddAtPlayhead();
            onOpenSheet('inspector', 'modelos');
          }}
        />
        <ToolButton
          icon={<Layers size={18} aria-hidden="true" />}
          label="Modelos"
          active={activeSheet === 'inspector' && inspectorTab === 'modelos'}
          onClick={() => onOpenSheet('inspector', 'modelos')}
        />
        <ToolButton
          icon={<ListOrdered size={18} aria-hidden="true" />}
          label="Frases"
          active={activeSheet === 'frases'}
          onClick={() => onOpenSheet('frases')}
        />
        <ToolButton
          icon={<Replace size={18} aria-hidden="true" />}
          label="Buscar"
          active={activeSheet === 'buscar'}
          onClick={() => onOpenSheet('buscar')}
        />
        <ToolButton
          icon={<UserRound size={18} aria-hidden="true" />}
          label="Pessoa"
          active={activeSheet === 'pessoa'}
          onClick={() => onOpenSheet('pessoa')}
        />
        <ToolButton
          icon={<Box size={18} aria-hidden="true" />}
          label="Câmera 3D"
          active={activeSheet === 'camera3d'}
          onClick={() => onOpenSheet('camera3d')}
        />
      </div>
    </nav>
  );
};
