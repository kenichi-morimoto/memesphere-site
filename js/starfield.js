/**
 * トップページの背景星空。
 * Wordsphere ランディングの背景星（CosmosBackground の BG 星: 2500 個、
 * 球面分布、回転 y = t*0.002 / x = sin(t*0.001)*0.02、色 #8c8ccc→#c2b7ff、
 * 背景 #04040a）を色反転して描く。
 * 定義・語・ユーザーのグラフ星と線は描かない。Wordsphere パッケージには依存しない。
 */

const BG_STAR_COUNT = 2500;
const BACKGROUND = "#fbfbf5";
const COLOR_A = [115, 115, 51];
const COLOR_B = [61, 72, 0];

const canvas = document.getElementById("starfield");
const ctx = canvas.getContext("2d");

const stars = [];
for (let i = 0; i < BG_STAR_COUNT; i++) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const radius = 40 + Math.random() * 100;
  stars.push({
    x: radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.sin(phi) * Math.sin(theta),
    z: radius * Math.cos(phi),
    size: Math.random() * 2.5 + 0.5,
    bright: Math.random() * 0.7 + 0.3,
  });
}

const startedAt = performance.now();

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.floor(window.innerWidth * dpr));
  canvas.height = Math.max(1, Math.floor(window.innerHeight * dpr));
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function frame(now) {
  const t = (now - startedAt) / 1000;
  const ry = t * 0.002;
  const rx = Math.sin(t * 0.001) * 0.02;
  const cosY = Math.cos(ry);
  const sinY = Math.sin(ry);
  const cosX = Math.cos(rx);
  const sinX = Math.sin(rx);
  const viewW = window.innerWidth;
  const viewH = window.innerHeight;
  const aspect = viewW / Math.max(viewH, 1);
  const focal = 1 / Math.tan((50 * Math.PI) / 360);

  ctx.setTransform(canvas.width / viewW, 0, 0, canvas.height / viewH, 0, 0);
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, viewW, viewH);

  for (const star of stars) {
    const y1 = star.y * cosX - star.z * sinX;
    const z1 = star.y * sinX + star.z * cosX;
    const x2 = star.x * cosY + z1 * sinY;
    const z2 = -star.x * sinY + z1 * cosY;
    if (z2 >= -0.5) continue;
    const depth = -z2;
    const ndcX = (x2 / depth) * (focal / aspect);
    const ndcY = (y1 / depth) * focal;
    const sx = (ndcX * 0.5 + 0.5) * viewW;
    const sy = (-ndcY * 0.5 + 0.5) * viewH;
    const pointSize = star.size * (200 / depth);
    const r = mix(COLOR_A[0], COLOR_B[0], star.bright);
    const g = mix(COLOR_A[1], COLOR_B[1], star.bright);
    const b = mix(COLOR_A[2], COLOR_B[2], star.bright);
    ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${star.bright * 0.8})`;
    ctx.beginPath();
    ctx.arc(sx, sy, Math.max(pointSize * 0.5, 0.3), 0, Math.PI * 2);
    ctx.fill();
  }

  requestAnimationFrame(frame);
}

resize();
window.addEventListener("resize", resize);
requestAnimationFrame(frame);
