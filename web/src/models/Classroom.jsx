import spec from '../map/classroom.json'
import { C } from './palette'
import { useContext, useLayoutEffect, useMemo, useRef } from 'react'
import { Color, Matrix4, Quaternion, Vector3 } from 'three'
import DeskSet, { deskParts } from './Desk'
import Box, { LookContext } from './Box'

const W = spec.width // x: 칠판(-x) ↔ 사물함(+x)
const D = spec.depth // z: 창문(-z) ↔ 복도(+z)
const H = spec.height
const WALL_T = 0.1 // 벽은 8x8m 안쪽에 세운다 (옆 교실과 겹치지 않게)
const WOOD_TILE = [0.4, 0.64]

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

// 책걸상 30자리를 한 번에 그린다 (상자 390개 → 그리기 1번). 층 전체에 14개 반을 놓아도 가볍게.
function InstancedSeats() {
  const ref = useRef()
  const items = useMemo(() => {
    const parts = deskParts(spec.desk, spec.chair, spec.furnitureStyle)
    const turn = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2)
    return seatPositions().flatMap((s) =>
      parts.map((part) => {
        const pos = new Vector3(...part.position).applyQuaternion(turn).add(new Vector3(s.x, 0, s.z))
        return { matrix: new Matrix4().compose(pos, turn, new Vector3(...part.size)), color: new Color(part.color) }
      }),
    )
  }, [])

  useLayoutEffect(() => {
    items.forEach((item, i) => {
      ref.current.setMatrixAt(i, item.matrix)
      ref.current.setColorAt(i, item.color)
    })
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.instanceColor.needsUpdate = true
  }, [items])

  return (
    <instancedMesh ref={ref} args={[null, null, items.length]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.85} />
    </instancedMesh>
  )
}

function Seats() {
  const look = useContext(LookContext)
  if (!look) return <InstancedSeats />
  // 사진 질감 모드: 의자·책상에 나무 질감을 입혀야 해서 상자를 하나씩 그린다
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
      <Box size={[WALL_T, H, D]} position={[x + WALL_T / 2, H / 2, 0]} color={C.wall} />
      <Box size={[0.03, h + 0.1, w + 0.1]} position={[x + WALL_T + 0.015, bottom + h / 2, 0]} color={C.boardFrame} />
      <Box size={[0.02, h, w]} position={[x + WALL_T + 0.035, bottom + h / 2, 0]} color={C.white} />
      {/* 교탁 */}
      <Box size={[p.d, p.h, p.w]} position={[p.x, p.h / 2, p.z]} color={C.white} />
    </>
  )
}

// 뒷벽 + 사물함: +x
function BackWall() {
  const { columns, tiers, cellW, cellH, depth } = spec.lockers
  const x = W / 2 - WALL_T // 벽 안쪽 면
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
  const z = D / 2 - WALL_T / 2
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
          <Box size={[doorW, doorH, 0.05]} position={[x, doorH / 2, z]} color={C.wood} tex="door" />
          <Glass size={[0.12, 0.7, 0.06]} position={[x - doorW / 4, 1.45, z]} />
          <Box size={[doorW, H - doorH, WALL_T]} position={[x, (H + doorH) / 2, z]} color={C.woodDark} tex="wood" tile={WOOD_TILE} />
        </group>
      ))}
      {/* 가운데: 아래 흰 판, 위 나무 창틀과 유리 */}
      <Box size={[midW, panelH, WALL_T]} position={[(midL + midR) / 2, panelH / 2, z]} color={C.wall} />
      <Glass size={[midW, H - panelH, 0.02]} position={[(midL + midR) / 2, (H + panelH) / 2, z]} />
      {[panelH + 0.03, doorH, H - 0.03].map((y) => (
        <Box key={y} size={[midW, 0.06, WALL_T]} position={[(midL + midR) / 2, y, z]} color={C.wood} tex="wood" tile={WOOD_TILE} />
      ))}
      {mullions.map((x) => (
        <Box key={x} size={[0.06, H - panelH, WALL_T]} position={[x, (H + panelH) / 2, z]} color={C.wood} tex="wood" tile={WOOD_TILE} />
      ))}
    </>
  )
}

// 창문 쪽 벽: -z
function WindowWall() {
  const { sill, h, w, centersX } = spec.window
  const z = -D / 2 + WALL_T / 2
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
// 천장 + LED 등 (안에서 볼 때만 쓴다. 위에서 내려다보면 교실을 가린다)
function Ceiling() {
  const lights = [-2.4, 0, 2.4].flatMap((x) => [-2, 2].map((z) => [x, z]))
  return (
    <>
      <Box size={[W, 0.05, D]} position={[0, H + 0.025, 0]} color={C.white} tex="ceiling" tile={[0.6, 0.39]} shadow={false} unlit />
      {lights.map(([x, z]) => (
        <mesh key={[x, z].join()} position={[x, H - 0.011, z]}>
          <boxGeometry args={[1.2, 0.02, 0.3]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
    </>
  )
}

// variant: 'A' = 칠판을 볼 때 문이 왼쪽·창이 오른쪽 (2-1, 2-14), 'B' = 좌우 반대 (나머지 반)
export default function Classroom({ ceiling = false, variant = 'A' }) {
  return (
    <group scale={[1, 1, variant === 'B' ? -1 : 1]}>
      <Box size={[W, 0.1, D]} position={[0, -0.05, 0]} color={C.floor} tex="floor" tile={[0.45, 0.45]} shadow={false} />
      {ceiling && <Ceiling />}
      <FrontWall />
      <BackWall />
      <CorridorWall />
      <WindowWall />
      <Seats />
    </group>
  )
}
