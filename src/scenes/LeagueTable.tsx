import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {COLORS, FONT, leagueTable} from '../data/season';

const borderColor = (i: number): string => {
  if (i < 2) return COLORS.blue;
  if (i === 2) return COLORS.orange;
  if (i === 3) return COLORS.green;
  if (i === 10) return COLORS.gold;
  if (i === 11) return COLORS.maroon;
  return 'transparent';
};

export const LeagueTable: React.FC = () => {
  const frame = useCurrentFrame();

  const headerOpacity = interpolate(frame, [0, 18], [0, 1], {extrapolateRight: 'clamp'});
  const colHeaderOpacity = interpolate(frame, [18, 30], [0, 1], {extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg, flexDirection: 'column'}}>
      <div style={{opacity: headerOpacity, paddingLeft: 44, paddingTop: 80, paddingRight: 40}}>
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
          Scottish Premiership 2025/26
        </div>
        <div
          style={{
            fontFamily: FONT,
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.white,
            marginBottom: 22,
          }}
        >
          Final Standings
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            paddingBottom: 10,
            borderBottom: `1px solid ${COLORS.grey}`,
            opacity: colHeaderOpacity,
          }}
        >
          <div style={{width: 52, fontFamily: FONT, fontSize: 20, color: COLORS.lightGrey}}>#</div>
          <div style={{flex: 1, fontFamily: FONT, fontSize: 20, color: COLORS.lightGrey}}>TEAM</div>
          <div style={{width: 72, textAlign: 'right', fontFamily: FONT, fontSize: 20, color: COLORS.lightGrey}}>PTS</div>
          <div style={{width: 88}} />
        </div>
      </div>

      {leagueTable.map((row, i) => {
        const startFrame = 28 + i * 13;
        const rowOpacity = interpolate(frame, [startFrame, startFrame + 16], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const rowY = interpolate(frame, [startFrame, startFrame + 16], [14, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        const isMWL = row.highlight === true;

        // Pulse glow for Motherwell row after all rows have appeared
        const glowOpacity = isMWL
          ? interpolate(
              Math.sin(((frame - 210) * Math.PI) / 40),
              [-1, 1],
              [0.06, 0.14],
              {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
            )
          : 0;

        return (
          <div
            key={row.pos}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              height: 127,
              paddingRight: 40,
              borderLeft: `4px solid ${borderColor(i)}`,
              paddingLeft: 40,
              borderBottom: `1px solid rgba(255,255,255,0.05)`,
              backgroundColor: isMWL
                ? `rgba(245,166,35,${glowOpacity})`
                : 'transparent',
              opacity: rowOpacity,
              transform: `translateY(${rowY}px)`,
            }}
          >
            <div
              style={{
                width: 52,
                fontFamily: FONT,
                fontSize: 26,
                color: isMWL ? COLORS.gold : COLORS.lightGrey,
                fontWeight: isMWL ? 700 : 400,
              }}
            >
              {row.pos}
            </div>
            <div
              style={{
                flex: 1,
                fontFamily: FONT,
                fontSize: isMWL ? 34 : 30,
                fontWeight: isMWL ? 700 : 400,
                color: isMWL ? COLORS.gold : COLORS.white,
              }}
            >
              {row.team}
            </div>
            <div
              style={{
                width: 72,
                textAlign: 'right',
                fontFamily: FONT,
                fontSize: isMWL ? 40 : 34,
                fontWeight: 700,
                color: isMWL ? COLORS.gold : COLORS.white,
              }}
            >
              {row.pts}
            </div>
            {row.badge ? (
              <div
                style={{
                  width: 78,
                  marginLeft: 10,
                  textAlign: 'center',
                  fontFamily: FONT,
                  fontSize: 17,
                  fontWeight: 700,
                  color: row.badgeColor,
                  border: `1.5px solid ${row.badgeColor}`,
                  borderRadius: 4,
                  padding: '5px 6px',
                  letterSpacing: 1,
                }}
              >
                {row.badge}
              </div>
            ) : (
              <div style={{width: 88}} />
            )}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
