/** Memória: fórmula, substituição, resultado e só então a referência. */

function n(v, d) {
  if (!Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  if (a !== 0 && (a >= 1e5 || a < 1e-3)) return v.toExponential(4);
  return v.toFixed(d);
}

function coreTopDz(mesh) {
  let dz = null;
  for (let j = 0; j < mesh.nz; j++) {
    if (mesh.zTags[j].region !== "core") continue;
    if (Math.abs(mesh.zEdges[j + 1] - mesh.zCoreTop) < 1e-6) dz = mesh.zEdges[j + 1] - mesh.zEdges[j];
  }
  return dz;
}

export function buildMemory(s) {
  const c = s.core;
  const eps = c.eps;
  const rho = (1 - eps) * c.rhoSolid;
  const alpha = c.k / (rho * c.cp);
  const dtS = s.dtHours * 3600;
  const tH = s.days * 24;
  const tS = s.days * 86400;
  const Lc = s.mesh.R / 2;
  const Bi = (s.hTop * Lc) / c.k;
  const depth = Math.sqrt(alpha * tS);
  const dz = coreTopDz(s.mesh);
  const last = s.frames[s.frames.length - 1];
  let tmin = Infinity;
  let tmax = -Infinity;
  for (const v of last.T) {
    if (v < tmin) tmin = v;
    if (v > tmax) tmax = v;
  }
  const eGJ = s.eUseful / 1e9;
  const r0 = s.lastHist[0];
  const rN = s.lastHist[s.lastHist.length - 1];
  const lines = [];
  const step = (title, formula, sub, result, ref) => {
    lines.push(title);
    lines.push("Fórmula: " + formula);
    lines.push("Substituição: " + sub);
    lines.push("Resultado: " + result);
    lines.push("Referência, depois do número: " + ref);
    lines.push("");
  };

  lines.push("Memória de cálculo do demonstrador SAET");
  lines.push("Os gráficos usam somente os resultados abaixo. Cada passo mostra a fórmula, o número colocado no lugar do símbolo, o resultado e, por último, a referência.");
  lines.push("");

  step(
    "Passo 1 — Densidade do leito",
    "ρ_leito = (1 − ε) · ρ_sólido",
    "(1 − " + n(eps, 2) + ") · " + n(c.rhoSolid, 1) + " = " + n(rho, 2),
    n(rho, 2) + " kg/m³ para " + c.name + ". cp = " + n(c.cp, 1) + " J/(kg·K). k = " + n(c.k, 3) + " W/(m·K).",
    "Dissertação, Eq. (2), ε inicial 0,40."
  );
  step(
    "Passo 2 — Difusividade",
    "α = k / (ρ_leito · cp)",
    n(c.k, 3) + " / (" + n(rho, 2) + " · " + n(c.cp, 1) + ") = " + n(c.k, 3) + " / " + n(rho * c.cp, 2),
    "α = " + n(alpha, 6) + " m²/s.",
    "Özisik (1993)."
  );
  step(
    "Passo 3 — Passo de tempo",
    "Δt_s = Δt_h · 3600;  N = t_h / Δt_h",
    n(s.dtHours, 2) + " h · 3600 = " + n(dtS, 1) + " s;  " + n(tH, 1) + " h / " + n(s.dtHours, 2) + " h = " + s.steps,
    "Cada avanço do Euler implícito soma " + n(s.dtHours, 2) + " h ao relógio. Δt não é diferença de temperatura. São " + s.steps + " passos em " + s.days + " d.",
    "Bathe (2014), Euler implícito."
  );
  step(
    "Passo 4 — Sistema de um passo",
    "(C/Δt + K) T^{n+1} = (C/Δt) T^n + b",
    "Δt = " + n(dtS, 1) + " s entra só como divisor de C. C é a massa concentrada por soma de linha. K traz k do elemento e o Robin.",
    "O solver é Gauss–Seidel. k, ρ e cp não mudam dentro do passo, então o sistema é linear.",
    "Bathe (2014). A massa concentrada evita o nó negativo quando a frente é mais fina que o elemento."
  );
  step(
    "Passo 5 — Biot",
    "Bi = h_topo · (R/2) / k",
    n(s.hTop, 2) + " · (" + n(s.mesh.R, 2) + " / 2) / " + n(c.k, 3) + " = " + n(s.hTop, 2) + " · " + n(Lc, 3) + " / " + n(c.k, 3),
    "Bi = " + n(Bi, 3) + ". Se Bi > 0,1 o sólido não é tratado como capacidade concentrada.",
    "Incropera et al. (2014). É o Biot do sólido aquecido na fronteira, não o de uma partícula num escoamento."
  );
  step(
    "Passo 6 — Alcance da condução",
    "δ ~ √(α · t)",
    "√(" + n(alpha, 6) + " · " + n(tS, 1) + ") = √(" + n(alpha * tS, 6) + ")",
    "δ ~ " + n(depth, 3) + " m no fim do horizonte. O primeiro intervalo do núcleo, junto ao topo quente, mede " + (dz == null ? "—" : n(dz, 4)) + " m.",
    "Incropera et al. (2014), ordem de grandeza do sólido semi-infinito. Não é a solução do cilindro."
  );

  const layers = [
    ["IFB interno do topo", s.thick.e3, s.kIns.ifb],
    ["perlita do topo", s.thick.e2, s.kIns.perlita],
    ["IFB externo do topo", s.thick.e1, s.kIns.ifb]
  ];
  let sumR = 0;
  const bits = [];
  for (const [name, e, k] of layers) {
    const Rth = e / k;
    sumR += Rth;
    bits.push(name + ": " + n(e, 3) + " / " + n(k, 4) + " = " + n(Rth, 4) + " m²·K/W");
  }
  const Rext = 1 / s.hExt;
  sumR += Rext;
  const U = 1 / sumR;
  step(
    "Passo 7 — Resistência do topo",
    "R_i = e_i / k_i;  1/U = Σ R_i + 1/h_ext",
    bits.join("; ") + ";  1/" + n(s.hExt, 2) + " = " + n(Rext, 4),
    "Σ R = " + n(sumR, 4) + " m²·K/W;  U_topo = " + n(U, 6) + " W/(m²·K). No modo refinada este U não substitui a malha. No modo equivalente ele é o Robin externo.",
    "Incropera et al. (2014), parede em série."
  );
  step(
    "Passo 8 — Energia que vai ao gráfico",
    "E = ∫ ρ_leito · cp · (T − T0) · 2π r dr dz",
    "ρ_leito = " + n(rho, 2) + ", cp = " + n(c.cp, 1) + ", T0 = " + n(s.T0, 1) + " °C. A integral é a soma nos elementos do núcleo.",
    "E útil, até T_base = " + n(s.tlim, 1) + " °C, vale " + n(eGJ, 4) + " GJ. Fim da termoclina: " + (s.tBreak == null ? "não ocorreu até " + n(tH, 1) + " h" : n(s.tBreak, 2) + " h") + ".",
    "Balanço no volume do leito. O isolante não entra nesta integral."
  );
  step(
    "Passo 9 — Resíduo do último passo",
    "razão = ‖R‖_{m+1} / ‖R‖_m",
    "‖R‖_1 = " + n(r0, 4) + ";  ‖R‖_final = " + n(rN, 4) + ";  iterações = " + s.lastHist.length + ";  razão final = " + (s.lastRate == null ? "—" : n(s.lastRate, 3)),
    (s.lastConv ? "Atingiu a tolerância. " : "Não atingiu a tolerância. ") + "A razão estável indica taxa linear do Gauss–Seidel. Não é convergência quadrática.",
    "Bathe (2014). Newton–Raphson não se aplica com propriedades constantes no passo."
  );

  lines.push("Eixos dos gráficos, com estes números");
  lines.push("Campo: r de 0 a " + n(s.mesh.rEdges[s.mesh.nr], 3) + " m; z de 0 a " + n(s.mesh.zEdges[s.mesh.nz], 3) + " m; cor de " + n(tmin, 1) + " °C a " + n(tmax, 1) + " °C.");
  lines.push("Energia: t de 0 a " + n(tH, 1) + " h; E em GJ, até cerca de " + n(Math.max(eGJ, last.E / 1e9), 3) + " GJ.");
  lines.push("Resíduo: m de 1 a " + s.lastHist.length + "; ordenada log10 ‖R‖ de " + n(Math.log10(Math.max(rN, 1e-16)), 2) + " a " + n(Math.log10(Math.max(r0, 1e-16)), 2) + ".");
  lines.push("Carga resistiva, T_carga = " + n(s.Tcharge, 1) + " °C, h_topo = " + n(s.hTop, 2) + " W/(m²·K). Sem gás no leito e sem fator k_eff.");
  return lines.join("\n");
}
