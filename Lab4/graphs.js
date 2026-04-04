const n1 = 5,
  n2 = 5,
  n3 = 0,
  n4 = 5;
const seed = n1 * 1000 + n2 * 100 + n3 * 10 + n4;
const n = 10 + n3;
const k1 = 1.0 - n3 * 0.01 - n4 * 0.01 - 0.3;
const k2 = 1.0 - n3 * 0.005 - n4 * 0.005 - 0.27;

document.getElementById("info").textContent =
  `Варіант: ${seed}, n = ${n}, k1 = ${k1.toFixed(4)}, розміщення: трикутник`;

// Генератор псевдовипадкових чисел
function makeRng(seed) {
  let current = seed;
  return () => {
    current = (1664525 * current + 1013904223) % 4294967296; // 4294967296 = 2^32
    return current / 4294967296;
  };
}
const rng = makeRng(seed);

// Матриця напрямленого графа
const dirMatrix1 = [];
for (let i = 0; i < n; i++) {
  dirMatrix1[i] = [];
  for (let j = 0; j < n; j++) {
    const val = rng() * 2.0;
    dirMatrix1[i][j] = val * k1 >= 1.0 ? 1 : 0;
  }
}

// Матриця ненапрямленого графа
const undirMatrix1 = Array.from({ length: n }, () => new Array(n).fill(0));
for (let i = 0; i < n; i++) {
  for (let j = 0; j < n; j++) {
    if (dirMatrix1[i][j] === 1) {
      undirMatrix1[i][j] = 1;
      undirMatrix1[j][i] = 1;
    }
  }
}

const cx = 370,
  cy = 295;
const triR = 200;
const NODE_R = 16;
const points = [];

// Знаходження кутів трикутника
const triAngles = [
  -Math.PI / 2,
  -Math.PI / 2 + (2 * Math.PI) / 3,
  -Math.PI / 2 + (4 * Math.PI) / 3,
];
const corners = triAngles.map((a) => ({
  x: cx + triR * Math.cos(a),
  y: cy + triR * Math.sin(a),
}));

// Розподіл вершин по сторонах
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

// Обчислення контрольної точки для вигину дуги
function getControlPoint(x1, y1, x2, y2, side) {
  const mx = (x1 + x2) / 2,
    my = (y1 + y2) / 2;
  const dist = Math.hypot(x2 - x1, y2 - y1);
  return {
    cpx: mx - ((y2 - y1) / dist) * 40 * side,
    cpy: my + ((x2 - x1) / dist) * 40 * side,
  };
}

// Малювання стрілки від вершини i до вершини j
function drawArrow(ctx, x1, y1, x2, y2, side) {
  const { cpx, cpy } = getControlPoint(x1, y1, x2, y2, side);

  const tStart = findEdgeT(x1, y1, cpx, cpy, x2, y2, x1, y1, NODE_R, false);
  const tEnd = findEdgeT(x1, y1, cpx, cpy, x2, y2, x2, y2, NODE_R, true);

  const ps = bezierPoint(tStart, x1, y1, cpx, cpy, x2, y2);
  const pe = bezierPoint(tEnd, x1, y1, cpx, cpy, x2, y2);

  const pb = bezierPoint(tEnd - 0.01, x1, y1, cpx, cpy, x2, y2);
  const angle = Math.atan2(pe.y - pb.y, pe.x - pb.x);

  // Малювання дуги
  ctx.beginPath();
  ctx.moveTo(ps.x, ps.y);
  ctx.quadraticCurveTo(cpx, cpy, pe.x, pe.y);
  ctx.stroke();

  // Малювання стрілки
  const size = 11;
  ctx.beginPath();
  ctx.moveTo(pe.x, pe.y);
  ctx.lineTo(
    pe.x - size * Math.cos(angle - Math.PI / 6),
    pe.y - size * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    pe.x - size * Math.cos(angle + Math.PI / 6),
    pe.y - size * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fill();
}

// Малювання лінії без стрілки
function drawLine(ctx, x1, y1, x2, y2) {
  const { cpx, cpy } = getControlPoint(x1, y1, x2, y2, +1);

  const tStart = findEdgeT(x1, y1, cpx, cpy, x2, y2, x1, y1, NODE_R, false);
  const tEnd = findEdgeT(x1, y1, cpx, cpy, x2, y2, x2, y2, NODE_R, true);

  const ps = bezierPoint(tStart, x1, y1, cpx, cpy, x2, y2);
  const pe = bezierPoint(tEnd, x1, y1, cpx, cpy, x2, y2);

  ctx.beginPath();
  ctx.moveTo(ps.x, ps.y);
  ctx.quadraticCurveTo(cpx, cpy, pe.x, pe.y);
  ctx.stroke();
}

// Малювання петлі
function drawLoop(ctx, x, y) {
  const loopR = 13;
  const ox = x + NODE_R * 0.65,
    oy = y - NODE_R * 0.65;

  ctx.beginPath();
  ctx.arc(ox, oy, loopR, 0, 2 * Math.PI);
  ctx.stroke();

  // Малювання стрілки на петлі
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

// Малювання вершин
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

// Вивід матриці в таблицю
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

// Малювання напрямленого графу
const dirCtx = document.getElementById("dirCanvas1").getContext("2d");
dirCtx.strokeStyle = "#c0392b";
dirCtx.fillStyle = "#c0392b";
dirCtx.lineWidth = 1.5;

for (let i = 0; i < n; i++) {
  for (let j = 0; j < n; j++) {
    if (dirMatrix1[i][j] !== 1) continue;
    const { x: x1, y: y1 } = points[i];
    const { x: x2, y: y2 } = points[j];
    if (i === j) {
      drawLoop(dirCtx, x1, y1);
    } else {
      const side = dirMatrix1[j][i] === 1 && i > j ? -1 : +1;
      drawArrow(dirCtx, x1, y1, x2, y2, side);
    }
  }
}
drawNodes(dirCtx, "#c0392b");

// Малювання ненапрямленого графу
const undirCtx = document.getElementById("undirCanvas1").getContext("2d");
undirCtx.strokeStyle = "#1a5276";
undirCtx.fillStyle = "#1a5276";
undirCtx.lineWidth = 1.5;

for (let i = 0; i < n; i++) {
  for (let j = i; j < n; j++) {
    if (undirMatrix1[i][j] !== 1) continue;
    const { x: x1, y: y1 } = points[i];
    const { x: x2, y: y2 } = points[j];
    if (i === j) {
      drawLoop(undirCtx, x1, y1);
    } else {
      drawLine(undirCtx, x1, y1, x2, y2);
    }
  }
}
drawNodes(undirCtx, "#1a5276");

// Вивід матриць
renderMatrix(dirMatrix1, document.getElementById("tDir1"));
renderMatrix(undirMatrix1, document.getElementById("tUndir1"));

// Характеристики графів
function calcOutDegrees(m) {
  return m.map((row) => row.reduce((s, v) => s + v, 0));
}

function calcInDegrees(m) {
  const deg = new Array(n).fill(0);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) deg[j] += m[i][j];
  return deg;
}

function calcUndirDegrees(m) {
  return m.map((row, i) =>
    row.reduce((s, v, j) => s + (i === j ? v * 2 : v), 0),
  );
}

const outDeg = calcOutDegrees(dirMatrix1);
const inDeg = calcInDegrees(dirMatrix1);
const undirDeg = calcUndirDegrees(undirMatrix1);
const dirDeg = outDeg.map((o, i) => o + inDeg[i]);

const pad = (d) => String(d).padStart(3);
const hdr = Array.from({ length: n }, (_, i) => pad(i + 1)).join("");

let t = "Вершина: " + hdr + "\n";
t += "Степінь (ненапрямлений): " + undirDeg.map(pad).join("") + "\n";
t += "Степінь (напрямлений): " + dirDeg.map(pad).join("") + "\n";
t += "Напівстепінь виходу: " + outDeg.map(pad).join("") + "\n";
t += "Напівстепінь заходу: " + inDeg.map(pad).join("") + "\n";

const regUndir = undirDeg.every((d) => d === undirDeg[0]);
const regDir = dirDeg.every((d) => d === dirDeg[0]);
t +=
  "Ненапрямлений: " +
  (regUndir ? `однорідний, степінь = ${undirDeg[0]}` : "не однорідний") +
  "\n";
t +=
  "Напрямлений: " +
  (regDir ? `однорідний, степінь = ${dirDeg[0]}` : "не однорідний") +
  "\n";

const hanging = undirDeg
  .map((d, i) => (d === 1 ? i + 1 : null))
  .filter(Boolean);
const isolated = undirDeg
  .map((d, i) => (d === 0 ? i + 1 : null))
  .filter(Boolean);
t +=
  "Висячі вершини: " + (hanging.length ? hanging.join(", ") : "немає") + "\n";
t +=
  "Ізольовані вершини: " +
  (isolated.length ? isolated.join(", ") : "немає") +
  "\n";

document.getElementById("results1").textContent = t;

// Графи (k2)
const rng2 = makeRng(seed);

const dirMatrix2 = [];
for (let i = 0; i < n; i++) {
  dirMatrix2[i] = [];
  for (let j = 0; j < n; j++) {
    const val = rng2() * 2.0;
    dirMatrix2[i][j] = val * k2 >= 1.0 ? 1 : 0;
  }
}

// Малювання напрямленого графу
const dirCtx2 = document.getElementById("dirCanvas2").getContext("2d");
dirCtx2.strokeStyle = "#27ae60";
dirCtx2.fillStyle = "#27ae60";
dirCtx2.lineWidth = 1.5;

for (let i = 0; i < n; i++) {
  for (let j = 0; j < n; j++) {
    if (dirMatrix2[i][j] !== 1) continue;
    const { x: x1, y: y1 } = points[i];
    const { x: x2, y: y2 } = points[j];
    if (i === j) {
      drawLoop(dirCtx2, x1, y1);
    } else {
      const side = dirMatrix2[j][i] === 1 && i > j ? -1 : +1;
      drawArrow(dirCtx2, x1, y1, x2, y2, side);
    }
  }
}
drawNodes(dirCtx2, "#27ae60");

renderMatrix(dirMatrix2, document.getElementById("tDir2"));

// Множення матриць
function multiplyMatrix(A, B) {
  const C = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++)
    for (let k = 0; k < n; k++) {
      if (A[i][k] === 0) continue;
      for (let j = 0; j < n; j++) C[i][j] += A[i][k] * B[k][j];
    }
  return C;
}

const A2 = multiplyMatrix(dirMatrix2, dirMatrix2);
const A3 = multiplyMatrix(A2, dirMatrix2);

// Шляхи довжини 2
console.log("Шляхи довжини 2:");
for (let i = 0; i < n; i++) {
  for (let j = 0; j < n; j++) {
    if (A2[i][j] === 0) continue;
    for (let k = 0; k < n; k++) {
      if (dirMatrix2[i][k] === 1 && dirMatrix2[k][j] === 1)
        console.log(`${i + 1} – ${k + 1} – ${j + 1}`);
    }
  }
}

// Шляхи довжини 3
console.log("Шляхи довжини 3:");
for (let i = 0; i < n; i++) {
  for (let j = 0; j < n; j++) {
    if (A3[i][j] === 0) continue;
    for (let k1 = 0; k1 < n; k1++) {
      if (dirMatrix2[i][k1] === 0) continue;
      for (let k2 = 0; k2 < n; k2++) {
        if (dirMatrix2[k1][k2] === 1 && dirMatrix2[k2][j] === 1)
          console.log(`${i + 1} – ${k1 + 1} – ${k2 + 1} – ${j + 1}`);
      }
    }
  }
}

// Транзитивне замикання (алгоритм Уоршелла)
function warshall(matrix) {
  const D = matrix.map((row) => [...row]);
  for (let i = 0; i < n; i++) D[i][i] = 1;
  for (let k = 0; k < n; k++)
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        if (D[i][k] === 1 && D[k][j] === 1) D[i][j] = 1;
  return D;
}

const outDeg2 = calcOutDegrees(dirMatrix2);
const inDeg2 = calcInDegrees(dirMatrix2);
const reachMatrix = warshall(dirMatrix2);

renderMatrix(reachMatrix, document.getElementById("tReach"));

let t2 = "Напівстепінь виходу: " + outDeg2.map(pad).join("") + "\n";
t2 += "Напівстепінь заходу: " + inDeg2.map(pad).join("") + "\n";

document.getElementById("results2").textContent = t2;
