/** Volume para a mesma energia. Areia = 100%. */

export const TMIN_REF = 150;
export const TMAX = {
  areia: 573,
  alumina: 1000,
  hematita: 1000
};

export function volumeCompare(spec) {
  const eps = spec.eps;
  const Vgeo = Math.PI * spec.R * spec.R * spec.L;
  const order = ["areia", "alumina", "hematita"];
  const rows = order.map((key) => {
    const src = spec.solids[key];
    const limit = TMAX[key];
    const tmin = spec.isothermal ? TMIN_REF : clamp(spec.ranges[key].tmin, 0, limit - 1);
    const tmax = spec.isothermal ? (key === "areia" ? TMAX.areia : TMAX.areia) : clamp(spec.ranges[key].tmax, tmin + 1, limit);
    const usedMax = spec.isothermal ? TMAX.areia : tmax;
    const usedMin = spec.isothermal ? TMIN_REF : tmin;
    const rho = (1 - eps) * src.rho;
    return {
      key,
      name: src.name,
      rhoSolid: src.rho,
      cp: src.cp,
      rho,
      tmin: usedMin,
      tmax: usedMax,
      dT: usedMax - usedMin,
      limit
    };
  });
  const sand = rows[0];
  const E = sand.rho * sand.cp * Vgeo * sand.dT;
  for (const row of rows) {
    row.V = E / (row.rho * row.cp * row.dT);
    row.pct = 100 * row.V / sandV(E, sand);
  }
  return { eps, Vgeo, E, rows, isothermal: spec.isothermal };
}

function sandV(E, sand) {
  return E / (sand.rho * sand.cp * sand.dT);
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function volumeText(v) {
  const lines = [];
  lines.push(v.isothermal
    ? "Estratégia isotérmica ligada. Os três substratos usam o mesmo salto da areia: " + v.rows[0].tmin + " °C a " + v.rows[0].tmax + " °C. A diferença de volume vem só de ρ e cp."
    : "Estratégia isotérmica desligada. Cada substrato usa o seu T_min e o seu T_max, sem passar do teto cristalográfico.");
  lines.push("O teto da areia é 573 °C. A inversão α–β do quartzo ocorre a 573 °C (847 K). 575 °C é arredondamento e não entra como default. Alumina e hematita não têm essa inversão; o teto do controle é 1 000 °C, o da carga já adotada na dissertação.");
  lines.push("");
  lines.push("Fórmula: ρ_leito = (1 − ε) · ρ_sólido");
  for (const r of v.rows) {
    lines.push("Substituição, " + r.name + ": (1 − " + v.eps.toFixed(2) + ") · " + r.rhoSolid + " = " + r.rho.toFixed(2) + " kg/m³");
  }
  lines.push("");
  lines.push("Fórmula: ΔT = T_max − T_min");
  for (const r of v.rows) {
    lines.push("Substituição, " + r.name + ": " + r.tmax + " − " + r.tmin + " = " + r.dT + " °C");
  }
  lines.push("");
  lines.push("Fórmula: V_geo = π R² L");
  lines.push("Fórmula: E_ref = ρ_areia · cp_areia · V_geo · ΔT_areia");
  const sand = v.rows[0];
  lines.push("Substituição: V_geo = π · " + (v.Vgeo / Math.PI).toFixed(4) + " = " + v.Vgeo.toFixed(4) + " m³");
  lines.push("Substituição: E_ref = " + sand.rho.toFixed(2) + " · " + sand.cp + " · " + v.Vgeo.toFixed(4) + " · " + sand.dT + " = " + v.E.toExponential(6) + " J");
  lines.push("");
  lines.push("Fórmula: V = E_ref / (ρ_leito · cp · ΔT)");
  for (const r of v.rows) {
    lines.push("Substituição, " + r.name + ": " + v.E.toExponential(6) + " / (" + r.rho.toFixed(2) + " · " + r.cp + " · " + r.dT + ") = " + r.V.toFixed(4) + " m³");
  }
  lines.push("");
  lines.push("Fórmula: percentual = 100 · V / V_areia. Areia de sílica = 100%.");
  for (const r of v.rows) {
    const drop = 100 - r.pct;
    lines.push(r.name + ": " + r.pct.toFixed(2) + "% do volume da areia" + (r.key === "areia" ? "." : " (redução de " + drop.toFixed(2) + "%)."));
  }
  return lines.join("\n");
}
