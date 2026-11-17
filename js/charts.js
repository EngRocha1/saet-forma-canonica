/** Desenho. Não avança o tempo e não monta matriz. */

function heat(t, a, b) {
  const f = Math.max(0, Math.min(1, (t - a) / Math.max(b - a, 1e-9)));
  const stops = [[15, 23, 42], [14, 165, 233], [250, 204, 21], [234, 88, 12], [127, 29, 29]];
  const x = f * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const u = x - i;
  const c0 = stops[i];
  const c1 = stops[i + 1];
  return [c0[0] + (c1[0] - c0[0]) * u, c0[1] + (c1[1] - c0[1]) * u, c0[2] + (c1[2] - c0[2]) * u];
}

function fit(canvas, w, h) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

export function drawField(canvas, state, frame) {
  const ctx = fit(canvas, canvas.clientWidth || 860, 460);
  const W = canvas.clientWidth || 860;
  const H = 460;
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
  const pad = { l: 48, r: 70, t: 16, b: 36 };
  const sc = Math.min((W - pad.l - pad.r) / rMax, (H - pad.t - pad.b) / zMax);
  const x0 = pad.l;
  const y0 = pad.t;
  for (const el of mesh.elements) {
    let t = 0;
    for (const n of el.n) t += T[n];
    t /= 4;
    const col = heat(t, tmin, tmax);
    const x = x0 + mesh.rEdges[el.i] * sc;
    const y = y0 + (zMax - mesh.zEdges[el.j + 1]) * sc;
    const w = (mesh.rEdges[el.i + 1] - mesh.rEdges[el.i]) * sc;
    const h = (mesh.zEdges[el.j + 1] - mesh.zEdges[el.j]) * sc;
    ctx.fillStyle = "rgb(" + (col[0] | 0) + "," + (col[1] | 0) + "," + (col[2] | 0) + ")";
    ctx.fillRect(x, y, Math.max(w, 1), Math.max(h, 1));
    ctx.strokeStyle = el.core ? "rgba(251,146,60,.85)" : "rgba(125,211,252,.55)";
    ctx.strokeRect(x, y, w, h);
  }
  ctx.fillStyle = "#e7e5e4";
  ctx.font = "12px IBM Plex Sans, sans-serif";
  ctx.fillText("r (m) →", x0, H - 14);
  ctx.fillText("z", 8, y0 + 12);
  ctx.font = "11px IBM Plex Mono, monospace";
  ctx.fillText(tmax.toFixed(0) + " °C", W - 62, pad.t + 12);
  ctx.fillText(tmin.toFixed(0) + " °C", W - 62, pad.t + 160);
  for (let i = 0; i < 24; i++) {
    const col = heat(tmin + (tmax - tmin) * (1 - i / 23), tmin, tmax);
    ctx.fillStyle = "rgb(" + (col[0] | 0) + "," + (col[1] | 0) + "," + (col[2] | 0) + ")";
    ctx.fillRect(W - 28, pad.t + i * 6, 14, 6);
  }
}

export function drawCharge(canvas, state) {
  const ctx = fit(canvas, canvas.clientWidth || 860, 280);
  const W = canvas.clientWidth || 860;
  const H = 280;
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, W, H);
  if (!state) return;
  const c = state.curve;
  let emax = 1;
  for (const p of c) emax = Math.max(emax, p.E);
  const pad = { l: 52, r: 16, t: 16, b: 32 };
  const X = (t) => pad.l + (t / Math.max(state.days * 24, 1e-6)) * (W - pad.l - pad.r);
  const Y = (e) => pad.t + (1 - e / emax) * (H - pad.t - pad.b);
  ctx.strokeStyle = "#fb923c";
  ctx.lineWidth = 2;
  ctx.beginPath();
  c.forEach((p, i) => {
    const x = X(p.tH);
    const y = Y(p.E);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  if (state.tBreak != null) {
    ctx.strokeStyle = "#facc15";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(X(state.tBreak), pad.t);
    ctx.lineTo(X(state.tBreak), H - pad.b);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.fillStyle = "#e7e5e4";
  ctx.font = "12px IBM Plex Sans, sans-serif";
  ctx.fillText("t (h)   linha = E (J)   tracejado = fim da termoclina", pad.l, H - 10);
}

export function drawResidual(canvas, state) {
  const ctx = fit(canvas, canvas.clientWidth || 860, 260);
  const W = canvas.clientWidth || 860;
  const H = 260;
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, W, H);
  const hist = state && state.lastHist ? state.lastHist : [];
  if (hist.length < 1) return;
  const logs = hist.map((v) => Math.log10(Math.max(v, 1e-16)));
  let lo = Math.min(...logs);
  let hi = Math.max(...logs);
  if (hi - lo < 0.2) { hi += 0.2; lo -= 0.2; }
  const pad = { l: 52, r: 16, t: 16, b: 32 };
  const X = (i) => pad.l + (i / Math.max(hist.length - 1, 1)) * (W - pad.l - pad.r);
  const Y = (v) => pad.t + (hi - v) / (hi - lo) * (H - pad.t - pad.b);
  ctx.strokeStyle = "#22d3ee";
  ctx.lineWidth = 2;
  ctx.beginPath();
  logs.forEach((v, i) => (i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v))));
  ctx.stroke();
  ctx.fillStyle = "#e7e5e4";
  ctx.font = "12px IBM Plex Sans, sans-serif";
  const rate = state.lastRate == null ? "—" : state.lastRate.toFixed(2);
  ctx.fillText("iteração do Gauss–Seidel   log10 ‖R‖   razão final " + rate + " (linear, não quadrática)", pad.l, H - 10);
}
