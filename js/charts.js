/** Desenho com grade e coordenadas. Não calcula a física. */

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
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y0 + h);
    ctx.stroke();
  }
  for (const y of ys) {
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x0 + w, y);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = "#e7e5e4";
  ctx.strokeRect(x0 + 0.5, y0 + 0.5, w, h);
}

export function drawField(canvas, state, frame) {
  const W = canvas.clientWidth || 860;
  const H = 520;
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
  const pad = { l: 58, r: 86, t: 18, b: 42 };
  const availW = W - pad.l - pad.r;
  const availH = H - pad.t - pad.b;
  const sc = Math.min(availW / rMax, availH / zMax);
  const meshW = rMax * sc;
  const meshH = zMax * sc;
  const x0 = pad.l + (availW - meshW) / 2;
  const y0 = pad.t + (availH - meshH) / 2;
  const xr = (r) => x0 + r * sc;
  const yz = (z) => y0 + (zMax - z) * sc;

  const rTicks = ticks(0, rMax, 6);
  const zTicks = ticks(0, zMax, 8);
  grid(ctx, x0, y0, meshW, meshH, rTicks.map(xr), zTicks.map(yz));

  for (const el of mesh.elements) {
    let t = 0;
    for (const n of el.n) t += T[n];
    t /= 4;
    const col = heat(t, tmin, tmax);
    const x = xr(mesh.rEdges[el.i]);
    const y = yz(mesh.zEdges[el.j + 1]);
    const w = (mesh.rEdges[el.i + 1] - mesh.rEdges[el.i]) * sc;
    const h = (mesh.zEdges[el.j + 1] - mesh.zEdges[el.j]) * sc;
    ctx.fillStyle = "rgb(" + (col[0] | 0) + "," + (col[1] | 0) + "," + (col[2] | 0) + ")";
    ctx.fillRect(x, y, Math.max(w, 0.5), Math.max(h, 0.5));
  }
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.strokeRect(x0, y0, meshW, meshH);

  ctx.fillStyle = "#e7e5e4";
  ctx.font = "11px IBM Plex Mono, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (const r of rTicks) ctx.fillText(label(r), xr(r), y0 + meshH + 4);
  ctx.font = "12px IBM Plex Sans, sans-serif";
  ctx.fillText("r (m)", x0 + meshW / 2, y0 + meshH + 20);
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.font = "11px IBM Plex Mono, monospace";
  for (const z of zTicks) ctx.fillText(label(z), x0 - 6, yz(z));
  ctx.save();
  ctx.translate(16, y0 + meshH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.font = "12px IBM Plex Sans, sans-serif";
  ctx.fillText("z (m)", 0, 0);
  ctx.restore();

  const bx = x0 + meshW + 18;
  const by = y0;
  const bh = meshH;
  for (let i = 0; i < bh; i++) {
    const t = tmax - (tmax - tmin) * (i / bh);
    const col = heat(t, tmin, tmax);
    ctx.fillStyle = "rgb(" + (col[0] | 0) + "," + (col[1] | 0) + "," + (col[2] | 0) + ")";
    ctx.fillRect(bx, by + i, 12, 1);
  }
  ctx.strokeStyle = "#e7e5e4";
  ctx.strokeRect(bx, by, 12, bh);
  ctx.fillStyle = "#e7e5e4";
  ctx.font = "11px IBM Plex Mono, monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  for (const tv of ticks(tmin, tmax, 6)) {
    const yy = by + (tmax - tv) / (tmax - tmin) * bh;
    ctx.fillText(label(tv) + " °C", bx + 16, yy);
  }
}

export function drawCharge(canvas, state) {
  const W = canvas.clientWidth || 860;
  const H = 320;
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
  c.forEach((p, i) => {
    const x = X(p.tH);
    const y = Y(p.E / 1e9);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  if (state.tBreak != null) {
    ctx.strokeStyle = "#facc15";
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(X(state.tBreak), pad.t);
    ctx.lineTo(X(state.tBreak), pad.t + h);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#facc15";
    ctx.font = "11px IBM Plex Sans, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("termoclina " + label(state.tBreak) + " h", X(state.tBreak) + 4, pad.t + 12);
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

export function drawResidual(canvas, state) {
  const W = canvas.clientWidth || 860;
  const H = 300;
  const ctx = fit(canvas, W, H);
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, W, H);
  const hist = state && state.lastHist ? state.lastHist : [];
  if (hist.length < 1) return;
  const logs = hist.map((v) => Math.log10(Math.max(v, 1e-16)));
  let lo = Math.min(...logs);
  let hi = Math.max(...logs);
  if (hi - lo < 0.3) { hi += 0.15; lo -= 0.15; }
  const pad = { l: 62, r: 18, t: 16, b: 40 };
  const w = W - pad.l - pad.r;
  const h = H - pad.t - pad.b;
  const n = logs.length;
  const X = (i) => pad.l + (n === 1 ? w / 2 : (i / (n - 1)) * w);
  const Y = (v) => pad.t + (hi - v) / (hi - lo) * h;
  const xt = ticks(1, n, 8);
  const yt = ticks(lo, hi, 6);
  grid(ctx, pad.l, pad.t, w, h, xt.map((v) => X(v - 1)), yt.map(Y));
  ctx.strokeStyle = "#22d3ee";
  ctx.lineWidth = 2;
  ctx.beginPath();
  logs.forEach((v, i) => (i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v))));
  ctx.stroke();
  ctx.fillStyle = "#e7e5e4";
  ctx.font = "11px IBM Plex Mono, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (const it of xt) ctx.fillText(String(Math.round(it)), X(it - 1), pad.t + h + 4);
  ctx.font = "12px IBM Plex Sans, sans-serif";
  ctx.fillText("iteração m do Gauss–Seidel", pad.l + w / 2, pad.t + h + 20);
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
