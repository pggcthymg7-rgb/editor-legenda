import { Player, type PlayerRef } from '@remotion/player';
import React, { useEffect, useRef } from 'react';
import type { CompositionProps, Project } from '../../core/types';
import { CaptionComposition } from '../../remotion/CaptionComposition';
import { FPS } from '../../remotion/Root';

type Props = {
  project: Project;
  playerRef: React.RefObject<PlayerRef | null>;
  selectedId: string | null;
  onMove: (id: string, x: number, y: number) => void;
  onTime: (ms: number) => void;
};

/** Preview com Player do Remotion + alça para arrastar a frase selecionada. */
export const Preview: React.FC<Props> = ({ project, playerRef, selectedId, onMove, onTime }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const { width, height, durationMs } = project.video;
  const selected = project.phrases.find((p) => p.id === selectedId);

  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    const h = (e: { detail: { frame: number } }) => onTime((e.detail.frame / FPS) * 1000);
    p.addEventListener('frameupdate', h);
    p.addEventListener('seeked', h);
    return () => {
      p.removeEventListener('frameupdate', h);
      p.removeEventListener('seeked', h);
    };
  }, [playerRef, onTime]);

  const startDrag = (e: React.PointerEvent) => {
    if (!selected || !boxRef.current) return;
    e.preventDefault();
    const box = boxRef.current.getBoundingClientRect();
    const move = (ev: PointerEvent) => {
      const x = Math.min(1, Math.max(0, (ev.clientX - box.left) / box.width));
      const y = Math.min(1, Math.max(0, (ev.clientY - box.top) / box.height));
      onMove(selected.id, x, y);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const inputProps: CompositionProps = { project, background: 'video' };

  return (
    <div className="preview">
      <div className="stage" ref={boxRef} style={{ aspectRatio: `${width} / ${height}` }}>
        <Player
          ref={playerRef}
          component={CaptionComposition}
          inputProps={inputProps}
          durationInFrames={Math.max(1, Math.ceil((durationMs / 1000) * FPS))}
          fps={FPS}
          compositionWidth={width}
          compositionHeight={height}
          style={{ width: '100%', height: '100%' }}
          controls
          clickToPlay={false}
          spaceKeyToPlayOrPause
          acknowledgeRemotionLicense
        />
        {selected && (
          <div
            className="handle"
            title="Arraste para mover a frase"
            onPointerDown={startDrag}
            style={{ left: `${selected.x * 100}%`, top: `${selected.y * 100}%` }}
          />
        )}
      </div>
    </div>
  );
};
