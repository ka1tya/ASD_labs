const n1 = 5,
  n2 = 5,
  n3 = 0,
  n4 = 5;
const seed = n1 * 1000 + n2 * 100 + n3 * 10 + n4;
const n = 10 + n3;
const k = 1.0 - n3 * 0.01 - n4 * 0.005 - 0.15;

document.getElementById("info").textContent =
  `Варіант: ${seed}, n = ${n}, k = ${k.toFixed(4)}, розміщення: трикутник`;

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
const dirMatrix = [];
for (let i = 0; i < n; i++) {
  dirMatrix[i] = [];
  for (let j = 0; j < n; j++) {
    const val = rng() * 2.0;
    dirMatrix[i][j] = val * k >= 1.0 ? 1 : 0;
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
function drawArrow(ctx, x1, y1, x2, y2, side, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
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
function drawLoop(ctx, x, y, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
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

// Малювання ребер
function drawEdges(ctx, matrix, color) {
  ctx.lineWidth = 1.5;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (matrix[i][j] !== 1) continue;
      const { x: x1, y: y1 } = points[i];
      const { x: x2, y: y2 } = points[j];
      if (i === j) {
        drawLoop(ctx, x1, y1, color);
      } else {
        const side = matrix[j][i] === 1 && i > j ? -1 : +1;
        drawArrow(ctx, x1, y1, x2, y2, side, color);
      }
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

// Малювання початкового стану графа
const canvas = document.getElementById("graphCanvas");
const ctx = canvas.getContext("2d");

const nodeColors = new Array(n).fill("white");

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawEdges(ctx, dirMatrix, "#ccc");
  ctx.lineWidth = 2.5;
  drawEdges(ctx, treeMatrix, "#1a6bbd");
  ctx.lineWidth = 1.5;
  drawNodes(ctx, nodeColors);
}

redraw();
renderMatrix(dirMatrix, document.getElementById("tDir"));

function findStartV(visited) {
  for (let i = 0; i < n; i++) {
    if (visited[i]) continue;
    for (let j = 0; j < n; j++) {
      if (dirMatrix[i][j] === 1) return i;
    }
  }
  return -1;
}

// Стан BFS
let visited = new Array(n).fill(false);
let queue = [];
let order = [];
let log = [];
let done = false;

// Ініціалізація BFS
function initBFS() {
  visited = new Array(n).fill(false);
  queue = [];
  order = [];
  log = [];
  done = false;

  // Знаходження стартової вершини
  const start = findStartV(visited);
  if (start === -1) {
    document.getElementById("protocol").textContent =
      "Немає вершин з вихідними дугами.";
    done = true;
    return;
  }

  // Додавання стартової вершини в чергу
  queue.push(start);
  visited[start] = true;
  nodeColors[start] = "#ffe066";

  log.push(`Початок BFS. Стартова вершина: ${start + 1}`);
  log.push(`Черга: [${queue.map((v) => v + 1).join(", ")}]`);

  redraw();
  document.getElementById("protocol").textContent = log.join("\n");
}

// Один крок BFS
function nextStep() {
  if (done) return;

  if (queue.length === 0) {
    const next = findStartV(visited);
    if (next === -1) {
      done = true;
      document.getElementById("btnStep").disabled = true;
      log.push("\nBFS завершено!");
      log.push(`Порядок відвідування: ${order.map((v) => v + 1).join(" → ")}`);
      document.getElementById("protocol").textContent = log.join("\n");
      showBFSResults();
      return;
    }
    queue.push(next);
    visited[next] = true;
    nodeColors[next] = "#ffe066";
    log.push(
      `\nНевідвідані вершини залишились. Продовжуємо з вершини ${next + 1}`,
    );
    log.push(`Черга: [${queue.map((v) => v + 1).join(", ")}]`);
    redraw();
    document.getElementById("protocol").textContent = log.join("\n");
    return;
  }

  // Витягання вершини з черги
  const current = queue.shift();
  const orderNum = order.length + 1;
  order.push(current);
  nodeColors[current] = "#27ae60";

  log.push(`\nКрок ${orderNum}: обробляємо вершину ${current + 1}`);

  // Перебирання сусідів в порядку нумерації
  let addedToQueue = [];
  for (let j = 0; j < n; j++) {
    if (dirMatrix[current][j] !== 1) continue;
    if (j === current) continue;

    if (!visited[j]) {
      visited[j] = true;
      queue.push(j);
      nodeColors[j] = "#ffe066";
      addedToQueue.push(j + 1);

      treeMatrix[current][j] = 1;
    }
  }

  if (addedToQueue.length > 0) {
    log.push(`  Додано до черги: ${addedToQueue.join(", ")}`);
  } else {
    log.push(`  Нових вершин не додано`);
  }
  log.push(`  Черга: [${queue.map((v) => v + 1).join(", ")}]`);

  redraw();
  document.getElementById("protocol").textContent = log.join("\n");
}

// Скидання BFS
function resetBFS() {
  for (let i = 0; i < n; i++) {
    nodeColors[i] = "white";
    for (let j = 0; j < n; j++) treeMatrix[i][j] = 0;
  }
  document.getElementById("btnStep").disabled = false;
  document.getElementById("bfsResults").style.display = "none";
  document.getElementById("protocol").textContent =
    'Натисніть "Наступний крок" щоб почати обхід';
  redraw();
  initBFS();
}

// Показ результатів BFS
function showBFSResults() {
  document.getElementById("bfsResults").style.display = "block";

  let vectorText = "Вершина → порядок відвідування:\n";
  for (let i = 0; i < order.length; i++) {
    vectorText += `  вершина ${order[i] + 1} → ${i + 1}\n`;
  }

  const notVisited = [];
  for (let i = 0; i < n; i++) {
    if (!visited[i]) notVisited.push(i + 1);
  }
  if (notVisited.length > 0)
    vectorText += `  (не відвідані: ${notVisited.join(", ")})`;

  document.getElementById("bfsVector").textContent = vectorText;
  renderMatrix(treeMatrix, document.getElementById("tTree"));
}

const treeMatrix = [];
for (let i = 0; i < n; i++) {
  treeMatrix[i] = new Array(n).fill(0);
}

initBFS();
