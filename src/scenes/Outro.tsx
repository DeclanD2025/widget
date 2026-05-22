import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT} from '../data/season';

const Stat: React.FC<{value: string; label: string; delay: number; frame: number; fps: number}> = ({
  value,
  label,
  delay,
  frame,
  fps,
}) => {
  const s = spring({frame: frame - delay, fps, config: {damping: 60, stiffness: 160}, from: 30, to: 0});
  const op = interpolate(frame, [delay, delay + 16], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        opacity: op,
        transform: `translateY(${s}px)`,
      }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontSize: 72,
          fontWeight: 700,
          color: COLORS.gold,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: FONT,
          fontSize: 22,
          letterSpacing: 3,
          color: COLORS.lightGrey,
          textTransform: 'uppercase',
          marginTop: 8,
        }}
      >
        {label}
      </div>
    </div>
  );
};

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const logoOpacity = interpolate(frame, [0, 20], [0, 1], {extrapolateRight: 'clamp'});
  const dividerWidth = interpolate(frame, [10, 50], [0, 320], {extrapolateRight: 'clamp'});
  const taglineOpacity = interpolate(frame, [90, 110], [0, 1], {extrapolateRight: 'clamp'});

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
      <div style={{opacity: logoOpacity, textAlign: 'center', marginBottom: 48}}>
        <div
          style={{
            fontFamily: FONT,
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: 6,
            color: COLORS.white,
            textTransform: 'uppercase',
          }}
        >
          THE STEELMEN DISPATCH
        </div>
      </div>

      <div style={{width: dividerWidth, height: 3, backgroundColor: COLORS.gold, marginBottom: 56}} />

      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 64,
          marginBottom: 56,
        }}
      >
        <Stat value="4th" label="Position" delay={20} frame={frame} fps={fps} />
        <div style={{width: 1, backgroundColor: COLORS.grey, alignSelf: 'stretch'}} />
        <Stat value="61" label="Points" delay={35} frame={frame} fps={fps} />
        <div style={{width: 1, backgroundColor: COLORS.grey, alignSelf: 'stretch'}} />
        <Stat value="16W" label="Wins" delay={50} frame={frame} fps={fps} />
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 64,
          marginBottom: 72,
        }}
      >
        <Stat value="13D" label="Draws" delay={65} frame={frame} fps={fps} />
        <div style={{width: 1, backgroundColor: COLORS.grey, alignSelf: 'stretch'}} />
        <Stat value="+23" label="Goal Diff" delay={80} frame={frame} fps={fps} />
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          opacity: taglineOpacity,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            border: `1.5px solid ${COLORS.green}`,
            borderRadius: 6,
            padding: '14px 28px',
          }}
        >
          <span
            style={{
              fontFamily: FONT,
              fontSize: 28,
              fontWeight: 700,
              color: COLORS.green,
              letterSpacing: 2,
            }}
          >
            UECL QUALIFIED
          </span>
        </div>
        <div
          style={{
            marginTop: 20,
            fontFamily: FONT,
            fontSize: 22,
            color: COLORS.lightGrey,
            letterSpacing: 2,
          }}
        >
          Conference League 2026/27
        </div>
      </div>
    </AbsoluteFill>
  );
};
