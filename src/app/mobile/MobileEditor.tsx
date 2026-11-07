import { ChevronLeft } from 'lucide-react';
import React from 'react';
import type { EditorState } from './useEditor';

export const MobileEditor: React.FC<{ ed: EditorState }> = ({ ed }) => {
  if (!ed.project) return null;

  return (
    <div
      className="mobile-root"
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-app)',
        color: 'var(--text-primary)',
      }}
    >
      <header
        style={{
          height: 48,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 12px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--bg-surface)',
        }}
      >
        <button
          className="back-btn"
          onClick={ed.closeProject}
          title="Voltar para o início"
          aria-label="Voltar para o início"
        >
          <ChevronLeft size={18} aria-hidden="true" />
          <span>Voltar</span>
        </button>
        <strong style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ed.project.name}
        </strong>
      </header>
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <p className="muted">Editor mobile em construção</p>
      </main>
    </div>
  );
};
