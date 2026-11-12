import { OrbitControls, Grid } from '@react-three/drei'
import Classroom from '../models/Classroom'

export const classroomCamera = { position: [7.5, 8.5, 7.5], fov: 50, far: 200 }

// 교실 작업실: 교실 템플릿 1개만 가까이서 본다
export default function ClassroomScene() {
  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight
        position={[4, 12, -6]}
        intensity={1.3}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />

      <Classroom />

      {/* 사람 크기 기준 막대 (키 1.7m) */}
      <mesh position={[-2.9, 0.85, -0.6]} castShadow>
        <capsuleGeometry args={[0.22, 1.26, 4, 12]} />
        <meshStandardMaterial color="#e2674a" />
      </mesh>

      <Grid
        position={[0, -0.11, 0]}
        cellSize={1}
        sectionSize={4}
        cellColor="#b4bcc2"
        sectionColor="#7c868e"
        fadeDistance={50}
        infiniteGrid
      />

      <OrbitControls makeDefault target={[0, 0.8, 0]} maxPolarAngle={Math.PI / 2.02} minDistance={0.5} maxDistance={40} />
    </>
  )
}
