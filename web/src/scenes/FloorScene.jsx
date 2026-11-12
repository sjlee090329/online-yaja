import { OrbitControls, Grid, Text, Billboard } from '@react-three/drei'
import floor from '../map/floor.json'

const H = floor.height
const T = floor.wallThickness / 2 // 맞닿은 두 방의 벽이 합쳐져 wallThickness가 되도록 절반씩
const DOOR_W = 1.0
const DOOR_H = 2.1

// 지도 좌표(왼쪽-앞 모서리 기준) → 화면 좌표. 층 한가운데가 원점, 뒤쪽이 -z.
const CENTER_X = 28
const CENTER_Z = 21

const FLOOR_COLOR = {
  classroom: '#aebbd0',
  room: '#d6d4cc',
  toilet: '#c3d4cf',
  lounge: '#d9c7a3',
  stairs: '#9fa4a8',
  elevator: '#5b6168',
  shaft: '#8b9095',
  corridor: '#eceef0',
  outdoor: '#b5cca9',
}
const WALL_COLOR = '#8f969c'

// 벽이 없는 공간, 문 없이 사방이 막힌 공간
const NO_WALLS = new Set(['corridor', 'outdoor'])

// 길이 L인 벽에서 문 구멍을 뺀 나머지 구간들 [시작, 끝] (벽 중심 기준)
function solidSegments(L, doors) {
  const segs = []
  let cursor = -L / 2
  for (const c of [...doors].sort((a, b) => a - b)) {
    segs.push([cursor, c - DOOR_W / 2])
    cursor = c + DOOR_W / 2
  }
  segs.push([cursor, L / 2])
  return segs.filter(([a, b]) => b - a > 0.01)
}

function doorCenters(space, L) {
  if (space.type === 'classroom') return [-(L / 2 - 1.2), L / 2 - 1.2] // 앞문·뒷문
  if (space.type === 'stairs' || space.type === 'lounge') return null // 복도 쪽이 통째로 열림
  return [0]
}

// side: front(+z) / back(-z) / left(-x) / right(+x)
function Wall({ space, side }) {
  const { w, d } = space
  const alongX = side === 'front' || side === 'back'
  const L = alongX ? w : d
  const offset = (alongX ? d : w) / 2 - T / 2
  const sign = side === 'front' || side === 'right' ? 1 : -1

  const isDoorSide = space.door === side
  const doors = isDoorSide ? doorCenters(space, L) : []
  if (doors === null) return null

  const place = (along, y) => (alongX ? [along, y, sign * offset] : [sign * offset, y, along])
  const size = (len, h) => (alongX ? [len, h, T] : [T, h, len])

  return (
    <>
      {solidSegments(L, doors).map(([a, b], i) => (
        <mesh key={i} position={place((a + b) / 2, H / 2)} castShadow receiveShadow>
          <boxGeometry args={size(b - a, H)} />
          <meshStandardMaterial color={WALL_COLOR} />
        </mesh>
      ))}
      {/* 문 위 벽 */}
      {doors.map((c, i) => (
        <mesh key={`lintel-${i}`} position={place(c, (H + DOOR_H) / 2)}>
          <boxGeometry args={size(DOOR_W, H - DOOR_H)} />
          <meshStandardMaterial color={WALL_COLOR} />
        </mesh>
      ))}
    </>
  )
}

function Space({ space }) {
  const { x, z, w, d, type, label } = space
  const isClassroom = type === 'classroom'
  const hasWalls = !NO_WALLS.has(type)

  return (
    <group position={[x + w / 2 - CENTER_X, 0, -(z + d / 2) + CENTER_Z]}>
      {/* 바닥 */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[w, 0.1, d]} />
        <meshStandardMaterial color={FLOOR_COLOR[type]} />
      </mesh>

      {hasWalls && ['front', 'back', 'left', 'right'].map((side) => <Wall key={side} space={space} side={side} />)}

      {label && (
        <Billboard position={[0, hasWalls ? H + 0.9 : 1.2, 0]}>
          <Text
            fontSize={isClassroom ? 1.5 : 0.85}
            color={isClassroom ? '#1f3a8a' : '#30363b'}
            outlineWidth={0.06}
            outlineColor="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            {label}
          </Text>
        </Billboard>
      )}

      {/* 사람 크기 기준 막대 (키 1.7m) */}
      {space.id === '2-1' && (
        <mesh position={[0, 0.85, 0]} castShadow>
          <capsuleGeometry args={[0.22, 1.26, 4, 12]} />
          <meshStandardMaterial color="#e2674a" />
        </mesh>
      )}
    </group>
  )
}

export const floorCamera = { position: [-12, 80, 78], fov: 50, far: 500 }

// 층 전체 그레이박스
export default function FloorScene() {
  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight
        position={[30, 60, 40]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-camera-far={200}
      />

      {floor.spaces.map((space) => (
        <Space key={space.id} space={space} />
      ))}

      {/* 1칸 = 1m 격자 */}
      <Grid
        position={[0, -0.11, 0]}
        cellSize={1}
        sectionSize={8}
        cellColor="#b4bcc2"
        sectionColor="#7c868e"
        fadeDistance={220}
        infiniteGrid
      />

      <OrbitControls makeDefault target={[0, 0, 0]} maxPolarAngle={Math.PI / 2.05} minDistance={3} maxDistance={160} />
    </>
  )
}
