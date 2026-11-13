import { createContext, useContext, useMemo } from 'react'
import { DoubleSide, Shape } from 'three'
import { OrbitControls, Grid, Text, Billboard } from '@react-three/drei'
import floor from '../map/floor.json'
import Classroom from '../models/Classroom'
import WalkControls from './WalkControls'

const H = floor.height
const T = floor.wallThickness / 2 // 맞닿은 두 방의 벽이 합쳐져 wallThickness가 되도록 절반씩
const DOOR_W = 1.0
const DOOR_H = 2.1

// 지도 좌표 → 화면 좌표: 지도의 (x, z)는 화면의 (x, -z). 뒤쪽이 -z.
// 전체를 CENTER만큼 옮겨 층 한가운데가 원점에 오게 한다 (FloorScene의 바깥 group).
const CENTER_X = 27
const CENTER_Z = 36

const FLOOR_COLOR = {
  classroom: '#d2d1cb',
  room: '#d6d4cc',
  toilet: '#c3d4cf',
  lounge: '#d9c7a3',
  stairs: '#b9bcbe',
  elevator: '#8d9398',
  corridor: '#dcdcd6',
  outdoor: '#b5cca9',
}
const WALL_COLOR = '#ecebe6'
const WOOD = '#c9a06a'

// 방 종류별 문짝 색
const DOOR_COLOR = { room: WOOD, toilet: '#8fa3a1', elevator: '#b4b9be' }

// 벽이 없는 공간
const NO_WALLS = new Set(['corridor', 'outdoor'])

// 걸어 다니기 화면이면 true: 천장을 덮고, 위에 띄운 이름표를 숨긴다
const WalkContext = createContext(false)

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

function Slab({ size, position, color, shadow = true, passable = false, opacity }) {
  return (
    <mesh position={position} castShadow={shadow} receiveShadow userData={{ noCollide: passable }}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} transparent={opacity !== undefined} opacity={opacity ?? 1} />
    </mesh>
  )
}

// 문 위나 입구 위에 붙는 방 이름판. out = 복도 쪽 방향(+1 또는 -1, 벽의 로컬 z 기준)
function NamePlate({ label, x, out, color = '#2f6fb5' }) {
  if (!label) return null
  const w = Math.max(0.7, label.length * 0.17 + 0.2)
  return (
    <group position={[x, DOOR_H + 0.2, out * (T / 2 + 0.02)]} rotation={[0, out > 0 ? 0 : Math.PI, 0]}>
      <mesh>
        <boxGeometry args={[w, 0.26, 0.02]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <Text position={[0, 0, 0.012]} fontSize={0.15} color="#ffffff" anchorX="center" anchorY="middle">
        {label}
      </Text>
    </group>
  )
}

// 벽 한 줄. 원점은 벽 가운데 바닥, 로컬 x가 벽 방향.
// doors: 문 중심 위치 목록. null이면 복도 쪽이 통째로 열린 입구(위쪽 보만 남김).
function WallRun({ L, doors, type, label, out }) {
  const open = doors === null
  const needsTactile = type === 'stairs' || type === 'toilet'

  return (
    <>
      {open ? (
        // 트인 입구: 위쪽 보
        <Slab size={[L, H - DOOR_H, T]} position={[0, (H + DOOR_H) / 2, 0]} color={WALL_COLOR} />
      ) : (
        <>
          {solidSegments(L, doors).map(([a, b]) => (
            <Slab key={a} size={[b - a, H, T]} position={[(a + b) / 2, H / 2, 0]} color={WALL_COLOR} />
          ))}
          {doors.map((c) => (
            <group key={c}>
              <Slab size={[DOOR_W, H - DOOR_H, T]} position={[c, (H + DOOR_H) / 2, 0]} color={WALL_COLOR} />
              {/* 문짝: 걸어 다닐 때는 그대로 통과한다 */}
              <Slab
                size={[DOOR_W, DOOR_H, 0.05]}
                position={[c, DOOR_H / 2, 0]}
                color={DOOR_COLOR[type] ?? WOOD}
                opacity={type === 'toilet' ? 0.85 : undefined}
                passable
              />
            </group>
          ))}
        </>
      )}

      {(open || doors.length > 0) && <NamePlate label={label} x={open ? 0 : doors[0]} out={out} />}

      {/* 계단 입구 위 비상구 유도등 */}
      {type === 'stairs' && <Slab size={[0.45, 0.2, 0.06]} position={[0, DOOR_H - 0.15, out * 0.08]} color="#1f9d55" shadow={false} />}

      {/* 계단·화장실 문 앞 노란 점자블록 */}
      {needsTactile &&
        (open ? [0] : doors).map((c) => (
          <Slab key={`t${c}`} size={[open ? Math.min(L - 0.4, 1.5) : 0.9, 0.012, 0.3]} position={[c, 0.006, out * 0.45]} color="#d9a441" shadow={false} />
        ))}
    </>
  )
}

function doorCenters(space, L) {
  if (space.type === 'stairs' || space.type === 'lounge') return null // 복도 쪽이 통째로 열림
  return [0]
}

// side: front(+z) / back(-z) / left(-x) / right(+x)
function Wall({ space, side }) {
  const { w, d } = space
  const alongX = side === 'front' || side === 'back'
  const L = alongX ? w : d
  const offset = (alongX ? d : w) / 2 - T / 2
  const sign = side === 'front' || side === 'right' ? 1 : -1 // 바깥(복도) 쪽이 로컬 +z인지
  const isDoorSide = space.door === side

  return (
    <group position={alongX ? [0, 0, sign * offset] : [sign * offset, 0, 0]} rotation={[0, alongX ? 0 : Math.PI / 2, 0]}>
      <WallRun L={L} doors={isDoorSide ? doorCenters(space, L) : []} type={space.type} label={space.label} out={sign} />
    </group>
  )
}

// 천장과 LED 등 (걸어 다니기 화면에서만)
function Ceiling({ w, d }) {
  const alongX = w >= d
  const n = Math.max(1, Math.round((alongX ? w : d) / 4))
  const lights = Array.from({ length: n }, (_, i) => ((i + 0.5) / n - 0.5) * (alongX ? w : d))
  return (
    <>
      <mesh position={[0, H + 0.025, 0]}>
        <boxGeometry args={[w, 0.05, d]} />
        <meshBasicMaterial color="#f1f1ee" />
      </mesh>
      {lights.map((p) => (
        <mesh key={p} position={alongX ? [p, H - 0.011, 0] : [0, H - 0.011, p]}>
          <boxGeometry args={alongX ? [1.2, 0.02, 0.3] : [0.3, 0.02, 1.2]} />
          <meshBasicMaterial color="#ffffff" />
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
  const SILL = 0.9
  const TOP = 2.1
  const n = Math.round(L / 3)
  const posts = Array.from({ length: n + 1 }, (_, i) => -L / 2 + (L * i) / n)

  return (
    <group position={[(x1 + x2) / 2, 0, -(z1 + z2) / 2]} rotation={[0, alongZ ? Math.PI / 2 : 0, 0]}>
      {windows ? (
        <>
          <Slab size={[L, SILL, t]} position={[0, SILL / 2, 0]} color={WALL_COLOR} />
          <Slab size={[L, H - TOP, t]} position={[0, (H + TOP) / 2, 0]} color={WALL_COLOR} />
          {posts.map((p) => (
            <Slab key={p} size={[0.3, TOP - SILL, t]} position={[p, (SILL + TOP) / 2, 0]} color={WALL_COLOR} />
          ))}
          <Slab size={[L, TOP - SILL, 0.04]} position={[0, (SILL + TOP) / 2, 0]} color="#9fd0ea" opacity={0.45} shadow={false} />
        </>
      ) : (
        <Slab size={[L, H, t]} position={[0, H / 2, 0]} color={WALL_COLOR} />
      )}
    </group>
  )
}

function FloatingLabel({ label, position, big = false }) {
  const walk = useContext(WalkContext)
  if (!label || walk) return null
  return (
    <Billboard position={position}>
      <Text
        fontSize={big ? 1.5 : 0.85}
        color={big ? '#1f3a8a' : '#30363b'}
        outlineWidth={0.06}
        outlineColor="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </Billboard>
  )
}

// 다각형 방: 꼭짓점 목록(points)으로 바닥을 만들고 변마다 벽을 세운다.
// 직각이 아닌 모서리나 ㄱ자 방에 쓴다.
function PolygonSpace({ space }) {
  const walk = useContext(WalkContext)
  const { points, type, label, doorEdges = [] } = space

  const shape = useMemo(() => {
    const s = new Shape()
    points.forEach(([px, pz], i) => (i ? s.lineTo(px, pz) : s.moveTo(px, pz)))
    return s
  }, [points])

  const cx = points.reduce((sum, p) => sum + p[0], 0) / points.length
  const cz = points.reduce((sum, p) => sum + p[1], 0) / points.length

  return (
    <group>
      {/* 바닥: XY 평면에 그린 모양을 눕히면 (x, z) → (x, 0, -z) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} receiveShadow>
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial color={FLOOR_COLOR[type]} />
      </mesh>
      {walk && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, H, 0]}>
          <shapeGeometry args={[shape]} />
          <meshBasicMaterial color="#f1f1ee" side={DoubleSide} />
        </mesh>
      )}

      {points.map(([x1, z1], i) => {
        const [x2, z2] = points[(i + 1) % points.length]
        const L = Math.hypot(x2 - x1, z2 - z1)
        const angle = Math.atan2(z2 - z1, x2 - x1)
        const mx = (x1 + x2) / 2
        const mz = (z1 + z2) / 2
        // 벽의 로컬 +z가 방 안쪽(중심 쪽)을 향하면 복도는 -z 쪽
        const localZ = [Math.sin(angle), -Math.cos(angle)] // 로컬 +z의 지도 좌표 (x, z) 방향
        const inward = (cx - mx) * localZ[0] + (cz - mz) * localZ[1] > 0
        return (
          <group key={i} position={[mx, 0, -mz]} rotation={[0, angle, 0]}>
            <WallRun L={L} doors={doorEdges.includes(i) ? [0] : []} type={type} label={label} out={inward ? -1 : 1} />
          </group>
        )
      })}

      <FloatingLabel label={label} position={[cx, H + 0.9, -cz]} />
    </group>
  )
}

// 교실 문 옆에 복도로 튀어나온 반 팻말
function ClassSign({ label, w, d, front }) {
  const z = (front ? 1 : -1) * (d / 2 + 0.22)
  return (
    <group position={[w / 2 - 0.45, 2.2, z]}>
      <mesh>
        <boxGeometry args={[0.03, 0.3, 0.4]} />
        <meshStandardMaterial color="#f4f4f1" />
      </mesh>
      <mesh position={[0, 0.11, 0]}>
        <boxGeometry args={[0.034, 0.08, 0.4]} />
        <meshStandardMaterial color="#e8792b" />
      </mesh>
      {[1, -1].map((s) => (
        <Text key={s} position={[s * 0.02, -0.03, 0]} rotation={[0, (s * Math.PI) / 2, 0]} fontSize={0.14} color="#1f2933" anchorX="center" anchorY="middle">
          {label}
        </Text>
      ))}
    </group>
  )
}

function Space({ space }) {
  const walk = useContext(WalkContext)
  if (space.points) return <PolygonSpace space={space} />
  const { x, z, w, d, type, label } = space
  const center = [x + w / 2, 0, -(z + d / 2)]

  // 막힌 덩어리: 천장까지 꽉 찬 상자
  if (type === 'solid') return <Slab size={[w, H, d]} position={[center[0], H / 2, center[2]]} color={WALL_COLOR} />

  // 교실은 상세 모델을 놓는다. 모델의 복도 쪽은 A타입 +z, B타입 -z 이므로
  // 실제 문이 난 쪽(door)과 맞지 않으면 반 바퀴 돌린다.
  if (type === 'classroom') {
    const variant = space.variant ?? 'B'
    const modelCorridor = variant === 'B' ? 'back' : 'front'
    return (
      <group position={center}>
        <group rotation={[0, space.door === modelCorridor ? 0 : Math.PI, 0]}>
          <Classroom variant={variant} ceiling={walk} />
        </group>
        <ClassSign label={label} w={w} d={d} front={space.door === 'front'} />
        <FloatingLabel label={label} position={[0, H + 0.9, 0]} big />
      </group>
    )
  }

  const hasWalls = !NO_WALLS.has(type)
  return (
    <group position={center}>
      {/* 바닥 */}
      <mesh position={[0, -0.05 - (space.drop ?? 0), 0]} receiveShadow>
        <boxGeometry args={[w, 0.1, d]} />
        <meshStandardMaterial color={FLOOR_COLOR[type]} />
      </mesh>

      {hasWalls && ['front', 'back', 'left', 'right'].map((side) => <Wall key={side} space={space} side={side} />)}
      {walk && type !== 'outdoor' && <Ceiling w={w} d={d} />}

      <FloatingLabel label={label} position={[0, hasWalls ? H + 0.9 : 1.2, 0]} />
    </group>
  )
}

export const floorCamera = { position: [-14, 100, 92], fov: 50, far: 600 }
export const planCamera = { position: [0, 135, 0.1], fov: 40, far: 600 }

// 걸어 다니기 시작 위치: 엘리베이터 앞 복도에서 2-2 쪽을 본다
const EYE_HEIGHT = 1.0 // 캐릭터 눈높이 (처음 값 1.5m의 2/3, 사용자 요청)
const WALK_START = [11 - CENTER_X, EYE_HEIGHT, -9.5 + CENTER_Z]
export const walkCamera = { position: WALK_START, fov: 70, near: 0.05, far: 300 }

const mainSpaces = floor.spaces.filter((s) => !s.frame)

// 층 전체. walk=true면 눈높이에서 걸어 다니는 화면.
export default function FloorScene({ walk = false }) {
  return (
    <WalkContext.Provider value={walk}>
      {walk && <color attach="background" args={['#cfe3f2']} />}
      <ambientLight intensity={walk ? 1.0 : 0.8} />
      <directionalLight
        position={[30, 60, 40]}
        intensity={1.5}
        castShadow={!walk}
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

      {walk ? (
        <WalkControls />
      ) : (
        <>
          {/* 1칸 = 1m 격자 */}
          <Grid position={[0, -0.11, 0]} cellSize={1} sectionSize={8} cellColor="#b4bcc2" sectionColor="#7c868e" fadeDistance={220} infiniteGrid />
          <OrbitControls makeDefault target={[0, 0, 0]} maxPolarAngle={Math.PI / 2.05} minDistance={3} maxDistance={220} />
        </>
      )}
    </WalkContext.Provider>
  )
}

export function WalkScene() {
  return <FloorScene walk />
}
