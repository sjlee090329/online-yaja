import { OrbitControls, Grid, Text, Billboard } from '@react-three/drei'
import floor from '../map/floor.json'
import Classroom from '../models/Classroom'

const H = floor.height
const T = floor.wallThickness / 2 // 맞닿은 두 방의 벽이 합쳐져 wallThickness가 되도록 절반씩
const DOOR_W = 1.0
const DOOR_H = 2.1

// 지도 좌표 → 화면 좌표: 지도의 (x, z)는 화면의 (x, -z). 뒤쪽이 -z.
// 전체를 CENTER만큼 옮겨 층 한가운데가 원점에 오게 한다 (FloorScene의 바깥 group).
const CENTER_X = 28
const CENTER_Z = 34

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

// 방에 속하지 않는 독립 벽. 창문 벽이면 창턱 + 유리 + 윗벽 + 기둥으로 그린다.
function FreeWall({ wall }) {
  const { x1, z1, x2, z2, windows } = wall
  const alongZ = x1 === x2
  const L = alongZ ? Math.abs(z2 - z1) : Math.abs(x2 - x1)
  const t = floor.wallThickness
  const position = [(x1 + x2) / 2, 0, -(z1 + z2) / 2]
  const size = (len, h, thick = t) => (alongZ ? [thick, h, len] : [len, h, thick])
  const at = (along, y) => (alongZ ? [0, y, along] : [along, y, 0])
  const SILL = 0.9
  const TOP = 2.1

  if (!windows) {
    return (
      <mesh position={[position[0], H / 2, position[2]]} castShadow receiveShadow>
        <boxGeometry args={size(L, H)} />
        <meshStandardMaterial color={WALL_COLOR} />
      </mesh>
    )
  }

  const posts = Array.from({ length: Math.round(L / 3) + 1 }, (_, i) => -L / 2 + (L * i) / Math.round(L / 3))
  return (
    <group position={position}>
      <mesh position={at(0, SILL / 2)} castShadow receiveShadow>
        <boxGeometry args={size(L, SILL)} />
        <meshStandardMaterial color={WALL_COLOR} />
      </mesh>
      <mesh position={at(0, (H + TOP) / 2)} castShadow>
        <boxGeometry args={size(L, H - TOP)} />
        <meshStandardMaterial color={WALL_COLOR} />
      </mesh>
      {posts.map((p) => (
        <mesh key={p} position={at(p, (SILL + TOP) / 2)} castShadow>
          <boxGeometry args={size(0.3, TOP - SILL)} />
          <meshStandardMaterial color={WALL_COLOR} />
        </mesh>
      ))}
      <mesh position={at(0, (SILL + TOP) / 2)}>
        <boxGeometry args={size(L, TOP - SILL, 0.04)} />
        <meshStandardMaterial color="#9fd0ea" transparent opacity={0.45} />
      </mesh>
    </group>
  )
}

function Space({ space }) {
  const { x, z, w, d, type, label } = space

  // 막힌 덩어리: 천장까지 꽉 찬 상자
  if (type === 'solid') {
    return (
      <mesh position={[x + w / 2, H / 2, -(z + d / 2)]} castShadow receiveShadow>
        <boxGeometry args={[w, H, d]} />
        <meshStandardMaterial color={WALL_COLOR} />
      </mesh>
    )
  }

  const isClassroom = type === 'classroom'
  const hasWalls = !NO_WALLS.has(type)

  // 교실은 상세 모델을 놓는다. 모델의 복도 쪽은 A타입 +z, B타입 -z 이므로
  // 실제 문이 난 쪽(door)과 맞지 않으면 반 바퀴 돌린다.
  if (isClassroom) {
    const variant = space.variant ?? 'B'
    const modelCorridor = variant === 'B' ? 'back' : 'front'
    return (
      <group position={[x + w / 2, 0, -(z + d / 2)]}>
        <group rotation={[0, space.door === modelCorridor ? 0 : Math.PI, 0]}>
          <Classroom variant={variant} />
        </group>
        <Billboard position={[0, H + 0.9, 0]}>
          <Text fontSize={1.5} color="#1f3a8a" outlineWidth={0.06} outlineColor="#ffffff" anchorX="center" anchorY="middle">
            {label}
          </Text>
        </Billboard>
      </group>
    )
  }

  return (
    <group position={[x + w / 2, 0, -(z + d / 2)]}>
      {/* 바닥 */}
      <mesh position={[0, -0.05 - (space.drop ?? 0), 0]} receiveShadow>
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

    </group>
  )
}

export const floorCamera = { position: [-14, 100, 92], fov: 50, far: 600 }

const mainSpaces = floor.spaces.filter((s) => !s.frame)

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
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
        shadow-camera-far={200}
      />

      <group position={[-CENTER_X, 0, CENTER_Z]}>
        {mainSpaces.map((space) => (
          <Space key={space.id} space={space} />
        ))}
        {(floor.walls ?? []).map((wall) => (
          <FreeWall key={wall.id} wall={wall} />
        ))}
        {/* 틀어진 건물: 자체 좌표를 쓰는 공간 묶음 */}
        {Object.entries(floor.frames ?? {}).map(([name, f]) => (
          <group key={name} position={[f.originX, 0, -f.originZ]} rotation={[0, (f.angleDeg * Math.PI) / 180, 0]}>
            {floor.spaces
              .filter((s) => s.frame === name)
              .map((space) => (
                <Space key={space.id} space={space} />
              ))}
          </group>
        ))}
      </group>

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

      <OrbitControls makeDefault target={[0, 0, 0]} maxPolarAngle={Math.PI / 2.05} minDistance={3} maxDistance={220} />
    </>
  )
}
