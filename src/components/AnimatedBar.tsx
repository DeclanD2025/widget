import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';

interface AnimatedBarProps {
  value: number;
  maxValue: number;
  maxWidth: number;
  height: number;
  color: string;
  delay: number;
  animDuration?: number;
  borderRadius?: number;
}

export const AnimatedBar: React.FC<AnimatedBarProps> = ({
  value,
  maxValue,
  maxWidth,
  height,
  color,
  delay,
  animDuration = 22,
  borderRadius = 3,
}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [delay, delay + animDuration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        width: (value / maxValue) * maxWidth * progress,
        height,
        backgroundColor: color,
        borderRadius,
        flexShrink: 0,
      }}
    />
  );
};
