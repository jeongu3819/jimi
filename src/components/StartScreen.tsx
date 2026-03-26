import React, { useState } from 'react';
import { GameSettings, Difficulty, GameMode, VisionMode } from '../game/types';
import { mapList } from '../game/maps';

interface Props {
  onStart: (settings: GameSettings) => void;
}

export function StartScreen({ onStart }: Props) {
  const [mapId, setMapId] = useState(mapList[0].id);
  const [zombieCount, setZombieCount] = useState(5);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [gameMode, setGameMode] = useState<GameMode>('first_caught');
  const [visionMode, setVisionMode] = useState<VisionMode>('normal');
  const [playerCount, setPlayerCount] = useState(1);
  const [playerNames, setPlayerNames] = useState(['', '', '', '']);

  const handleStart = () => {
    const names = playerNames.map((n, i) => n.trim() || `P${i + 1}`);
    onStart({
      mapId, zombieCount, difficulty, gameMode, visionMode,
      playerCount,
      playerNames: names.slice(0, playerCount),
    });
  };

  const updateName = (index: number, name: string) => {
    const updated = [...playerNames];
    updated[index] = name;
    setPlayerNames(updated);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>ZOMBIE SURVIVAL</h1>
        <p style={styles.subtitle}>좀비를 피해 살아남아라! - 커피내기 에디션</p>

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

        <div style={styles.row}>
          <div style={{ ...styles.section, flex: 1 }}>
            <label style={styles.label}>플레이어 수: {playerCount}명</label>
            <input
              type="range" min={1} max={4}
              value={playerCount}
              onChange={e => setPlayerCount(Number(e.target.value))}
              style={styles.slider}
            />
          </div>
          <div style={{ ...styles.section, flex: 1 }}>
            <label style={styles.label}>좀비 수: {zombieCount}</label>
            <input
              type="range" min={1} max={20}
              value={zombieCount}
              onChange={e => setZombieCount(Number(e.target.value))}
              style={styles.slider}
            />
          </div>
        </div>

        {playerCount > 1 && (
          <div style={styles.section}>
            <label style={styles.label}>플레이어 이름</label>
            <div style={styles.nameGrid}>
              {Array.from({ length: playerCount }).map((_, i) => (
                <input
                  key={i}
                  type="text"
                  placeholder={`P${i + 1}`}
                  value={playerNames[i]}
                  onChange={e => updateName(i, e.target.value)}
                  maxLength={8}
                  style={{
                    ...styles.nameInput,
                    borderColor: ['#4a9eff', '#44dd55', '#ff77aa', '#ffaa33'][i],
                  }}
                />
              ))}
            </div>
          </div>
        )}

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

        {playerCount > 1 && (
          <div style={styles.section}>
            <label style={styles.label}>게임 모드</label>
            <div style={styles.diffRow}>
              <button
                onClick={() => setGameMode('first_caught')}
                style={{
                  ...styles.diffBtn,
                  ...(gameMode === 'first_caught' ? { ...styles.diffBtnActive, backgroundColor: '#cc4400' } : {}),
                }}
              >
                <strong>First Caught</strong>
                <small style={{ fontSize: 10, opacity: 0.8, display: 'block' }}>
                  먼저 잡힌 사람이 짐
                </small>
              </button>
              <button
                onClick={() => setGameMode('last_survivor')}
                style={{
                  ...styles.diffBtn,
                  ...(gameMode === 'last_survivor' ? { ...styles.diffBtnActive, backgroundColor: '#2d5a7a' } : {}),
                }}
              >
                <strong>Last Survivor</strong>
                <small style={{ fontSize: 10, opacity: 0.8, display: 'block' }}>
                  마지막 1명이 승리
                </small>
              </button>
            </div>
          </div>
        )}

        <div style={styles.section}>
          <label style={styles.label}>시야 모드</label>
          <div style={styles.diffRow}>
            <button
              onClick={() => setVisionMode('normal')}
              style={{
                ...styles.diffBtn,
                ...(visionMode === 'normal' ? { ...styles.diffBtnActive, backgroundColor: '#555' } : {}),
              }}
            >
              일반 시야
            </button>
            <button
              onClick={() => setVisionMode('blackout')}
              style={{
                ...styles.diffBtn,
                ...(visionMode === 'blackout' ? { ...styles.diffBtnActive, backgroundColor: '#222', border: '1px solid #666' } : {}),
              }}
            >
              암전 모드
            </button>
          </div>
        </div>

        <button onClick={handleStart} style={styles.startBtn}>
          게임 시작
        </button>

        <div style={styles.controls}>
          <p style={styles.controlTitle}>조작법</p>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <p style={styles.controlText}><strong style={{ color: '#4a9eff' }}>P1</strong>: WASD + Space(방어막)</p>
              {playerCount > 1 && <p style={styles.controlText}><strong style={{ color: '#44dd55' }}>P2</strong>: 방향키 + Enter(방어막)</p>}
              {playerCount > 2 && <p style={styles.controlText}><strong style={{ color: '#ff77aa' }}>P3</strong>: IJKL + U(방어막)</p>}
              {playerCount > 3 && <p style={styles.controlText}><strong style={{ color: '#ffaa33' }}>P4</strong>: 8456(넘패드) + 0(방어막)</p>}
            </div>
            <div style={{ flex: 1 }}>
              <p style={styles.controlText}>ESC: 일시정지</p>
              <p style={styles.controlText}>
                <span style={{ color: '#44ddff' }}>&#9889; 속도 증가</span>
                {' | '}
                <span style={{ color: '#ff77aa' }}>&#10052; 좀비 둔화</span>
              </p>
              <p style={styles.controlText}>
                <span style={{ color: '#4a7a4a' }}>&#9650; 높은 지형</span>: 임시 안전지대 (오래 머물면 위험!)
              </p>
              <p style={styles.controlText}>
                방어막: 한 판에 1회, 2.5초 무적
              </p>
            </div>
          </div>
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
    overflowY: 'auto',
  },
  card: {
    background: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
    padding: '32px 40px',
    maxWidth: 560,
    width: '100%',
    border: '1px solid rgba(255,255,255,0.1)',
    backdropFilter: 'blur(10px)',
  },
  title: {
    textAlign: 'center',
    color: '#ff4444',
    fontSize: 32,
    margin: 0,
    fontFamily: 'monospace',
    letterSpacing: 4,
    textShadow: '0 0 20px rgba(255,68,68,0.5)',
  },
  subtitle: {
    textAlign: 'center',
    color: '#aaa',
    fontSize: 13,
    marginTop: 6,
    marginBottom: 24,
  },
  section: {
    marginBottom: 18,
  },
  row: {
    display: 'flex',
    gap: 16,
  },
  label: {
    display: 'block',
    color: '#ddd',
    fontSize: 13,
    marginBottom: 6,
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
    padding: '8px 10px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    color: '#ccc',
    cursor: 'pointer',
    textAlign: 'left' as const,
    fontSize: 12,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 3,
  },
  optionBtnActive: {
    background: 'rgba(74,158,255,0.15)',
    borderColor: '#4a9eff',
    color: '#fff',
  },
  mapDesc: {
    fontSize: 10,
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
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    color: '#ccc',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 'bold',
  },
  diffBtnActive: {
    color: '#fff',
    borderColor: 'transparent',
  },
  nameGrid: {
    display: 'flex',
    gap: 8,
  },
  nameInput: {
    flex: 1,
    padding: '6px 8px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 6,
    color: '#fff',
    fontSize: 13,
    outline: 'none',
  },
  startBtn: {
    width: '100%',
    padding: '12px 0',
    background: 'linear-gradient(135deg, #cc2222, #ff4444)',
    border: 'none',
    borderRadius: 10,
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    cursor: 'pointer',
    letterSpacing: 2,
    marginTop: 4,
  },
  controls: {
    marginTop: 20,
    padding: '12px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.06)',
  },
  controlTitle: {
    color: '#aaa',
    fontSize: 11,
    margin: '0 0 6px 0',
    fontWeight: 'bold',
  },
  controlText: {
    color: '#888',
    fontSize: 11,
    margin: '3px 0',
  },
};
