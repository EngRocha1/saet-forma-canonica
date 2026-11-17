import { seriesU, diffusivity, biot, conductionDepth } from "./formulas.js";
import { stackLayers, INSULATORS } from "./materials.js";
import { buildMesh } from "./mesh.js";
import { assembleOperators, systemForDt, rhs, gaussSeidel, coreEnergy, faceMean } from "./galerkin.js";

const T0 = 25;
const TAMB = 37;
const TSOLO = 25;

export function simulate(input) {
  const core = input.core;
  const props = {
    [core.key]: { k: core.k, rho: core.rho, cp: core.cp },
    ifb: { k: input.kIns.ifb, rho: INSULATORS.ifb.rho, cp: INSULATORS.ifb.cp },
    perlita: { k: input.kIns.perlita, rho: INSULATORS.perlita.rho, cp: INSULATORS.perlita.cp },
    silicato: { k: input.kIns.silicato, rho: INSULATORS.silicato.rho, cp: INSULATORS.silicato.cp },
    vermiculita: { k: input.kIns.vermiculita, rho: INSULATORS.vermiculita.rho, cp: INSULATORS.vermiculita.cp }
  };
  const thick = input.thick;
  const mesh = buildMesh({
    mode: input.mode,
    R: input.R,
    L: input.L,
    nCoreR: input.nCoreR,
    nCoreZ: input.nCoreZ,
    coreKey: core.key,
    e1: thick.e1, e2: thick.e2, e3: thick.e3,
    eb1: thick.eb1, eb2: thick.eb2, eb3: thick.eb3
  });
  const kMap = {
    ifb: props.ifb.k, perlita: props.perlita.k,
    silicato: props.silicato.k, vermiculita: props.vermiculita.k
  };
  const Ulat = seriesU(stackLayers("lat", thick, kMap), input.hExt);
  const Utop = seriesU(stackLayers("top", thick, kMap), input.hExt);
  const Ubase = seriesU(stackLayers("base", thick, kMap), input.hExt);
  const bc = {
    carga: { h: input.hTop, Tref: input.Tcharge },
    "ext-top": { h: input.hExt, Tref: TAMB },
    "ext-base": { h: input.hExt, Tref: TSOLO },
    "ext-lat": { h: input.hExt, Tref: TAMB },
    "eq-top": { h: Utop, Tref: TAMB },
    "eq-base": { h: Ubase, Tref: TSOLO },
    "eq-lat": { h: Ulat, Tref: TAMB }
  };
  const dt = input.dtHours * 3600;
  const op = assembleOperators(mesh, props, bc);
  const system = systemForDt(op, dt);
  const steps = Math.max(1, Math.round((input.days * 24) / input.dtHours));
  let T = new Array(mesh.nn).fill(T0);
  const frames = [];
  let tBreak = null;
  let eUseful = 0;
  const curve = [];
  const keep = Math.max(1, Math.floor(steps / 36));
  let lastHist = [];
  let lastRate = null;
  let lastConv = false;

  for (let s = 0; s <= steps; s++) {
    const tH = s * input.dtHours;
    const E = s === 0 ? 0 : coreEnergy(mesh, props, T, T0);
    const Tb = faceMean(mesh, T, mesh.zCore0, mesh.R);
    const Tt = faceMean(mesh, T, mesh.zCoreTop, mesh.R);
    const frontOK = Tb < input.tlim;
    if (frontOK) eUseful = E;
    if (!frontOK && tBreak == null && s > 0) tBreak = tH;
    curve.push({ tH, E, Tb, Tt, frontOK });
    if (s % keep === 0 || s === steps) frames.push({ tH, T: T.slice(), E, Tb, Tt, frontOK });
    if (s === steps) break;
    const b = rhs(system, T);
    const out = gaussSeidel(system, b, T);
    T = out.T;
    lastHist = out.hist;
    lastRate = out.rate;
    lastConv = out.converged;
  }

  const alpha = diffusivity(core.k, core.rho, core.cp);
  const tSec = input.days * 86400;
  return {
    mesh, frames, curve, T, lastHist, lastRate, lastConv,
    tBreak, eUseful, dtHours: input.dtHours, days: input.days, steps,
    alpha,
    depth: conductionDepth(alpha, tSec),
    biot: biot(input.hTop, input.R / 2, core.k),
    Ulat, Utop, Ubase,
    T0, TAMB, TSOLO,
    core, mode: input.mode, Tcharge: input.Tcharge, hTop: input.hTop, hExt: input.hExt,
    tlim: input.tlim, thick: input.thick, kIns: input.kIns
  };
}
