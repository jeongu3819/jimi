import React, { useState } from 'react';
import { GameSettings, Difficulty } from '../game/types';
import { mapList } from '../game/maps';

interface Props {
  onStart: (settings: GameSettings) => void;
}

export function StartScreen({ onStart }: Props) {
  const [mapId, setMapId] = useState(mapList[0].id);
  const [zombieCount, setZombieCount] = useState(5);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');

  const handleStart = () => {
    onStart({ mapId, zombieCount, difficulty });
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>ZOMBIE SURVIVAL</h1>
        <p style={styles.subtitle}>좀비를 피해 살아남아라!</p>

        <div style={styles.section}>
          <label style={styles.label}>맵 선택</label>
          <div style={styles.options}>
            {mapList.map(map => (
              <button
                key={map.id}
                onClick={() => setMapId(map.id)}
                style={{
                  ...styles.optionBtn,
                  ...(mapId === map.id ? styles.optionBtnActive : {}),
                }}
              >
                <strong>{map.nameKo}</strong>
                <small style={styles.mapDesc}>{map.description}</small>
              </button>
            ))}
          </div>
        </div>

        <div style={styles.section}>
          <label style={styles.label}>좀비 수: {zombieCount}</label>
          <input
            type="range"
            min={1}
            max={15}
            value={zombieCount}
            onChange={e => setZombieCount(Number(e.target.value))}
            style={styles.slider}
          />
        </div>

        <div style={styles.section}>
          <label style={styles.label}>난이도</label>
          <div style={styles.diffRow}>
            {(['easy', 'normal', 'hard'] as Difficulty[]).map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                style={{
                  ...styles.diffBtn,
                  ...(difficulty === d ? styles.diffBtnActive : {}),
                  ...(difficulty === d ? {
                    backgroundColor: d === 'easy' ? '#2d7a2d' : d === 'normal' ? '#cc8800' : '#cc2222',
                  } : {}),
                }}
              >
                {d === 'easy' ? '쉬움' : d === 'normal' ? '보통' : '어려움'}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleStart} style={styles.startBtn}>
          게임 시작
        </button>

        <div style={styles.controls}>
          <p style={styles.controlTitle}>조작법</p>
          <p style={styles.controlText}>WASD 또는 방향키로 이동</p>
          <p style={styles.controlText}>ESC: 일시정지</p>
          <p style={styles.controlText}>
            <span style={{ color: '#44ddff' }}>⚡ 속도 증가</span>
            {' | '}
            <span style={{ color: '#ff77aa' }}>❄ 좀비 둔화</span>
          </p>
          <p style={styles.controlText}>
            <span style={{ color: '#4a7a4a' }}>▲ 높은 지형</span>: 올라가면 좀비 회피 (hard 좀비 제외)
          </p>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    padding: 20,
  },
  card: {
    background: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
    padding: '40px 48px',
    maxWidth: 500,
    width: '100%',
    border: '1px solid rgba(255,255,255,0.1)',
    backdropFilter: 'blur(10px)',
  },
  title: {
    textAlign: 'center',
    color: '#ff4444',
    fontSize: 36,
    margin: 0,
    fontFamily: 'monospace',
    letterSpacing: 4,
    textShadow: '0 0 20px rgba(255,68,68,0.5)',
  },
  subtitle: {
    textAlign: 'center',
    color: '#aaa',
    fontSize: 14,
    marginTop: 8,
    marginBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    display: 'block',
    color: '#ddd',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  options: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap' as const,
  },
  optionBtn: {
    flex: 1,
    minWidth: 120,
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    color: '#ccc',
    cursor: 'pointer',
    textAlign: 'left' as const,
    fontSize: 13,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
  },
  optionBtnActive: {
    background: 'rgba(74,158,255,0.15)',
    borderColor: '#4a9eff',
    color: '#fff',
  },
  mapDesc: {
    fontSize: 11,
    opacity: 0.7,
  },
  slider: {
    width: '100%',
    accentColor: '#4a9eff',
  },
  diffRow: {
    display: 'flex',
    gap: 8,
  },
  diffBtn: {
    flex: 1,
    padding: '10px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    color: '#ccc',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 'bold',
  },
  diffBtnActive: {
    color: '#fff',
    borderColor: 'transparent',
  },
  startBtn: {
    width: '100%',
    padding: '14px 0',
    background: 'linear-gradient(135deg, #cc2222, #ff4444)',
    border: 'none',
    borderRadius: 10,
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    cursor: 'pointer',
    letterSpacing: 2,
    marginTop: 8,
    transition: 'transform 0.1s',
  },
  controls: {
    marginTop: 28,
    padding: '16px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.06)',
  },
  controlTitle: {
    color: '#aaa',
    fontSize: 12,
    margin: '0 0 8px 0',
    fontWeight: 'bold',
  },
  controlText: {
    color: '#888',
    fontSize: 12,
    margin: '4px 0',
  },
};
