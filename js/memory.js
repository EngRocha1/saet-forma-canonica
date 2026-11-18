/** Memória: fórmula, substituição, resultado e só então a referência. */

import { SIGMA } from "./galerkin.js";
import { stackLayers } from "./materials.js";
import { seriesBreakdown } from "./formulas.js";
import { frontReport } from "./profiles.js";

function n(v, d) {
  if (!Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  if (a !== 0 && (a >= 1e5 || a < 1e-3)) return v.toExponential(4);
  return v.toFixed(d);
}

function resistanceText(s) {
  const kMap = s.kIns;
  const faces = [
    ["Topo", "top"],
    ["Lateral", "lat"],
    ["Base", "base"]
  ];
  const lines = ["Resistência equivalente, camada por camada. A malha continua resolvida; U só confere a pilha."];
  lines.push("Fórmula da camada: R\" = e / k.  Fórmula da face: R\"_total = Σ R\" + 1/h.  U = 1 / R\"_total.");
  for (const [title, side] of faces) {
    const layers = stackLayers(side, s.thick, kMap);
    if (side === "base") {
      layers[0].name = "IFB";
      layers[1].name = "silicato de cálcio";
      layers[2].name = "vermiculita";
    } else {
      layers[0].name = "IFB interno";
      layers[1].name = "perlita";
      layers[2].name = "IFB externo";
    }
    const pack = seriesBreakdown(layers, s.hExt);
    lines.push(title);
    for (const row of pack.rows) {
      lines.push("Substituição, " + row.name + ": " + n(row.e, 3) + " / " + n(row.k, 4) + " = " + n(row.R, 4) + " m²·K/W");
    }
    lines.push("Soma das camadas = " + n(pack.Rcond, 4) + " m²·K/W");
    lines.push("Substituição da convecção: 1 / " + n(s.hExt, 2) + " = " + n(pack.Rconv, 4) + " m²·K/W");
    lines.push("R\"_total = " + n(pack.Rcond, 4) + " + " + n(pack.Rconv, 4) + " = " + n(pack.Rtot, 4) + " m²·K/W");
    lines.push("U_" + title.toLowerCase() + " = 1 / " + n(pack.Rtot, 4) + " = " + n(pack.U, 6) + " W/(m²·K)");
  }
  lines.push("Incropera et al. (2014), parede plana composta. Topo e lateral usam a mesma pilha, por isso U coincide.");
  return lines.join("\n");
}

export function buildTrioMemory(pack) {
  const lines = ["Os três substratos usam a mesma malha, o mesmo passo e o mesmo isolamento. Mudam ρ, cp e k do núcleo."];
  for (const key of pack.keys) {
    const s = pack.byKey[key];
    lines.push("");
    lines.push(s.core.name);
    lines.push("Fórmula: ρ_leito = (1 − ε) ρ_sólido");
    lines.push("Substituição: (1 − " + n(s.core.eps, 2) + ") · " + n(s.core.rhoSolid, 1) + " = " + n(s.core.rho, 2) + " kg/m³; cp = " + n(s.core.cp, 1) + " J/(kg·K); k = " + n(s.core.k, 3) + " W/(m·K)");
    const frame = s.frames[s.frames.length - 1];
    const front = frontReport(s.mesh, frame.T, s);
    lines.push("E exata = " + front.E.toExponential(8) + " J = " + n(front.E / 1e9, 6) + " GJ");
    lines.push("T_médio da energia = T0 + E / (ρ cp V) = " + n(front.Tmean, 3) + " °C");
    lines.push("Frente, profundidade em que T cai à média entre topo e base: " + (front.zHalf == null ? "não houve cruzamento" : n(front.zHalf, 3) + " m") + ". T_base no eixo = " + n(front.Tb, 3) + " °C. Limite = " + n(s.tlim, 1) + " °C. " + (front.reached ? "A base já cruzou o limite." : "A base ainda não cruzou o limite."));
    lines.push("Newton ‖R‖: " + (s.newtonHist || []).map((v) => n(v, 3)).join(" → "));
    lines.push("Ordem assintótica, três últimos resíduos: " + (s.newtonOrder == null ? "—" : n(s.newtonOrder, 3)) + ". Resíduo da eliminação: " + (s.linearResidual == null ? "—" : s.linearResidual.toExponential(3)));
    lines.push("Ordem temporal p = " + (s.temporal && s.temporal.p != null ? n(s.temporal.p, 3) : "—"));
  }
  lines.push("");
  lines.push(resistanceText(pack.byKey[pack.keys[0]]));
  if (pack.volumeNote) {
    lines.push("");
    lines.push(pack.volumeNote);
  }
  return lines.join("\n");
}

export function buildMemory(s) {
  const c = s.core;
  const rho = (1 - c.eps) * c.rhoSolid;
  const dtS = s.dtHours * 3600;
  const g = s.sample;
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
  lines.push("Cada passo traz a fórmula, os números no lugar dos símbolos, o resultado e, por último, a referência.");
  lines.push("");

  step(
    "Passo 1 — Discretização espacial",
    "O retângulo (r, z) é partido em quadriláteros bilineares. Cada elemento tem 4 nós. A integral usa 2×2 pontos de Gauss, ξ = η = ±1/√3.",
    "1/√3 = " + n(1 / Math.sqrt(3), 6) + ". A malha completa tem " + s.mesh.nr + " intervalos em r e " + s.mesh.nz + " em z, isolamento incluído. O primeiro intervalo do núcleo, no topo quente, mede " + n(s.mesh.dzTopTarget, 3) + " m.",
    "Há " + s.mesh.nn + " nós e " + s.mesh.elements.length + " elementos. O isolamento não segue o controle do núcleo: cada subcamada tem 2 elementos na espessura.",
    "Özisik (1993); Bathe (2014). O peso da integral axissimétrica é r, não 2πr. O 2π volta só na energia e na potência, em watt."
  );

  const census = Object.entries(s.mesh.census).map(([k, v]) => k + ": " + v + " elementos").join("; ");
  step(
    "Passo 2 — Nós do isolamento",
    "Cada subcamada definida (IFB, perlita, silicato, vermiculita) recebe a sua própria faixa de nós.",
    census,
    "Reduzir n_r ou n_z só muda o núcleo. Nenhuma camada de isolamento fica sem nó.",
    "A espessura continua a ser a do controle, em metros. Dois elementos em 15 cm dão 7,5 cm cada."
  );

  if (g) {
    step(
      "Passo 3 — Um ponto de Gauss, com número",
      "det = (Δr Δz)/4;   w_k = k · r · det;   w_m = ρ cp · r · det",
      "Δr = " + n(g.dr, 4) + " m; Δz = " + n(g.dz, 4) + " m; det = " + n(g.det, 6) + "; ξ = " + n(g.xi, 6) + "; r = " + n(g.r, 4) + " m; z = " + n(g.z, 4) + " m",
      "w_k = " + n(g.k, 3) + " · " + n(g.r, 4) + " · " + n(g.det, 6) + " = " + n(g.wk, 6) + ";  w_m = " + n(g.wm, 4),
      "Este elemento é o do núcleo, em r = 0, encostado no topo quente. A matriz soma w_k nos gradientes e w_m nas funções de forma."
    );
  }

  step(
    "Passo 4 — Densidade e difusividade",
    "ρ_leito = (1 − ε) ρ_sólido;   α = k / (ρ_leito cp)",
    "(1 − " + n(c.eps, 2) + ") · " + n(c.rhoSolid, 1) + " = " + n(rho, 2) + ";  α = " + n(c.k, 3) + " / (" + n(rho, 2) + " · " + n(c.cp, 1) + ")",
    "ρ_leito = " + n(rho, 2) + " kg/m³;  α = " + n(s.alpha, 6) + " m²/s;  √(α t) = " + n(s.depth, 3) + " m no fim do horizonte.",
    "Dissertação, Eq. (2). Özisik (1993). Incropera et al. (2014) para a ordem da frente."
  );

  step(
    "Passo 5 — Euler implícito",
    "Δt_s = Δt_h · 3600;   (C/Δt + K) entra na Jacobiana",
    n(s.dtHours, 2) + " · 3600 = " + n(dtS, 1) + " s;  passos do caso principal = " + s.steps,
    "C é concentrada por soma de linha. K é a rigidez de Galerkin mais o Robin linear h(T − Tref).",
    "Bathe (2014). Δt é tempo, não diferença de temperatura."
  );

  const rad = s.radSample;
  step(
    "Passo 6 — Radiação no contorno, a não linearidade",
    "q = ε σ [(T+273,15)^4 − (T∞+273,15)^4];   ∂q/∂T = ε σ · 4 (T+273,15)^3",
    rad
      ? "ε = " + n(s.epsRad, 2) + "; σ = " + SIGMA.toExponential(3) + "; T_superfície ≈ " + n(rad.ts, 2) + " °C = " + n(rad.tk, 2) + " K; T∞ = " + n(s.TAMB, 1) + " °C = " + n(rad.tink, 2) + " K"
      : "ε = " + n(s.epsRad, 2) + "; σ = " + SIGMA.toExponential(3),
    rad
      ? "q = " + n(rad.q, 3) + " W/m²;  ∂q/∂T = " + n(rad.dq, 4) + " W/(m²·K). Esse ∂q/∂T é a contribuição da face para a matriz Jacobiana."
      : "A amostra da face ainda não foi calculada.",
    "Dissertação, contorno de Robin com Stefan–Boltzmann. σ = 5,67×10⁻⁸ como no texto. ε é dado de contorno: o texto escreve o símbolo e o número fica no controle. A base, enterrada, fica só com convecção."
  );

  const hist = s.newtonHist || [];
  step(
    "Passo 7 — Newton–Raphson",
    "R(T) = (C/Δt)(T − T_antigo) + K T − b + R_rad(T);   J δ = −R;   T ← T + δ",
    "No passo de " + (s.newtonAt == null ? "—" : n(s.newtonAt, 2)) + " h, ‖R‖ por iteração: " + (hist.length ? hist.map((v) => n(v, 3)).join(" → ") : "—"),
    "A ordem é medida nos três últimos resíduos, já perto da raiz: p = ln(‖R‖ₙ₋₁/‖R‖ₙ) / ln(‖R‖ₙ₋₂/‖R‖ₙ₋₁). O valor neste passo foi " + (s.newtonOrder == null ? "—" : n(s.newtonOrder, 3)) + ". Dois não é garantido em todo passo; é o que a conta devolveu neste.",
    "Jδ = −R é resolvido por eliminação de Gauss em banda, não por Gauss–Seidel. O resíduo linear restante foi " + (s.linearResidual == null ? "—" : s.linearResidual.toExponential(3)) + ".",
    "Bathe (2014). Sem a radiação, J não depende de T e Newton termina em uma iteração. Com εσT^4, J depende de T."
  );

  const tempo = s.temporal;
  if (tempo) {
    const bits = tempo.runs.map((r) => "Δt = " + n(r.dt, 3) + " h → T = " + n(r.T, 2) + " °C em z = " + n(r.z, 3) + " m").join("; ");
    step(
      "Passo 8 — Convergência temporal",
      "p ≈ log(|T_h − T_h/2| / |T_h/2 − T_h/4|) / log(2)",
      "Janela de " + n(tempo.hours, 2) + " h, a mesma malha. " + bits,
      "|T(Δt) − T(Δt/2)| = " + n(tempo.d1, 3) + " °C;  |T(Δt/2) − T(Δt/4)| = " + n(tempo.d2, 3) + " °C;  p = " + (tempo.p == null ? "—" : n(tempo.p, 3)) + ". O Euler implícito é de ordem 1. p perto de 1 confirma o passo de tempo.",
      "Bathe (2014). A sonda está no eixo, cerca de 0,2 m abaixo do topo do núcleo."
    );
  }

  const frame = s.frames[s.frames.length - 1];
  const lossLine = (frame.losses || []).map((r) => r.layer + " = " + n(r.Q / 1000, 3) + " kW").join("; ");
  step(
    "Passo 9 — Perda por material",
    "Q = k (T_interno − T_externo) / espessura · área da face interna da subcamada",
    lossLine || "sem camadas",
    "Pele externa: convecção " + n(frame.skin.conv / 1000, 3) + " kW; radiação " + n(frame.skin.rad / 1000, 3) + " kW. Positivo sai do reservatório. Em regime transiente as faces de uma mesma pilha não têm o mesmo Q, porque a camada acumula calor.",
    "Incropera et al. (2014), condução. A área leva 2πr. U em série, só para conferência: U_topo = " + n(s.Utop, 4) + "; U_lateral = " + n(s.Ulat, 4) + "; U_base = " + n(s.Ubase, 4) + " W/(m²·K)."
  );

  step(
    "Passo 10 — Energia do gráfico",
    "E = ∫ ρ cp (T − T0) 2π r dr dz, só no núcleo",
    "T0 = " + n(s.T0, 1) + " °C; ρ = " + n(rho, 2) + "; cp = " + n(c.cp, 1),
    "E útil até T_base = " + n(s.tlim, 1) + " °C: " + n(s.eUseful / 1e9, 4) + " GJ. Termoclina: " + (s.tBreak == null ? "não atingiu o limite" : n(s.tBreak, 2) + " h") + ".",
    "O isolante não entra nesta integral."
  );

  lines.push("Eixos");
  lines.push("Cilindro: r de −" + n(s.mesh.rEdges[s.mesh.nr], 3) + " a " + n(s.mesh.rEdges[s.mesh.nr], 3) + " m; z de 0 a " + n(s.mesh.zEdges[s.mesh.nz], 3) + " m. Laranja = núcleo. Branco = envelope externo. Amarelo = plano de carga, no centro, sob o isolamento.");
  lines.push("Perdas: uma barra por subcamada, em kW.");
  lines.push("Newton: log10 ‖R‖ contra o número da iteração.");
  lines.push("Tempo: erro da sonda contra o Δt mais fino, na janela de " + (tempo ? n(tempo.hours, 2) : "—") + " h.");
  lines.push("");
  lines.push(resistanceText(s));
  if (s.volumeNote) {
    lines.push("");
    lines.push("Volume dos três substratos");
    lines.push(s.volumeNote);
  }
  return lines.join("\n");
}
