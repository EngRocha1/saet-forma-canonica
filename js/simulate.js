import { seriesU, diffusivity, biot, conductionDepth } from "./formulas.js";
import { stackLayers, INSULATORS } from "./materials.js";
import { buildMesh } from "./mesh.js";
import {
  assembleOperators, newtonStep, coreEnergy, faceMean,
  insulationLosses, surfaceLoss, discretizationSample
} from "./galerkin.js";

const T0 = 25;
const TAMB = 37;
const TSOLO = 25;

function prepare(input) {
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
    R: input.R, L: input.L,
    nCoreR: input.nCoreR, nCoreZ: input.nCoreZ,
    coreKey: core.key,
    e1: thick.e1, e2: thick.e2, e3: thick.e3,
    eb1: thick.eb1, eb2: thick.eb2, eb3: thick.eb3
  });
  const kMap = {
    ifb: props.ifb.k, perlita: props.perlita.k,
    silicato: props.silicato.k, vermiculita: props.vermiculita.k
  };
  const bc = {
    carga: { h: input.hTop, Tref: input.Tcharge },
    "ext-top": { h: input.hExt, Tref: TAMB },
    "ext-base": { h: input.hExt, Tref: TSOLO },
    "ext-lat": { h: input.hExt, Tref: TAMB }
  };
  const op = assembleOperators(mesh, props, bc);
  return { mesh, props, op, kMap, core };
}

function march(prep, input, dtHours, hours) {
  const { mesh, props, op } = prep;
  const dt = dtHours * 3600;
  const steps = Math.max(1, Math.round(hours / dtHours));
  let T = new Array(mesh.nn).fill(T0);
  const frames = [];
  const curve = [];
  let tBreak = null;
  let eUseful = 0;
  const keep = Math.max(1, Math.floor(steps / 36));
  let worst = null;
  let lastStep = null;
  const eps = input.epsRad;

  for (let s = 0; s <= steps; s++) {
    const tH = s * dtHours;
    const E = s === 0 ? 0 : coreEnergy(mesh, props, T, T0);
    const Tb = faceMean(mesh, T, mesh.zCore0, mesh.R);
    const Tt = faceMean(mesh, T, mesh.zCoreTop, mesh.R);
    const frontOK = Tb < input.tlim;
    if (frontOK) eUseful = E;
    if (!frontOK && tBreak == null && s > 0) tBreak = tH;
    const losses = insulationLosses(mesh, props, T);
    const skin = surfaceLoss(mesh, T, input.hExt, eps, TAMB, TSOLO);
    curve.push({ tH, E, Tb, Tt, frontOK });
    if (s % keep === 0 || s === steps) frames.push({ tH, T: T.slice(), E, Tb, Tt, frontOK, losses, skin });
    if (s === steps) break;
    const step = newtonStep(op, T, dt, mesh, eps, TAMB);
    T = step.T;
    lastStep = step;
    if (!worst || step.hist[0] > worst.hist[0]) worst = { ...step, tH: tH + dtHours };
  }
  return { frames, curve, T, tBreak, eUseful, steps, worst, lastStep };
}

function probeTemp(mesh, T) {
  const zWant = mesh.zCoreTop - 0.2;
  let best = 0;
  let dist = Infinity;
  for (let p = 0; p < mesh.nn; p++) {
    if (mesh.nodeR(p) > 1e-8) continue;
    const d = Math.abs(mesh.nodeZ(p) - zWant);
    if (d < dist) { dist = d; best = p; }
  }
  return { T: T[best], z: mesh.nodeZ(best) };
}

function temporalOrder(prep, input) {
  const dt = input.dtHours;
  const hours = 4 * dt;
  const runs = [dt, dt / 2, dt / 4].map((h) => {
    const out = march(prep, input, h, hours);
    const probe = probeTemp(prep.mesh, out.T);
    return { dt: h, T: probe.T, z: probe.z, E: out.curve[out.curve.length - 1].E };
  });
  const d1 = Math.abs(runs[0].T - runs[1].T);
  const d2 = Math.abs(runs[1].T - runs[2].T);
  let p = null;
  if (d1 > 1e-8 && d2 > 1e-12) p = Math.log(d1 / d2) / Math.log(2);
  return { hours, runs, p, d1, d2 };
}

export function simulate(input) {
  const prep = prepare(input);
  const main = march(prep, input, input.dtHours, input.days * 24);
  const temporal = temporalOrder(prep, input);
  const alpha = diffusivity(input.core.k, input.core.rho, input.core.cp);
  const kMap = prep.kMap;
  const thick = input.thick;
  const sample = discretizationSample(prep.mesh, prep.props);
  const shown = main.worst || main.lastStep;
  return {
    mesh: prep.mesh,
    frames: main.frames,
    curve: main.curve,
    T: main.T,
    tBreak: main.tBreak,
    eUseful: main.eUseful,
    steps: main.steps,
    newtonHist: shown ? shown.hist : [],
    newtonOrder: shown ? shown.order : null,
    newtonAt: shown ? shown.tH : null,
    lastNewton: main.lastStep ? main.lastStep.hist : [],
    lastNewtonAt: input.days * 24,
    innerRate: shown && shown.inner ? shown.inner.rate : null,
    innerHist: shown && shown.inner ? shown.inner.hist : [],
    radSample: shown ? shown.radSample : null,
    dtHours: input.dtHours,
    days: input.days,
    alpha,
    depth: conductionDepth(alpha, input.days * 86400),
    biot: biot(input.hTop, input.R / 2, input.core.k),
    Utop: seriesU(stackLayers("top", thick, kMap), input.hExt),
    Ulat: seriesU(stackLayers("lat", thick, kMap), input.hExt),
    Ubase: seriesU(stackLayers("base", thick, kMap), input.hExt),
    T0, TAMB, TSOLO,
    core: input.core,
    mode: "refinada",
    Tcharge: input.Tcharge,
    hTop: input.hTop,
    hExt: input.hExt,
    epsRad: input.epsRad,
    tlim: input.tlim,
    thick, kIns: input.kIns,
    sample,
    temporal
  };
}
