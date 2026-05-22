import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {AnimatedBar} from '../components/AnimatedBar';
import {COLORS, FONT, goalsAssists} from '../data/season';

const MAX_GOALS = 16;
const BAR_MAX_WIDTH = 560;
const ROW_HEIGHT = 130;
const BAR_HEIGHT = 22;
const STAGGER = 22;

export const GoalsAssists: React.FC = () => {
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
          FBref Snapshot
        </div>
        <div
          style={{
            fontFamily: FONT,
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.white,
            marginBottom: 48,
          }}
        >
          Goals &amp; Assists
        </div>
      </div>

      {goalsAssists.map((p, i) => {
        const delay = 28 + i * STAGGER;
        const nameOpacity = interpolate(frame, [delay, delay + 14], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        return (
          <div
            key={p.name}
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              height: ROW_HEIGHT,
              opacity: nameOpacity,
            }}
          >
            <div
              style={{
                fontFamily: FONT,
                fontSize: 30,
                fontWeight: 600,
                color: COLORS.white,
                marginBottom: 10,
              }}
            >
              {p.name}
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                <AnimatedBar
                  value={p.goals}
                  maxValue={MAX_GOALS}
                  maxWidth={BAR_MAX_WIDTH}
                  height={BAR_HEIGHT}
                  color={COLORS.white}
                  delay={delay + 6}
                />
                <span style={{fontFamily: FONT, fontSize: 22, color: COLORS.lightGrey, width: 28}}>
                  {p.goals}
                </span>
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                <AnimatedBar
                  value={p.assists}
                  maxValue={MAX_GOALS}
                  maxWidth={BAR_MAX_WIDTH}
                  height={BAR_HEIGHT}
                  color={COLORS.gold}
                  delay={delay + 10}
                />
                <span style={{fontFamily: FONT, fontSize: 22, color: COLORS.lightGrey, width: 28}}>
                  {p.assists}
                </span>
              </div>
            </div>
          </div>
        );
      })}

      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: 32,
          marginTop: 28,
          opacity: interpolate(frame, [50, 70], [0, 1], {extrapolateRight: 'clamp'}),
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
          <div style={{width: 24, height: 10, backgroundColor: COLORS.white, borderRadius: 2}} />
          <span style={{fontFamily: FONT, fontSize: 22, color: COLORS.lightGrey}}>Goals</span>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
          <div style={{width: 24, height: 10, backgroundColor: COLORS.gold, borderRadius: 2}} />
          <span style={{fontFamily: FONT, fontSize: 22, color: COLORS.lightGrey}}>Assists</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
