/**
 * サービスページとカンパニーページの背景星空。トップは landing-sky.js。
 * 背景星（2500、球面、回転 y = t*0.002 / x = sin(t*0.001)*0.02、視野角 50°）に、
 * 単語星とユーザー星をランダムに散らして線で結ぶ。定義の星は置かない。
 * 背景色は CSS の --sky（ごく薄い青）。星の色は背景星 #8c8ccc、ユーザー星 #6673cc。
 * カメラはランディング先頭の周回（半径 22、上下振幅 10、速度 0.012）。
 */

const BG_STAR_COUNT = 2500;
const WORD_COUNT = 70;
const USER_COUNT = 25;
const SPREAD = 55;
const WORD_COLOR = "#8c8ccc";
const USER_COLOR = "#6673cc";
const LINE_ALPHA = 0.45;

const canvas = document.getElementById("starfield");
const ctx = canvas.getContext("2d");

const bgStars = [];
for (let i = 0; i < BG_STAR_COUNT; i++) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const radius = 40 + Math.random() * 100;
  bgStars.push({
    x: radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.sin(phi) * Math.sin(theta),
    z: radius * Math.cos(phi),
    size: Math.random() * 2.5 + 0.5,
    bright: Math.random() * 0.7 + 0.3,
  });
}

const nodes = [];
for (let i = 0; i < WORD_COUNT; i++) {
  nodes.push({
    kind: "word",
    x: (Math.random() - 0.5) * SPREAD,
    y: (Math.random() - 0.5) * SPREAD,
    z: (Math.random() - 0.5) * SPREAD,
    size: 0.35 + Math.random() * 0.2,
  });
}
const userStart = nodes.length;
for (let i = 0; i < USER_COUNT; i++) {
  nodes.push({
    kind: "user",
    x: (Math.random() - 0.5) * SPREAD,
    y: (Math.random() - 0.5) * SPREAD,
    z: (Math.random() - 0.5) * SPREAD,
    size: 0.2 + Math.random() * 0.15,
  });
}

const links = [];
for (let w = 0; w < WORD_COUNT; w++) {
  links.push([w, userStart + Math.floor(Math.random() * USER_COUNT)]);
}
for (let u = 0; u < USER_COUNT; u++) {
  links.push([Math.floor(Math.random() * WORD_COUNT), userStart + u]);
}

const startedAt = performance.now();
const sky = getComputedStyle(document.body).backgroundColor;

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.floor(window.innerWidth * dpr));
  canvas.height = Math.max(1, Math.floor(window.innerHeight * dpr));
}

function poseAt(t) {
  const a = t * 0.012;
  const camX = Math.sin(a) * 22;
  const camY = Math.sin(a * 1.4) * 10;
  const camZ = Math.cos(a * 0.7) * 22;
  const la = a + 0.35;
  const lookX = Math.sin(la) * 22 * 0.25;
  const lookY = Math.sin(la * 1.4) * 10 * 0.25;
  const lookZ = Math.cos(la * 0.7) * 22 * 0.25;
  let zx = camX - lookX;
  let zy = camY - lookY;
  let zz = camZ - lookZ;
  const zl = Math.hypot(zx, zy, zz) || 1;
  zx /= zl;
  zy /= zl;
  zz /= zl;
  let xx = zz;
  let xy = 0;
  let xz = -zx;
  const xl = Math.hypot(xx, xy, xz) || 1;
  xx /= xl;
  xy /= xl;
  xz /= xl;
  const yx = zy * xz - zz * xy;
  const yy = zz * xx - zx * xz;
  const yz = zx * xy - zy * xx;
  return { camX, camY, camZ, xx, xy, xz, yx, yy, yz, zx, zy, zz };
}

function viewOf(pose, x, y, z) {
  const dx = x - pose.camX;
  const dy = y - pose.camY;
  const dz = z - pose.camZ;
  return {
    vx: dx * pose.xx + dy * pose.xy + dz * pose.xz,
    vy: dx * pose.yx + dy * pose.yy + dz * pose.yz,
    vz: dx * pose.zx + dy * pose.zy + dz * pose.zz,
  };
}

function rotateBg(star, ry, rx) {
  const cosY = Math.cos(ry);
  const sinY = Math.sin(ry);
  const cosX = Math.cos(rx);
  const sinX = Math.sin(rx);
  const y1 = star.y * cosX - star.z * sinX;
  const z1 = star.y * sinX + star.z * cosX;
  return {
    x: star.x * cosY + z1 * sinY,
    y: y1,
    z: -star.x * sinY + z1 * cosY,
  };
}

function project(view, viewW, viewH, focal, aspect) {
  if (view.vz >= -0.5) return null;
  const depth = -view.vz;
  const ndcX = (view.vx / depth) * (focal / aspect);
  const ndcY = (view.vy / depth) * focal;
  return {
    sx: (ndcX * 0.5 + 0.5) * viewW,
    sy: (-ndcY * 0.5 + 0.5) * viewH,
    depth,
  };
}

function frame(now) {
  const t = (now - startedAt) / 1000;
  const pose = poseAt(t);
  const ry = t * 0.002;
  const rx = Math.sin(t * 0.001) * 0.02;
  const viewW = window.innerWidth;
  const viewH = window.innerHeight;
  const aspect = viewW / Math.max(viewH, 1);
  const focal = 1 / Math.tan((50 * Math.PI) / 360);

  ctx.setTransform(canvas.width / viewW, 0, 0, canvas.height / viewH, 0, 0);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, viewW, viewH);

  for (const star of bgStars) {
    const spun = rotateBg(star, ry, rx);
    const point = project(viewOf(pose, spun.x, spun.y, spun.z), viewW, viewH, focal, aspect);
    if (!point) continue;
    const pointSize = star.size * (200 / point.depth);
    const mix = star.bright;
    const r = (0x8c + (0x66 - 0x8c) * mix) | 0;
    const g = (0x8c + (0x73 - 0x8c) * mix) | 0;
    const b = (0xcc + (0xcc - 0xcc) * mix) | 0;
    ctx.fillStyle = `rgba(${r},${g},${b},${star.bright * 0.8})`;
    ctx.beginPath();
    ctx.arc(point.sx, point.sy, Math.max(pointSize * 0.5, 0.3), 0, Math.PI * 2);
    ctx.fill();
  }

  const projected = nodes.map((node) => {
    const point = project(viewOf(pose, node.x, node.y, node.z), viewW, viewH, focal, aspect);
    if (!point) return null;
    const radius = Math.min(node.size * (viewH * focal) / point.depth, viewH * 0.08);
    return { ...point, radius, kind: node.kind };
  });

  ctx.strokeStyle = `rgba(102, 115, 204, ${LINE_ALPHA})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const [from, to] of links) {
    const a = projected[from];
    const b = projected[to];
    if (!a || !b) continue;
    ctx.moveTo(a.sx, a.sy);
    ctx.lineTo(b.sx, b.sy);
  }
  ctx.stroke();

  const visible = projected.filter(Boolean).sort((a, b) => b.depth - a.depth);
  for (const node of visible) {
    ctx.fillStyle = node.kind === "word" ? WORD_COLOR : USER_COLOR;
    ctx.beginPath();
    ctx.arc(node.sx, node.sy, Math.max(node.radius, 0.3), 0, Math.PI * 2);
    ctx.fill();
  }

  requestAnimationFrame(frame);
}

resize();
window.addEventListener("resize", resize);
requestAnimationFrame(frame);
