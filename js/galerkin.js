/** Galerkin Q1, massa consistente, Euler implícito, Gauss–Seidel (taxa linear). */

const GP = 1 / Math.sqrt(3);
const GS = [-GP, GP];

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
        const r = Math.max(r0 + ((xi + 1) / 2) * dr, 0);
        const wm = p.rho * p.cp * r * det;
        const wk = p.k * r * det;
        const dNdr = [0, 0, 0, 0];
        const dNdz = [0, 0, 0, 0];
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

  const cRows = lumpRows(C.rows(n));
  return { n, kRows: K.rows(n), cRows, bRobin };
}

function lumpRows(rows) {
  return rows.map((row, i) => {
    let d = 0;
    for (const e of row) d += e.v;
    return [{ j: i, v: d }];
  });
}

export function systemForDt(op, dt) {
  const n = op.n;
  const rows = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    const acc = new Map();
    for (const e of op.kRows[i]) acc.set(e.j, (acc.get(e.j) || 0) + e.v);
    for (const e of op.cRows[i]) acc.set(e.j, (acc.get(e.j) || 0) + e.v / dt);
    for (const [j, v] of acc) rows[i].push({ j, v });
  }
  return { n, rows, cRows: op.cRows, bRobin: op.bRobin, dt };
}

export function rhs(system, told) {
  const b = new Float64Array(system.n);
  for (let i = 0; i < system.n; i++) {
    let s = system.bRobin[i];
    const row = system.cRows[i];
    for (let q = 0; q < row.length; q++) s += (row[q].v / system.dt) * told[row[q].j];
    b[i] = s;
  }
  return b;
}

export function gaussSeidel(system, b, told, maxIter = 80, tol = 1e-5) {
  const n = system.n;
  const T = Float64Array.from(told);
  const hist = [];
  let residual = Infinity;
  for (let m = 0; m < maxIter; m++) {
    for (let i = 0; i < n; i++) {
      let sigma = b[i];
      let diag = 0;
      const row = system.rows[i];
      for (let q = 0; q < row.length; q++) {
        const e = row[q];
        if (e.j === i) diag = e.v;
        else sigma -= e.v * T[e.j];
      }
      if (diag !== 0) T[i] = sigma / diag;
    }
    residual = residualNorm(system.rows, T, b);
    hist.push(residual);
    if (residual / Math.max(norm(b), 1e-30) < tol) break;
  }
  const rate = hist.length > 1 ? hist[hist.length - 1] / Math.max(hist[hist.length - 2], 1e-30) : null;
  return {
    T: Array.from(T),
    hist,
    residual,
    rate,
    converged: residual / Math.max(norm(b), 1e-30) < tol * 5
  };
}

function residualNorm(rows, T, b) {
  let s = 0;
  for (let i = 0; i < T.length; i++) {
    let ax = 0;
    const row = rows[i];
    for (let q = 0; q < row.length; q++) ax += row[q].v * T[row[q].j];
    const r = ax - b[i];
    s += r * r;
  }
  return Math.sqrt(s);
}

function norm(v) {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i] * v[i];
  return Math.sqrt(s);
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
