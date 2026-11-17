import { bedDensity } from "./formulas.js";

/** ρ e cp iniciais: dissertação §10.2. k efetivo do leito é controle, não condutividade do cristal. */
export const SOLIDS = {
  areia: { name: "Areia de sílica", k: 1.2, rho: 2650, cp: 885, ref: "§10.2.1 · Incropera et al., 2014" },
  alumina: { name: "Alumina calcinada", k: 1.2, rho: 3970, cp: 1000, ref: "§10.2.2" },
  hematita: { name: "Hematita", k: 1.2, rho: 5150, cp: 800, ref: "§10.2.3 · Anthony et al., 1990 (faixa 5 000–5 300)" }
};

export const INSULATORS = {
  ifb: { name: "IFB", k: 0.15, rho: 600, cp: 900 },
  perlita: { name: "Perlita expandida", k: 0.051, rho: 105, cp: 900 },
  silicato: { name: "Silicato de cálcio", k: 0.059, rho: 190, cp: 850 },
  vermiculita: { name: "Vermiculita", k: 0.065, rho: 100, cp: 900 }
};

export function applyJson(data) {
  if (!data) return;
  for (const key of Object.keys(INSULATORS)) {
    if (data[key] && data[key].k != null) INSULATORS[key].k = data[key].k;
  }
}

export function coreProps(key, slider, eps) {
  const base = SOLIDS[key] || SOLIDS.hematita;
  const rhoSolid = slider.rho;
  return {
    key,
    name: base.name,
    ref: base.ref,
    k: slider.k,
    cp: slider.cp,
    rhoSolid,
    rho: bedDensity(rhoSolid, eps),
    eps
  };
}

export function stackLayers(side, thicknessM, kMap) {
  if (side === "top" || side === "lat") {
    return [
      { mat: "ifb", e: thicknessM.e1, k: kMap.ifb },
      { mat: "perlita", e: thicknessM.e2, k: kMap.perlita },
      { mat: "ifb", e: thicknessM.e3, k: kMap.ifb }
    ];
  }
  return [
    { mat: "ifb", e: thicknessM.eb1, k: kMap.ifb },
    { mat: "silicato", e: thicknessM.eb2, k: kMap.silicato },
    { mat: "vermiculita", e: thicknessM.eb3, k: kMap.vermiculita }
  ];
}
