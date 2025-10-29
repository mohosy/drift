const sampleInput = document.getElementById("sample");
const shiftInput = document.getElementById("shift");
const spreadInput = document.getElementById("spread");
const analyzeBtn = document.getElementById("analyze");
const streamBtn = document.getElementById("stream");

const sampleVal = document.getElementById("sampleVal");
const shiftVal = document.getElementById("shiftVal");
const spreadVal = document.getElementById("spreadVal");

const psiText = document.getElementById("psi");
const jsText = document.getElementById("js");
const alertText = document.getElementById("alert");
const countText = document.getElementById("count");

const histCanvas = document.getElementById("hist");
const trendCanvas = document.getElementById("trend");
const hctx = histCanvas.getContext("2d");
const tctx = trendCanvas.getContext("2d");

let baseline = [];
let current = [];
let psiTrend = [];

function randn() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function generate(n, mean, std) {
  const arr = [];
  for (let i = 0; i < n; i += 1) arr.push(mean + randn() * std);
  return arr;
}

function hist(arr, bins, min, max) {
  const out = Array(bins).fill(0);
  const width = (max - min) / bins;
  arr.forEach((x) => {
    const idx = Math.max(0, Math.min(bins - 1, Math.floor((x - min) / width)));
    out[idx] += 1;
  });
  return out.map((c) => c / arr.length);
}

function psi(base, curr) {
  let s = 0;
  for (let i = 0; i < base.length; i += 1) {
    const b = Math.max(base[i], 1e-6);
    const c = Math.max(curr[i], 1e-6);
    s += (c - b) * Math.log(c / b);
  }
  return s;
}

function jsd(base, curr) {
  const m = base.map((b, i) => 0.5 * (b + curr[i]));
  const kl = (p, q) => p.reduce((s, pi, i) => s + pi * Math.log(Math.max(pi, 1e-9) / Math.max(q[i], 1e-9)), 0);
  return 0.5 * kl(base, m) + 0.5 * kl(curr, m);
}

function analyze(append = true) {
  const n = Number(sampleInput.value);
  const shift = Number(shiftInput.value);
  const spread = Number(spreadInput.value);

  baseline = generate(n, 0, 1);
  current = generate(n, shift, spread);

  const min = -5;
  const max = 5;
  const bins = 28;
  const hb = hist(baseline, bins, min, max);
  const hc = hist(current, bins, min, max);

  const psiVal = psi(hb, hc);
  const jsVal = jsd(hb, hc);

  if (append) psiTrend.push(psiVal);

  psiText.textContent = psiVal.toFixed(3);
  jsText.textContent = jsVal.toFixed(3);

  const alert = psiVal > 0.35 ? "High Drift" : psiVal > 0.18 ? "Moderate" : "Stable";
  alertText.textContent = alert;

  const count = psiTrend.filter((v) => v > 0.2).length;
  countText.textContent = String(count);

  drawHist(hb, hc);
  drawTrend();
}

function streamWindows() {
  psiTrend = [];
  const baseShift = Number(shiftInput.value);

  for (let i = 0; i < 20; i += 1) {
    const ramp = baseShift + (i / 19) * 0.5 - 0.25;
    shiftInput.value = ramp.toFixed(2);
    analyze(true);
  }

  shiftInput.value = baseShift.toFixed(2);
  syncLabels();
}

function drawHist(hb, hc) {
  const w = histCanvas.width;
  const h = histCanvas.height;
  hctx.clearRect(0, 0, w, h);
  hctx.fillStyle = "#140f1f";
  hctx.fillRect(0, 0, w, h);

  const bins = hb.length;
  const bw = (w - 40) / bins;
  const maxY = Math.max(...hb, ...hc, 0.01);

  for (let i = 0; i < bins; i += 1) {
    const x = 20 + i * bw;
    const h1 = (hb[i] / maxY) * (h - 40);
    const h2 = (hc[i] / maxY) * (h - 40);

    hctx.fillStyle = "rgba(164, 132, 235, 0.55)";
    hctx.fillRect(x, h - 20 - h1, bw - 2, h1);

    hctx.fillStyle = "rgba(244, 180, 120, 0.55)";
    hctx.fillRect(x + 1, h - 20 - h2, bw - 4, h2);
  }
}

function drawTrend() {
  const w = trendCanvas.width;
  const h = trendCanvas.height;
  tctx.clearRect(0, 0, w, h);
  tctx.fillStyle = "#140f1f";
  tctx.fillRect(0, 0, w, h);

  if (!psiTrend.length) return;

  const maxY = Math.max(0.4, ...psiTrend) * 1.2;
  const sx = (i) => 20 + (i / Math.max(1, psiTrend.length - 1)) * (w - 40);
  const sy = (v) => h - 20 - (v / maxY) * (h - 40);

  tctx.beginPath();
  psiTrend.forEach((v, i) => {
    const x = sx(i);
    const y = sy(v);
    if (i === 0) tctx.moveTo(x, y);
    else tctx.lineTo(x, y);
  });
  tctx.strokeStyle = "#c8a3ff";
  tctx.lineWidth = 2;
  tctx.stroke();

  const y = sy(0.2);
  tctx.strokeStyle = "rgba(255,170,140,0.85)";
  tctx.setLineDash([8, 6]);
  tctx.beginPath();
  tctx.moveTo(20, y);
  tctx.lineTo(w - 20, y);
  tctx.stroke();
  tctx.setLineDash([]);
}

function syncLabels() {
  sampleVal.textContent = sampleInput.value;
  shiftVal.textContent = Number(shiftInput.value).toFixed(2);
  spreadVal.textContent = Number(spreadInput.value).toFixed(2);
}

[sampleInput, shiftInput, spreadInput].forEach((el) => {
  el.addEventListener("input", syncLabels);
});

analyzeBtn.addEventListener("click", () => analyze(true));
streamBtn.addEventListener("click", streamWindows);

syncLabels();
analyze(true);
