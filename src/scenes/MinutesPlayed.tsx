import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {AnimatedBar} from '../components/AnimatedBar';
import {COLORS, FONT, minutesPlayed} from '../data/season';

const MAX_MINS = 3400;
const BAR_MAX_WIDTH = 560;
const BAR_HEIGHT = 16;
const ROW_HEIGHT = 114;
const STAGGER = 14;

const posBackground = (pos: string): string => {
  if (pos === 'GK') return COLORS.maroon;
  if (pos === 'MF') return COLORS.blue;
  if (pos === 'FW') return COLORS.gold;
  return '#333333';
};

export const MinutesPlayed: React.FC = () => {
  const frame = useCurrentFrame();

  const headerOpacity = interpolate(frame, [0, 18], [0, 1], {extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        flexDirection: 'column',
        paddingTop: 80,
        paddingLeft: 48,
        paddingRight: 48,
      }}
    >
      <div style={{opacity: headerOpacity}}>
        <div
          style={{
            fontFamily: FONT,
            fontSize: 26,
            letterSpacing: 3,
            color: COLORS.gold,
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          2025/26 · Tracked Squad
        </div>
        <div
          style={{
            fontFamily: FONT,
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.white,
            marginBottom: 32,
          }}
        >
          Minutes Played
        </div>
      </div>

      {minutesPlayed.map((p, i) => {
        const delay = 26 + i * STAGGER;
        const rowOpacity = interpolate(frame, [delay, delay + 14], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        return (
          <div
            key={p.name}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              height: ROW_HEIGHT,
              gap: 14,
              opacity: rowOpacity,
            }}
          >
            <div
              style={{
                width: 44,
                height: 30,
                backgroundColor: posBackground(p.pos),
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontFamily: FONT,
                  fontSize: 16,
                  fontWeight: 700,
                  color: COLORS.white,
                  letterSpacing: 0.5,
                }}
              >
                {p.pos}
              </span>
            </div>
            <div
              style={{
                width: 210,
                fontFamily: FONT,
                fontSize: 26,
                fontWeight: 500,
                color: COLORS.white,
                flexShrink: 0,
              }}
            >
              {p.name}
            </div>
            <AnimatedBar
              value={p.mins}
              maxValue={MAX_MINS}
              maxWidth={BAR_MAX_WIDTH}
              height={BAR_HEIGHT}
              color={p.posColor}
              delay={delay + 4}
              borderRadius={2}
            />
            <div
              style={{
                fontFamily: FONT,
                fontSize: 24,
                fontWeight: 700,
                color: COLORS.lightGrey,
                width: 80,
                textAlign: 'right',
                flexShrink: 0,
              }}
            >
              {p.mins.toLocaleString()}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
