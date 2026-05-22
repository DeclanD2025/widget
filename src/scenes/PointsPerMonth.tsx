import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {COLORS, FONT, pointsPerMonth} from '../data/season';

const MAX_PPG = 3;
const CHART_HEIGHT = 700;
const BAR_WIDTH = 72;
const GAP = 28;
const AVG_LINE = 1.5;

export const PointsPerMonth: React.FC = () => {
  const frame = useCurrentFrame();

  const headerOpacity = interpolate(frame, [0, 18], [0, 1], {extrapolateRight: 'clamp'});
  const avgLineOpacity = interpolate(frame, [140, 160], [0, 1], {extrapolateRight: 'clamp'});

  const barColor = (m: typeof pointsPerMonth[0]): string => {
    if (m.isBad) return COLORS.maroon;
    if (m.isGolden) return COLORS.gold;
    return '#444444';
  };

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
          Full Season · Aug–May
        </div>
        <div
          style={{
            fontFamily: FONT,
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.white,
            marginBottom: 12,
          }}
        >
          Points per Game
        </div>
        <div
          style={{
            fontFamily: FONT,
            fontSize: 24,
            color: COLORS.lightGrey,
            fontStyle: 'italic',
            marginBottom: 48,
            lineHeight: 1.4,
          }}
        >
          Dec–Feb golden run: 2.38 PPG · 26 scored, 2 conceded
        </div>
      </div>

      <div style={{position: 'relative', height: CHART_HEIGHT}}>
        {/* Y-axis grid lines */}
        {[0, 0.5, 1, 1.5, 2, 2.5, 3].map((v) => {
          const y = CHART_HEIGHT - (v / MAX_PPG) * CHART_HEIGHT;
          return (
            <div
              key={v}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: y,
                height: 1,
                backgroundColor: 'rgba(255,255,255,0.06)',
              }}
            />
          );
        })}

        {/* Avg line */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: CHART_HEIGHT - (AVG_LINE / MAX_PPG) * CHART_HEIGHT,
            height: 1,
            backgroundColor: COLORS.lightGrey,
            opacity: avgLineOpacity,
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: CHART_HEIGHT - (AVG_LINE / MAX_PPG) * CHART_HEIGHT - 26,
            fontFamily: FONT,
            fontSize: 20,
            color: COLORS.lightGrey,
            opacity: avgLineOpacity,
          }}
        >
          Avg 1.5
        </div>

        {/* Bars */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: GAP,
          }}
        >
          {pointsPerMonth.map((m, i) => {
            const delay = 28 + i * 14;
            const progress = interpolate(frame, [delay, delay + 22], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const barH = (m.ppg / MAX_PPG) * CHART_HEIGHT * progress;
            const labelOpacity = interpolate(frame, [delay + 8, delay + 22], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });

            return (
              <div
                key={m.month}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: BAR_WIDTH,
                    height: barH,
                    backgroundColor: barColor(m),
                    borderRadius: '4px 4px 0 0',
                  }}
                />
                <div
                  style={{
                    fontFamily: FONT,
                    fontSize: 22,
                    color: COLORS.lightGrey,
                    opacity: labelOpacity,
                  }}
                >
                  {m.month}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: 28,
          marginTop: 32,
          opacity: interpolate(frame, [60, 80], [0, 1], {extrapolateRight: 'clamp'}),
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
          <div style={{width: 20, height: 20, backgroundColor: COLORS.gold, borderRadius: 3}} />
          <span style={{fontFamily: FONT, fontSize: 22, color: COLORS.lightGrey}}>≥ 2.00 PPG</span>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
          <div style={{width: 20, height: 20, backgroundColor: COLORS.maroon, borderRadius: 3}} />
          <span style={{fontFamily: FONT, fontSize: 22, color: COLORS.lightGrey}}>{'< 1.00 PPG'}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
