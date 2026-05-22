import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT} from '../data/season';

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const titleSlide = spring({frame, fps, config: {damping: 60, stiffness: 180}, from: 50, to: 0});
  const titleOpacity = interpolate(frame, [0, 18], [0, 1], {extrapolateRight: 'clamp'});
  const subOpacity = interpolate(frame, [22, 42], [0, 1], {extrapolateRight: 'clamp'});
  const lineWidth = interpolate(frame, [4, 38], [0, 220], {extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        gap: 0,
      }}
    >
      <div
        style={{
          width: lineWidth,
          height: 3,
          backgroundColor: COLORS.gold,
          marginBottom: 32,
        }}
      />
      <div
        style={{
          fontFamily: FONT,
          fontSize: 62,
          fontWeight: 700,
          color: COLORS.white,
          letterSpacing: 8,
          textTransform: 'uppercase',
          textAlign: 'center',
          lineHeight: 1.15,
          transform: `translateY(${titleSlide}px)`,
          opacity: titleOpacity,
        }}
      >
        THE STEELMEN{'\n'}DISPATCH
      </div>
      <div
        style={{
          marginTop: 32,
          fontFamily: FONT,
          fontSize: 30,
          fontWeight: 400,
          color: COLORS.gold,
          letterSpacing: 5,
          textTransform: 'uppercase',
          opacity: subOpacity,
        }}
      >
        2025/26 · Season Review
      </div>
    </AbsoluteFill>
  );
};
