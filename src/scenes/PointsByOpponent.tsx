import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {AnimatedBar} from '../components/AnimatedBar';
import {COLORS, FONT, pointsByOpponent} from '../data/season';

const MAX_PTS = 9;
const BAR_MAX_WIDTH = 580;
const BAR_HEIGHT = 28;
const ROW_HEIGHT = 110;
const STAGGER = 14;

const categoryColor = (cat: 'high' | 'mid' | 'low'): string => {
  if (cat === 'high') return COLORS.gold;
  if (cat === 'mid') return '#555555';
  return COLORS.maroon;
};

export const PointsByOpponent: React.FC = () => {
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
          2025/26 · All Fixtures
        </div>
        <div
          style={{
            fontFamily: FONT,
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.white,
            marginBottom: 36,
          }}
        >
          Points by Opponent
        </div>
      </div>

      {pointsByOpponent.map((opp, i) => {
        const delay = 26 + i * STAGGER;
        const rowOpacity = interpolate(frame, [delay, delay + 14], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        return (
          <div
            key={opp.opponent}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              height: ROW_HEIGHT,
              gap: 16,
              opacity: rowOpacity,
            }}
          >
            <div
              style={{
                width: 168,
                fontFamily: FONT,
                fontSize: 26,
                fontWeight: 500,
                color: COLORS.white,
                textAlign: 'right',
                flexShrink: 0,
              }}
            >
              {opp.opponent}
            </div>
            <AnimatedBar
              value={opp.pts}
              maxValue={MAX_PTS}
              maxWidth={BAR_MAX_WIDTH}
              height={BAR_HEIGHT}
              color={categoryColor(opp.category)}
              delay={delay + 4}
            />
            <div
              style={{
                fontFamily: FONT,
                fontSize: 26,
                fontWeight: 700,
                color: COLORS.lightGrey,
                width: 32,
                flexShrink: 0,
              }}
            >
              {opp.pts}
            </div>
          </div>
        );
      })}

      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: 24,
          marginTop: 24,
          flexWrap: 'wrap',
          opacity: interpolate(frame, [50, 70], [0, 1], {extrapolateRight: 'clamp'}),
        }}
      >
        {[
          {color: COLORS.gold,   label: '≥ 70% pts'},
          {color: '#555555',     label: '40–69%'},
          {color: COLORS.maroon, label: '< 40%'},
        ].map(({color, label}) => (
          <div key={label} style={{display: 'flex', alignItems: 'center', gap: 8}}>
            <div style={{width: 20, height: 20, backgroundColor: color, borderRadius: 3}} />
            <span style={{fontFamily: FONT, fontSize: 22, color: COLORS.lightGrey}}>{label}</span>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
