// Параметри варіанту
const n1 = 5,
  n2 = 5,
  n3 = 0,
  n4 = 5;
const seed = n1 * 1000 + n2 * 100 + n3 * 10 + n4;
const n = 10 + n3;
const k = 1.0 - n3 * 0.02 - n4 * 0.005 - 0.25;

document.getElementById("info").textContent =
  `Варіант: ${seed}   ,   n = ${n}   ,   k = ${k.toFixed(4)}   ,   розміщення: трикутник`;

// Детермінований генератор (Mulberry32)
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = makeRng(seed);

// Матриця суміжності напрямленого графа
const dirMatrix = [];
for (let i = 0; i < n; i++) {
  dirMatrix[i] = [];
  for (let j = 0; j < n; j++) {
    const val = rng() * 2.0;
    dirMatrix[i][j] = val * k >= 1.0 ? 1 : 0;
  }
}

// Матриця суміжності ненапрямленого графа
const undirMatrix = Array.from({ length: n }, () => new Array(n).fill(0));
for (let i = 0; i < n; i++)
  for (let j = 0; j < n; j++)
    if (dirMatrix[i][j] === 1) {
      undirMatrix[i][j] = 1;
      undirMatrix[j][i] = 1;
    }

// Координати вершин: трикутник
const cx = 370,
  cy = 295;
const triR = 200;
const NODE_R = 16;
const points = [];

// Кути трикутника (рівносторонній)
const triAngle = [
  -Math.PI / 2,
  -Math.PI / 2 + (2 * Math.PI) / 3,
  -Math.PI / 2 + (4 * Math.PI) / 3,
];
const corners = triAngle.map((a) => ({
  x: cx + triR * Math.cos(a),
  y: cy + triR * Math.sin(a),
}));

const perSide = Math.floor(n / 3);
const extra = n % 3;

const sideCounts = [
  perSide + (extra > 0 ? 1 : 0),
  perSide + (extra > 1 ? 1 : 0),
  perSide,
];

for (let side = 0; side < 3; side++) {
  const from = corners[side];
  const to = corners[(side + 1) % 3];
  const count = sideCounts[side];

  for (let i = 0; i < count; i++) {
    const t = (i + 1) / (count + 1);
    points.push({
      x: from.x + t * (to.x - from.x),
      y: from.y + t * (to.y - from.y),
    });
  }
}

// Функції малювання та роботи з кривими Безьє
function bezierPoint(t, x1, y1, cpx, cpy, x2, y2) {
  const mt = 1 - t;
  return {
    x: mt * mt * x1 + 2 * mt * t * cpx + t * t * x2,
    y: mt * mt * y1 + 2 * mt * t * cpy + t * t * y2,
  };
}

function findEdgeT(x1, y1, cpx, cpy, x2, y2, ox, oy, r, fromEnd) {
  const steps = 100;
  for (let i = 0; i <= steps; i++) {
    const t = fromEnd ? 1 - i / steps : i / steps;
    const p = bezierPoint(t, x1, y1, cpx, cpy, x2, y2);
    if (Math.hypot(p.x - ox, p.y - oy) >= r) return t;
  }
  return fromEnd ? 0 : 1;
}

function getControlPoint(x1, y1, x2, y2, side) {
  const mx = (x1 + x2) / 2,
    my = (y1 + y2) / 2;
  const dist = Math.hypot(x2 - x1, y2 - y1);
  return {
    cpx: mx - ((y2 - y1) / dist) * 40 * side,
    cpy: my + ((x2 - x1) / dist) * 40 * side,
  };
}

// Всі ребра — дуги, щоб не проходити через проміжні вершини.
function drawCurvedArrow(ctx, x1, y1, x2, y2, side) {
  const { cpx, cpy } = getControlPoint(x1, y1, x2, y2, side);

  const tStart = findEdgeT(x1, y1, cpx, cpy, x2, y2, x1, y1, NODE_R, false);
  const tEnd = findEdgeT(x1, y1, cpx, cpy, x2, y2, x2, y2, NODE_R, true);

  const ps = bezierPoint(tStart, x1, y1, cpx, cpy, x2, y2);
  const pe = bezierPoint(tEnd, x1, y1, cpx, cpy, x2, y2);

  const pb = bezierPoint(tEnd - 0.01, x1, y1, cpx, cpy, x2, y2);
  const angle = Math.atan2(pe.y - pb.y, pe.x - pb.x);

  ctx.beginPath();
  ctx.moveTo(ps.x, ps.y);
  ctx.quadraticCurveTo(cpx, cpy, pe.x, pe.y);
  ctx.stroke();

  const as = 11;
  ctx.beginPath();
  ctx.moveTo(pe.x, pe.y);
  ctx.lineTo(
    pe.x - as * Math.cos(angle - Math.PI / 6),
    pe.y - as * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    pe.x - as * Math.cos(angle + Math.PI / 6),
    pe.y - as * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fill();
}

// Вигнута лінія без стрілки (для ненапрямленого графа)
function drawCurvedSegment(ctx, x1, y1, x2, y2, side) {
  const { cpx, cpy } = getControlPoint(x1, y1, x2, y2, side);

  const tStart = findEdgeT(x1, y1, cpx, cpy, x2, y2, x1, y1, NODE_R, false);
  const tEnd = findEdgeT(x1, y1, cpx, cpy, x2, y2, x2, y2, NODE_R, true);

  const ps = bezierPoint(tStart, x1, y1, cpx, cpy, x2, y2);
  const pe = bezierPoint(tEnd, x1, y1, cpx, cpy, x2, y2);

  ctx.beginPath();
  ctx.moveTo(ps.x, ps.y);
  ctx.quadraticCurveTo(cpx, cpy, pe.x, pe.y);
  ctx.stroke();
}

// Петля — ребро з вершини в себе
function drawLoop(ctx, x, y) {
  const loopR = 13;
  const ox = x + NODE_R * 0.65,
    oy = y - NODE_R * 0.65;

  ctx.beginPath();
  ctx.arc(ox, oy, loopR, 0, 2 * Math.PI);
  ctx.stroke();

  const a = 0.1 * Math.PI;
  const tx = ox + loopR * Math.cos(a),
    ty = oy + loopR * Math.sin(a);
  const angle = a + Math.PI / 2;
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(
    tx - 9 * Math.cos(angle - Math.PI / 6),
    ty - 9 * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    tx - 9 * Math.cos(angle + Math.PI / 6),
    ty - 9 * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fill();
}

function drawNodes(ctx, color) {
  ctx.font = "bold 12px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < n; i++) {
    const { x, y } = points[i];
    ctx.beginPath();
    ctx.arc(x, y, NODE_R, 0, 2 * Math.PI);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillText(i + 1, x, y);
  }
}

function renderMatrix(matrix, tableEl) {
  for (let i = 0; i < n; i++) {
    const row = tableEl.insertRow();
    for (let j = 0; j < n; j++) {
      const td = row.insertCell();
      td.textContent = matrix[i][j];
      if (matrix[i][j] === 1) td.className = "one";
    }
  }
}

// Допоміжна функція: малює контур трикутника пунктиром
function drawTriangleOutline(ctx) {
  ctx.save();
  ctx.setLineDash([6, 5]);
  ctx.strokeStyle = "#ccc";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < 3; i++) ctx.lineTo(corners[i].x, corners[i].y);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

// Малювання напрямленого графа
const dirCtx = document.getElementById("dirCanvas").getContext("2d");
drawTriangleOutline(dirCtx);

dirCtx.strokeStyle = "#c0392b";
dirCtx.fillStyle = "#c0392b";
dirCtx.lineWidth = 1.5;

for (let i = 0; i < n; i++) {
  for (let j = 0; j < n; j++) {
    if (dirMatrix[i][j] !== 1) continue;
    const { x: x1, y: y1 } = points[i];
    const { x: x2, y: y2 } = points[j];

    if (i === j) {
      drawLoop(dirCtx, x1, y1);
    } else {
      const side = dirMatrix[j][i] === 1 && i > j ? -1 : +1;
      drawCurvedArrow(dirCtx, x1, y1, x2, y2, side);
    }
  }
}
drawNodes(dirCtx, "#c0392b");

// Малювання ненапрямленого графа
const undirCtx = document.getElementById("undirCanvas").getContext("2d");
drawTriangleOutline(undirCtx);

undirCtx.strokeStyle = "#1a5276";
undirCtx.fillStyle = "#1a5276";
undirCtx.lineWidth = 1.5;

for (let i = 0; i < n; i++) {
  for (let j = i; j < n; j++) {
    if (undirMatrix[i][j] !== 1) continue;
    const { x: x1, y: y1 } = points[i];
    const { x: x2, y: y2 } = points[j];
    i === j
      ? drawLoop(undirCtx, x1, y1)
      : drawCurvedSegment(undirCtx, x1, y1, x2, y2, +1);
  }
}
drawNodes(undirCtx, "#1a5276");

// Вивід матриць
renderMatrix(dirMatrix, document.getElementById("tDir"));
renderMatrix(undirMatrix, document.getElementById("tUndir"));
