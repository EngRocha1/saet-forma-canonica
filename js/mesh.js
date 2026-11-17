/**
 * Malha alinhada às camadas.
 * Modo refinada: cada subcamada recebe nPorCamada elementos (padrão 2),
 * então 15 cm de IFB não colapsam numa célula de ~1 m.
 * Modo equivalente: só o núcleo é malhado; o envelope vira U em série.
 */

function linspace(a, b, n) {
  const out = [];
  const steps = Math.max(1, n);
  for (let i = 0; i <= steps; i++) out.push(a + (b - a) * (i / steps));
  return out;
}

function gradedCore(a, b, n, dzTop) {
  const L = b - a;
  const nInt = Math.max(1, n);
  if (L / nInt <= dzTop * 1.02) return linspace(a, b, nInt);
  let lo = 1.0000001;
  let hi = 8;
  for (let k = 0; k < 48; k++) {
    const q = 0.5 * (lo + hi);
    const sum = dzTop * (Math.pow(q, nInt) - 1) / (q - 1);
    if (sum > L) hi = q;
    else lo = q;
  }
  const q = 0.5 * (lo + hi);
  const lens = [];
  let dz = dzTop;
  for (let i = 0; i < nInt; i++) {
    lens.push(dz);
    dz *= q;
  }
  const s = lens.reduce((p, c) => p + c, 0);
  const out = [b];
  let z = b;
  for (let i = 0; i < nInt - 1; i++) {
    z -= lens[i] * (L / s);
    out.push(z);
  }
  out.push(a);
  return out.reverse();
}

function pushSegment(edges, tags, a, b, n, tag) {
  pushPoints(edges, tags, linspace(a, b, n), tag);
}

function pushPoints(edges, tags, pts, tag) {
  for (let i = 0; i < pts.length; i++) {
    if (edges.length && Math.abs(edges[edges.length - 1] - pts[i]) < 1e-8) continue;
    edges.push(pts[i]);
    if (edges.length > 1) tags.push(tag);
  }
}

export function buildMesh(spec) {
  const mode = spec.mode === "equivalente" ? "equivalente" : "refinada";
  const nCoreR = clampInt(spec.nCoreR, 4, 12);
  const nCoreZ = clampInt(spec.nCoreZ, 4, 16);
  const nLayer = 2;
  const R = spec.R;
  const L = spec.L;
  const eLat = spec.e1 + spec.e2 + spec.e3;
  const eTop = eLat;
  const eBase = spec.eb1 + spec.eb2 + spec.eb3;

  const rEdges = [];
  const rTags = [];
  pushSegment(rEdges, rTags, 0, R, nCoreR, { region: "core", mat: spec.coreKey });
  if (mode === "refinada") {
    pushSegment(rEdges, rTags, R, R + spec.e1, nLayer, { region: "lat", mat: "ifb" });
    pushSegment(rEdges, rTags, R + spec.e1, R + spec.e1 + spec.e2, nLayer, { region: "lat", mat: "perlita" });
    pushSegment(rEdges, rTags, R + spec.e1 + spec.e2, R + eLat, nLayer, { region: "lat", mat: "ifb" });
  }

  const zEdges = [];
  const zTags = [];
  if (mode === "refinada") {
    pushSegment(zEdges, zTags, 0, spec.eb3, nLayer, { region: "base", mat: "vermiculita" });
    pushSegment(zEdges, zTags, spec.eb3, spec.eb3 + spec.eb2, nLayer, { region: "base", mat: "silicato" });
    pushSegment(zEdges, zTags, spec.eb3 + spec.eb2, eBase, nLayer, { region: "base", mat: "ifb" });
  }
  const zCore0 = mode === "refinada" ? eBase : 0;
  const dzTop = 0.05;
  pushPoints(zEdges, zTags, gradedCore(zCore0, zCore0 + L, nCoreZ, dzTop), { region: "core", mat: spec.coreKey });
  if (mode === "refinada") {
    const z1 = zCore0 + L;
    pushSegment(zEdges, zTags, z1, z1 + spec.e3, nLayer, { region: "top", mat: "ifb" });
    pushSegment(zEdges, zTags, z1 + spec.e3, z1 + spec.e3 + spec.e2, nLayer, { region: "top", mat: "perlita" });
    pushSegment(zEdges, zTags, z1 + spec.e3 + spec.e2, z1 + eTop, nLayer, { region: "top", mat: "ifb" });
  }

  const nr = rEdges.length - 1;
  const nz = zEdges.length - 1;
  const nn = (nr + 1) * (nz + 1);
  const id = (i, j) => j * (nr + 1) + i;

  const elements = [];
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nr; i++) {
      const rt = rTags[i];
      const zt = zTags[j];
      let mat = spec.coreKey;
      let region = "core";
      if (rt.region !== "core") {
        mat = rt.mat;
        region = "lat";
      } else if (zt.region !== "core") {
        mat = zt.mat;
        region = zt.region;
      }
      elements.push({
        n: [id(i, j), id(i + 1, j), id(i + 1, j + 1), id(i, j + 1)],
        i, j, mat, region,
        core: region === "core" && rt.region === "core"
      });
    }
  }

  const zCoreTop = zCore0 + L;
  const faces = [];
  const addH = (j, i0, i1, kind) => {
    for (let i = i0; i < i1; i++) faces.push({ n0: id(i, j), n1: id(i + 1, j), kind, axis: "h" });
  };
  const addV = (i, j0, j1, kind) => {
    for (let j = j0; j < j1; j++) faces.push({ n0: id(i, j), n1: id(i, j + 1), kind, axis: "v" });
  };

  if (mode === "refinada") {
    const jTop = zEdges.findIndex((z) => Math.abs(z - zCoreTop) < 1e-8);
    const iCore = rEdges.findIndex((r) => Math.abs(r - R) < 1e-8);
    addH(jTop, 0, iCore, "carga");
    addH(nz, 0, nr, "ext-top");
    addH(0, 0, nr, "ext-base");
    addV(nr, 0, nz, "ext-lat");
  } else {
    addH(nz, 0, nr, "carga");
    addH(nz, 0, nr, "eq-top");
    addH(0, 0, nr, "eq-base");
    addV(nr, 0, nz, "eq-lat");
  }

  let minLayer = Infinity;
  for (let j = 0; j < nz; j++) {
    if (zTags[j].region === "core") continue;
    minLayer = Math.min(minLayer, zEdges[j + 1] - zEdges[j]);
  }
  for (let i = 0; i < nr; i++) {
    if (rTags[i].region === "core") continue;
    minLayer = Math.min(minLayer, rEdges[i + 1] - rEdges[i]);
  }

  return {
    mode, R, L, eLat, eTop, eBase, zCore0, zCoreTop,
    rEdges, zEdges, rTags, zTags, nr, nz, nn, elements, faces, id,
    nLayer,
    dzTopTarget: dzTop,
    minLayerM: Number.isFinite(minLayer) ? minLayer : null,
    nodeR: (p) => rEdges[p % (nr + 1)],
    nodeZ: (p) => zEdges[Math.floor(p / (nr + 1))]
  };
}

function clampInt(v, a, b) {
  return Math.max(a, Math.min(b, Math.round(v) || a));
}
