import { createContext, useContext, useMemo } from 'react'
import { BoxGeometry } from 'three'

// 사진 질감 묶음. null이면 단색으로 그린다.
// 값이 있으면 { floor, ceiling, wood, door } 처럼 이름 → 질감.
export const LookContext = createContext(null)

// 상자 각 면의 UV를 실제 크기에 맞춰 늘려, 질감이 tile(미터) 간격으로 반복되게 한다
function tileUV(geometry, [w, h, d], [tu, tv]) {
  const uv = geometry.attributes.uv
  const faceDims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]] // +x -x +y -y +z -z
  for (let i = 0; i < uv.count; i++) {
    const [fu, fv] = faceDims[Math.floor(i / 4)]
    uv.setXY(i, (uv.getX(i) * fu) / tu, (uv.getY(i) * fv) / tv)
  }
}

// tex: 질감 이름(사진 질감 모드에서만 쓰임), tile: 질감 한 장이 덮는 크기 [가로, 세로] (미터)
// unlit: 조명 계산 없이 질감 색 그대로 (천장처럼 아래에서 빛을 못 받는 면)
// passable: 걸어 다닐 때 막지 않고 통과시킨다 (문짝)
export default function Box({ size, position, color, tex, tile, shadow = true, unlit = false, passable = false }) {
  const look = useContext(LookContext)
  const map = (look && tex && look[tex]) || null
  const tiled = Boolean(map && tile)

  const geometry = useMemo(() => {
    const g = new BoxGeometry(...size)
    if (tiled) tileUV(g, size, tile)
    return g
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.join(), tiled, tile?.join()])

  return (
    <mesh geometry={geometry} position={position} castShadow={shadow} receiveShadow userData={{ noCollide: passable }}>
      {unlit ? (
        <meshBasicMaterial color={map ? '#f2f2f2' : color} map={map} />
      ) : (
        <meshStandardMaterial color={map ? '#ffffff' : color} map={map} roughness={0.85} />
      )}
    </mesh>
  )
}
