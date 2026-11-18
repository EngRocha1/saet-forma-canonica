/** Perfis lidos dos nós. Não resolvem a equação. */

function axisNodes(mesh, T) {
  const out = [];
  for (let j = 0; j <= mesh.nz; j++) {
    const p = j * (mesh.nr + 1);
    out.push({ z: mesh.zEdges[j], T: T[p], j });
  }
  return out;
}

export function depthProfile(mesh, T) {
  return axisNodes(mesh, T)
    .filter((n) => n.z >= mesh.zCore0 - 1e-9 && n.z <= mesh.zCoreTop + 1e-9)
    .map((n) => ({ depth: mesh.zCoreTop - n.z, z: n.z, T: n.T }))
    .sort((a, b) => a.depth - b.depth);
}

export function wallProfile(mesh, T) {
  let jHot = 0;
  let best = Infinity;
  for (let j = 0; j <= mesh.nz; j++) {
    const d = Math.abs(mesh.zEdges[j] - mesh.zCoreTop);
    if (d < best) { best = d; jHot = j; }
  }
  const pts = [];
  for (let i = 0; i <= mesh.nr; i++) {
    const r = mesh.rEdges[i];
    if (r < mesh.R - 1e-9) continue;
    const layer = i < mesh.nr ? mesh.rTags[i].layer : mesh.rTags[mesh.nr - 1].layer;
    pts.push({ r, T: T[jHot * (mesh.nr + 1) + i], layer });
  }
  return pts;
}

export function baseProfile(mesh, T) {
  const nodes = axisNodes(mesh, T)
    .filter((n) => n.z <= mesh.zCore0 + 1e-9)
    .sort((a, b) => b.z - a.z);
  return nodes.map((n) => {
    const j = Math.min(n.j, mesh.nz - 1);
    const layer = mesh.zTags[j] && mesh.zTags[j].region === "base" ? mesh.zTags[j].layer : "núcleo";
    return { x: mesh.zCore0 - n.z, z: n.z, T: n.T, layer };
  });
}

function cross(profile, level) {
  for (let i = 1; i < profile.length; i++) {
    const a = profile[i - 1];
    const b = profile[i];
    if ((a.T - level) * (b.T - level) <= 0 && a.T !== b.T) {
      const u = (a.T - level) / (a.T - b.T);
      return a.depth + u * (b.depth - a.depth);
    }
  }
  return null;
}

export function frontReport(mesh, T, state) {
  const depth = depthProfile(mesh, T);
  const Tt = depth.length ? depth[0].T : state.curve.at(-1).Tt;
  const Tb = depth.length ? depth[depth.length - 1].T : state.curve.at(-1).Tb;
  const half = 0.5 * (Tt + Tb);
  const zHalf = cross(depth, half);
  const zLim = cross(depth, state.tlim);
  const V = Math.PI * mesh.R * mesh.R * mesh.L;
  const E = state.curve[state.curve.length - 1].E;
  const Tmean = state.T0 + E / Math.max(state.core.rho * state.core.cp * V, 1e-30);
  return {
    depth, Tt, Tb, half, zHalf, zLim,
    reached: Tb >= state.tlim,
    remaining: zLim == null ? mesh.L : Math.max(0, mesh.L - zLim),
    E, V, Tmean
  };
}
