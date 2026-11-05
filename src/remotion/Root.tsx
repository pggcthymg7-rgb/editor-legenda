import React from 'react';
import { Composition, type CalculateMetadataFunction } from 'remotion';
import type { CompositionProps } from '../core/types';
import { CaptionComposition } from './CaptionComposition';
import { SAMPLE_PROJECT } from './sample';

export const COMPOSITION_ID = 'Legendas';
export const FPS = 30;

export const calculateMetadata: CalculateMetadataFunction<CompositionProps> = ({ props }) => {
  const v = props.project.video;
  return {
    width: v.width,
    height: v.height,
    fps: FPS,
    durationInFrames: Math.max(1, Math.ceil((v.durationMs / 1000) * FPS)),
  };
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id={COMPOSITION_ID}
    component={CaptionComposition}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={300}
    defaultProps={{ project: SAMPLE_PROJECT, background: 'green' } satisfies CompositionProps}
    calculateMetadata={calculateMetadata}
  />
);
