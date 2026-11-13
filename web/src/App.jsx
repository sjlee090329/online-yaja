import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import FloorScene, { floorCamera } from './scenes/FloorScene'
import ClassroomScene, { classroomCamera } from './scenes/ClassroomScene'
import PhotoScene, { photoCamera } from './scenes/PhotoScene'

const VIEWS = {
  floor: { label: '층 전체', Scene: FloorScene, camera: floorCamera },
  plan: { label: '평면 보기', Scene: FloorScene, camera: { position: [0, 135, 0.1], fov: 40, far: 600 } }, // 바로 위에서 내려다봄 (도면과 비교용)
  classroom: { label: '교실 작업실', Scene: ClassroomScene, camera: classroomCamera },
  // 사진 질감 예시는 학교 사진에서 잘라낸 이미지가 필요해서, 이 컴퓨터의 개발 서버에서만 보인다 (공개 사이트에는 없음)
  ...(import.meta.env.DEV
    ? { photo: { label: '사진 질감 예시', Scene: PhotoScene, camera: photoCamera, flat: true } } // flat: 톤 보정 끔
    : {}),
}

const viewFromHash = () => (VIEWS[location.hash.slice(1)] ? location.hash.slice(1) : 'floor')

export default function App() {
  const [view, setView] = useState(viewFromHash)

  // 주소 끝의 #classroom / #floor 로 화면을 고른다 (링크로 바로 열 수 있게)
  useEffect(() => {
    const onHash = () => setView(viewFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const { Scene, camera, flat = false } = VIEWS[view]

  return (
    <>
      <Canvas key={view} shadows flat={flat} camera={camera} dpr={[1, 2]}>
        <color attach="background" args={['#dfe5e8']} />
        <Scene />
      </Canvas>

      <nav style={{ position: 'fixed', top: 12, left: 12, display: 'flex', gap: 6 }}>
        {Object.entries(VIEWS).map(([id, v]) => (
          <a
            key={id}
            href={`#${id}`}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 14,
              textDecoration: 'none',
              color: id === view ? '#fff' : '#1f2933',
              background: id === view ? '#1f3a8a' : 'rgba(255,255,255,0.9)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}
          >
            {v.label}
          </a>
        ))}
      </nav>
    </>
  )
}
