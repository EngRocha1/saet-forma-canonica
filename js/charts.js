/** Gráficos. Não montam matriz. */

import { depthProfile, wallProfile, baseProfile, frontReport } from "./profiles.js";

const CORE_COLOR = { areia: "#e7e5e4", alumina: "#38bdf8", hematita: "#fb923c" };
const CORE_LABEL = { areia: "Areia", alumina: "Alumina", hematita: "Hematita" };

function trio(pack) {
  if (!pack || !pack.byKey) return null;
  return pack.keys.map((key) => ({ key, state: pack.byKey[key] }));
}

function remember(canvas, W, H, hits) {
  canvas._plot = { W, H, hits };
}

export function bindPlotHover(canvas, tip) {
  if (canvas.dataset.hover === "1") return;
  canvas.dataset.hover = "1";
  canvas.addEventListener("mousemove", (ev) => {
    const plot = canvas._plot;
    if (!plot || !plot.hits.length) { tip.hidden = true; return; }
    const rect = canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) * (plot.W / rect.width);
    const y = (ev.clientY - rect.top) * (plot.H / rect.height);
    let best = null;
    let dist = 22;
    for (const hit of plot.hits) {
      const d = Math.hypot(hit.x - x, hit.y - y);
      if (d < dist) { dist = d; best = hit; }
    }
    if (!best) { tip.hidden = true; return; }
    tip.hidden = false;
    tip.textContent = best.text;
    tip.style.left = (ev.clientX + 14) + "px";
    tip.style.top = (ev.clientY + 14) + "px";
  });
  canvas.addEventListener("mouseleave", () => { tip.hidden = true; });
}

function yTicks(ctx, pad, ticksY, Y) {
  ctx.fillStyle = "#f5f5f4";
  ctx.font = "12px IBM Plex Mono, monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (const v of ticksY) ctx.fillText(label(v), pad.l - 8, Y(v));
  ctx.textBaseline = "alphabetic";
}
  if (!pack || !pack.byKey) return null;
  return pack.keys.map((key) => ({ key, state: pack.byKey[key] }));
}

function frameAt(state, index) {
  const frames = state.frames || [];
  if (!frames.length) return null;
  const i = Math.max(0, Math.min(index, frames.length - 1));
  return frames[i];
}
const MAT = {
  ifb: "#fdba74",
  perlita: "#7dd3fc",
  silicato: "#bef264",
  vermiculita: "#d8b4fe"
};

function heat(t, a, b) {
  const f = Math.max(0, Math.min(1, (t - a) / Math.max(b - a, 1e-9)));
  const stops = [[15, 23, 42], [14, 165, 233], [250, 204, 21], [234, 88, 12], [127, 29, 29]];
  const x = f * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const u = x - i;
  const c0 = stops[i];
  const c1 = stops[i + 1];
  return [
    c0[0] + (c1[0] - c0[0]) * u,
    c0[1] + (c1[1] - c0[1]) * u,
    c0[2] + (c1[2] - c0[2]) * u
  ];
}

function fit(canvas, w, h) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

function ticks(min, max, count) {
  const span = max - min;
  if (!(span > 0)) return [min];
  const raw = span / Math.max(2, count);
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  const step = (n <= 1.5 ? 1 : n <= 3.5 ? 2 : n <= 7.5 ? 5 : 10) * pow;
  const start = Math.ceil((min - step * 1e-8) / step) * step;
  const out = [];
  for (let v = start; v <= max + step * 1e-6; v += step) {
    const r = Math.round(v / step) * step;
    out.push(Math.abs(r) < 1e-10 ? 0 : r);
    if (out.length > 14) break;
  }
  return out;
}

function label(v) {
  const a = Math.abs(v);
  if (a !== 0 && (a >= 1e4 || a < 0.01)) return v.toExponential(1);
  if (a >= 100) return String(Math.round(v));
  if (Number.isInteger(v)) return String(v);
  return (Math.round(v * 100) / 100).toString();
}

function grid(ctx, x0, y0, w, h, xs, ys) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, w, h);
  ctx.clip();
  ctx.strokeStyle = "rgba(231,229,228,0.18)";
  ctx.lineWidth = 1;
  for (const x of xs) {
    ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + h); ctx.stroke();
  }
  for (const y of ys) {
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + w, y); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = "#e7e5e4";
  ctx.strokeRect(x0 + 0.5, y0 + 0.5, w, h);
}

function paintElements(ctx, mesh, T, tmin, tmax, mapR, mapZ) {
  for (const el of mesh.elements) {
    let t = 0;
    for (const n of el.n) t += T[n];
    t /= 4;
    const col = heat(t, tmin, tmax);
    const x1 = mapR(mesh.rEdges[el.i]);
    const x2 = mapR(mesh.rEdges[el.i + 1]);
    const y1 = mapZ(mesh.zEdges[el.j]);
    const y2 = mapZ(mesh.zEdges[el.j + 1]);
    ctx.fillStyle = "rgb(" + (col[0] | 0) + "," + (col[1] | 0) + "," + (col[2] | 0) + ")";
    ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.max(Math.abs(x2 - x1), 0.4), Math.max(Math.abs(y2 - y1), 0.4));
  }
}

export function drawField(canvas, pack, frameOrIndex) {
  const list = trio(pack);
  if (list) {
    drawFieldTrio(canvas, list, typeof frameOrIndex === "number" ? frameOrIndex : 0);
    return;
  }
  drawFieldOne(canvas, pack, frameOrIndex);
}

function drawFieldTrio(canvas, list, index) {
  const W = canvas.clientWidth || 860;
  const H = 520;
  const ctx = fit(canvas, W, H);
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, W, H);
  const gap = 10;
  const pw = (W - gap * (list.length - 1)) / list.length;
  list.forEach((item, i) => {
    const frame = frameAt(item.state, index);
    if (!frame) return;
    paintPanel(ctx, item.state.mesh, frame.T, item.key, i * (pw + gap), 8, pw, H - 16);
  });
}

function paintPanel(ctx, mesh, T, key, x0, y0, w, h) {
  let tmin = Infinity;
  let tmax = -Infinity;
  for (const v of T) {
    if (v < tmin) tmin = v;
    if (v > tmax) tmax = v;
  }
  if (tmax - tmin < 1) tmax = tmin + 1;
  const rMax = mesh.rEdges[mesh.nr];
  const zMax = mesh.zEdges[mesh.nz];
  const pad = { l: 36, r: 8, t: 22, b: 28 };
  const availW = w - pad.l - pad.r;
  const availH = h - pad.t - pad.b;
  const sc = Math.min(availW / (2 * rMax), availH / zMax);
  const meshW = 2 * rMax * sc;
  const meshH = zMax * sc;
  const ox = x0 + pad.l + (availW - meshW) / 2;
  const oy = y0 + pad.t + (availH - meshH) / 2;
  const xr = (r) => ox + (r + rMax) * sc;
  const yz = (z) => oy + (zMax - z) * sc;
  ctx.save();
  ctx.beginPath();
  ctx.rect(ox, oy, meshW / 2, meshH);
  ctx.clip();
  paintElements(ctx, mesh, T, tmin, tmax, (r) => xr(-r), yz);
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.rect(ox + meshW / 2, oy, meshW / 2, meshH);
  ctx.clip();
  paintElements(ctx, mesh, T, tmin, tmax, xr, yz);
  ctx.restore();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(xr(-rMax), yz(zMax), 2 * rMax * sc, zMax * sc);
  ctx.strokeStyle = "#fb923c";
  ctx.lineWidth = 2;
  ctx.strokeRect(xr(-mesh.R), yz(mesh.zCoreTop), 2 * mesh.R * sc, (mesh.zCoreTop - mesh.zCore0) * sc);
  ctx.strokeStyle = "#fef08a";
  ctx.beginPath();
  ctx.moveTo(xr(-mesh.R), yz(mesh.zCoreTop));
  ctx.lineTo(xr(mesh.R), yz(mesh.zCoreTop));
  ctx.stroke();
  ctx.fillStyle = CORE_COLOR[key];
  ctx.font = "13px IBM Plex Sans, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(CORE_LABEL[key], x0 + 4, y0);
  ctx.fillStyle = "#e7e5e4";
  ctx.font = "11px IBM Plex Mono, monospace";
  ctx.fillText(label(tmin) + "–" + label(tmax) + " °C", x0 + 4, y0 + h - 16);
}

function drawFieldOne(canvas, state, frame) {
  const W = canvas.clientWidth || 860;
  const H = 560;
  const ctx = fit(canvas, W, H);
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, W, H);
  if (!state || !frame) return;
  const mesh = state.mesh;
  const T = frame.T;
  let tmin = Infinity;
  let tmax = -Infinity;
  for (const v of T) {
    if (v < tmin) tmin = v;
    if (v > tmax) tmax = v;
  }
  if (tmax - tmin < 1) tmax = tmin + 1;
  const rMax = mesh.rEdges[mesh.nr];
  const zMax = mesh.zEdges[mesh.nz];
  const pad = { l: 58, r: 210, t: 16, b: 46 };
  const availW = W - pad.l - pad.r;
  const availH = H - pad.t - pad.b;
  const sc = Math.min(availW / (2 * rMax), availH / zMax);
  const meshW = 2 * rMax * sc;
  const meshH = zMax * sc;
  const x0 = pad.l + (availW - meshW) / 2;
  const y0 = pad.t + (availH - meshH) / 2;
  const xr = (r) => x0 + (r + rMax) * sc;
  const yz = (z) => y0 + (zMax - z) * sc;

  const rTicks = ticks(-rMax, rMax, 6);
  const zTicks = ticks(0, zMax, 8);
  grid(ctx, x0, y0, meshW, meshH, rTicks.map(xr), zTicks.map(yz));

  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, meshW / 2, meshH);
  ctx.clip();
  paintElements(ctx, mesh, T, tmin, tmax, (r) => xr(-r), yz);
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0 + meshW / 2, y0, meshW / 2, meshH);
  ctx.clip();
  paintElements(ctx, mesh, T, tmin, tmax, xr, yz);
  ctx.restore();

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.strokeRect(xr(-rMax), yz(zMax), 2 * rMax * sc, zMax * sc);
  ctx.strokeStyle = "#fb923c";
  ctx.lineWidth = 3;
  const coreH = (mesh.zCoreTop - mesh.zCore0) * sc;
  ctx.strokeRect(xr(-mesh.R), yz(mesh.zCoreTop), 2 * mesh.R * sc, coreH);
  strokeInsulation(ctx, mesh, xr, yz);
  ctx.strokeStyle = "#fef08a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(xr(-mesh.R), yz(mesh.zCoreTop));
  ctx.lineTo(xr(mesh.R), yz(mesh.zCoreTop));
  ctx.stroke();
  ctx.fillStyle = "#fef08a";
  ctx.font = "12px IBM Plex Sans, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("carga no centro, sob o isolamento", xr(0), yz(mesh.zCoreTop) - 4);

  ctx.fillStyle = "#e7e5e4";
  ctx.font = "11px IBM Plex Mono, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (const r of rTicks) ctx.fillText(label(r), xr(r), y0 + meshH + 4);
  ctx.font = "12px IBM Plex Sans, sans-serif";
  ctx.fillText("r (m)  ·  eixo no centro", x0 + meshW / 2, y0 + meshH + 22);
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.font = "11px IBM Plex Mono, monospace";
  for (const z of zTicks) ctx.fillText(label(z), x0 - 6, yz(z));
  ctx.save();
  ctx.translate(16, y0 + meshH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.font = "12px IBM Plex Sans, sans-serif";
  ctx.fillStyle = "#e7e5e4";
  ctx.fillText("z (m)", 0, 0);
  ctx.restore();

  const bx = x0 + meshW + 18;
  const bh = Math.min(meshH * 0.42, 160);
  for (let i = 0; i < bh; i++) {
    const t = tmax - (tmax - tmin) * (i / bh);
    const col = heat(t, tmin, tmax);
    ctx.fillStyle = "rgb(" + (col[0] | 0) + "," + (col[1] | 0) + "," + (col[2] | 0) + ")";
    ctx.fillRect(bx, y0 + i, 12, 1);
  }
  ctx.strokeStyle = "#e7e5e4";
  ctx.strokeRect(bx, y0, 12, bh);
  ctx.fillStyle = "#e7e5e4";
  ctx.font = "11px IBM Plex Mono, monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  for (const tv of ticks(tmin, tmax, 4)) {
    const yy = y0 + (tmax - tv) / (tmax - tmin) * bh;
    ctx.fillText(label(tv) + " °C", bx + 16, yy);
  }
  const infoY = y0 + bh + 22;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = "12px IBM Plex Sans, sans-serif";
  const lines = [
    "Núcleo (laranja)",
    "R = " + mesh.R.toFixed(2) + " m",
    "L = " + mesh.L.toFixed(2) + " m",
    "Externo (branco)",
    "R = " + rMax.toFixed(2) + " m",
    "H = " + zMax.toFixed(2) + " m",
    "IFB · perlita · silicato · vermiculita",
    "contorno colorido em cada camada"
  ];
  lines.forEach((line, i) => ctx.fillText(line, bx, infoY + i * 16));
}

function strokeInsulation(ctx, mesh, xr, yz) {
  ctx.lineWidth = 1.5;
  for (const el of mesh.elements) {
    if (el.core) continue;
    const y1 = yz(mesh.zEdges[el.j]);
    const y2 = yz(mesh.zEdges[el.j + 1]);
    const y = Math.min(y1, y2);
    const h = Math.abs(y2 - y1);
    ctx.strokeStyle = MAT[el.mat] || "#fff";
    for (const sign of [1, -1]) {
      const x1 = xr(sign * mesh.rEdges[el.i]);
      const x2 = xr(sign * mesh.rEdges[el.i + 1]);
      ctx.strokeRect(Math.min(x1, x2), y, Math.abs(x2 - x1), h);
    }
  }
}

export function drawVolume(canvas, pack) {
  const W = canvas.clientWidth || 860;
  const H = 280;
  const ctx = fit(canvas, W, H);
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, W, H);
  if (!pack || !pack.rows) return;
  const rows = pack.rows;
  const vmax = Math.max(...rows.map((r) => r.V)) * 1.15;
  const pad = { l: 56, r: 16, t: 16, b: 48 };
  const w = W - pad.l - pad.r;
  const h = H - pad.t - pad.b;
  const slot = w / rows.length;
  const Y = (v) => pad.t + (1 - v / vmax) * h;
  const yt = ticks(0, vmax, 5);
  grid(ctx, pad.l, pad.t, w, h, [], yt.map(Y));
  ctx.fillStyle = "#e7e5e4";
  ctx.font = "11px IBM Plex Mono, monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (const t of yt) ctx.fillText(label(t), pad.l - 6, Y(t));
  rows.forEach((r, i) => {
    const x = pad.l + i * slot + slot * 0.22;
    const bw = slot * 0.56;
    const y = Y(r.V);
    ctx.fillStyle = i === 0 ? "#a8a29e" : "#fb923c";
    ctx.fillRect(x, y, bw, pad.t + h - y);
    ctx.fillStyle = "#e7e5e4";
    ctx.textAlign = "center";
    ctx.font = "12px IBM Plex Sans, sans-serif";
    ctx.fillText(r.name, x + bw / 2, pad.t + h + 8);
    ctx.font = "11px IBM Plex Mono, monospace";
    ctx.fillText(r.V.toFixed(1) + " m³", x + bw / 2, y - 16);
    ctx.fillText(r.pct.toFixed(1) + "%", x + bw / 2, y - 2);
  });
  ctx.font = "12px IBM Plex Sans, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("V (m³) para a mesma energia da areia  ·  areia = 100%", W / 2, H - 8);
}

export function drawLosses(canvas, frameOrPack, index) {
  if (frameOrPack && frameOrPack.byKey) {
    drawLossTrio(canvas, frameOrPack, index || 0);
    return;
  }
  const frame = frameOrPack;
  const W = canvas.clientWidth || 860;
  const H = 320;
  const ctx = fit(canvas, W, H);
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, W, H);
  const rows = frame && frame.losses ? frame.losses : [];
  if (!rows.length) return;
  const vals = rows.map((r) => r.Q / 1000);
  let lo = Math.min(0, ...vals);
  let hi = Math.max(0, ...vals);
  if (hi - lo < 1e-6) hi = lo + 1;
  const pad = lo < 0 ? 0.08 * (hi - lo) : 0;
  lo -= pad; hi += 0.08 * (hi - lo);
  const padL = 168;
  const padR = 70;
  const top = 16;
  const bot = 36;
  const rowH = (H - top - bot) / rows.length;
  const xOf = (q) => padL + (q - lo) / (hi - lo) * (W - padL - padR);
  ctx.strokeStyle = "rgba(231,229,228,0.25)";
  for (const tick of ticks(lo, hi, 5)) {
    ctx.beginPath();
    ctx.moveTo(xOf(tick), top);
    ctx.lineTo(xOf(tick), H - bot);
    ctx.stroke();
    ctx.fillStyle = "#e7e5e4";
    ctx.font = "11px IBM Plex Mono, monospace";
    ctx.textAlign = "center";
    ctx.fillText(label(tick), xOf(tick), H - bot + 16);
  }
  ctx.beginPath();
  ctx.strokeStyle = "#e7e5e4";
  ctx.moveTo(xOf(0), top);
  ctx.lineTo(xOf(0), H - bot);
  ctx.stroke();
  rows.forEach((r, i) => {
    const y = top + i * rowH + 4;
    const x1 = xOf(0);
    const x2 = xOf(r.Q / 1000);
    ctx.fillStyle = r.Q >= 0 ? "#fb923c" : "#38bdf8";
    ctx.fillRect(Math.min(x1, x2), y, Math.max(2, Math.abs(x2 - x1)), rowH - 8);
    ctx.fillStyle = "#e7e5e4";
    ctx.font = "12px IBM Plex Sans, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(r.layer, padL - 8, y + (rowH - 8) / 2);
    ctx.textAlign = "left";
    ctx.font = "11px IBM Plex Mono, monospace";
    ctx.fillText(label(r.Q / 1000) + " kW", Math.max(x1, x2) + 4, y + (rowH - 8) / 2);
  });
  ctx.fillStyle = "#e7e5e4";
  ctx.font = "12px IBM Plex Sans, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("potência na face interna da camada (kW)  ·  positivo sai do núcleo", W / 2, H - 8);
}

export function drawCharge(canvas, state) {
  if (state && state.byKey) {
    drawChargeTrio(canvas, state);
    return;
  }
  const W = canvas.clientWidth || 860;
  const H = 300;
  const ctx = fit(canvas, W, H);
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, W, H);
  if (!state) return;
  const c = state.curve;
  let emax = 0;
  for (const p of c) emax = Math.max(emax, p.E / 1e9);
  emax = emax <= 0 ? 1 : emax * 1.08;
  const tmax = Math.max(state.days * 24, c[c.length - 1].tH);
  const pad = { l: 62, r: 18, t: 16, b: 40 };
  const w = W - pad.l - pad.r;
  const h = H - pad.t - pad.b;
  const X = (t) => pad.l + (t / tmax) * w;
  const Y = (e) => pad.t + (1 - e / emax) * h;
  const xt = ticks(0, tmax, 8);
  const yt = ticks(0, emax, 6);
  grid(ctx, pad.l, pad.t, w, h, xt.map(X), yt.map(Y));
  ctx.strokeStyle = "#fb923c";
  ctx.lineWidth = 2;
  ctx.beginPath();
  c.forEach((p, i) => (i ? ctx.lineTo(X(p.tH), Y(p.E / 1e9)) : ctx.moveTo(X(p.tH), Y(p.E / 1e9))));
  ctx.stroke();
  if (state.tBreak != null) {
    ctx.strokeStyle = "#facc15";
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(X(state.tBreak), pad.t);
    ctx.lineTo(X(state.tBreak), pad.t + h);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.fillStyle = "#e7e5e4";
  ctx.font = "11px IBM Plex Mono, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (const t of xt) ctx.fillText(label(t), X(t), pad.t + h + 4);
  ctx.font = "12px IBM Plex Sans, sans-serif";
  ctx.fillText("t (h)", pad.l + w / 2, pad.t + h + 20);
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.font = "11px IBM Plex Mono, monospace";
  for (const e of yt) ctx.fillText(label(e), pad.l - 6, Y(e));
  ctx.save();
  ctx.translate(16, pad.t + h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.font = "12px IBM Plex Sans, sans-serif";
  ctx.fillText("E (GJ)", 0, 0);
  ctx.restore();
}

function series(ctx, data, X, Y, color) {
  if (!data.length) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  data.forEach((v, i) => (i ? ctx.lineTo(X(i), Y(Math.log10(Math.max(v, 1e-16)))) : ctx.moveTo(X(i), Y(Math.log10(Math.max(v, 1e-16))))));
  ctx.stroke();
}

export function drawResidual(canvas, state) {
  if (state && state.byKey) {
    drawResidualTrio(canvas, state);
    return;
  }
  const W = canvas.clientWidth || 860;
  const H = 300;
  const ctx = fit(canvas, W, H);
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, W, H);
  const a = state && state.newtonHist ? state.newtonHist : [];
  const b = state && state.lastNewton ? state.lastNewton : [];
  if (!a.length) return;
  const logs = a.concat(b).map((v) => Math.log10(Math.max(v, 1e-16)));
  let lo = Math.min(...logs);
  let hi = Math.max(...logs);
  if (hi - lo < 0.3) { hi += 0.15; lo -= 0.15; }
  const n = Math.max(a.length, b.length);
  const pad = { l: 62, r: 18, t: 28, b: 40 };
  const w = W - pad.l - pad.r;
  const h = H - pad.t - pad.b;
  const X = (i) => pad.l + (n === 1 ? w / 2 : (i / (n - 1)) * w);
  const Y = (v) => pad.t + (hi - v) / (hi - lo) * h;
  const xt = ticks(1, n, 6);
  const yt = ticks(lo, hi, 6);
  grid(ctx, pad.l, pad.t, w, h, xt.map((v) => X(v - 1)), yt.map(Y));
  series(ctx, a, X, Y, "#fb923c");
  series(ctx, b, X, Y, "#22d3ee");
  ctx.fillStyle = "#fb923c";
  ctx.font = "12px IBM Plex Sans, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("laranja: passo em que o resíduo inicial é maior (" + (state.newtonAt ?? "—") + " h)", pad.l, 16);
  ctx.fillStyle = "#22d3ee";
  ctx.fillText("ciano: último passo", pad.l + 420, 16);
  ctx.fillStyle = "#e7e5e4";
  ctx.font = "11px IBM Plex Mono, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (const it of xt) ctx.fillText(String(Math.round(it)), X(it - 1), pad.t + h + 4);
  ctx.font = "12px IBM Plex Sans, sans-serif";
  ctx.fillText("iteração de Newton", pad.l + w / 2, pad.t + h + 20);
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.font = "11px IBM Plex Mono, monospace";
  for (const v of yt) ctx.fillText(label(v), pad.l - 6, Y(v));
  ctx.save();
  ctx.translate(16, pad.t + h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.font = "12px IBM Plex Sans, sans-serif";
  ctx.fillText("log10 ‖R‖", 0, 0);
  ctx.restore();
}

export function drawTemporal(canvas, state) {
  if (state && state.byKey) {
    drawTemporalTrio(canvas, state);
    return;
  }
  const W = canvas.clientWidth || 860;
  const H = 260;
  const ctx = fit(canvas, W, H);
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, W, H);
  const runs = state && state.temporal ? state.temporal.runs : [];
  if (runs.length < 3) return;
  const ref = runs[2].T;
  const err = [Math.abs(runs[0].T - ref), Math.abs(runs[1].T - ref)];
  const lo = Math.max(Math.min(...err) * 0.5, 1e-4);
  const hi = Math.max(...err) * 1.35;
  const pad = { l: 70, r: 18, t: 16, b: 48 };
  const w = W - pad.l - pad.r;
  const h = H - pad.t - pad.b;
  const X = (i) => pad.l + (i + 0.5) * (w / 2);
  const Y = (v) => pad.t + (Math.log10(hi) - Math.log10(Math.max(v, lo))) / (Math.log10(hi) - Math.log10(lo)) * h;
  ctx.strokeStyle = "#e7e5e4";
  ctx.strokeRect(pad.l, pad.t, w, h);
  err.forEach((e, i) => {
    const y = Y(e);
    ctx.fillStyle = "#fb923c";
    ctx.fillRect(X(i) - 22, y, 44, pad.t + h - y);
    ctx.fillStyle = "#e7e5e4";
    ctx.font = "11px IBM Plex Mono, monospace";
    ctx.textAlign = "center";
    ctx.fillText("Δt = " + label(runs[i].dt) + " h", X(i), pad.t + h + 16);
    ctx.fillText(e.toFixed(2) + " °C", X(i), y - 8);
  });
  ctx.fillStyle = "#e7e5e4";
  ctx.font = "12px IBM Plex Sans, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("erro da sonda contra Δt = " + label(runs[2].dt) + " h  ·  ordem " + (state.temporal.p == null ? "—" : state.temporal.p.toFixed(2)), W / 2, H - 8);
}

function drawLossTrio(canvas, pack, index) {
  const W = canvas.clientWidth || 860;
  const H = 360;
  const ctx = fit(canvas, W, H);
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, W, H);
  const list = trio(pack);
  const layers = (frameAt(list[0].state, index).losses || []).map((r) => r.layer);
  if (!layers.length) return;
  const vals = [];
  for (const item of list) {
    const frame = frameAt(item.state, index);
    for (const row of frame.losses || []) vals.push(row.Q / 1000);
  }
  let lo = Math.min(0, ...vals);
  let hi = Math.max(0, ...vals);
  if (hi - lo < 1e-6) hi = lo + 1;
  hi += 0.12 * (hi - lo);
  const padL = 188;
  const padR = 72;
  const top = 28;
  const bot = 36;
  const rowH = (H - top - bot) / layers.length;
  const xOf = (q) => padL + (q - lo) / (hi - lo) * (W - padL - padR);
  ctx.strokeStyle = "rgba(231,229,228,0.25)";
  for (const tick of ticks(lo, hi, 5)) {
    ctx.beginPath();
    ctx.moveTo(xOf(tick), top);
    ctx.lineTo(xOf(tick), H - bot);
    ctx.stroke();
    ctx.fillStyle = "#e7e5e4";
    ctx.font = "11px IBM Plex Mono, monospace";
    ctx.textAlign = "center";
    ctx.fillText(label(tick), xOf(tick), H - bot + 16);
  }
  layers.forEach((name, i) => {
    const y0 = top + i * rowH;
    ctx.fillStyle = "#e7e5e4";
    ctx.font = "12px IBM Plex Sans, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(name, padL - 8, y0 + rowH / 2);
    list.forEach((item, k) => {
      const row = (frameAt(item.state, index).losses || []).find((r) => r.layer === name);
      if (!row) return;
      const bh = Math.max(4, (rowH - 8) / list.length);
      const y = y0 + 4 + k * bh;
      const x1 = xOf(0);
      const x2 = xOf(row.Q / 1000);
      ctx.fillStyle = CORE_COLOR[item.key];
      ctx.fillRect(Math.min(x1, x2), y, Math.max(2, Math.abs(x2 - x1)), bh - 1);
      ctx.fillStyle = "#f5f5f4";
      ctx.font = "11px IBM Plex Mono, monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(label(row.Q / 1000) + " kW", Math.max(x1, x2) + 4, y + bh / 2);
    });
  });
  const hits = [];
  layers.forEach((name, i) => {
    list.forEach((item, k) => {
      const row = (frameAt(item.state, index).losses || []).find((r) => r.layer === name);
      if (!row) return;
      const bh = Math.max(4, (rowH - 8) / list.length);
      const y = top + i * rowH + 4 + k * bh;
      hits.push({ x: xOf(row.Q / 1000), y: y + bh / 2, text: item.key + " · " + name + " · " + (row.Q / 1000).toFixed(3) + " kW" });
    });
  });
  remember(canvas, W, H, hits);
  ctx.font = "12px IBM Plex Sans, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  list.forEach((item, k) => {
    ctx.fillStyle = CORE_COLOR[item.key];
    ctx.fillText(CORE_LABEL[item.key], 12 + k * 100, 16);
  });
}

function drawChargeTrio(canvas, pack) {
  const W = canvas.clientWidth || 860;
  const H = 340;
  const ctx = fit(canvas, W, H);
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, W, H);
  const list = trio(pack);
  let emax = 0;
  let tmax = 1;
  let tbMax = 40;
  for (const item of list) {
    for (const p of item.state.curve) {
      emax = Math.max(emax, p.E / 1e9);
      tbMax = Math.max(tbMax, p.Tb, item.state.tlim);
    }
    tmax = Math.max(tmax, item.state.days * 24);
  }
  emax = emax <= 0 ? 1 : emax * 1.12;
  tbMax *= 1.15;
  const pad = { l: 62, r: 54, t: 28, b: 42 };
  const w = W - pad.l - pad.r;
  const h = H - pad.t - pad.b;
  const X = (t) => pad.l + (t / tmax) * w;
  const Y = (e) => pad.t + (1 - e / emax) * h;
  const Yt = (tv) => pad.t + (1 - tv / tbMax) * h;
  grid(ctx, pad.l, pad.t, w, h, ticks(0, tmax, 8).map(X), ticks(0, emax, 6).map(Y));
  const tlim = list[0].state.tlim;
  ctx.strokeStyle = "#f472b6";
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(pad.l, Yt(tlim));
  ctx.lineTo(pad.l + w, Yt(tlim));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#f472b6";
  ctx.font = "11px IBM Plex Sans, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("limite " + label(tlim) + " °C", pad.l + 6, Yt(tlim) - 4);
  for (const item of list) {
    ctx.strokeStyle = CORE_COLOR[item.key];
    ctx.lineWidth = 2;
    ctx.beginPath();
    item.state.curve.forEach((p, i) => (i ? ctx.lineTo(X(p.tH), Y(p.E / 1e9)) : ctx.moveTo(X(p.tH), Y(p.E / 1e9))));
    ctx.stroke();
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    item.state.curve.forEach((p, i) => (i ? ctx.lineTo(X(p.tH), Yt(p.Tb)) : ctx.moveTo(X(p.tH), Yt(p.Tb))));
    ctx.stroke();
    ctx.setLineDash([]);
    if (item.state.tBreak != null) {
      ctx.strokeStyle = "#facc15";
      ctx.beginPath();
      ctx.moveTo(X(item.state.tBreak), pad.t);
      ctx.lineTo(X(item.state.tBreak), pad.t + h);
      ctx.stroke();
    }
  }
  ctx.font = "12px IBM Plex Sans, sans-serif";
  list.forEach((item, k) => {
    ctx.fillStyle = CORE_COLOR[item.key];
    ctx.textAlign = "left";
    ctx.fillText(CORE_LABEL[item.key], pad.l + k * 110, 16);
  });
  ctx.fillStyle = "#e7e5e4";
  ctx.font = "11px IBM Plex Mono, monospace";
  ctx.textAlign = "center";
  for (const t of ticks(0, tmax, 8)) ctx.fillText(label(t), X(t), pad.t + h + 4);
  ctx.font = "12px IBM Plex Sans, sans-serif";
  ctx.fillText("t (h)", pad.l + w / 2, pad.t + h + 22);
  ctx.textAlign = "right";
  ctx.font = "11px IBM Plex Mono, monospace";
  for (const e of ticks(0, emax, 6)) ctx.fillText(label(e), pad.l - 6, Y(e));
  ctx.textAlign = "left";
  for (const tv of ticks(0, tbMax, 5)) ctx.fillText(label(tv), pad.l + w + 6, Yt(tv));
  const hits = [];
  for (const item of list) {
    item.state.curve.forEach((p, i) => {
      if (i % 4 !== 0 && i !== item.state.curve.length - 1) return;
      hits.push({
        x: X(p.tH), y: Y(p.E / 1e9),
        text: CORE_LABEL[item.key] + " · t = " + p.tH.toFixed(1) + " h · E = " + (p.E / 1e9).toFixed(3) + " GJ · T_base = " + p.Tb.toFixed(2) + " °C"
      });
    });
  }
  remember(canvas, W, H, hits);
}

function drawResidualTrio(canvas, pack) {
  const W = canvas.clientWidth || 860;
  const H = 300;
  const ctx = fit(canvas, W, H);
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, W, H);
  const list = trio(pack);
  const logs = [];
  let n = 1;
  for (const item of list) {
    n = Math.max(n, item.state.newtonHist.length);
    for (const v of item.state.newtonHist) logs.push(Math.log10(Math.max(v, 1e-16)));
  }
  if (!logs.length) return;
  let lo = Math.min(...logs);
  let hi = Math.max(...logs);
  if (hi - lo < 0.3) { hi += 0.15; lo -= 0.15; }
  const pad = { l: 62, r: 18, t: 28, b: 40 };
  const w = W - pad.l - pad.r;
  const h = H - pad.t - pad.b;
  const X = (i) => pad.l + (n === 1 ? w / 2 : (i / (n - 1)) * w);
  const Y = (v) => pad.t + (hi - v) / (hi - lo) * h;
  grid(ctx, pad.l, pad.t, w, h, ticks(1, n, 6).map((v) => X(v - 1)), ticks(lo, hi, 6).map(Y));
  yTicks(ctx, pad, ticks(lo, hi, 6), Y);
  for (const item of list) series(ctx, item.state.newtonHist, X, Y, CORE_COLOR[item.key]);
  ctx.font = "12px IBM Plex Sans, sans-serif";
  list.forEach((item, k) => {
    const p = item.state.newtonOrder;
    ctx.fillStyle = CORE_COLOR[item.key];
    ctx.fillText(CORE_LABEL[item.key] + " p=" + (p == null ? "—" : p.toFixed(2)), pad.l + k * 150, 16);
  });
  ctx.fillStyle = "#e7e5e4";
  ctx.font = "11px IBM Plex Mono, monospace";
  ctx.textAlign = "center";
  for (const it of ticks(1, n, 6)) ctx.fillText(String(Math.round(it)), X(it - 1), pad.t + h + 4);
  ctx.font = "12px IBM Plex Sans, sans-serif";
  ctx.fillText("iteração de Newton  ·  ordem nos três últimos resíduos", pad.l + w / 2, pad.t + h + 20);
  const hits = [];
  for (const item of list) {
    item.state.newtonHist.forEach((v, i) => {
      hits.push({ x: X(i), y: Y(Math.log10(Math.max(v, 1e-16))), text: CORE_LABEL[item.key] + " · iteração " + (i + 1) + " · ‖R‖ = " + v.toExponential(3) });
    });
  }
  remember(canvas, W, H, hits);
}

function drawTemporalTrio(canvas, pack) {
  const W = canvas.clientWidth || 860;
  const H = 260;
  const ctx = fit(canvas, W, H);
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, W, H);
  const list = trio(pack);
  const errs = list.map((item) => {
    const runs = item.state.temporal.runs;
    const ref = runs[2].T;
    return [Math.abs(runs[0].T - ref), Math.abs(runs[1].T - ref)];
  });
  const flat = errs.flat();
  const lo = Math.max(Math.min(...flat) * 0.5, 1e-4);
  const hi = Math.max(...flat) * 1.35;
  const pad = { l: 70, r: 16, t: 28, b: 48 };
  const w = W - pad.l - pad.r;
  const h = H - pad.t - pad.b;
  const slot = w / 2;
  const Y = (v) => pad.t + (Math.log10(hi) - Math.log10(Math.max(v, lo))) / (Math.log10(hi) - Math.log10(lo)) * h;
  ctx.strokeStyle = "#e7e5e4";
  ctx.strokeRect(pad.l, pad.t, w, h);
  const decades = ticks(Math.log10(lo), Math.log10(hi), 5).map((p) => Math.pow(10, p));
  yTicks(ctx, pad, decades, Y);
  const hits = [];
  errs.forEach((pair, i) => {
    pair.forEach((e, j) => {
      const x = pad.l + j * slot + slot * (0.22 + i * 0.2);
      ctx.fillStyle = CORE_COLOR[list[i].key];
      ctx.fillRect(x, Y(e), 18, pad.t + h - Y(e));
      ctx.fillStyle = "#f5f5f4";
      ctx.font = "11px IBM Plex Mono, monospace";
      ctx.textAlign = "center";
      ctx.fillText(e.toExponential(2), x + 9, Y(e) - 4);
      hits.push({ x: x + 9, y: Y(e), text: CORE_LABEL[list[i].key] + " · Δt/" + (j === 0 ? "1" : "2") + " · erro = " + e.toExponential(3) + " °C" });
    });
  });
  ctx.font = "12px IBM Plex Sans, sans-serif";
  list.forEach((item, k) => {
    ctx.fillStyle = CORE_COLOR[item.key];
    const p = item.state.temporal.p;
    ctx.fillText(CORE_LABEL[item.key] + " p=" + (p == null ? "—" : p.toFixed(2)), pad.l + k * 150, 16);
  });
  ctx.fillStyle = "#e7e5e4";
  ctx.font = "12px IBM Plex Sans, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("erro da sonda (°C, escala log) contra o Δt mais fino", W / 2, H - 8);
  remember(canvas, W, H, hits);
}

function lastFrame(state, index) {
  return frameAt(state, index == null ? state.frames.length - 1 : index);
}

export function drawDepth(canvas, pack, index) {
  drawAlong(canvas, pack, index, {
    title: "profundidade a partir da face quente (m)",
    yTitle: "T (°C)",
    pick: (mesh, T) => depthProfile(mesh, T).map((p) => ({ x: p.depth, y: p.T })),
    note: (state, mesh, T) => {
      const r = frontReport(mesh, T, state);
      const z = r.zHalf == null ? "sem cruzamento" : r.zHalf.toFixed(2) + " m até T média local";
      return CORE_LABEL[state.core.key] + " " + z;
    }
  });
}

export function drawWall(canvas, pack, index) {
  drawAlong(canvas, pack, index, {
    title: "raio, da parede do núcleo para fora (m)",
    yTitle: "T (°C)",
    pick: (mesh, T) => wallProfile(mesh, T).map((p) => ({ x: p.r, y: p.T, layer: p.layer })),
    bands: true
  });
}

export function drawBase(canvas, pack, index) {
  drawAlong(canvas, pack, index, {
    title: "espessura da base, a partir do núcleo (m)",
    yTitle: "T (°C)",
    pick: (mesh, T) => baseProfile(mesh, T).map((p) => ({ x: p.x, y: p.T, layer: p.layer })),
    bands: true
  });
}

function drawAlong(canvas, pack, index, spec) {
  const W = canvas.clientWidth || 860;
  const H = 320;
  const ctx = fit(canvas, W, H);
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, W, H);
  const list = trio(pack);
  if (!list) return;
  const series = list.map((item) => {
    const frame = lastFrame(item.state, index);
    const pts = spec.pick(item.state.mesh, frame.T);
    return { key: item.key, state: item.state, pts };
  });
  let xmin = Infinity;
  let xmax = -Infinity;
  let ymin = Infinity;
  let ymax = -Infinity;
  for (const s of series) {
    for (const p of s.pts) {
      xmin = Math.min(xmin, p.x);
      xmax = Math.max(xmax, p.x);
      ymin = Math.min(ymin, p.y);
      ymax = Math.max(ymax, p.y);
    }
  }
  if (!Number.isFinite(xmin)) return;
  if (xmax - xmin < 1e-6) xmax = xmin + 1;
  if (ymax - ymin < 1) ymax = ymin + 1;
  ymin = Math.min(ymin, 0);
  const pad = { l: 72, r: 16, t: 36, b: 48 };
  const w = W - pad.l - pad.r;
  const h = H - pad.t - pad.b;
  const X = (x) => pad.l + (x - xmin) / (xmax - xmin) * w;
  const Y = (y) => pad.t + (1 - (y - ymin) / (ymax - ymin)) * h;
  if (spec.bands && series[0].pts.some((p) => p.layer)) {
    const pts = series[0].pts;
    ctx.globalAlpha = 0.18;
    let start = 0;
    for (let i = 1; i <= pts.length; i++) {
      if (i === pts.length || pts[i].layer !== pts[start].layer) {
        const x0 = X(pts[start].x);
        const x1 = X(pts[i - 1].x);
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(Math.min(x0, x1), pad.t, Math.abs(x1 - x0), h);
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#e7e5e4";
        ctx.font = "11px IBM Plex Sans, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(String(pts[start].layer || "").replace("Lateral · ", "").replace("Base · ", ""), (x0 + x1) / 2, pad.t + 14);
        ctx.globalAlpha = 0.18;
        start = i;
      }
    }
    ctx.globalAlpha = 1;
  }
  grid(ctx, pad.l, pad.t, w, h, ticks(xmin, xmax, 6).map(X), ticks(ymin, ymax, 6).map(Y));
  yTicks(ctx, pad, ticks(ymin, ymax, 6), Y);
  for (const s of series) {
    ctx.strokeStyle = CORE_COLOR[s.key];
    ctx.lineWidth = 2;
    ctx.beginPath();
    s.pts.forEach((p, i) => (i ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y))));
    ctx.stroke();
    const tip = s.pts[0];
    if (tip) {
      ctx.fillStyle = CORE_COLOR[s.key];
      ctx.beginPath();
      ctx.arc(X(tip.x), Y(tip.y), 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "11px IBM Plex Mono, monospace";
      ctx.textAlign = "left";
      ctx.fillText(label(tip.y) + " °C", X(tip.x) + 4, Y(tip.y) - 6);
    }
  }
  ctx.font = "12px IBM Plex Sans, sans-serif";
  list.forEach((item, k) => {
    ctx.fillStyle = CORE_COLOR[item.key];
    ctx.textAlign = "left";
    ctx.fillText(CORE_LABEL[item.key], pad.l + k * 110, 16);
  });
  ctx.fillStyle = "#e7e5e4";
  ctx.font = "11px IBM Plex Mono, monospace";
  ctx.textAlign = "center";
  for (const x of ticks(xmin, xmax, 6)) ctx.fillText(label(x), X(x), pad.t + h + 4);
  ctx.font = "12px IBM Plex Sans, sans-serif";
  ctx.fillText(spec.title, pad.l + w / 2, pad.t + h + 22);
  ctx.save();
  ctx.translate(16, pad.t + h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(spec.yTitle, 0, 0);
  ctx.restore();
  const hits = [];
  for (const s of series) {
    s.pts.forEach((p) => hits.push({ x: X(p.x), y: Y(p.y), text: CORE_LABEL[s.key] + " · x = " + p.x.toFixed(3) + " m · T = " + p.y.toFixed(2) + " °C" }));
  }
  remember(canvas, W, H, hits);
}
