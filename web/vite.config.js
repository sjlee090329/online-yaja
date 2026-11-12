import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './', // GitHub Pages처럼 하위 경로(/저장소이름/)에 올려도 파일을 찾도록 상대 경로 사용
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // 같은 와이파이의 폰에서도 접속해 볼 수 있게
  },
})
