import { C } from './palette'

function Box({ size, position, color, ...rest }) {
  return (
    <mesh position={position} castShadow receiveShadow {...rest}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

// 책상 1개 + 의자 1개. 원점은 책상 중심의 바닥, 학생은 -z 쪽을 본다 (의자는 +z).
export default function DeskSet({ desk, chair, style = 'wood' }) {
  const { w, d, h } = desk
  const accent = style === 'blue' ? C.blue : C.chairWood
  const legX = w / 2 - 0.04
  const chairZ = d / 2 + 0.28
  const { seatW, seatH, backH } = chair
  const chairLegX = seatW / 2 - 0.02

  return (
    <group>
      {/* 책상 상판, 앞가림판, 다리 */}
      <Box size={[w, 0.03, d]} position={[0, h - 0.015, 0]} color={C.deskTop} />
      <Box size={[w - 0.1, 0.26, 0.02]} position={[0, h - 0.19, -d / 2 + 0.03]} color={accent} />
      {[-legX, legX].map((x) => (
        <group key={x}>
          <Box size={[0.04, h - 0.03, 0.04]} position={[x, (h - 0.03) / 2, 0]} color={C.metal} />
          <Box size={[0.04, 0.03, d]} position={[x, 0.015, 0]} color={C.metal} />
        </group>
      ))}

      {/* 의자 좌판, 등받이, 다리 */}
      <Box size={[seatW, 0.03, seatW]} position={[0, seatH, chairZ]} color={accent} />
      <Box size={[seatW, 0.24, 0.03]} position={[0, backH - 0.12, chairZ + seatW / 2]} color={accent} />
      {[-chairLegX, chairLegX].map((x) => (
        <group key={x}>
          <Box size={[0.03, seatH, 0.03]} position={[x, seatH / 2, chairZ - seatW / 2 + 0.03]} color={C.metal} />
          <Box size={[0.03, backH, 0.03]} position={[x, backH / 2, chairZ + seatW / 2]} color={C.metal} />
          <Box size={[0.03, 0.03, seatW]} position={[x, 0.015, chairZ]} color={C.metal} />
        </group>
      ))}
    </group>
  )
}
