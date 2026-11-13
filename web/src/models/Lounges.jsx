import Box from './Box'

// 쉼터·휴게공간·개수대의 내부 모델.
// 공통 규칙: 원점은 바닥 한가운데, 복도 쪽으로 트인 면이 +z, 안쪽 벽이 -z.
// 치수와 배치는 전부 사진을 보고 어림잡은 값이다.

const WHITE = '#f4f4f1'
const WOOD_FLOOR = '#c69c6d'
const THEME = {
  blue: { wall: '#2f6fd0', seat: '#2a5fb8', book: ['#d9d2c0', '#8a5a44', '#3d5a80', '#c9b458'] },
  yellow: { wall: '#c9a43a', seat: '#6b6f76', book: ['#d9d2c0', '#3d3d3d', '#8a5a44', '#4a6fa5'] },
}
const WINDOW = '#bfe0f2'
const FRAME = '#3d4a4c'

const SHELF_W = 1.6
const SHELF_D = 0.3
const EAVE = 1.5 // 책장 옆기둥 높이
const PEAK = 2.0 // 집 모양 지붕 꼭대기

function Tilted({ size, position, angle, color }) {
  return (
    <mesh position={position} rotation={[0, 0, angle]} castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

// 책장 1칸. house=true면 집 모양(박공지붕) 테두리. 등판이 z=0, 방 안쪽으로 +z.
function ShelfUnit({ theme, house, books = false }) {
  const t = THEME[theme]
  const slope = Math.atan2(PEAK - EAVE, SHELF_W / 2)
  const roofLen = Math.hypot(PEAK - EAVE, SHELF_W / 2) + 0.06
  const z = SHELF_D / 2
  return (
    <group>
      <Box size={[SHELF_W, EAVE, 0.02]} position={[0, EAVE / 2, 0.01]} color={t.wall} shadow={false} />
      {[-1, 1].map((s) => (
        <Box key={s} size={[0.06, EAVE, SHELF_D]} position={[s * (SHELF_W / 2 - 0.03), EAVE / 2, z]} color={WHITE} />
      ))}
      {[0.12, 0.55, 0.95, 1.33].map((y) => (
        <Box key={y} size={[SHELF_W - 0.12, 0.03, SHELF_D]} position={[0, y, z]} color={WHITE} shadow={false} />
      ))}
      {house ? (
        [-1, 1].map((s) => (
          <Tilted key={s} size={[roofLen, 0.06, SHELF_D]} position={[(s * SHELF_W) / 4, (EAVE + PEAK) / 2, z]} angle={-s * slope} color={WHITE} />
        ))
      ) : (
        <Box size={[SHELF_W, 0.06, SHELF_D]} position={[0, EAVE, z]} color={WHITE} />
      )}
      {books &&
        [0.55, 0.95].map((y, row) =>
          t.book.map((c, i) => (
            <Box key={`${row}-${i}`} size={[0.22, 0.24, 0.16]} position={[-0.5 + i * 0.26 + row * 0.15, y + 0.135, z]} color={c} shadow={false} />
          )),
        )}
    </group>
  )
}

// 벽을 따라 책장 n칸. at = 첫 칸 중심 위치, turn = 벽 방향에 맞춘 회전
function ShelfRow({ n, position, turn, theme, house }) {
  return (
    <group position={position} rotation={[0, turn, 0]}>
      {Array.from({ length: n }, (_, i) => (
        <group key={i} position={[i * SHELF_W, 0, 0]}>
          <ShelfUnit theme={theme} house={house} books={i % 2 === 1} />
        </group>
      ))}
    </group>
  )
}

// 창가 부스: 테두리 + 마주 보는 의자 2개 + 테이블. 등이 z=0 (창 쪽), 방 안쪽으로 +z.
function Booth({ theme, house }) {
  const t = THEME[theme]
  const W = 1.8
  const D = 1.4
  const slope = Math.atan2(0.5, W / 2)
  const roofLen = Math.hypot(0.5, W / 2) + 0.06
  return (
    <group>
      {/* 방 쪽 입구 테두리 */}
      {[-1, 1].map((s) => (
        <Box key={s} size={[0.08, 1.7, house ? 0.08 : D]} position={[s * (W / 2), 0.85, house ? D : D / 2]} color={house ? WHITE : t.wall} />
      ))}
      {house &&
        [-1, 1].map((s) => (
          <Tilted key={s} size={[roofLen, 0.08, 0.08]} position={[(s * W) / 4, 1.95, D]} angle={-s * slope} color={WHITE} />
        ))}
      {/* 의자 2개와 테이블 */}
      {[-1, 1].map((s) => (
        <Box key={s} size={[0.45, 0.45, D - 0.2]} position={[s * (W / 2 - 0.3), 0.225, D / 2]} color={t.seat} />
      ))}
      <Box size={[0.6, 0.04, D - 0.4]} position={[0, 0.72, D / 2]} color={WHITE} />
      <Box size={[0.08, 0.7, 0.08]} position={[0, 0.35, D / 2]} color={WHITE} />
    </group>
  )
}

function WindowPanel({ w, position, turn = 0 }) {
  return (
    <group position={position} rotation={[0, turn, 0]}>
      <Box size={[w, 1.2, 0.02]} position={[0, 0, 0]} color={WINDOW} shadow={false} unlit />
      {[-w / 2, 0, w / 2].map((x) => (
        <Box key={x} size={[0.06, 1.2, 0.04]} position={[x, 0, 0]} color={FRAME} shadow={false} />
      ))}
      {[-0.6, 0.25, 0.6].map((y) => (
        <Box key={y} size={[w, 0.06, 0.04]} position={[0, y, 0]} color={FRAME} shadow={false} />
      ))}
    </group>
  )
}

// 드림쉼터(blue, 집 모양) / 지성쉼터(yellow, 네모 책장). 8x8m 기준.
export function Shelter({ w, d, theme = 'blue', ceiling = false }) {
  const t = THEME[theme]
  const house = theme === 'blue'
  const hw = w / 2
  const hd = d / 2
  const H = 2.5
  return (
    <group>
      <Box size={[w - 0.2, 0.012, d - 0.1]} position={[0, 0.006, 0]} color={WOOD_FLOOR} shadow={false} />

      {/* 벽 위쪽 색띠 (안쪽 벽, 양옆 벽) */}
      <Box size={[w - 0.2, H - EAVE, 0.02]} position={[0, (H + EAVE) / 2, -hd + 0.12]} color={t.wall} shadow={false} />
      {[-1, 1].map((s) => (
        <Box key={s} size={[0.02, H - EAVE, d - 0.2]} position={[s * (hw - 0.12), (H + EAVE) / 2, 0]} color={t.wall} shadow={false} />
      ))}
      {ceiling && <Box size={[w * 0.6, 0.02, d * 0.6]} position={[0, H - 0.03, -d * 0.1]} color={t.wall} shadow={false} unlit />}

      {/* 왼쪽 벽: 책장 4칸 / 안쪽 벽 왼편: 책장 2칸 */}
      <ShelfRow n={4} position={[-hw + 0.12, 0, -hd + 0.2 + SHELF_W * 3.5]} turn={Math.PI / 2} theme={theme} house={house} />
      <ShelfRow n={2} position={[-hw + 0.5 + SHELF_W / 2, 0, -hd + 0.12]} turn={0} theme={theme} house={house} />

      {/* 안쪽 벽 오른편: 창문과 부스 2개 */}
      <WindowPanel w={3.6} position={[hw - 2.1, 1.5, -hd + 0.13]} />
      {[hw - 3.1, hw - 1.2].map((x) => (
        <group key={x} position={[x, 0, -hd + 0.15]}>
          <Booth theme={theme} house={house} />
        </group>
      ))}

      {/* 오른쪽 벽: 흰 책장 */}
      <ShelfRow n={3} position={[hw - 0.12, 0, hd - 1.2 - SHELF_W * 2.5]} turn={-Math.PI / 2} theme={theme} house={false} />

      {/* 지성쉼터에만: 큐브 의자와 긴 테이블 */}
      {!house && (
        <>
          {[[-0.6, -1.6], [0.1, -1.9], [-1.3, -2.0]].map(([x, z]) => (
            <Box key={x} size={[0.45, 0.45, 0.45]} position={[x, 0.225, z]} color={t.wall} />
          ))}
          <Box size={[2.4, 0.04, 0.7]} position={[1.2, 0.72, 1.6]} color={WHITE} />
          {[0.2, 2.2].map((x) => (
            <Box key={x} size={[0.06, 0.7, 0.6]} position={[x, 0.35, 1.6]} color="#9aa0a5" />
          ))}
        </>
      )}
    </group>
  )
}

// 2-5와 2-6 사이 휴게공간: 양쪽 벽 벤치, 가운데 흰 원형 테이블, 안쪽 끝 창문
export function RestArea({ w, d }) {
  const hw = w / 2
  const hd = d / 2
  const seats = ['#2c3e66', WHITE, '#6b6f76', '#2c3e66']
  return (
    <group>
      <WindowPanel w={w - 1} position={[0, 1.5, -hd + 0.13]} />
      {[-1, 1].flatMap((s) =>
        [0, 1].map((i) => {
          const z = -hd + 2 + i * 2.6
          const x = s * (hw - 0.4)
          return (
            <group key={`${s}-${i}`}>
              <Box size={[0.5, 0.08, 2.4]} position={[x, 0.42, z]} color={seats[i + (s > 0 ? 2 : 0)]} />
              <Box size={[0.05, 0.4, 2.4]} position={[s * (hw - 0.17), 0.72, z]} color={seats[i + (s > 0 ? 2 : 0)]} />
              {[-1.1, 1.1].map((dz) => (
                <Box key={dz} size={[0.5, 0.4, 0.05]} position={[x, 0.2, z + dz]} color="#22262b" />
              ))}
            </group>
          )
        }),
      )}
      <mesh position={[0, 0.72, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.45, 0.04, 24]} />
        <meshStandardMaterial color={WHITE} />
      </mesh>
      <mesh position={[0, 0.36, 0]}>
        <cylinderGeometry args={[0.04, 0.2, 0.72, 16]} />
        <meshStandardMaterial color={WHITE} />
      </mesh>
    </group>
  )
}

// 개수대: 짙은 바닥, 초록 정수기, 스테인리스 세면대, 거울
export function SinkAlcove({ w, d }) {
  const hd = d / 2
  return (
    <group>
      <Box size={[w - 0.2, 0.012, d - 0.1]} position={[0, 0.006, 0]} color="#4b4f54" shadow={false} />
      <Box size={[w - 1, 0.8, 0.02]} position={[0, 1.6, -hd + 0.13]} color="#c9d6dc" shadow={false} />
      {/* 정수기 */}
      <Box size={[1.7, 0.95, 0.6]} position={[-w / 4, 0.475, -hd + 0.45]} color={WHITE} />
      <Box size={[1.6, 0.5, 0.02]} position={[-w / 4, 0.3, -hd + 0.76]} color="#7ac043" shadow={false} />
      <Box size={[1.7, 0.5, 0.1]} position={[-w / 4, 1.2, -hd + 0.2]} color={WHITE} />
      {/* 세면대 */}
      <Box size={[2.2, 0.25, 0.55]} position={[w / 4, 0.75, -hd + 0.42]} color="#aeb4b9" />
      <Box size={[2.0, 0.6, 0.4]} position={[w / 4, 0.3, -hd + 0.4]} color="#8d9398" />
      <Box size={[2.2, 0.05, 0.2]} position={[w / 4, 1.05, -hd + 0.22]} color="#8a4a3a" shadow={false} />
    </group>
  )
}
