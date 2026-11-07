import { Check, X } from 'lucide-react';
import React from 'react';
import { Drawer } from 'vaul';

export type MobileBottomSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  /** Exibe botão de confirmação (✓) à direita em vez do X ou junto a ele */
  onConfirm?: () => void;
  /** Altura máxima do sheet (ex.: '58dvh' ou '78dvh') */
  maxHeight?: string;
  children: React.ReactNode;
};

/**
 * Gaveta inferior estilo CapCut Mobile baseada no Vaul:
 * - modal={false} para permitir assistir/tocar no vídeo e na timeline com o painel aberto
 * - handleOnly para que listas e sliders internos rolem livremente sem fechar a gaveta por acidente
 * - repositionInputs para subir suavemente quando o teclado do iOS abrir
 */
export const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  open,
  onOpenChange,
  title,
  onConfirm,
  maxHeight = '62dvh',
  children,
}) => {
  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      modal={false}
      handleOnly
      repositionInputs
    >
      <Drawer.Portal
        container={
          typeof document !== 'undefined'
            ? (document.querySelector('.mobile-root') as HTMLElement | null) ?? undefined
            : undefined
        }
      >
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-[#15171E]/95 backdrop-blur-xl border-t border-white/12 rounded-t-[20px] text-[#F8FAFC] shadow-[0_-12px_36px_rgba(0,0,0,0.65)] focus:outline-none"
          style={{
            maxHeight,
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          {/* Barra superior de arraste (handle) + título */}
          <div className="flex flex-col shrink-0 pt-2 pb-1.5 px-3.5 border-b border-white/[0.07]">
            <Drawer.Handle className="w-9 h-1 rounded-full bg-white/25 mx-auto mb-2" />
            <div className="flex items-center justify-between gap-2 min-h-[36px]">
              <Drawer.Title className="text-[14px] font-bold text-white truncate">
                {title ?? 'Opções'}
              </Drawer.Title>
              <div className="flex items-center gap-1 shrink-0">
                {onConfirm ? (
                  <button
                    type="button"
                    onClick={onConfirm}
                    className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-[#00D4EB]/15 text-[#00D4EB] flex items-center justify-center hover:bg-[#00D4EB]/25"
                    aria-label="Confirmar e fechar"
                  >
                    <Check size={18} strokeWidth={2.5} aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-white/[0.06] text-[#9CA3AF] hover:text-white flex items-center justify-center"
                    aria-label="Fechar painel"
                  >
                    <X size={18} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Corpo rolável */}
          <div
            className="flex-1 overflow-y-auto overflow-x-hidden px-3.5 py-3"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};
