import React from 'react';
import {AbsoluteFill, Series} from 'remotion';
import {COLORS} from './data/season';
import {Intro} from './scenes/Intro';
import {LeagueTable} from './scenes/LeagueTable';
import {GoalsAssists} from './scenes/GoalsAssists';
import {PointsPerMonth} from './scenes/PointsPerMonth';
import {PointsByOpponent} from './scenes/PointsByOpponent';
import {MinutesPlayed} from './scenes/MinutesPlayed';
import {Outro} from './scenes/Outro';

export const SeasonRecap: React.FC = () => {
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      <Series>
        <Series.Sequence durationInFrames={75}>
          <Intro />
        </Series.Sequence>
        <Series.Sequence durationInFrames={330}>
          <LeagueTable />
        </Series.Sequence>
        <Series.Sequence durationInFrames={210}>
          <GoalsAssists />
        </Series.Sequence>
        <Series.Sequence durationInFrames={210}>
          <PointsPerMonth />
        </Series.Sequence>
        <Series.Sequence durationInFrames={240}>
          <PointsByOpponent />
        </Series.Sequence>
        <Series.Sequence durationInFrames={240}>
          <MinutesPlayed />
        </Series.Sequence>
        <Series.Sequence durationInFrames={150}>
          <Outro />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
