import React, { useState } from 'react';
import { GameSettings, Difficulty, GameMode, VisionMode } from '../game/types';

interface Props {
  onStart: (settings: GameSettings) => void;
}

export function StartScreen({ onStart }: Props) {
  const [zombieCount] = useState(0); // auto-spawned waves now
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [gameMode, setGameMode] = useState<GameMode>('first_caught');
  const [visionMode, setVisionMode] = useState<VisionMode>('normal');
  const [playerCount, setPlayerCount] = useState(2);
  const [playerNames, setPlayerNames] = useState(['', '', '', '', '']);

  const handleStart = () => {
    const names = playerNames.map((n, i) => n.trim() || `P${i + 1}`);
    onStart({
      mapId: 'arena',
      zombieCount,
      difficulty,
      gameMode,
      visionMode,
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
        <h1 style={styles.title}>ZOMBIE DEFENSE</h1>
        <p style={styles.subtitle}>기지를 방어하고 살아남아라! - 커피내기 에디션</p>

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
                <small style={styles.sub}>먼저 죽으면 짐</small>
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

        <div style={styles.section}>
          <label style={styles.label}>시야 모드</label>
          <div style={styles.row}>
            <button onClick={() => setVisionMode('normal')} style={{
              ...styles.btn, ...(visionMode === 'normal' ? { ...styles.btnActive, backgroundColor: '#555' } : {}),
            }}>일반 시야</button>
            <button onClick={() => setVisionMode('blackout')} style={{
              ...styles.btn, ...(visionMode === 'blackout' ? { ...styles.btnActive, backgroundColor: '#222', border: '1px solid #666' } : {}),
            }}>암전 모드</button>
          </div>
        </div>

        <button onClick={handleStart} style={styles.startBtn}>게임 시작</button>

        <div style={styles.controls}>
          <p style={styles.controlTitle}>조작법</p>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <p style={styles.ct}>이동: <b>방향키</b> 또는 <b>WASD</b></p>
              <p style={styles.ct}>사격: <b>Space</b> (자동 조준)</p>
              <p style={styles.ct}>방어막: <b>Shift</b> (1회, 2.5초 무적)</p>
              <p style={styles.ct}>일시정지: <b>ESC</b></p>
            </div>
            <div style={{ flex: 1 }}>
              <p style={styles.ct}><span style={{ color: '#ff6644' }}>D</span> 총 데미지 강화</p>
              <p style={styles.ct}><span style={{ color: '#ffaa22' }}>R</span> 총 연사 강화</p>
              <p style={styles.ct}><span style={{ color: '#44cc44' }}>W</span> 벽 수리</p>
              <p style={styles.ct}><span style={{ color: '#ff4488' }}>+</span> 체력 회복</p>
              <p style={styles.ct}>기지 근처에 있으면 벽 자동 수리</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', padding: 16, overflowY: 'auto' },
  card: { background: 'rgba(0,0,0,0.65)', borderRadius: 14, padding: '28px 36px', maxWidth: 520, width: '100%', border: '1px solid rgba(255,255,255,0.1)' },
  title: { textAlign: 'center', color: '#ff4444', fontSize: 30, margin: 0, fontFamily: 'monospace', letterSpacing: 3, textShadow: '0 0 20px rgba(255,68,68,0.5)' },
  subtitle: { textAlign: 'center', color: '#aaa', fontSize: 12, marginTop: 4, marginBottom: 20 },
  section: { marginBottom: 14 },
  label: { display: 'block', color: '#ddd', fontSize: 12, marginBottom: 5, fontWeight: 'bold' },
  slider: { width: '100%', accentColor: '#4a9eff' },
  row: { display: 'flex', gap: 6 },
  btn: { flex: 1, padding: '7px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 7, color: '#ccc', cursor: 'pointer', fontSize: 12, fontWeight: 'bold', textAlign: 'center' as const },
  btnActive: { color: '#fff', borderColor: 'transparent' },
  sub: { fontSize: 9, opacity: 0.8, display: 'block' },
  nameGrid: { display: 'flex', gap: 6, flexWrap: 'wrap' as const },
  nameInput: { width: 80, padding: '5px 6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 5, color: '#fff', fontSize: 12, outline: 'none' },
  startBtn: { width: '100%', padding: '11px 0', background: 'linear-gradient(135deg, #cc2222, #ff4444)', border: 'none', borderRadius: 9, color: '#fff', fontSize: 16, fontWeight: 'bold', cursor: 'pointer', letterSpacing: 2, marginTop: 4 },
  controls: { marginTop: 16, padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: 7, border: '1px solid rgba(255,255,255,0.06)' },
  controlTitle: { color: '#aaa', fontSize: 10, margin: '0 0 5px 0', fontWeight: 'bold' },
  ct: { color: '#888', fontSize: 10, margin: '2px 0' },
};
