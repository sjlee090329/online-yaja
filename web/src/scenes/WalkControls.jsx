import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Raycaster, Vector3 } from 'three'

const SPEED = 4 // m/s (Shift를 누르면 2배)
const BODY = 0.23 // 벽에서 이만큼 떨어져서 멈춘다 (몸 크기. 처음 값 0.35의 2/3)
const KNEE = 0.5 // 충돌을 검사하는 높이. 책상·사물함·벽에 걸린다
const KEYS = {
  KeyW: [0, 1], ArrowUp: [0, 1],
  KeyS: [0, -1], ArrowDown: [0, -1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
}

// 눈높이에서 걸어 다니기: WASD/방향키로 이동, 화면을 끌어서 둘러본다.
// 벽과 가구는 막히고, 문짝(userData.noCollide)은 그대로 통과한다.
export default function WalkControls() {
  const { camera, gl, scene } = useThree()
  const look = useRef({ yaw: -Math.PI / 2, pitch: 0 }) // 처음에 +x(2-2 쪽)를 본다
  const pressed = useRef(new Set())
  const ray = useMemo(() => new Raycaster(), [])

  useEffect(() => {
    const el = gl.domElement
    let dragging = false
    const down = (e) => {
      dragging = true
      el.setPointerCapture?.(e.pointerId)
    }
    const up = () => (dragging = false)
    const move = (e) => {
      if (!dragging) return
      // 오른쪽으로 끌면 오른쪽을 본다
      look.current.yaw -= e.movementX * 0.004
      look.current.pitch = Math.max(-1.2, Math.min(1.2, look.current.pitch - e.movementY * 0.004))
    }
    const keyDown = (e) => {
      if (KEYS[e.code] || e.code.startsWith('Shift')) {
        pressed.current.add(e.code)
        e.preventDefault()
      }
    }
    const keyUp = (e) => pressed.current.delete(e.code)
    const clear = () => pressed.current.clear()

    el.addEventListener('pointerdown', down)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('pointermove', move)
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    window.addEventListener('blur', clear)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.removeEventListener('pointermove', move)
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      window.removeEventListener('blur', clear)
    }
  }, [gl])

  // 이 방향으로 dist만큼 가도 되는지: 무릎 높이에서 광선을 쏴서 막히는지 본다
  const blocked = (from, dir, dist) => {
    ray.set(new Vector3(from.x, KNEE, from.z), dir)
    ray.far = dist + BODY
    return ray.intersectObjects(scene.children, true).some((hit) => !hit.object.userData.noCollide)
  }

  useFrame((_, dt) => {
    const { yaw, pitch } = look.current
    camera.rotation.set(pitch, yaw, 0, 'YXZ')

    let side = 0
    let ahead = 0
    for (const code of pressed.current) {
      if (!KEYS[code]) continue
      side += KEYS[code][0]
      ahead += KEYS[code][1]
    }
    if (!side && !ahead) return

    const running = [...pressed.current].some((c) => c.startsWith('Shift'))
    const dist = SPEED * (running ? 2 : 1) * Math.min(dt, 0.05)
    // 카메라는 yaw=0일 때 -z를 본다
    const fx = -Math.sin(yaw)
    const fz = -Math.cos(yaw)
    const move = new Vector3(fx * ahead - fz * side, 0, fz * ahead + fx * side).normalize()

    // 막히면 x축, z축 따로 시도해서 벽을 타고 미끄러지게 한다
    for (const step of [move, new Vector3(Math.sign(move.x), 0, 0), new Vector3(0, 0, Math.sign(move.z))]) {
      if (step.lengthSq() === 0) continue
      const scale = step === move ? 1 : Math.abs(step.x ? move.x : move.z)
      if (scale < 0.05 || blocked(camera.position, step, dist * scale)) continue
      camera.position.addScaledVector(step, dist * scale)
      break
    }
  })

  return null
}
