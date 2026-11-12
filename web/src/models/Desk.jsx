import { C } from './palette'
import Box from './Box'

// 책상 1개 + 의자 1개를 이루는 상자 목록.
// 원점은 책상 중심의 바닥, 학생은 -z 쪽을 본다 (의자는 +z).
export function deskParts(desk, chair, style = 'wood') {
  const { w, d, h } = desk
  const { seatW, seatH, backH } = chair
  const accent = style === 'blue' ? C.blue : C.chairWood
  const tex = style === 'blue' ? undefined : 'wood'
  const legX = w / 2 - 0.04
  const chairZ = d / 2 + 0.28
  const chairLegX = seatW / 2 - 0.02

  return [
    // 책상 상판, 앞가림판, 다리
    { size: [w, 0.03, d], position: [0, h - 0.015, 0], color: C.deskTop },
    { size: [w - 0.1, 0.26, 0.02], position: [0, h - 0.19, -d / 2 + 0.03], color: accent, tex },
    ...[-legX, legX].flatMap((x) => [
      { size: [0.04, h - 0.03, 0.04], position: [x, (h - 0.03) / 2, 0], color: C.metal },
      { size: [0.04, 0.03, d], position: [x, 0.015, 0], color: C.metal },
    ]),
    // 의자 좌판, 등받이, 다리
    { size: [seatW, 0.03, seatW], position: [0, seatH, chairZ], color: accent, tex },
    { size: [seatW, 0.24, 0.03], position: [0, backH - 0.12, chairZ + seatW / 2], color: accent, tex },
    ...[-chairLegX, chairLegX].flatMap((x) => [
      { size: [0.03, seatH, 0.03], position: [x, seatH / 2, chairZ - seatW / 2 + 0.03], color: C.metal },
      { size: [0.03, backH, 0.03], position: [x, backH / 2, chairZ + seatW / 2], color: C.metal },
      { size: [0.03, 0.03, seatW], position: [x, 0.015, chairZ], color: C.metal },
    ]),
  ]
}

export default function DeskSet({ desk, chair, style = 'wood' }) {
  return (
    <group>
      {deskParts(desk, chair, style).map((part, i) => (
        <Box key={i} {...part} />
      ))}
    </group>
  )
}
