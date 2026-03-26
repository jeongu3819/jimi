import React, { useState } from 'react';
import { GameSettings } from './game/types';
import { StartScreen } from './components/StartScreen';
import { GameCanvas } from './components/GameCanvas';

export default function App() {
  const [settings, setSettings] = useState<GameSettings | null>(null);

  if (!settings) {
    return <StartScreen onStart={setSettings} />;
  }

  return (
    <GameCanvas
      key={JSON.stringify(settings)}
      settings={settings}
      onBackToMenu={() => setSettings(null)}
    />
  );
}
