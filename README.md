# 온라인 야자실

2학년 층을 웹 3D로 옮긴 온라인 독서실. 설계와 결정 사항은 [세션요약파일.md](세션요약파일.md)에 있다.

## 다른 기기에서 이어서 작업하기

Node.js(LTS)와 Git이 필요하다.

```bash
git clone <이 저장소 주소>
cd <저장소 폴더>/web
npm install
npm run dev
```

브라우저에서 http://localhost:5173 을 연다.

## 구조

- `web/` — 화면 (React + Vite + React Three Fiber)
- `web/src/map/floor.json` — 층 배치 데이터 (미터 단위). 방을 옮기거나 치수를 고칠 때는 이 파일만 수정한다.
- `web/src/map/classroom.json` — 교실 템플릿 치수 (책상, 사물함, 문, 창문 등)
- `web/src/models/` — 교실과 가구 모델. 색은 `palette.js`에 모여 있다.
- `web/src/scenes/` — 화면 두 개: 층 전체(`#floor`), 교실 작업실(`#classroom`)
- `.github/workflows/deploy.yml` — `main`에 올리면 GitHub Pages로 자동 배포

학교 사진은 저장소에 올리지 않는다 (`.gitignore` 참고).
