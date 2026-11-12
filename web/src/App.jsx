import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import FloorScene, { floorCamera } from './scenes/FloorScene'
import ClassroomScene, { classroomCamera } from './scenes/ClassroomScene'

const VIEWS = {
  floor: { label: '층 전체', Scene: FloorScene, camera: floorCamera },
  classroom: { label: '교실 작업실', Scene: ClassroomScene, camera: classroomCamera },
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

  const { Scene, camera } = VIEWS[view]

  return (
    <>
      <Canvas key={view} shadows camera={camera} dpr={[1, 2]}>
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
