/** Galerkin Q1, Euler implícito, Newton–Raphson na radiação, Gauss–Seidel no sistema linear. */

const GP = 1 / Math.sqrt(3);
const GS = [-GP, GP];
export const SIGMA = 5.67e-8;

function shape(xi, eta) {
  return {
    N: [
      0.25 * (1 - xi) * (1 - eta),
      0.25 * (1 + xi) * (1 - eta),
      0.25 * (1 + xi) * (1 + eta),
      0.25 * (1 - xi) * (1 + eta)
    ],
    dxi: [-0.25 * (1 - eta), 0.25 * (1 - eta), 0.25 * (1 + eta), -0.25 * (1 + eta)],
    deta: [-0.25 * (1 - xi), -0.25 * (1 + xi), 0.25 * (1 + xi), 0.25 * (1 - xi)]
  };
}

function edgeN(xi) {
  return [0.5 * (1 - xi), 0.5 * (1 + xi)];
}

function Sparse() {
  this.map = new Map();
}
Sparse.prototype.add = function (i, j, v) {
  if (!v) return;
  const k = i + ":" + j;
  this.map.set(k, (this.map.get(k) || 0) + v);
};
Sparse.prototype.rows = function (n) {
  const rows = Array.from({ length: n }, () => []);
  for (const [k, v] of this.map) {
    const p = k.indexOf(":");
    rows[+k.slice(0, p)].push({ j: +k.slice(p + 1), v });
  }
  return rows;
};

function lumpRows(rows) {
  return rows.map((row, i) => {
    let d = 0;
    for (const e of row) d += e.v;
    return [{ j: i, v: d }];
  });
}

export function assembleOperators(mesh, props, bc) {
  const n = mesh.nn;
  const K = new Sparse();
  const C = new Sparse();
  const bRobin = new Float64Array(n);

  for (const el of mesh.elements) {
    const p = props[el.mat];
    const r0 = mesh.rEdges[el.i];
    const r1 = mesh.rEdges[el.i + 1];
    const z0 = mesh.zEdges[el.j];
    const z1 = mesh.zEdges[el.j + 1];
    const dr = r1 - r0;
    const dz = z1 - z0;
    const det = (dr * dz) / 4;
    for (const xi of GS) {
      for (const eta of GS) {
        const { N, dxi, deta } = shape(xi, eta);
        const r = Math.max(r0 + ((xi + 1) / 2) * dr, 1e-8);
        const wm = p.rho * p.cp * r * det;
        const wk = p.k * r * det;
        const dNdr = new Array(4);
        const dNdz = new Array(4);
        for (let a = 0; a < 4; a++) {
          dNdr[a] = dxi[a] * (2 / dr);
          dNdz[a] = deta[a] * (2 / dz);
        }
        for (let a = 0; a < 4; a++) {
          for (let b = 0; b < 4; b++) {
            C.add(el.n[a], el.n[b], wm * N[a] * N[b]);
            K.add(el.n[a], el.n[b], wk * (dNdr[a] * dNdr[b] + dNdz[a] * dNdz[b]));
          }
        }
      }
    }
  }

  for (const face of mesh.faces) {
    const spec = bc[face.kind];
    if (!spec || spec.h <= 0) continue;
    addLinearRobin(mesh, face, spec, K, bRobin);
  }

  return { n, kRows: K.rows(n), cRows: lumpRows(C.rows(n)), bRobin };
}

function addLinearRobin(mesh, face, spec, K, bRobin) {
  const rA = mesh.nodeR(face.n0);
  const zA = mesh.nodeZ(face.n0);
  const rB = mesh.nodeR(face.n1);
  const zB = mesh.nodeZ(face.n1);
  const len = Math.hypot(rB - rA, zB - zA);
  const nodes = [face.n0, face.n1];
  for (const xi of GS) {
    const N = edgeN(xi);
    const r = Math.max(rA + ((xi + 1) / 2) * (rB - rA), 1e-6);
    const w = spec.h * r * (len / 2);
    for (let a = 0; a < 2; a++) {
      bRobin[nodes[a]] += w * N[a] * spec.Tref;
      for (let b = 0; b < 2; b++) K.add(nodes[a], nodes[b], w * N[a] * N[b]);
    }
  }
}

function baseRows(op, dt) {
  const n = op.n;
  const rows = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    const acc = new Map();
    for (const e of op.kRows[i]) acc.set(e.j, (acc.get(e.j) || 0) + e.v);
    for (const e of op.cRows[i]) acc.set(e.j, (acc.get(e.j) || 0) + e.v / dt);
    for (const [j, v] of acc) rows[i].push({ j, v });
  }
  return rows;
}

function cloneRows(rows) {
  return rows.map((row) => row.map((e) => ({ j: e.j, v: e.v })));
}

function addEntry(rows, i, j, v) {
  const row = rows[i];
  for (let q = 0; q < row.length; q++) {
    if (row[q].j === j) { row[q].v += v; return; }
  }
  row.push({ j, v });
}

function radiation(mesh, T, eps, tInfC) {
  const n = mesh.nn;
  const res = new Float64Array(n);
  const jac = [];
  const tInfK = tInfC + 273.15;
  const tInf4 = tInfK * tInfK * tInfK * tInfK;
  if (eps <= 0) return { res, jac };
  for (const face of mesh.faces) {
    if (!face.rad) continue;
    const rA = mesh.nodeR(face.n0);
    const zA = mesh.nodeZ(face.n0);
    const rB = mesh.nodeR(face.n1);
    const zB = mesh.nodeZ(face.n1);
    const len = Math.hypot(rB - rA, zB - zA);
    const nodes = [face.n0, face.n1];
    for (const xi of GS) {
      const N = edgeN(xi);
      const r = Math.max(rA + ((xi + 1) / 2) * (rB - rA), 1e-6);
      const w = r * (len / 2);
      let ts = 0;
      for (let a = 0; a < 2; a++) ts += N[a] * T[nodes[a]];
      const tk = Math.max(ts + 273.15, 1);
      const q = eps * SIGMA * (tk * tk * tk * tk - tInf4);
      const dq = eps * SIGMA * 4 * tk * tk * tk;
      for (let a = 0; a < 2; a++) {
        res[nodes[a]] += w * N[a] * q;
        for (let b = 0; b < 2; b++) jac.push([nodes[a], nodes[b], w * N[a] * dq * N[b]]);
      }
    }
  }
  return { res, jac };
}

function applyLinear(op, rows, T, told, dt) {
  const y = new Float64Array(op.n);
  for (let i = 0; i < op.n; i++) {
    let s = 0;
    const row = rows[i];
    for (let q = 0; q < row.length; q++) s += row[q].v * T[row[q].j];
    s -= (op.cRows[i][0].v / dt) * told[i];
    s -= op.bRobin[i];
    y[i] = s;
  }
  return y;
}

function norm(v) {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i] * v[i];
  return Math.sqrt(s);
}

function bandWidth(rows) {
  let bw = 1;
  for (let i = 0; i < rows.length; i++) {
    for (const e of rows[i]) bw = Math.max(bw, Math.abs(e.j - i));
  }
  return bw;
}

/** Eliminação de Gauss em banda. A Jacobiana do Q1 axissimétrico cabe na banda nr+2. */
export function solveBand(rows, b) {
  const n = b.length;
  const bw = bandWidth(rows);
  const a = Array.from({ length: n }, () => new Float64Array(2 * bw + 1));
  for (let i = 0; i < n; i++) {
    for (const e of rows[i]) a[i][e.j - i + bw] += e.v;
  }
  const x = Float64Array.from(b);
  for (let k = 0; k < n; k++) {
    const piv = a[k][bw];
    if (Math.abs(piv) < 1e-18) throw new Error("Jacobiana singular na eliminação");
    const rMax = Math.min(n - 1, k + bw);
    for (let i = k + 1; i <= rMax; i++) {
      const factor = a[i][k - i + bw] / piv;
      if (factor === 0) continue;
      const jMax = Math.min(n - 1, k + bw);
      for (let j = k; j <= jMax; j++) a[i][j - i + bw] -= factor * a[k][j - k + bw];
      x[i] -= factor * x[k];
    }
  }
  for (let i = n - 1; i >= 0; i--) {
    let s = x[i];
    const jMax = Math.min(n - 1, i + bw);
    for (let j = i + 1; j <= jMax; j++) s -= a[i][j - i + bw] * x[j];
    x[i] = s / a[i][bw];
  }
  return { x, residual: residualOf(rows, x, b) };
}

function asymptoticOrder(hist) {
  const h = hist.filter((v) => v > 0);
  if (h.length < 3) return null;
  const a = h[h.length - 3];
  const b = h[h.length - 2];
  const c = h[h.length - 1];
  if (!(a > b && b > c && b < a)) return null;
  return Math.log(b / c) / Math.log(a / b);
}
function residualOf(rows, x, b) {
  let s = 0;
  for (let i = 0; i < x.length; i++) {
    let ax = 0;
    const row = rows[i];
    for (let q = 0; q < row.length; q++) ax += row[q].v * x[row[q].j];
    const r = ax - b[i];
    s += r * r;
  }
  return Math.sqrt(s);
}

export function newtonStep(op, told, dt, mesh, eps, tAmb) {
  const linear = baseRows(op, dt);
  let T = Float64Array.from(told);
  const hist = [];
  let lastInner = null;
  let radSample = null;
  for (let k = 0; k < 8; k++) {
    const top = radiation(mesh, T, eps, tAmb);
    const R = applyLinear(op, linear, T, told, dt);
    for (let i = 0; i < op.n; i++) R[i] += top.res[i];
    const res = norm(R);
    hist.push(res);
    if (k === 0) radSample = sampleRadiation(mesh, T, eps, tAmb);
    const scale = Math.max(norm(op.bRobin), 1);
    if (res / scale < 1e-12 || res < 1e-9) break;
    const rows = cloneRows(linear);
    for (const [i, j, v] of top.jac) addEntry(rows, i, j, v);
    const b = new Float64Array(op.n);
    for (let i = 0; i < op.n; i++) b[i] = -R[i];
    const solved = solveBand(rows, b);
    lastInner = solved;
    for (let i = 0; i < op.n; i++) T[i] += solved.x[i];
  }
  return { T: Array.from(T), hist, order: asymptoticOrder(hist), linearResidual: lastInner ? lastInner.residual : null, radSample };
}

function sampleRadiation(mesh, T, eps, tAmb) {
  const face = mesh.faces.find((f) => f.kind === "ext-top");
  if (!face) return null;
  const tA = T[face.n0];
  const tB = T[face.n1];
  const ts = 0.5 * (tA + tB);
  const tk = ts + 273.15;
  const tink = tAmb + 273.15;
  return {
    ts, tk, tink,
    q: eps * SIGMA * (tk ** 4 - tink ** 4),
    dq: eps * SIGMA * 4 * tk ** 3
  };
}

export function coreEnergy(mesh, props, T, T0) {
  let E = 0;
  for (const el of mesh.elements) {
    if (!el.core) continue;
    const p = props[el.mat];
    const r0 = mesh.rEdges[el.i];
    const r1 = mesh.rEdges[el.i + 1];
    const z0 = mesh.zEdges[el.j];
    const z1 = mesh.zEdges[el.j + 1];
    let tBar = 0;
    for (const node of el.n) tBar += T[node];
    tBar /= 4;
    const rc = 0.5 * (r0 + r1);
    const dV = 2 * Math.PI * rc * (r1 - r0) * (z1 - z0);
    E += p.rho * p.cp * (tBar - T0) * dV;
  }
  return E;
}

export function faceMean(mesh, T, zValue, rMax) {
  let s = 0;
  let c = 0;
  const ni = mesh.nr + 1;
  for (let j = 0; j <= mesh.nz; j++) {
    if (Math.abs(mesh.zEdges[j] - zValue) > 1e-6) continue;
    for (let i = 0; i < ni; i++) {
      if (mesh.rEdges[i] > rMax + 1e-8) continue;
      s += T[j * ni + i];
      c++;
    }
  }
  return c ? s / c : NaN;
}

export function insulationLosses(mesh, props, T) {
  const groups = new Map();
  for (const el of mesh.elements) {
    if (!el.layer) continue;
    if (!groups.has(el.layer)) groups.set(el.layer, []);
    groups.get(el.layer).push(el);
  }
  const out = [];
  for (const [layer, els] of groups) {
    let face = els;
    if (els[0].out === "r") {
      const imin = Math.min(...els.map((e) => e.i));
      face = els.filter((e) => e.i === imin);
    } else if (els[0].out === "z+") {
      const jmin = Math.min(...els.map((e) => e.j));
      face = els.filter((e) => e.j === jmin);
    } else {
      const jmax = Math.max(...els.map((e) => e.j));
      face = els.filter((e) => e.j === jmax);
    }
    let Q = 0;
    for (const el of face) Q += elementFlux(mesh, props, T, el);
    out.push({ layer, Q, elements: els.length });
  }
  return out;
}

function elementFlux(mesh, props, T, el) {
  const p = props[el.mat];
  const r0 = mesh.rEdges[el.i];
  const r1 = mesh.rEdges[el.i + 1];
  const z0 = mesh.zEdges[el.j];
  const z1 = mesh.zEdges[el.j + 1];
  const n = el.n;
  const dr = r1 - r0;
  const dz = z1 - z0;
  if (el.out === "r") {
    const tin = 0.5 * (T[n[0]] + T[n[3]]);
    const tout = 0.5 * (T[n[1]] + T[n[2]]);
    const rm = 0.5 * (r0 + r1);
    return p.k * (tin - tout) / dr * (2 * Math.PI * rm * dz);
  }
  const rc = 0.5 * (r0 + r1);
  const area = 2 * Math.PI * rc * dr;
  if (el.out === "z+") {
    const tin = 0.5 * (T[n[0]] + T[n[1]]);
    const tout = 0.5 * (T[n[3]] + T[n[2]]);
    return p.k * (tin - tout) / dz * area;
  }
  const tin = 0.5 * (T[n[3]] + T[n[2]]);
  const tout = 0.5 * (T[n[0]] + T[n[1]]);
  return p.k * (tin - tout) / dz * area;
}

export function surfaceLoss(mesh, T, h, eps, tAmb, tSolo) {
  let conv = 0;
  let rad = 0;
  for (const face of mesh.faces) {
    if (face.kind !== "ext-top" && face.kind !== "ext-lat" && face.kind !== "ext-base") continue;
    const tRef = face.kind === "ext-base" ? tSolo : tAmb;
    const useRad = face.rad && eps > 0;
    const rA = mesh.nodeR(face.n0);
    const zA = mesh.nodeZ(face.n0);
    const rB = mesh.nodeR(face.n1);
    const zB = mesh.nodeZ(face.n1);
    const len = Math.hypot(rB - rA, zB - zA);
    for (const xi of GS) {
      const N = edgeN(xi);
      const r = Math.max(rA + ((xi + 1) / 2) * (rB - rA), 1e-6);
      const dA = 2 * Math.PI * r * (len / 2);
      const ts = N[0] * T[face.n0] + N[1] * T[face.n1];
      conv += h * (ts - tRef) * dA;
      if (useRad) {
        const tk = ts + 273.15;
        const tink = tRef + 273.15;
        rad += eps * SIGMA * (tk ** 4 - tink ** 4) * dA;
      }
    }
  }
  return { conv, rad };
}

export function discretizationSample(mesh, props) {
  let el = null;
  for (const item of mesh.elements) {
    if (!item.core) continue;
    if (item.i !== 0) continue;
    if (Math.abs(mesh.zEdges[item.j + 1] - mesh.zCoreTop) < 1e-6) el = item;
  }
  if (!el) return null;
  const p = props[el.mat];
  const r0 = mesh.rEdges[el.i];
  const r1 = mesh.rEdges[el.i + 1];
  const z0 = mesh.zEdges[el.j];
  const z1 = mesh.zEdges[el.j + 1];
  const dr = r1 - r0;
  const dz = z1 - z0;
  const det = (dr * dz) / 4;
  const xi = GP;
  const r = Math.max(r0 + ((xi + 1) / 2) * dr, 1e-8);
  const z = z0 + ((xi + 1) / 2) * dz;
  return { dr, dz, det, xi, r, z, k: p.k, rho: p.rho, cp: p.cp, wk: p.k * r * det, wm: p.rho * p.cp * r * det };
}
