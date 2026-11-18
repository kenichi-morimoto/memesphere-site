/**
 * トップページだけの背景。
 * Wordsphere の LP 先頭（landing / generateStarSystems）と同じ星系を描く。
 * 星の種類（背景星、単語、ユーザー、定義、原始星、孤立星）、配置、
 * ランディング周回、定義の平面リング、線、原始星の瞬きは LP の最初の画面に合わせる。
 * 背景だけ LP の暗色を反転したクリーム #fbfbf5。星・線・ラベルは LP の寒色
 * （青紫、#6673cc の系統）を反転せず、クリーム地で読める明度にする。
 * 彩度は #6673cc 付近に抑え、薄い #c8c8e0 や #c2b7ff のまま塗らない。
 * サービスとカンパニーはこのファイルを読まない。
 */

const BG_STAR_COUNT = 2500;
const LANDING_ORBIT_RADIUS = 22;
const LANDING_ORBIT_Y_AMP = 10;
const LANDING_ORBIT_SPEED = 0.012;
const LOOK_OFFSET = 0.35;
const FOV_DEG = 50;
const SPREAD = 55;
const TARGET_USERS = 25;
const TARGET_WORDS = 70;
const TARGET_DEFS = 100;
const RESONANCE_COUNT = 50;
const ORBIT_RADIUS_DRIFT_AMP = 0.07;
const ORBIT_VERTICAL_RATIO = 0.18;
const STAR_PULSE_AMPLITUDE = 0.15;
const BOB_AMPLITUDE = 0.15;
const BOB_SPEED = 0.2;
const LABEL_LOD_NEAR = 15;
const LABEL_LOD_FAR = 25;
const LABEL_POOL = 40;

const LP_BG = "#04040a";
const LP_BG_STAR_A = "#8c8ccc";
const LP_BG_STAR_B = "#c2b7ff";
const LP_NODE_COLOR = {
  User: "#6673cc",
  Word: "#c8c8e0",
  Definition: "#8080a8",
};
const NODE_OPACITY = { User: 1, Word: 0.85, Definition: 0.85 };
const NODE_SIZE = {
  User: [0.2, 0.35],
  Word: [0.35, 0.55],
  Definition: [0.14, 0.24],
};

const SYSTEM_CONFIGS = [
  { word: "自由", defs: [
    { text: "何にも縛られない心の状態", user: "Taro" },
    { text: "選択肢を持つ権利", user: "Yuki" },
    { text: "責任と表裏一体のもの", user: "Hana" },
  ]},
  { word: "愛", defs: [
    { text: "無条件の受容", user: "Hana" },
    { text: "相手の幸せを願う気持ち", user: "Kenta" },
    { text: "時に痛みを伴う感情", user: "Miku" },
    { text: "言葉では表せないもの", user: "Sora" },
  ]},
  { word: "時間", defs: [
    { text: "取り戻せない資源", user: "Ryo" },
    { text: "主観で伸び縮みするもの", user: "Taro" },
  ]},
  { word: "美", defs: [
    { text: "調和の中に見出すもの", user: "Sora" },
    { text: "見る人の心が決めるもの", user: "Rin" },
    { text: "儚さの中にこそ宿るもの", user: "Yuki" },
  ]},
  { word: "孤独", defs: [
    { text: "自分と向き合う時間", user: "Miku" },
    { text: "つながりの深さの欠如", user: "Kenta" },
  ]},
  { word: "成功", defs: [
    { text: "目標ではなく過程", user: "Ryo" },
    { text: "自分らしくあること", user: "Hana" },
    { text: "誰かの役に立てた瞬間", user: "Taro" },
  ]},
  { word: "創造", defs: [
    { text: "無から有を生む行為", user: "Rin" },
    { text: "既存の組み合わせの再発見", user: "Sora" },
  ]},
  { word: "言葉", defs: [
    { text: "思考の器", user: "Yuki" },
    { text: "他者とつながる橋", user: "Kenta" },
    { text: "世界を切り分ける刃", user: "Miku" },
  ]},
];

const SYSTEM_POSITIONS = [
  [0, 0, 0], [18, 4, -12], [-20, -3, -8], [12, -6, 16],
  [-14, 8, 14], [22, -2, 8], [-8, 10, -20], [5, -10, -22],
];

const canvas = document.getElementById("starfield");
const ctx = canvas.getContext("2d");

function hexToRgb01(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function rgbCss(rgb) {
  return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
}

/** LP の暗い背景へ加算した色を、写真のネガにする。 */
function invertAdditive(rgb01, alpha) {
  const bg = hexToRgb01(LP_BG);
  return bg.map((channel, i) => Math.round((1 - Math.min(1, channel + rgb01[i] * alpha)) * 255));
}

function dist3(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function generateStarSystems() {
  const nodes = [];
  const edges = [];
  const systemWordIndices = [];
  const featuredDefIndices = [];
  const featuredUserIndices = [];
  const globalUserMap = new Map();
  const userSystemIndices = new Map();

  for (let si = 0; si < SYSTEM_CONFIGS.length; si++) {
    const cfg = SYSTEM_CONFIGS[si];
    const center = {
      x: SYSTEM_POSITIONS[si][0],
      y: SYSTEM_POSITIONS[si][1],
      z: SYSTEM_POSITIONS[si][2],
    };
    const wordIdx = nodes.length;
    systemWordIndices.push(wordIdx);
    nodes.push({
      id: `word_${si}`,
      type: "Word",
      label: cfg.word,
      x: center.x,
      y: center.y,
      z: center.z,
      orbital: null,
    });
    const systemUserIndices = [];

    for (let di = 0; di < cfg.defs.length; di++) {
      const angle = (di / cfg.defs.length) * Math.PI * 2 + Math.random() * 0.3;
      const radius = 3 + Math.random() * 1.5;
      const defIdx = nodes.length;
      nodes.push({
        id: `def_${si}_${di}`,
        type: "Definition",
        label: cfg.defs[di].text,
        x: center.x + Math.cos(angle) * radius,
        y: center.y,
        z: center.z + Math.sin(angle) * radius,
        orbital: {
          centerIdx: wordIdx,
          radius,
          angle0: angle,
          speed: 0.03 + Math.random() * 0.04,
          tilt: (Math.random() - 0.5) * 0.6,
          driftRadius: 0,
          driftTilt: 0,
        },
      });
      featuredDefIndices.push(defIdx);
      edges.push({ source: defIdx, target: wordIdx, phase: Math.random() * Math.PI * 2 });

      const uname = cfg.defs[di].user;
      if (!globalUserMap.has(uname)) {
        const userIdx = nodes.length;
        nodes.push({
          id: `user_${uname}`,
          type: "User",
          label: uname,
          x: 0,
          y: 0,
          z: 0,
          orbital: null,
        });
        globalUserMap.set(uname, userIdx);
        featuredUserIndices.push(userIdx);
        userSystemIndices.set(uname, [si]);
      } else {
        const existing = userSystemIndices.get(uname);
        if (!existing.includes(si)) existing.push(si);
      }
      const userIdx = globalUserMap.get(uname);
      if (!systemUserIndices.includes(userIdx)) systemUserIndices.push(userIdx);
      edges.push({ source: userIdx, target: defIdx, phase: Math.random() * Math.PI * 2 });
    }
  }

  for (const [uname, userIdx] of globalUserMap) {
    const sysList = userSystemIndices.get(uname);
    const centroid = { x: 0, y: 0, z: 0 };
    for (const si of sysList) {
      centroid.x += SYSTEM_POSITIONS[si][0];
      centroid.y += SYSTEM_POSITIONS[si][1];
      centroid.z += SYSTEM_POSITIONS[si][2];
    }
    centroid.x /= sysList.length;
    centroid.y /= sysList.length;
    centroid.z /= sysList.length;
    centroid.y += 2 + Math.random() * 2;
    centroid.x += (Math.random() - 0.5) * 3;
    centroid.z += (Math.random() - 0.5) * 3;
    nodes[userIdx].x = centroid.x;
    nodes[userIdx].y = centroid.y;
    nodes[userIdx].z = centroid.z;
  }

  const clearRadius = 14;
  const hanaIdx = globalUserMap.get("Hana");
  const clearCenter = hanaIdx === undefined ? null : {
    x: nodes[hanaIdx].x,
    y: nodes[hanaIdx].y,
    z: nodes[hanaIdx].z,
  };
  const rndSpread = () => (Math.random() - 0.5) * SPREAD;
  const rndPosAvoiding = () => {
    for (let attempt = 0; attempt < 30; attempt++) {
      const p = { x: rndSpread(), y: rndSpread(), z: rndSpread() };
      if (!clearCenter || dist3(p, clearCenter) > clearRadius) return p;
    }
    const p = { x: rndSpread(), y: rndSpread(), z: rndSpread() };
    if (!clearCenter) return p;
    let dx = p.x - clearCenter.x;
    let dy = p.y - clearCenter.y;
    let dz = p.z - clearCenter.z;
    const len = Math.hypot(dx, dy, dz) || 1;
    const mag = clearRadius + Math.random() * 10;
    return {
      x: clearCenter.x + (dx / len) * mag,
      y: clearCenter.y + (dy / len) * mag,
      z: clearCenter.z + (dz / len) * mag,
    };
  };

  const extraUserCount = Math.max(0, TARGET_USERS - featuredUserIndices.length);
  const extraUserStart = nodes.length;
  for (let i = 0; i < extraUserCount; i++) {
    const p = rndPosAvoiding();
    nodes.push({ id: `user_x${i}`, type: "User", label: "", ...p, orbital: null });
  }

  const extraWordIndices = [];
  for (let i = 0; i < Math.max(0, TARGET_WORDS - SYSTEM_CONFIGS.length); i++) {
    extraWordIndices.push(nodes.length);
    const p = rndPosAvoiding();
    nodes.push({ id: `word_x${i}`, type: "Word", label: "", ...p, orbital: null });
  }

  const allUserIndices = [
    ...featuredUserIndices,
    ...Array.from({ length: extraUserCount }, (_, i) => extraUserStart + i),
  ];
  const allWordIndices = [...systemWordIndices, ...extraWordIndices];
  const allDefIndices = [...featuredDefIndices];
  const extraDefCount = Math.max(0, TARGET_DEFS - featuredDefIndices.length);
  for (let i = 0; i < extraDefCount; i++) {
    const uIdx = allUserIndices[Math.floor(Math.random() * allUserIndices.length)];
    const wIdx = allWordIndices[Math.floor(Math.random() * allWordIndices.length)];
    let defPos = {
      x: (nodes[uIdx].x + nodes[wIdx].x) * 0.5 + (Math.random() - 0.5) * 8,
      y: (nodes[uIdx].y + nodes[wIdx].y) * 0.5 + (Math.random() - 0.5) * 8,
      z: (nodes[uIdx].z + nodes[wIdx].z) * 0.5 + (Math.random() - 0.5) * 8,
    };
    if (clearCenter && dist3(defPos, clearCenter) < clearRadius) defPos = rndPosAvoiding();
    const defIdx = nodes.length;
    nodes.push({
      id: `def_x${i}`,
      type: "Definition",
      label: "",
      ...defPos,
      orbital: null,
    });
    allDefIndices.push(defIdx);
    edges.push({ source: uIdx, target: defIdx, phase: Math.random() * Math.PI * 2 });
    edges.push({ source: defIdx, target: wIdx, phase: Math.random() * Math.PI * 2 });
  }

  for (let i = 0; i < RESONANCE_COUNT; i++) {
    const uIdx = allUserIndices[Math.floor(Math.random() * allUserIndices.length)];
    const dIdx = allDefIndices[Math.floor(Math.random() * allDefIndices.length)];
    edges.push({ source: uIdx, target: dIdx, phase: Math.random() * Math.PI * 2 });
  }

  const protostarIdx = nodes.length;
  nodes.push({
    id: "protostar",
    type: "Definition",
    label: "？",
    x: 0,
    y: 12,
    z: 5,
    orbital: null,
  });
  const lonelyStarIdx = nodes.length;
  nodes.push({
    id: "lonely_star",
    type: "User",
    label: "",
    x: -50,
    y: 5,
    z: 45,
    orbital: null,
  });

  for (const node of nodes) {
    const range = NODE_SIZE[node.type];
    node.size = range[0] + Math.random() * (range[1] - range[0]);
    node.phase = Math.random() * Math.PI * 2;
  }

  const wordNodeIndices = nodes
    .map((node, index) => (node.type === "Word" ? index : -1))
    .filter((index) => index >= 0);
  const shuffledWords = [...wordNodeIndices].sort(() => Math.random() - 0.5);
  const protoTargets = shuffledWords.slice(0, Math.min(12, shuffledWords.length));

  return { nodes, edges, protostarIdx, lonelyStarIdx, protoTargets };
}

function planarRing(orb, center, t) {
  const oa = orb.angle0 + t * orb.speed;
  const radius = orb.radius * (1 + ORBIT_RADIUS_DRIFT_AMP * Math.sin(t * orb.driftRadius));
  const yPhase = orb.tilt + t * orb.driftTilt;
  return {
    x: center.x + Math.cos(oa) * radius,
    y: center.y + Math.sin(oa * 0.7 + yPhase) * radius * ORBIT_VERTICAL_RATIO,
    z: center.z + Math.sin(oa) * radius,
  };
}

function bobY(t, phase) {
  return Math.sin(t * BOB_SPEED + phase) * BOB_AMPLITUDE;
}

const sky = generateStarSystems();
const animated = sky.nodes.map((node) => ({ x: node.x, y: node.y, z: node.z }));
const drawOrder = ["User", "Word", "Definition"];

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

const PROTO_IDLE_MIN = 4;
const PROTO_IDLE_MAX = 9;
const PROTO_FADE_IN = 1;
const PROTO_HOLD = 0.2;
const PROTO_FADE_OUT = 1.8;
let protoPhase = 0;
let protoTimer = 2 + Math.random() * 3;
let protoProgress = 0;
let protoActive = -1;
let prevTime = 0;

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.floor(window.innerWidth * dpr));
  canvas.height = Math.max(1, Math.floor(window.innerHeight * dpr));
}

function poseAt(t) {
  const a = t * LANDING_ORBIT_SPEED;
  const scroll = (window.scrollY || 0) * 0.003;
  const camX = Math.sin(a) * LANDING_ORBIT_RADIUS;
  const camY = Math.sin(a * 1.4) * LANDING_ORBIT_Y_AMP - scroll;
  const camZ = Math.cos(a * 0.7) * LANDING_ORBIT_RADIUS;
  const la = a + LOOK_OFFSET;
  const lookX = Math.sin(la) * LANDING_ORBIT_RADIUS * 0.25;
  const lookY = Math.sin(la * 1.4) * LANDING_ORBIT_Y_AMP * 0.25 - scroll;
  const lookZ = Math.cos(la * 0.7) * LANDING_ORBIT_RADIUS * 0.25;
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

function hsl2rgb(h, s, l) {
  const wrap = [0, 4, 2];
  return wrap.map((offset) => {
    const channel = Math.abs(((h * 6 + offset) % 6) - 3) - 1;
    const clamped = Math.min(Math.max(channel, 0), 1);
    return l + s * (clamped - 0.5) * (1 - Math.abs(2 * l - 1));
  });
}

function rgbToHsl(rgb) {
  const [r, g, b] = rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0.645, 0, l];
  const d = max - min;
  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h /= 6;
  if (h < 0) h += 1;
  return [h, s, l];
}

/** LP の色相を青紫に収め、明度をクリーム地で読める範囲へ落とす。彩度は上げすぎない。 */
function coolOnCream(rgb01) {
  let [h, s, l] = rgbToHsl(rgb01);
  if (h < 0.56 || h > 0.78) {
    const span = 0.22;
    h = 0.56 + ((h % span) + span) % span;
  }
  s = Math.min(0.5, Math.max(s, 0.32));
  if (l > 0.5) l = 0.44;
  else if (l < 0.36) l = 0.4;
  return hsl2rgb(h, s, l);
}

function rgbaCss(rgb01, alpha) {
  const rgb = rgb01.map((channel) => Math.round(channel * 255));
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}

function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function edgeRgb(t, phase, posSum) {
  const time = t * 0.15 + phase;
  const pulse = Math.sin(time * 3 + posSum * 0.3) * 0.5 + 0.5;
  const burstCycle = ((time + phase * 6.28) % 12 + 12) % 12;
  const burst = smoothstep(0, 0.3, burstCycle) * smoothstep(1.5, 0.5, burstCycle);
  const hue = ((time * 0.08 + posSum * 0.01 + phase) % 1 + 1) % 1;
  const iri = hsl2rgb(hue, 0.7, 0.5);
  const base = [0.25, 0.25, 0.55];
  const color = base.map((channel, i) => channel + (iri[i] - channel) * burst * 0.85);
  const alpha = 0.04 + pulse * 0.06 + burst * 0.35;
  return { color: coolOnCream(color), alpha: Math.min(1, 0.72 + alpha) };
}

function stepProto(t) {
  const dt = Math.max(0, t - prevTime);
  prevTime = t;
  protoTimer -= dt;
  if (protoPhase === 0 && protoTimer <= 0) {
    protoActive = Math.floor(Math.random() * sky.protoTargets.length);
    protoPhase = 1;
    protoTimer = PROTO_FADE_IN;
  } else if (protoPhase === 1) {
    protoProgress = 1 - protoTimer / PROTO_FADE_IN;
    if (protoTimer <= 0) {
      protoPhase = 2;
      protoTimer = PROTO_HOLD;
    }
  } else if (protoPhase === 2) {
    protoProgress = 1;
    if (protoTimer <= 0) {
      protoPhase = 3;
      protoTimer = PROTO_FADE_OUT;
    }
  } else if (protoPhase === 3) {
    protoProgress = protoTimer / PROTO_FADE_OUT;
    if (protoTimer <= 0) {
      protoPhase = 0;
      protoTimer = PROTO_IDLE_MIN + Math.random() * (PROTO_IDLE_MAX - PROTO_IDLE_MIN);
      protoActive = -1;
      protoProgress = 0;
    }
  }
}

function placeNodes(t) {
  for (const type of drawOrder) {
    for (let i = 0; i < sky.nodes.length; i++) {
      const node = sky.nodes[i];
      if (node.type !== type) continue;
      if (node.orbital) {
        const center = animated[node.orbital.centerIdx];
        const pos = planarRing(node.orbital, center, t);
        animated[i].x = pos.x;
        animated[i].y = pos.y;
        animated[i].z = pos.z;
      } else {
        animated[i].x = node.x;
        animated[i].y = node.y + bobY(t, node.phase);
        animated[i].z = node.z;
      }
    }
  }
}

function mixBgColor(bright) {
  const a = hexToRgb01(LP_BG_STAR_A);
  const b = hexToRgb01(LP_BG_STAR_B);
  return a.map((channel, i) => channel + (b[i] - channel) * bright);
}

const startedAt = performance.now();

function frame(now) {
  const t = (now - startedAt) / 1000;
  placeNodes(t);
  stepProto(t);
  const pose = poseAt(t);
  const ry = t * 0.002;
  const rx = Math.sin(t * 0.001) * 0.02;
  const viewW = window.innerWidth;
  const viewH = window.innerHeight;
  const aspect = viewW / Math.max(viewH, 1);
  const tanHalf = Math.tan((FOV_DEG * Math.PI) / 360);
  const focal = 1 / tanHalf;

  ctx.setTransform(canvas.width / viewW, 0, 0, canvas.height / viewH, 0, 0);
  const bg = invertAdditive(hexToRgb01(LP_BG), 0);
  ctx.fillStyle = rgbCss(bg);
  ctx.fillRect(0, 0, viewW, viewH);

  for (const star of bgStars) {
    const spun = rotateBg(star, ry, rx);
    const point = project(viewOf(pose, spun.x, spun.y, spun.z), viewW, viewH, focal, aspect);
    if (!point) continue;
    const diameter = star.size * (200 / point.depth);
    const mixed = mixBgColor(star.bright);
    const alpha = 0.88 + star.bright * 0.12;
    ctx.fillStyle = rgbaCss(coolOnCream(mixed), alpha);
    ctx.beginPath();
    ctx.arc(point.sx, point.sy, Math.max(diameter * 0.5, 0.3), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.lineWidth = 1;
  for (const edge of sky.edges) {
    const a = animated[edge.source];
    const b = animated[edge.target];
    const pa = project(viewOf(pose, a.x, a.y, a.z), viewW, viewH, focal, aspect);
    const pb = project(viewOf(pose, b.x, b.y, b.z), viewW, viewH, focal, aspect);
    if (!pa || !pb) continue;
    const posSum = (a.x + a.y + a.z + b.x + b.y + b.z) * 0.5;
    const drawn = edgeRgb(t, edge.phase, posSum);
    ctx.strokeStyle = rgbaCss(drawn.color, drawn.alpha);
    ctx.beginPath();
    ctx.moveTo(pa.sx, pa.sy);
    ctx.lineTo(pb.sx, pb.sy);
    ctx.stroke();
  }

  if (protoActive >= 0 && protoProgress > 0.01) {
    const from = animated[sky.protostarIdx];
    const to = animated[sky.protoTargets[protoActive]];
    const pa = project(viewOf(pose, from.x, from.y, from.z), viewW, viewH, focal, aspect);
    const pb = project(viewOf(pose, to.x, to.y, to.z), viewW, viewH, focal, aspect);
    if (pa && pb) {
      const hue = ((t * 0.04) % 1 + 1) % 1;
      const color = coolOnCream(hsl2rgb(hue, 0.5, 0.48));
      const alpha = Math.min(1, 0.62 + protoProgress * 0.38);
      ctx.strokeStyle = rgbaCss(color, alpha);
      ctx.beginPath();
      ctx.moveTo(pa.sx, pa.sy);
      ctx.lineTo(pb.sx, pb.sy);
      ctx.stroke();
    }
  }

  const visible = [];
  for (let i = 0; i < sky.nodes.length; i++) {
    const node = sky.nodes[i];
    const pos = animated[i];
    const point = project(viewOf(pose, pos.x, pos.y, pos.z), viewW, viewH, focal, aspect);
    if (!point) continue;
    const pulse = 1 + Math.sin(t * 0.5 + node.phase) * STAR_PULSE_AMPLITUDE;
    const worldRadius = node.size * pulse;
    const radiusPx = (worldRadius * viewH) / (2 * point.depth * tanHalf);
    visible.push({
      index: i,
      sx: point.sx,
      sy: point.sy,
      depth: point.depth,
      radiusPx,
      node,
      pos,
    });
  }
  visible.sort((a, b) => b.depth - a.depth);
  for (const star of visible) {
    const rgb01 = coolOnCream(hexToRgb01(LP_NODE_COLOR[star.node.type]));
    ctx.fillStyle = rgbaCss(rgb01, Math.max(NODE_OPACITY[star.node.type], 0.92));
    ctx.beginPath();
    ctx.arc(star.sx, star.sy, Math.max(star.radiusPx, 0.4), 0, Math.PI * 2);
    ctx.fill();
  }

  const labels = [];
  for (const star of visible) {
    if (!star.node.label || star.node.type === "Definition") continue;
    const dx = star.pos.x - pose.camX;
    const dy = star.pos.y - pose.camY;
    const dz = star.pos.z - pose.camZ;
    const dist = Math.hypot(dx, dy, dz);
    if (dist >= LABEL_LOD_FAR) continue;
    labels.push({ star, dist });
  }
  labels.sort((a, b) => a.dist - b.dist);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const fontFamily = "system-ui, -apple-system, sans-serif";
  for (const item of labels.slice(0, LABEL_POOL)) {
    const opacity = item.dist < LABEL_LOD_NEAR
      ? 0.9
      : 0.9 * (1 - (item.dist - LABEL_LOD_NEAR) / (LABEL_LOD_FAR - LABEL_LOD_NEAR));
    if (item.star.node.type === "Word") {
      const diameter = item.star.radiusPx * 2;
      const usable = diameter * 0.94;
      ctx.font = `400 19px ${fontFamily}`;
      const widthAtCap = ctx.measureText(item.star.node.label).width * 1.02;
      const fitted = usable / Math.hypot(widthAtCap / 19, 1);
      const fontSize = Math.min(19, fitted);
      if (!(fontSize > 2)) continue;
      ctx.font = `400 ${fontSize}px ${fontFamily}`;
    } else {
      ctx.font = `300 11px ${fontFamily}`;
    }
    const ink = coolOnCream(hexToRgb01(LP_NODE_COLOR[item.star.node.type]));
    const rgb = ink.map((channel) => Math.round(channel * 255));
    const weight = item.star.node.type === "Word" ? 0.92 : 0.96;
    ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${weight * opacity})`;
    ctx.fillText(item.star.node.label, item.star.sx, item.star.sy);
  }

  requestAnimationFrame(frame);
}

resize();
window.addEventListener("resize", resize);
requestAnimationFrame(frame);
