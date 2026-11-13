import { useMemo } from 'react'
import { OrbitControls, useTexture } from '@react-three/drei'
import { MirroredRepeatWrapping, SRGBColorSpace } from 'three'
import Classroom from '../models/Classroom'
import { LookContext } from '../models/Box'

// 교실 뒤쪽 복도 편 구석에서 칠판을 바라보는 눈높이
export const photoCamera = { position: [3.3, 1.55, 3.1], fov: 65, near: 0.05, far: 200 }

const url = (name) => `${import.meta.env.BASE_URL}textures/${name}.jpg`

// 사진 질감 예시: 학교 사진에서 잘라 원근을 편 질감을 교실 템플릿에 입힌다
export default function PhotoScene() {
  const loaded = useTexture({
    floor: url('floor'),
    ceiling: url('ceiling'),
    wood: url('wood'),
    door: url('door'),
  })

  const look = useMemo(() => {
    for (const [name, t] of Object.entries(loaded)) {
      t.colorSpace = SRGBColorSpace
      t.anisotropy = 8
      if (name !== 'door') t.wrapS = t.wrapT = MirroredRepeatWrapping // 이음매가 덜 보이게 거울 반복
      t.needsUpdate = true
    }
    return loaded
  }, [loaded])

  return (
    <LookContext.Provider value={look}>
      <color attach="background" args={['#cfe3f2']} />
      <ambientLight intensity={1.1} />
      <hemisphereLight args={['#ffffff', '#b9b4a8', 0.5]} />
      {/* 창으로 들어오는 햇빛 */}
      <directionalLight
        position={[3, 6, -11]}
        intensity={1.6}
        color="#fff4e0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0005}
      />
      {/* 천장 등 */}
      {[-2.4, 2.4].flatMap((x) => [-2, 2].map((z) => <pointLight key={[x, z].join()} position={[x, 2.3, z]} intensity={2.5} />))}

      <Classroom ceiling />

      {/* 회전 중심을 카메라 바로 앞에 둬서, 끌면 제자리에서 둘러보는 느낌이 나게 한다 */}
      <OrbitControls makeDefault target={[2.91, 1.51, 2.79]} rotateSpeed={-0.4} minDistance={0.3} maxDistance={6} />
    </LookContext.Provider>
  )
}
