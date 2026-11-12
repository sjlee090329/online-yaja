import spec from '../map/classroom.json'
import { C } from './palette'
import DeskSet from './Desk'

const W = spec.width // x: 칠판(-x) ↔ 사물함(+x)
const D = spec.depth // z: 창문(-z) ↔ 복도(+z)
const H = spec.height
const WALL_T = 0.1

function Box({ size, position, color, shadow = true }) {
  return (
    <mesh position={position} castShadow={shadow} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

function Glass({ size, position }) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={C.glass} transparent opacity={0.35} />
    </mesh>
  )
}

// 자리 목록: 번호는 복도 쪽 앞자리부터 뒤로, 그다음 줄로 넘어간다 (임시 규칙)
export function seatPositions() {
  const { rows, firstRowX, rowPitch, pairCentersZ } = spec.seating
  const half = spec.desk.w / 2 + 0.01
  const columnsZ = [...pairCentersZ].sort((a, b) => b - a).flatMap((z) => [z + half, z - half])
  const seats = []
  columnsZ.forEach((z) => {
    for (let r = 0; r < rows; r++) seats.push({ no: seats.length + 1, x: firstRowX + r * rowPitch, z })
  })
  return seats
}

function Seats() {
  return seatPositions().map((s) => (
    <group key={s.no} position={[s.x, 0, s.z]} rotation={[0, Math.PI / 2, 0]}>
      <DeskSet desk={spec.desk} chair={spec.chair} style={spec.furnitureStyle} />
    </group>
  ))
}

// 칠판(화이트보드) 벽: -x
function FrontWall() {
  const { w, h, bottom } = spec.whiteboard
  const p = spec.podium
  const x = -W / 2
  return (
    <>
      <Box size={[WALL_T, H, D]} position={[x - WALL_T / 2, H / 2, 0]} color={C.wall} />
      <Box size={[0.03, h + 0.1, w + 0.1]} position={[x + 0.015, bottom + h / 2, 0]} color={C.boardFrame} />
      <Box size={[0.02, h, w]} position={[x + 0.035, bottom + h / 2, 0]} color={C.white} />
      {/* 교탁 */}
      <Box size={[p.d, p.h, p.w]} position={[p.x, p.h / 2, p.z]} color={C.white} />
    </>
  )
}

// 뒷벽 + 사물함: +x
function BackWall() {
  const { columns, tiers, cellW, cellH, depth } = spec.lockers
  const x = W / 2
  const length = columns * cellW
  const doors = []
  for (let c = 0; c < columns; c++) {
    for (let t = 0; t < tiers; t++) {
      doors.push(
        <Box
          key={`${c}-${t}`}
          size={[0.02, cellH - 0.04, cellW - 0.04]}
          position={[x - depth - 0.01, cellH * (t + 0.5), -length / 2 + cellW * (c + 0.5)]}
          color={(c + t) % 2 ? C.white : C.blue}
          shadow={false}
        />,
      )
    }
  }
  return (
    <>
      <Box size={[WALL_T, H, D]} position={[x + WALL_T / 2, H / 2, 0]} color={C.wall} />
      <Box size={[depth, tiers * cellH, length]} position={[x - depth / 2, (tiers * cellH) / 2, 0]} color={C.white} />
      {doors}
    </>
  )
}

// 복도 쪽 벽: +z. 양 끝에 앞문·뒷문, 가운데는 아래 흰 판 + 위 나무 창틀
function CorridorWall() {
  const { w: doorW, h: doorH, fromEnd } = spec.door
  const { panelH, panes } = spec.corridorWall
  const z = D / 2 + WALL_T / 2
  const doorXs = [-(W / 2 - fromEnd), W / 2 - fromEnd]
  const midL = doorXs[0] + doorW / 2
  const midR = doorXs[1] - doorW / 2
  const midW = midR - midL
  const endW = fromEnd - doorW / 2
  const mullions = Array.from({ length: panes + 1 }, (_, i) => midL + (midW * i) / panes)

  return (
    <>
      {/* 양 끝 벽 */}
      {[-1, 1].map((s) => (
        <Box key={s} size={[endW, H, WALL_T]} position={[s * (W / 2 - endW / 2), H / 2, z]} color={C.wall} />
      ))}
      {/* 문 + 문 위 고창 */}
      {doorXs.map((x) => (
        <group key={x}>
          <Box size={[doorW, doorH, 0.05]} position={[x, doorH / 2, z]} color={C.wood} />
          <Glass size={[0.12, 0.7, 0.06]} position={[x - doorW / 4, 1.45, z]} />
          <Box size={[doorW, H - doorH, WALL_T]} position={[x, (H + doorH) / 2, z]} color={C.woodDark} />
        </group>
      ))}
      {/* 가운데: 아래 흰 판, 위 나무 창틀과 유리 */}
      <Box size={[midW, panelH, WALL_T]} position={[(midL + midR) / 2, panelH / 2, z]} color={C.wall} />
      <Glass size={[midW, H - panelH, 0.02]} position={[(midL + midR) / 2, (H + panelH) / 2, z]} />
      {[panelH + 0.03, doorH, H - 0.03].map((y) => (
        <Box key={y} size={[midW, 0.06, WALL_T]} position={[(midL + midR) / 2, y, z]} color={C.wood} />
      ))}
      {mullions.map((x) => (
        <Box key={x} size={[0.06, H - panelH, WALL_T]} position={[x, (H + panelH) / 2, z]} color={C.wood} />
      ))}
    </>
  )
}

// 창문 쪽 벽: -z
function WindowWall() {
  const { sill, h, w, centersX } = spec.window
  const z = -D / 2 - WALL_T / 2
  const top = sill + h
  const edges = [-W / 2, ...centersX.flatMap((c) => [c - w / 2, c + w / 2]), W / 2]
  const piers = []
  for (let i = 0; i < edges.length; i += 2) piers.push([edges[i], edges[i + 1]])
  const f = 0.06

  return (
    <>
      <Box size={[W, sill, WALL_T]} position={[0, sill / 2, z]} color={C.wall} />
      <Box size={[W, H - top, WALL_T]} position={[0, (H + top) / 2, z]} color={C.wall} />
      {piers.map(([a, b]) => (
        <Box key={a} size={[b - a, h, WALL_T]} position={[(a + b) / 2, sill + h / 2, z]} color={C.wall} />
      ))}
      {centersX.map((cx) => (
        <group key={cx} position={[cx, sill + h / 2, z]}>
          <Glass size={[w, h, 0.02]} position={[0, 0, 0]} />
          {/* 새시: 테두리, 가운데 세로대, 위쪽 가로대 */}
          <Box size={[w, f, 0.08]} position={[0, h / 2 - f / 2, 0]} color={C.windowFrame} />
          <Box size={[w, f, 0.08]} position={[0, -h / 2 + f / 2, 0]} color={C.windowFrame} />
          <Box size={[w, f, 0.08]} position={[0, h / 2 - 0.4, 0]} color={C.windowFrame} />
          {[-w / 2 + f / 2, 0, w / 2 - f / 2].map((x) => (
            <Box key={x} size={[f, h, 0.08]} position={[x, 0, 0]} color={C.windowFrame} />
          ))}
        </group>
      ))}
    </>
  )
}

// 교실 템플릿 1개. 원점은 교실 바닥 한가운데.
export default function Classroom() {
  return (
    <group>
      <Box size={[W, 0.1, D]} position={[0, -0.05, 0]} color={C.floor} shadow={false} />
      <FrontWall />
      <BackWall />
      <CorridorWall />
      <WindowWall />
      <Seats />
    </group>
  )
}
