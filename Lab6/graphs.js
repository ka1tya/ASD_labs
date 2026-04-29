const n1 = 5,
  n2 = 5,
  n3 = 0,
  n4 = 5;
const seed = n1 * 1000 + n2 * 100 + n3 * 10 + n4;
const n = 10 + n3;
const k = 1.0 - n3 * 0.01 - n4 * 0.005 - 0.05;

document.getElementById("info").textContent =
  `Варіант: ${seed}, n = ${n}, k = ${k.toFixed(4)}, розміщення: трикутник, алгоритм: Прима`;

// Генератор псевдовипадкових чисел
function makeRng(seed) {
  let current = seed;
  return () => {
    current = (1664525 * current + 1013904223) % 4294967296; // 4294967296 = 2^32
    return current / 4294967296;
  };
}

const rng1 = makeRng(seed);

// Матриця напрямленого графа
const dirMatrix = [];
for (let i = 0; i < n; i++) {
  dirMatrix[i] = [];
  for (let j = 0; j < n; j++) {
    const val = rng1() * 2.0;
    dirMatrix[i][j] = val * k >= 1.0 ? 1 : 0;
  }
}

// Матриця ненапрямленого графа
const undirMatrix = Array.from({ length: n }, () => new Array(n).fill(0));
for (let i = 0; i < n; i++) {
  for (let j = 0; j < n; j++) {
    if (dirMatrix[i][j] === 1) {
      undirMatrix[i][j] = 1;
      undirMatrix[j][i] = 1;
    }
  }
}

const rng2 = makeRng(seed);

// Матриця B
const B = [];
for (let i = 0; i < n; i++) {
  B[i] = [];
  for (let j = 0; j < n; j++) {
    B[i][j] = rng2() * 2.0;
  }
}

// Матриця C
const C = [];
for (let i = 0; i < n; i++) {
  C[i] = [];
  for (let j = 0; j < n; j++) {
    C[i][j] = Math.ceil(B[i][j] * 100 * undirMatrix[i][j]);
  }
}

// Матриця D
const D = [];
for (let i = 0; i < n; i++) {
  D[i] = [];
  for (let j = 0; j < n; j++) {
    D[i][j] = C[i][j] > 0 ? 1 : 0;
  }
}

// Матриця H
const H = [];
for (let i = 0; i < n; i++) {
  H[i] = [];
  for (let j = 0; j < n; j++) {
    H[i][j] = D[i][j] !== D[j][i] ? 1 : 0;
  }
}

// Верхньотрикутна матриця Tr
const Tr = [];
for (let i = 0; i < n; i++) {
  Tr[i] = [];
  for (let j = 0; j < n; j++) {
    Tr[i][j] = i < j ? 1 : 0;
  }
}

// Матриця ваг W
const W = [];
for (let i = 0; i < n; i++) {
  W[i] = new Array(n).fill(0);
}
for (let i = 0; i < n; i++) {
  for (let j = 0; j < n; j++) {
    const w = (D[i][j] + H[i][j] * Tr[i][j]) * C[i][j];
    W[i][j] = w;
    W[j][i] = w;
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

// Малювання дуги між двома вершинами
function drawEdge(ctx, x1, y1, x2, y2, lineWidth, color, weight, showWeight) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;

  const { cpx, cpy } = getControlPoint(x1, y1, x2, y2, +1);
  const tStart = findEdgeT(x1, y1, cpx, cpy, x2, y2, x1, y1, NODE_R, false);
  const tEnd = findEdgeT(x1, y1, cpx, cpy, x2, y2, x2, y2, NODE_R, true);
  const ps = bezierPoint(tStart, x1, y1, cpx, cpy, x2, y2);
  const pe = bezierPoint(tEnd, x1, y1, cpx, cpy, x2, y2);

  ctx.beginPath();
  ctx.moveTo(ps.x, ps.y);
  ctx.quadraticCurveTo(cpx, cpy, pe.x, pe.y);
  ctx.stroke();

  // Малювання ваги на дугу
  if (showWeight && weight > 0) {
    const mid = bezierPoint(0.5, x1, y1, cpx, cpy, x2, y2);
    ctx.fillStyle = color;
    ctx.font = "11px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "white";
    ctx.fillRect(mid.x - 9, mid.y - 7, 18, 14);
    ctx.fillStyle = color;
    ctx.fillText(String(weight), mid.x, mid.y);
  }
}

// Малювання петлі
function drawLoop(ctx, x, y, color) {
  const loopR = 13;
  const ox = x + NODE_R * 0.65,
    oy = y - NODE_R * 0.65;

  ctx.beginPath();
  ctx.arc(ox, oy, loopR, 0, 2 * Math.PI);
  ctx.stroke();
}

// Малює всі ребра графа
function drawAllEdges(ctx, matrix, weightMatrix, color, showWeights) {
  ctx.lineWidth = 1.5;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (matrix[i][j] !== 1) continue;
      const x1 = points[i].x,
        y1 = points[i].y;
      const x2 = points[j].x,
        y2 = points[j].y;
      drawEdge(ctx, x1, y1, x2, y2, +1, color, weightMatrix[i][j], showWeights);
    }
  }
}

// Малювання вершин
function drawNodes(ctx, nodeColors) {
  ctx.font = "bold 12px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < n; i++) {
    const { x, y } = points[i];
    const color = nodeColors[i];

    ctx.beginPath();
    ctx.arc(x, y, NODE_R, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = color === "white" || color === "#ffe066" ? "#000" : "#fff";
    ctx.fillText(i + 1, x, y);
  }
}

// Вивід матриці в таблицю
function renderMatrix(matrix, tableId) {
  const tableEl = document.getElementById(tableId);
  tableEl.innerHTML = "";
  for (let i = 0; i < n; i++) {
    const row = tableEl.insertRow();
    for (let j = 0; j < n; j++) {
      const td = row.insertCell();
      const v = matrix[i][j];
      td.textContent = v;
      if (v === 0) {
      } else if (v === 1 && tableId === "tUndir") {
        td.className = "one";
      } else if (v > 0) {
        td.className = "val";
      }
    }
  }
}

// Матриця мінімального кістяка
const spanTree = [];
for (let i = 0; i < n; i++) {
  spanTree[i] = new Array(n).fill(0);
}

// Малювання початкового стану графа
const canvas = document.getElementById("graphCanvas");
const ctx = canvas.getContext("2d");

let nodeColors = new Array(n).fill("white");

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (undirMatrix[i][j] !== 1) continue;
      drawEdge(
        ctx,
        points[i].x,
        points[i].y,
        points[j].x,
        points[j].y,
        1.5,
        "#ccc",
        W[i][j],
        true,
      );
    }
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (spanTree[i][j] !== 1) continue;
      drawEdge(
        ctx,
        points[i].x,
        points[i].y,
        points[j].x,
        points[j].y,
        3,
        "#e74c3c",
        W[i][j],
        true,
      );
    }
  }

  drawNodes(ctx, nodeColors);
}

redraw();
renderMatrix(undirMatrix, "tUndir");
renderMatrix(W, "tWeights");

// Стан алгоритму Прима
let inTree = new Array(n).fill(false);
let pLog = [];
let pDone = false;
let pStep = 0;
let total = 0;

// Ініціалізація алгоритму
function initPrima() {
  inTree = new Array(n).fill(false);
  pLog = [];
  pDone = false;
  pStep = 0;
  total = 0;
  nodeColors = new Array(n).fill("white");

  for (let i = 0; i < n; i++) {
    spanTree[i] = new Array(n).fill(0);
  }

  inTree[0] = true;
  nodeColors[0] = "#27ae60";

  pLog.push("Початок алгоритму Прима. Стартова вершина: 1");
  pLog.push(`В кістяку: { 1 }`);

  redraw();
  document.getElementById("protocol").textContent = pLog.join("\n");
}

function pNextStep() {
  if (pDone) return;

  pStep++;

  // Знаходження ребра з мінімальною вагою
  let minWeight = Infinity;
  let bestI = -1,
    bestJ = -1;

  for (let i = 0; i < n; i++) {
    if (!inTree[i]) continue;
    for (let j = 0; j < n; j++) {
      if (inTree[j]) continue;
      if (undirMatrix[i][j] !== 1) continue;
      if (W[i][j] < minWeight) {
        minWeight = W[i][j];
        bestI = i;
        bestJ = j;
      }
    }
  }

  if (bestJ === -1) {
    pDone = true;
    document.getElementById("btnStep").disabled = true;
    pLog.push("\nАлгоритм Прима завершено!");
    pLog.push(`Загальна вага кістяка: ${total}`);
    document.getElementById("protocol").textContent = pLog.join("\n");
    showPResults();
    return;
  }

  // Додавання вершини та ребра до кістяка
  inTree[bestJ] = true;
  spanTree[bestI][bestJ] = 1;
  spanTree[bestJ][bestI] = 1;
  total += minWeight;
  nodeColors[bestJ] = "#27ae60";

  for (let i = 0; i < n; i++) {
    if (inTree[i]) continue;
    let neighbor = false;
    for (let j = 0; j < n; j++) {
      if (inTree[j] && undirMatrix[i][j] === 1) {
        neighbor = true;
        break;
      }
    }
    nodeColors[i] = neighbor ? "#ffe066" : "white";
  }

  const treeVertices = [];
  for (let i = 0; i < n; i++) {
    if (inTree[i]) treeVertices.push(i + 1);
  }

  pLog.push(
    `\nКрок ${pStep}: додаємо ребро (${bestI + 1}, ${bestJ + 1}), вага = ${minWeight}`,
  );
  pLog.push(`  В кістяку: { ${treeVertices.join(", ")} }`);
  pLog.push(`  Загальна вага: ${total}`);

  redraw();
  document.getElementById("protocol").textContent = pLog.join("\n");

  if (treeVertices.length === n) {
    pDone = true;
    document.getElementById("btnStep").disabled = true;
    pLog.push("\nАлгоритм Прима завершено!");
    pLog.push(`Загальна вага кістяка: ${total}`);
    document.getElementById("protocol").textContent = pLog.join("\n");
    showPResults();
  }
}

// Скидання алгоритму
function resetPrima() {
  document.getElementById("btnStep").disabled = false;
  document.getElementById("pResults").style.display = "none";
  document.getElementById("protocol").textContent =
    'Натисніть "Наступний крок" щоб почати алгоритм Прима';
  initPrima();
}

function showPResults() {
  document.getElementById("pResults").style.display = "block";

  // Список ребер кістяка
  let text = `Загальна вага мінімального кістяка: ${total}\n\n`;
  text += "Ребра кістяка:\n";
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (spanTree[i][j] === 1) {
        text += `  (${i + 1}, ${j + 1})  вага = ${W[i][j]}\n`;
      }
    }
  }

  document.getElementById("pVector").textContent = text;
  renderMatrix(spanTree, "tSpanTree");
}

// Запуск алгоритму
initPrima();
