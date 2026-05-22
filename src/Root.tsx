import React from 'react';
import {Composition} from 'remotion';
import {SeasonRecap} from './SeasonRecap';

// Total: 75 + 330 + 210 + 210 + 240 + 240 + 150 = 1455 frames @ 30fps (~48.5s)
export const Root: React.FC = () => {
  return (
    <Composition
      id="SeasonRecap"
      component={SeasonRecap}
      durationInFrames={1455}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};
