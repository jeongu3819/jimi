import React, { useState } from 'react';
import { GameSettings, Difficulty, GameMode } from '../game/types';

interface Props {
  onStart: (settings: GameSettings) => void;
}

export function StartScreen({ onStart }: Props) {
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [gameMode, setGameMode] = useState<GameMode>('first_caught');
  const [playerCount, setPlayerCount] = useState(2);
  const [playerNames, setPlayerNames] = useState(['', '', '', '', '']);

  const handleStart = () => {
    const names = playerNames.map((n, i) => n.trim() || `P${i + 1}`);
    onStart({
      mapId: 'arena',
      difficulty,
      gameMode,
      playerCount,
      playerNames: names.slice(0, playerCount),
    });
  };

  const updateName = (i: number, name: string) => {
    const u = [...playerNames]; u[i] = name; setPlayerNames(u);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>ZOMBIE SURVIVAL</h1>
        <p style={styles.subtitle}>도망쳐라, 살아남아라 — 커피내기 에디션</p>

        <div style={styles.section}>
          <label style={styles.label}>플레이어 수: {playerCount}명</label>
          <input type="range" min={1} max={5} value={playerCount}
            onChange={e => setPlayerCount(Number(e.target.value))} style={styles.slider} />
        </div>

        <div style={styles.section}>
          <label style={styles.label}>플레이어 이름</label>
          <div style={styles.nameGrid}>
            {Array.from({ length: playerCount }).map((_, i) => (
              <input key={i} type="text" placeholder={`P${i + 1}`} value={playerNames[i]}
                onChange={e => updateName(i, e.target.value)} maxLength={6}
                style={{ ...styles.nameInput, borderColor: ['#4a9eff','#44dd55','#ff77aa','#ffaa33','#cc88ff'][i] }} />
            ))}
          </div>
        </div>

        <div style={styles.section}>
          <label style={styles.label}>난이도</label>
          <div style={styles.row}>
            {(['easy','normal','hard'] as Difficulty[]).map(d => (
              <button key={d} onClick={() => setDifficulty(d)} style={{
                ...styles.btn,
                ...(difficulty === d ? {
                  ...styles.btnActive,
                  backgroundColor: d === 'easy' ? '#2d7a2d' : d === 'normal' ? '#cc8800' : '#cc2222',
                } : {}),
              }}>
                {d === 'easy' ? '쉬움' : d === 'normal' ? '보통' : '어려움'}
              </button>
            ))}
          </div>
        </div>

        {playerCount > 1 && (
          <div style={styles.section}>
            <label style={styles.label}>게임 모드</label>
            <div style={styles.row}>
              <button onClick={() => setGameMode('first_caught')} style={{
                ...styles.btn,
                ...(gameMode === 'first_caught' ? { ...styles.btnActive, backgroundColor: '#cc4400' } : {}),
              }}>
                <strong>First Caught</strong>
                <small style={styles.sub}>먼저 잡히면 짐</small>
              </button>
              <button onClick={() => setGameMode('last_survivor')} style={{
                ...styles.btn,
                ...(gameMode === 'last_survivor' ? { ...styles.btnActive, backgroundColor: '#2d5a7a' } : {}),
              }}>
                <strong>Last Survivor</strong>
                <small style={styles.sub}>마지막 1명 승리</small>
              </button>
            </div>
          </div>
        )}

        <button onClick={handleStart} style={styles.startBtn}>게임 시작</button>

        <div style={styles.controls}>
          <p style={styles.controlTitle}>조작법</p>
          <div>
            <p style={styles.ct}>이동: <b>방향키</b> 또는 <b>WASD</b></p>
            <p style={styles.ct}>높은 지형 오르기: 해당 방향으로 이동</p>
            <p style={styles.ct}>일시정지: <b>ESC</b></p>
          </div>
          <div style={{ marginTop: 8 }}>
            <p style={styles.controlTitle}>생존 규칙</p>
            <p style={styles.ct}>좀비에 닿으면 즉사! 무기 없음, 오직 도망만!</p>
            <p style={styles.ct}>높은 곳에 올라가면 잠시 안전, 하지만...</p>
            <p style={styles.ct}>시간이 지나면 좀비가 합쳐져 거대화! 높은 곳도 올라옴!</p>
            <p style={styles.ct}>8초 후 암전 — 내 주변만 보인다</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a1a 0%, #0e1520 50%, #0a1020 100%)', padding: 16, overflowY: 'auto' },
  card: { background: 'rgba(0,0,0,0.7)', borderRadius: 14, padding: '28px 36px', maxWidth: 480, width: '100%', border: '1px solid rgba(255,60,60,0.15)' },
  title: { textAlign: 'center', color: '#ff3333', fontSize: 28, margin: 0, fontFamily: 'monospace', letterSpacing: 4, textShadow: '0 0 25px rgba(255,50,50,0.6)' },
  subtitle: { textAlign: 'center', color: '#888', fontSize: 12, marginTop: 4, marginBottom: 20 },
  section: { marginBottom: 14 },
  label: { display: 'block', color: '#ddd', fontSize: 12, marginBottom: 5, fontWeight: 'bold' },
  slider: { width: '100%', accentColor: '#ff4444' },
  row: { display: 'flex', gap: 6 },
  btn: { flex: 1, padding: '7px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 7, color: '#ccc', cursor: 'pointer', fontSize: 12, fontWeight: 'bold', textAlign: 'center' as const },
  btnActive: { color: '#fff', borderColor: 'transparent' },
  sub: { fontSize: 9, opacity: 0.8, display: 'block' },
  nameGrid: { display: 'flex', gap: 6, flexWrap: 'wrap' as const },
  nameInput: { width: 80, padding: '5px 6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 5, color: '#fff', fontSize: 12, outline: 'none' },
  startBtn: { width: '100%', padding: '11px 0', background: 'linear-gradient(135deg, #881111, #cc2222)', border: 'none', borderRadius: 9, color: '#fff', fontSize: 16, fontWeight: 'bold', cursor: 'pointer', letterSpacing: 2, marginTop: 4, textShadow: '0 0 8px rgba(255,50,50,0.5)' },
  controls: { marginTop: 16, padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: 7, border: '1px solid rgba(255,255,255,0.06)' },
  controlTitle: { color: '#aaa', fontSize: 10, margin: '0 0 5px 0', fontWeight: 'bold' },
  ct: { color: '#888', fontSize: 10, margin: '2px 0' },
};
