/** Memorial de cálculo, seções 0 a 13. Não resolve a equação. */

import { stackLayers } from "./materials.js";
import { seriesBreakdown } from "./formulas.js";
import { frontReport } from "./profiles.js";
import { volumeCompare } from "./volume.js";

const NS = "http://www.w3.org/2000/svg";
const PRICE = { areia: 36, alumina: 456.11, hematita: 73.29 };
const THEME = {
  0: "petroleo", 1: "petroleo",
  2: "esmeralda", 3: "esmeralda",
  4: "indigo", 5: "indigo",
  6: "ardosia", 7: "ardosia", 8: "ardosia",
  9: "ambar", 10: "ambar",
  11: "vinho",
  12: "grafite", 13: "grafite"
};
const INK = { areia: "#57534e", alumina: "#0369a1", hematita: "#c2410c" };

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function num(v, d) {
  if (!Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  const s = a !== 0 && (a >= 1e5 || a < 1e-3) ? v.toExponential(d) : v.toFixed(d);
  return s.replace(".", ",");
}

function sci(v) {
  if (!Number.isFinite(v)) return "—";
  return v.toExponential(3).replace(".", ",");
}

function tex(src) {
  const n = el("div", "formula");
  n.dataset.tex = src;
  return n;
}

function deduction(parts) {
  const box = el("article", "deduction");
  for (const part of parts) {
    box.append(el("h3", null, part.h));
    if (part.text) box.append(el("p", null, part.text));
    if (part.tex) box.append(tex(part.tex));
    if (part.node) box.append(part.node);
  }
  return box;
}

function grid(caption, headers, rows, dense) {
  const wrap = el("div", "table-wrap");
  wrap.append(el("p", "tabcap", caption));
  const table = el("table", dense ? "dense" : "");
  const thead = document.createElement("thead");
  const hr = document.createElement("tr");
  headers.forEach((h) => hr.append(el("th", null, h)));
  thead.append(hr);
  const tb = document.createElement("tbody");
  for (const row of rows) {
    const tr = document.createElement("tr");
    row.forEach((c) => tr.append(el("td", null, c == null ? "—" : String(c))));
    tb.append(tr);
  }
  table.append(thead, tb);
  wrap.append(table);
  return wrap;
}

function section(n, title) {
  const s = el("section", "sec " + THEME[n]);
  s.id = "mem-sec-" + n;
  const h = el("h2", "sec-title");
  h.append(el("span", "sec-no", String(n)));
  h.append(document.createTextNode(title));
  s.append(h);
  return s;
}

function typeset(root) {
  root.querySelectorAll("[data-tex]").forEach((node) => {
    const src = node.dataset.tex;
    if (window.katex) {
      window.katex.render(src, node, { throwOnError: false, displayMode: true });
    } else {
      node.textContent = src;
    }
  });
}

function facePack(side, state) {
  const layers = stackLayers(side, state.thick, state.kIns);
  if (side === "base") {
    layers[0].name = "IFB";
    layers[1].name = "Silicato de cálcio";
    layers[2].name = "Vermiculita";
  } else {
    layers[0].name = "IFB interno";
    layers[1].name = "Perlita";
    layers[2].name = "IFB externo";
  }
  return seriesBreakdown(layers, state.hExt);
}

function tagNode(mesh, i, j) {
  const r = mesh.rEdges[i];
  const z = mesh.zEdges[j];
  if (r <= mesh.R + 1e-8 && z >= mesh.zCore0 - 1e-8 && z <= mesh.zCoreTop + 1e-8) return "N";
  return "I";
}

function nodeMaterials(mesh) {
  const sets = Array.from({ length: mesh.nn }, () => new Set());
  for (const eln of mesh.elements) for (const n of eln.n) sets[n].add(eln.mat);
  return sets.map((s) => [...s].join(" + "));
}

function frameNear(state, hour) {
  let best = state.frames[0];
  let dist = Infinity;
  for (const frame of state.frames) {
    const d = Math.abs(frame.tH - hour);
    if (d < dist) { dist = d; best = frame; }
  }
  return best;
}

function sampleHours(state) {
  const end = state.days * 24;
  return [0, 0.25, 0.5, 0.75, 1].map((f) => end * f);
}

function nodeRows(mesh, frames, mats) {
  const ni = mesh.nr + 1;
  const rows = [];
  for (let j = 0; j <= mesh.nz; j++) {
    for (let i = 0; i <= mesh.nr; i++) {
      const g = j * ni + i;
      const row = [
        String(g), String(i), String(j),
        num(mesh.rEdges[i], 3), num(mesh.zEdges[j], 3),
        tagNode(mesh, i, j), mats[g]
      ];
      for (const frame of frames) row.push(num(frame.T[g], 2));
      rows.push(row);
    }
  }
  return rows;
}

function heat(t, a, b) {
  const f = Math.max(0, Math.min(1, (t - a) / Math.max(b - a, 1)));
  const stops = [[15, 23, 42], [14, 116, 144], [250, 204, 21], [234, 88, 12], [127, 29, 29]];
  const x = f * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const u = x - i;
  const c0 = stops[i];
  const c1 = stops[i + 1];
  const r = c0[0] + (c1[0] - c0[0]) * u;
  const g = c0[1] + (c1[1] - c0[1]) * u;
  const bch = c0[2] + (c1[2] - c0[2]) * u;
  return "rgb(" + (r | 0) + "," + (g | 0) + "," + (bch | 0) + ")";
}

function svg(w, h, label) {
  const s = document.createElementNS(NS, "svg");
  s.setAttribute("viewBox", "0 0 " + w + " " + h);
  s.setAttribute("class", "fig");
  s.setAttribute("role", "img");
  s.setAttribute("aria-label", label);
  const title = document.createElementNS(NS, "title");
  title.textContent = label;
  s.append(title);
  return s;
}

function sEl(name, attrs, text) {
  const n = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  if (text != null) n.textContent = text;
  return n;
}

function niceTicks(min, max, count) {
  const span = max - min;
  if (!(span > 0)) return [min];
  const raw = span / Math.max(2, count);
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  const step = (n <= 1.5 ? 1 : n <= 3.5 ? 2 : n <= 7.5 ? 5 : 10) * pow;
  const start = Math.ceil(min / step) * step;
  const out = [];
  for (let v = start; v <= max + step * 1e-6; v += step) {
    out.push(Math.abs(v) < 1e-10 ? 0 : v);
    if (out.length > 8) break;
  }
  if (!out.length) out.push(min, max);
  return out;
}

function headerBlock(pack) {
  const hem = pack.byKey.hematita;
  const mesh = hem.mesh;
  const head = el("header", "inst");
  head.append(el("p", "inst-kicker", "XV CBPE | PPGEE-UFPI | Memória de Cálculo — Demonstrador SAET 2D (Recorte de Dissertação)"));
  head.append(el("h1", null, "MEMÓRIA DE CÁLCULO INTEGRAL — SISTEMA DE ARMAZENAMENTO DE ENERGIA TÉRMICA (SAET)"));
  const meta = el("div", "inst-meta");
  meta.append(el("p", null, "Autor: Tarcísio Dias da Rocha  ·  Orientador: Prof. Dr. Marcos Antônio Tavares Lira (PPGEE/UFPI)"));
  meta.append(el("p", null, "Evento: XV Congresso Brasileiro de Planejamento Energético (XV CBPE) — João Pessoa-PB, 04 a 06/11/2026"));
  meta.append(el("p", null, "Repositório: https://github.com/EngRocha1/saet-forma-canonica  ·  Demo: https://engrocha1.github.io/saet-forma-canonica/"));
  meta.append(el("p", null, "Geração: " + new Date().toLocaleString("pt-BR", { timeZone: "America/Fortaleza" }) + " (horário de Fortaleza)"));
  head.append(meta);
  const kpis = el("div", "kpis");
  const cards = [
    ["R", num(mesh.R, 2) + " m"],
    ["L", num(mesh.L, 2) + " m"],
    ["Malha", mesh.nr + " × " + mesh.nz],
    ["Nós", String(mesh.nn)],
    ["Δt", num(hem.dtHours, 2) + " h"],
    ["Horizonte", num(hem.days, 0) + " d"],
    ["T carga", num(hem.Tcharge, 0) + " °C"],
    ["T0 / Tamb / Tsolo", num(hem.T0, 0) + " / " + num(hem.TAMB, 0) + " / " + num(hem.TSOLO, 0) + " °C"]
  ];
  for (const [k, v] of cards) {
    const card = el("div", "kpi");
    card.append(el("span", null, k));
    card.append(el("strong", null, v));
    kpis.append(card);
  }
  head.append(kpis);
  return head;
}

function sec0(pack) {
  const s = section(0, "Natureza e escopo deste documento");
  s.append(deduction([
    { h: "Conceito", text: "Este memorial documenta o modelo que esta página executa agora: condução axissimétrica em três leitos (areia de sílica, alumina calcinada e hematita), com carga resistiva de Robin no topo do núcleo. É um recorte público da dissertação em andamento no PPGEE/UFPI, feito para o XV CBPE. Não é o PDF de 4 de novembro de 2026 e não é o código Python da tese. O gás de um ciclo futuro não entra no leito." },
    { h: "Referência", text: "Rocha e Lira, demonstrador SAET, XV CBPE, 2026. O PDF antigo descrevia volumes finitos e atualização só pela diagonal. Esse método não está neste arquivo." },
    { h: "Fórmula", tex: "\\text{método} = \\text{Galerkin Q1} + \\text{Euler implícito} + \\text{Newton–Raphson em banda}" },
    { h: "Substituição", text: "Substratos nesta execução: " + pack.keys.map((k) => pack.byKey[k].core.name).join(", ") + ". Malha do domínio: " + pack.byKey.hematita.mesh.nn + " nós. Nenhum fator multiplica k." }
  ]));
  return s;
}

function sec1(pack) {
  const s = section(1, "Equação governante e propriedades efetivas");
  const rows = pack.keys.map((key) => {
    const c = pack.byKey[key].core;
    const st = pack.byKey[key];
    return [c.name, num(c.rhoSolid, 1), num(c.eps, 2), num(c.rho, 2), num(c.cp, 1), num(c.k, 3), st.alpha.toExponential(4).replace(".", ",")];
  });
  s.append(deduction([
    { h: "Conceito", text: "Sem geração e sem escoamento, a taxa de aumento da energia interna é o balanço do fluxo de Fourier. Em cilindro axissimétrico o campo não depende do ângulo. A densidade do leito desconta o vazio: só a fração sólida guarda calor. k, ρ e cp são constantes em cada região." },
    { h: "Referência", text: "Incropera et al. (2014); Çengel e Ghajar (2020); Özisik (1993). A densidade (1 − ε) ρ é a do leito poroso usada na dissertação; Kaviany (1995) trata o mesmo tipo de média. Não há k(T) nem cp(T)." },
    { h: "Fórmula", tex: "\\rho c_p \\frac{\\partial T}{\\partial t} = \\frac{1}{r}\\frac{\\partial}{\\partial r}\\!\\left(r k \\frac{\\partial T}{\\partial r}\\right) + \\frac{\\partial}{\\partial z}\\!\\left(k \\frac{\\partial T}{\\partial z}\\right), \\quad \\rho_{\\mathrm{leito}}=(1-\\varepsilon)\\rho_{\\mathrm{s}}, \\quad \\alpha=\\frac{k}{\\rho_{\\mathrm{leito}} c_p}" },
    { h: "Substituição", node: grid("Tabela 1.1 — Propriedades do leito nesta execução", ["Substrato", "ρ sólido", "ε", "ρ leito", "cp", "k", "α (m²/s)"], rows, true) }
  ]));
  const hem = pack.byKey.hematita.core;
  s.append(el("p", "after", "Hematita: (1 − " + num(hem.eps, 2) + ") × " + num(hem.rhoSolid, 1) + " = " + num(hem.rho, 2) + " kg/m³. α = " + num(hem.k, 3) + " / (" + num(hem.rho, 2) + " × " + num(hem.cp, 1) + ") = " + pack.byKey.hematita.alpha.toExponential(4).replace(".", ",") + " m²/s."));
  return s;
}

function sec2(pack) {
  const s = section(2, "Discretização espacial e geometria");
  const mesh = pack.byKey.hematita.mesh;
  const g = pack.byKey.hematita.sample;
  const census = Object.entries(mesh.census).map(([k, v]) => [k, String(v)]);
  s.append(deduction([
    { h: "Conceito", text: "O plano (r, z) é partido em quadriláteros bilineares de 4 nós. A integral usa 2×2 pontos de Gauss e o peso r. O núcleo é graduado: o primeiro intervalo na face quente vale " + num(mesh.dzTopTarget, 3) + " m. Cada subcamada de isolamento tem dois elementos, com nós próprios. Não há malha uniforme e não há média harmônica de face: cada elemento carrega o k do seu material." },
    { h: "Referência", text: "Bathe (1996); Özisik (1993). Patankar (1980) é o volume finito do PDF de 4 de novembro. Este programa não usa essa discretização." },
    { h: "Fórmula", tex: "\\det J = \\frac{\\Delta r\\,\\Delta z}{4}, \\quad w_k = k\\, r\\, \\det J, \\quad w_m = \\rho c_p\\, r\\, \\det J, \\quad \\xi=\\eta=\\pm\\frac{1}{\\sqrt{3}}" },
    { h: "Substituição", text: g
      ? "Elemento do núcleo encostado no topo, r = 0. Δr = " + num(g.dr, 4) + " m; Δz = " + num(g.dz, 4) + " m; det = " + num(g.det, 6) + "; ξ = " + num(g.xi, 6) + "; r = " + num(g.r, 4) + " m; z = " + num(g.z, 4) + " m. w_k = " + num(g.wk, 6) + "; w_m = " + num(g.wm, 4) + ". Nós do domínio = " + mesh.nn + ". Intervalos: n_r = " + mesh.nr + ", n_z = " + mesh.nz + ". Menor elemento de isolamento = " + num(mesh.minLayerM, 4) + " m."
      : "A amostra de Gauss não foi gravada." }
  ]));
  s.append(grid("Tabela 2.1 — Arestas r (m)", ["i", "r"], mesh.rEdges.map((r, i) => [String(i), num(r, 4)]), true));
  s.append(grid("Tabela 2.2 — Arestas z (m)", ["j", "z"], mesh.zEdges.map((z, j) => [String(j), num(z, 4)]), true));
  s.append(grid("Tabela 2.3 — Elementos por subcamada", ["Camada", "Elementos"], census, true));
  return s;
}

function sec3(pack) {
  const hem = pack.byKey.hematita;
  const area = Math.PI * hem.mesh.R * hem.mesh.R;
  const pClosed = hem.hTop * (hem.Tcharge - hem.T0) * area;
  const s = section(3, "Condições de contorno e condição inicial");
  s.append(deduction([
    { h: "Conceito", text: "O eixo não recebe fluxo, por simetria. A carga renovável desta página é resistiva: Robin só no topo do núcleo, debaixo do isolamento. Topo externo e lateral perdem calor por convecção e por radiação para o ar. A base, no solo, perde só por convecção. O sólido inteiro parte de T0." },
    { h: "Referência", text: "Incropera et al. (2014), condição de Robin e lei de Stefan–Boltzmann. Rocha e Lira, XV CBPE, 2026, para a carga no topo do núcleo e não no envelope." },
    { h: "Fórmula", tex: "r=0:\\ q_r=0;\\quad -k\\frac{\\partial T}{\\partial z}=h(T-T_{\\mathrm{carga}});\\quad -k\\frac{\\partial T}{\\partial n}=h_{\\mathrm{ext}}(T-T_{\\mathrm{amb}})+\\varepsilon\\sigma[(T+273{,}15)^4-(T_{\\mathrm{amb}}+273{,}15)^4];\\quad \\text{base:}\\ -k\\frac{\\partial T}{\\partial z}=h_{\\mathrm{ext}}(T-T_{\\mathrm{solo}})" },
    { h: "Substituição", text: "h = " + num(hem.hTop, 1) + " W/(m²·K); T_carga = " + num(hem.Tcharge, 1) + " °C; h_ext = " + num(hem.hExt, 1) + " W/(m²·K); T_amb = " + num(hem.TAMB, 1) + " °C; T_solo = " + num(hem.TSOLO, 1) + " °C; T0 = " + num(hem.T0, 1) + " °C; ε = " + num(hem.epsRad, 2) + "; σ = 5,67×10⁻⁸. Área do topo do núcleo = π × " + num(hem.mesh.R, 2) + "² = " + num(area, 3) + " m². P(t = 0) = " + num(hem.hTop, 1) + " × (" + num(hem.Tcharge, 1) + " − " + num(hem.T0, 1) + ") × " + num(area, 3) + " = " + num(pClosed / 1e6, 3) + " MW. O valor integrado nas faces, no código, é " + num(hem.balance.P0 / 1e6, 3) + " MW. É fluxo de Robin com o sólido ainda em T0, não potência de usina. Bi = h (R/2) / k = " + num(hem.biot, 1) + "." }
  ]));
  return s;
}

function sec4(pack) {
  const s = section(4, "Avanço temporal e Newton–Raphson");
  const rows = pack.keys.map((key) => {
    const st = pack.byKey[key];
    return [
      st.core.name,
      st.newtonAt == null ? "—" : num(st.newtonAt, 1),
      (st.newtonHist || []).map((v) => sci(v)).join(" → "),
      st.newtonOrder == null ? "—" : num(st.newtonOrder, 3),
      st.linearResidual == null ? "—" : sci(st.linearResidual),
      st.temporal && st.temporal.p != null ? num(st.temporal.p, 3) : "—"
    ];
  });
  s.append(deduction([
    { h: "Conceito", text: "O Euler implícito avalia condução e Robin no instante futuro. A radiação torna o resíduo função de T. A Jacobiana inclui 4 ε σ (T + 273,15)³ em todas as posições da face, não só na diagonal. O sistema Jδ = −R é resolvido por eliminação de Gauss em banda. A ordem assintótica usa os três últimos resíduos do passo em que o resíduo inicial é o maior. A ordem temporal compara uma sonda no eixo, cerca de 0,2 m abaixo do topo, em Δt, Δt/2 e Δt/4." },
    { h: "Referência", text: "Bathe (1996), Newton–Raphson e ordem do Euler implícito. O critério de parada é do programa: ||R|| / ||b|| < 10⁻¹² ou ||R|| < 10⁻⁹. Não se usa ||R|| < 10⁻⁴." },
    { h: "Fórmula", tex: "\\left(\\frac{C}{\\Delta t}+K\\right)T^{n+1}=\\frac{C}{\\Delta t}T^{n}+b, \\quad p=\\frac{\\ln(\\|R\\|_{n-1}/\\|R\\|_n)}{\\ln(\\|R\\|_{n-2}/\\|R\\|_{n-1})}" },
    { h: "Substituição", node: grid("Tabela 4.1 — Newton, eliminação e ordem temporal", ["Substrato", "t do pior passo (h)", "||R||", "ordem", "resíduo da eliminação", "p temporal"], rows, true) }
  ]));
  const hem = pack.byKey.hematita;
  s.append(el("p", "after", "Hematita, Δt = " + num(hem.dtHours, 2) + " h = " + num(hem.dtHours * 3600, 0) + " s. Passos do horizonte = " + hem.steps + ". A razão ||R||_{k+1} / ||R||_k² do PDF antigo não é constante e não é publicada aqui como prova."));
  return s;
}

function sec5(pack) {
  const s = section(5, "Iterações no tempo");
  const hem = pack.byKey.hematita;
  const log = hem.stepLog || [];
  const rows = [];
  for (const step of log) {
    const hist = step.hist || [];
    hist.forEach((v, k) => {
      const ratio = k < hist.length - 1 && v > 0 ? num(hist[k + 1] / v, 4) : "—";
      rows.push([
        k === 0 ? num(step.tH, 2) : "",
        String(k + 1),
        sci(v),
        ratio,
        k === hist.length - 1 && step.order != null ? num(step.order, 3) : ""
      ]);
    });
  }
  s.append(deduction([
    { h: "Conceito", text: "Cada passo de tempo repete Newton até o critério. A tabela da hematita lista ||R|| em toda iteração de todo passo deste horizonte. A razão é ||R||_{k+1} / ||R||_k, entre iterações consecutivas. Ela cai forte no começo e deixa de ser um teste de ordem 2." },
    { h: "Referência", text: "Bathe (1996). A ordem da Tabela 4.1 continua sendo a conta logarítmica dos três últimos resíduos, não esta razão." },
    { h: "Fórmula", tex: "\\rho_k = \\frac{\\|R\\|_{k+1}}{\\|R\\|_k}" },
    { h: "Substituição", text: "Hematita. Passos registrados: " + log.length + ". O passo de maior resíduo inicial está em t = " + (hem.newtonAt == null ? "—" : num(hem.newtonAt, 2)) + " h." }
  ]));
  s.append(grid("Tabela 5.1 — Hematita, residual por iteração", ["t (h)", "iter.", "||R||", "razão", "ordem no fim do passo"], rows, true));
  return s;
}

function sec6(pack) {
  const s = section(6, "Temperaturas nodais");
  const hem = pack.byKey.hematita;
  const mesh = hem.mesh;
  const mats = nodeMaterials(mesh);
  const hours = sampleHours(hem);
  const frames = hours.map((h) => frameNear(hem, h));
  const headers = ["g", "i", "j", "r (m)", "z (m)", "reg.", "mat."].concat(frames.map((f) => "T " + num(f.tH, 1) + " h"));
  const front = frontReport(mesh, frames[frames.length - 1].T, hem);
  s.append(deduction([
    { h: "Conceito", text: "O índice global é g = j (n_r + 1) + i. N é nó no retângulo do núcleo, inclusive a fronteira. I é nó só do isolamento. A frente é a profundidade, a partir da face quente, em que a temperatura no eixo cai à média entre o topo e a base. O limite da base é o controle T_base, default 80 °C." },
    { h: "Referência", text: "Rocha e Lira, XV CBPE, 2026. Incropera et al. (2014) para a ordem √(α t) da penetração por condução." },
    { h: "Fórmula", tex: "g = j(n_r+1)+i, \\quad z_{1/2}:\\ T(0,z)=\\frac{T_{\\mathrm{topo}}+T_{\\mathrm{base}}}{2}" },
    { h: "Substituição", text: "Hematita no último quadro (" + num(frames[frames.length - 1].tH, 2) + " h). T_topo no eixo = " + num(front.Tt, 2) + " °C. T_base = " + num(front.Tb, 2) + " °C. Limite = " + num(hem.tlim, 1) + " °C. " + (front.reached ? "A base cruzou o limite." : "A base ainda não cruzou o limite.") + " Frente da média = " + (front.zHalf == null ? "sem cruzamento" : num(front.zHalf, 3) + " m") + ". Isoterma do limite = " + (front.zLim == null ? "não aparece no núcleo" : num(front.zLim, 3) + " m") + ". √(α t) = " + num(hem.depth, 3) + " m." }
  ]));
  s.append(grid("Tabela 6.1 — Hematita, T(i, j) nos instantes amostrados", headers, nodeRows(mesh, frames, mats), true));
  return s;
}

function sec7(pack) {
  const s = section(7, "Diagonal da Jacobiana no estado final");
  const mesh = pack.byKey.hematita.mesh;
  const mats = nodeMaterials(mesh);
  const ni = mesh.nr + 1;
  const rows = [];
  for (let g = 0; g < mesh.nn; g++) {
    const i = g % ni;
    const j = Math.floor(g / ni);
    const row = [String(g), String(i), String(j), tagNode(mesh, i, j), mats[g]];
    for (const key of pack.keys) {
      const d = pack.byKey[key].finalDiag;
      row.push(d && d[g] != null ? sci(d[g]) : "—");
    }
    rows.push(row);
  }
  s.append(deduction([
    { h: "Conceito", text: "A coluna é a diagonal da Jacobiana completa, montada no último passo, com a radiação já somada. O programa não atualiza T por R_g / J_gg. A eliminação usa a banda inteira. A diagonal é só o diagnóstico pedido desta seção." },
    { h: "Referência", text: "Bathe (1996). A lista J_gg do PDF de 4 de novembro era a diagonal de um Jacobi. Não é esta tabela." },
    { h: "Fórmula", tex: "J_{gg} = \\frac{\\partial R_g}{\\partial T_g}, \\quad J\\delta = -R \\ \\text{(eliminação em banda)}" },
    { h: "Substituição", text: "Três substratos, mesmo índice g, estado final de cada marcha. Unidades de J_gg: resíduo por kelvin." }
  ]));
  s.append(grid("Tabela 7.1 — Diagonal nodal no estado final", ["g", "i", "j", "reg.", "material", "J_gg areia", "J_gg alumina", "J_gg hematita"], rows, true));
  return s;
}

function sec8(pack) {
  const s = section(8, "Resíduos nodais finais");
  const mesh = pack.byKey.hematita.mesh;
  const ni = mesh.nr + 1;
  const rows = [];
  let maxAbs = 0;
  for (let g = 0; g < mesh.nn; g++) {
    const i = g % ni;
    const j = Math.floor(g / ni);
    const row = [String(g), String(i), String(j), tagNode(mesh, i, j)];
    for (const key of pack.keys) {
      const r = pack.byKey[key].finalNodeR;
      const v = r ? r[g] : NaN;
      if (Number.isFinite(v)) maxAbs = Math.max(maxAbs, Math.abs(v));
      row.push(Number.isFinite(v) ? sci(Math.abs(v)) : "—");
    }
    rows.push(row);
  }
  s.append(deduction([
    { h: "Conceito", text: "R_g é o desequilíbrio de energia no nó depois da última iteração do último passo, antes de declarar o passo encerrado. |R_g| pequeno, junto com a norma da seção 4, é a conservação discreta deste esquema. Não é um volume de controle de Patankar." },
    { h: "Referência", text: "Bathe (1996). O critério global está na seção 4." },
    { h: "Fórmula", tex: "|R_g| = \\left| \\left(\\frac{C}{\\Delta t}(T-T^{n}) + KT - b + R_{\\mathrm{rad}}\\right)_g \\right|" },
    { h: "Substituição", text: "Maior |R_g| entre os três campos finais: " + sci(maxAbs) + ". A norma ||R|| da hematita no último passo é " + (pack.byKey.hematita.lastNewton || []).map(sci).join(" → ") + "." }
  ]));
  s.append(grid("Tabela 8.1 — |R_g| no estado final", ["g", "i", "j", "reg.", "|R| areia", "|R| alumina", "|R| hematita"], rows, true));
  return s;
}

function sec9(pack) {
  const s = section(9, "Isolamento, resistências e perdas");
  const hem = pack.byKey.hematita;
  const faces = [["Topo", "top"], ["Lateral", "lat"], ["Base", "base"]];
  s.append(deduction([
    { h: "Conceito", text: "A resistência de cada camada é e/k. A da face soma as camadas e 1/h_ext. U é o inverso. A malha continua sendo resolvida; U só confere a pilha. Topo e lateral usam a mesma pilha, por isso o U coincide. A base troca o miolo e o revestimento externo. Em regime transiente as faces de uma mesma pilha não têm o mesmo fluxo, porque a camada acumula calor." },
    { h: "Referência", text: "Incropera et al. (2014), parede plana composta. A vermiculita desta malha está em 0,065 W/(m·K). O valor 0,17 W/(m·K) de uma fórmula da dissertação não entrou aqui." },
    { h: "Fórmula", tex: "R''=\\frac{e}{k}, \\quad R''_{\\mathrm{total}}=\\sum R''+\\frac{1}{h_{\\mathrm{ext}}}, \\quad U=\\frac{1}{R''_{\\mathrm{total}}}" },
    { h: "Substituição", text: "h_ext = " + num(hem.hExt, 2) + " W/(m²·K), logo 1/h = " + num(1 / hem.hExt, 4) + " m²·K/W." }
  ]));
  for (const [title, side] of faces) {
    const packU = facePack(side, hem);
    const rows = packU.rows.map((r) => [r.name, num(r.e, 3), num(r.k, 4), num(r.R, 4)]);
    rows.push(["Convecção", "—", "—", num(packU.Rconv, 4)]);
    rows.push(["Total", "—", "—", num(packU.Rtot, 4)]);
    s.append(grid("Tabela 9." + (side === "top" ? "1" : side === "lat" ? "2" : "3") + " — " + title + ". U = " + num(packU.U, 6) + " W/(m²·K)", ["Camada", "e (m)", "k", "R'' (m²·K/W)"], rows, true));
  }
  const frame = hem.frames[hem.frames.length - 1];
  const lossRows = [];
  const names = (frame.losses || []).map((r) => r.layer);
  for (const name of names) {
    const row = [name];
    for (const key of pack.keys) {
      const fr = pack.byKey[key].frames[pack.byKey[key].frames.length - 1];
      const hit = (fr.losses || []).find((r) => r.layer === name);
      row.push(hit ? num(hit.Q / 1000, 3) : "—");
    }
    lossRows.push(row);
  }
  s.append(grid("Tabela 9.4 — Fluxo instantâneo na face interna da camada, no fim do horizonte (kW). Positivo sai do núcleo.", ["Camada", "Areia", "Alumina", "Hematita"], lossRows, true));
  return s;
}

function sec10(pack) {
  const s = section(10, "Balanço global, potência e termoclina");
  const rows = pack.keys.map((key) => {
    const st = pack.byKey[key];
    const frame = st.frames[st.frames.length - 1];
    const front = frontReport(st.mesh, frame.T, st);
    const b = st.balance;
    const rel = 100 * b.closure / Math.max(Math.abs(b.Qin), 1);
    return [
      st.core.name,
      num(b.P0 / 1e6, 3),
      num(b.Pfinal / 1e6, 3),
      num(b.Qin / 1e9, 3),
      num(b.Edomain / 1e9, 3),
      num(front.E / 1e9, 4),
      num(front.Tmean, 2),
      num(b.Qout / 1e9, 3),
      num(b.closure / 1e9, 4) + " (" + num(rel, 2) + "%)",
      front.zHalf == null ? "—" : num(front.zHalf, 3),
      front.reached ? "cruzou " + num(st.tlim, 0) + " °C" : "T_base " + num(front.Tb, 2) + " °C < " + num(st.tlim, 0)
    ];
  });
  s.append(deduction([
    { h: "Conceito", text: "A potência é a integral do Robin de carga na face do núcleo. A energia do gráfico é só o leito. A energia do balanço é o domínio inteiro, núcleo mais isolamento. O fechamento é ∫P dt − E_domínio − perdas de pele. O resíduo existe porque a integral usa o fluxo no fim do passo. A termoclina desta página é condução, não uma frente empurrada por gás." },
    { h: "Referência", text: "Incropera et al. (2014), balanço de energia. Rocha e Lira, XV CBPE, 2026." },
    { h: "Fórmula", tex: "P=\\int h(T_{\\mathrm{carga}}-T)\\,dA, \\quad E=\\int \\rho c_p (T-T_0)\\,2\\pi r\\,dr\\,dz, \\quad \\int P\\,dt = E_{\\mathrm{dom}} + Q_{\\mathrm{pele}} + \\mathrm{res\\acute{\\i}duo}" },
    { h: "Substituição", node: grid("Tabela 10.1 — Três substratos no fim do horizonte", ["Substrato", "P0 (MW)", "P final (MW)", "∫P dt (GJ)", "E domínio (GJ)", "E núcleo (GJ)", "T média (°C)", "Pele (GJ)", "Fechamento", "Frente (m)", "Base"], rows, true) }
  ]));
  return s;
}

function volumeSpec(pack, isothermal) {
  const hem = pack.byKey.hematita;
  const solids = {};
  for (const key of pack.keys) {
    const c = pack.byKey[key].core;
    solids[key] = { name: c.name, rho: c.rhoSolid, cp: c.cp };
  }
  return {
    eps: hem.core.eps,
    R: hem.mesh.R,
    L: hem.mesh.L,
    isothermal,
    solids,
    ranges: {
      areia: { tmin: 150, tmax: 573 },
      alumina: { tmin: 150, tmax: 1000 },
      hematita: { tmin: 150, tmax: 1000 }
    }
  };
}

function volumeRows(v) {
  return v.rows.map((r) => [
    r.name, num(r.rho, 2), num(r.cp, 1), num(r.tmin, 0), num(r.tmax, 0), num(r.dT, 0),
    num(r.V, 2), num(r.pct, 2), num(100 - r.pct, 2)
  ]);
}

function costRows(v) {
  return v.rows.map((r) => {
    const price = PRICE[r.key];
    const c = (price / 1000) / (r.cp * r.dT) * 3.6e6;
    return [r.name, num(price, 2), num(r.dT, 0), num(c, 3)];
  });
}

function sec11(pack) {
  const s = section(11, "Volume com e sem estratégia de temperatura");
  const a = volumeCompare(volumeSpec(pack, true));
  const b = volumeCompare(volumeSpec(pack, false));
  const sand = a.rows[0];
  const hem = b.rows[2];
  const ratio = hem.V / b.rows[0].V;
  s.append(deduction([
    { h: "Conceito", text: "O volume comparado guarda a mesma energia de referência da areia no cilindro geométrico. No cenário A os três materiais usam o mesmo salto, de 150 °C a 573 °C. A diferença de volume vem só de ρ_leito cp. No cenário B a areia permanece em 573 °C e alumina e hematita vão a 1 000 °C, com o mesmo piso de 150 °C. 573 °C é a inversão α–β do quartzo (847 K). Não é 540 °C e não é 575 °C. O teto de 1 000 °C é o da carga desta conta, não um ensaio do cristal." },
    { h: "Referência", text: "Dissertação, propriedades e teto da sílica. Incropera et al. (2014) para o calor sensível Q = ρ cp V ΔT. Preços já citados na dissertação: areia 36,00 USD/t (USGS, estimativa 2025), minério de ferro não aglomerado 73,29 USD/t e alumina calcinada 456,11 USD/t (ANM, 2025). Não incluem frete nem isolamento." },
    { h: "Fórmula", tex: "V_{\\mathrm{geo}}=\\pi R^{2} L, \\quad E_{\\mathrm{ref}}=\\rho_{\\mathrm{areia}} c_{p,\\mathrm{areia}} V_{\\mathrm{geo}} \\Delta T_{\\mathrm{areia}}, \\quad V=\\frac{E_{\\mathrm{ref}}}{\\rho_{\\mathrm{leito}} c_p \\Delta T}, \\quad c=\\frac{\\mathrm{pre\\c{c}o}}{c_p\\Delta T}" },
    { h: "Substituição", text: "V_geo = " + num(a.Vgeo, 2) + " m³. E_ref do cenário A = " + a.E.toExponential(4).replace(".", ",") + " J, com ΔT = " + num(sand.dT, 0) + " K e ρ_areia = " + num(sand.rho, 2) + " kg/m³. No cenário B a razão de volumes hematita/areia = " + num(ratio, 4) + " (redução de " + num(100 * (1 - ratio), 2) + "%). A área, na semelhança geométrica do cenário A, escala com o volume elevado a 2/3, não com o volume." }
  ]));
  s.append(el("h3", "subhead", "11.1 Cenário A — estratégia isotérmica ligada"));
  s.append(grid("Tabela 11.1 — Mesmo salto, 150 °C a 573 °C", ["Substrato", "ρ leito", "cp", "T mín", "T máx", "ΔT", "V (m³)", "% da areia", "redução %"], volumeRows(a), true));
  s.append(grid("Tabela 11.2 — Custo do sólido no cenário A (USD/kWh térmico)", ["Substrato", "USD/t", "ΔT (K)", "USD/kWh"], costRows(a), true));
  s.append(el("h3", "subhead", "11.2 Cenário B — teto individual"));
  s.append(grid("Tabela 11.3 — Areia até 573 °C; alumina e hematita até 1 000 °C", ["Substrato", "ρ leito", "cp", "T mín", "T máx", "ΔT", "V (m³)", "% da areia", "redução %"], volumeRows(b), true));
  s.append(grid("Tabela 11.4 — Custo do sólido no cenário B (USD/kWh térmico)", ["Substrato", "USD/t", "ΔT (K)", "USD/kWh"], costRows(b), true));
  s.append(el("p", "after", "Reduzir volume não é reduzir o custo do meio. No cenário A a hematita ocupa menos espaço e custa mais por kWh térmico do que a areia, com estes preços de commodity. O isolamento não tem preço de compra nesta memória."));
  return s;
}

function sec12() {
  const s = section(12, "Referências");
  const refs = [
    ["Rocha e Lira (2026)", "Seções 0, 3, 6 e 10. Demonstrador e condições de contorno desta página.", "ROCHA, Tarcísio Dias da; LIRA, Marcos Antônio Tavares. SAET — demonstrador Galerkin 2D. XV Congresso Brasileiro de Planejamento Energético, João Pessoa, 2026. Disponível em: https://github.com/EngRocha1/saet-forma-canonica. Acesso em: 22 nov. 2026."],
    ["Incropera et al. (2014)", "Seções 1, 3, 6, 9 e 10. Fourier, Robin e parede composta.", "INCROPERA, Frank P. et al. Fundamentos de transferência de calor e de massa. 7. ed. Rio de Janeiro: LTC, 2014."],
    ["Çengel e Ghajar (2020)", "Seção 1. Condução transiente.", "ÇENGEL, Yunus A.; GHAJAR, Afshin J. Heat and mass transfer: fundamentals and applications. New York: McGraw-Hill, 2020."],
    ["Özisik (1993)", "Seções 1 e 2. Condução e formulação fraca.", "ÖZISIK, M. Necati. Heat conduction. 2. ed. New York: John Wiley, 1993."],
    ["Bathe (1996)", "Seções 2, 4, 5, 7 e 8. Elementos finitos e Newton–Raphson.", "BATHE, Klaus-Jürgen. Finite element procedures. Englewood Cliffs: Prentice Hall, 1996."],
    ["Kaviany (1995)", "Seção 1. Média em meio poroso. Não substitui a medida do leito.", "KAVIANY, Massoud. Principles of heat transfer in porous media. 2. ed. New York: Springer, 1995."],
    ["Patankar (1980)", "Seção 2, só como contraste. Não é o método deste commit.", "PATANKAR, Suhas V. Numerical heat transfer and fluid flow. New York: Hemisphere, 1980."],
    ["USGS (2026) e ANM (2025)", "Seção 11. Preços de commodity já usados na dissertação.", "UNITED STATES GEOLOGICAL SURVEY. Mineral commodity summaries: sand and gravel (industrial). 2026. AGÊNCIA NACIONAL DE MINERAÇÃO. Anuário mineral brasileiro. Brasília: ANM, 2025."]
  ];
  s.append(grid("Tabela 12.1 — Onde cada obra entra", ["Obra", "Uso neste memorial", "Referência"], refs, false));
  return s;
}

function figMap(pack) {
  const plate = el("div", "plate");
  const hem = pack.byKey.hematita;
  const temps = [];
  for (const key of pack.keys) for (const v of pack.byKey[key].frames.at(-1).T) temps.push(v);
  const tmin = Math.min(...temps);
  const tmax = Math.max(...temps);
  const mesh = hem.mesh;
  const W = 980;
  const H = 460;
  const s = svg(W, H, "Mapa térmico dos três substratos");
  s.append(sEl("rect", { x: 0, y: 0, width: W, height: H, fill: "#0e1a2b" }));
  const gap = 12;
  const pw = (W - 36 - gap * 2) / 3;
  pack.keys.forEach((key, idx) => {
    const st = pack.byKey[key];
    const frame = st.frames.at(-1);
    const x0 = 28 + idx * (pw + gap);
    drawField(s, st.mesh, frame.T, tmin, tmax, x0, 28, pw, H - 56, INK[key], st.core.name);
  });
  s.append(sEl("text", { x: 28, y: 18, fill: "#f8fafc", "font-size": 12 }, "T de " + num(tmin, 0) + " °C a " + num(tmax, 0) + " °C  ·  z cresce para cima  ·  r = 0 no centro"));
  plate.append(s);
  plate.append(el("p", "caption", "Figura 13.1 — Mapa térmico (r, z) no fim do horizonte. O retângulo claro é o núcleo. A escala é a mesma para os três. Fonte: o autor, nesta execução."));
  return plate;
}

function drawField(s, mesh, T, tmin, tmax, x0, y0, w, h, color, name) {
  const rMax = mesh.rEdges[mesh.nr];
  const zMax = mesh.zEdges[mesh.nz];
  const pad = { l: 36, r: 8, t: 16, b: 28 };
  const aw = w - pad.l - pad.r;
  const ah = h - pad.t - pad.b;
  const sc = Math.min(aw / (2 * rMax), ah / zMax);
  const mw = 2 * rMax * sc;
  const mh = zMax * sc;
  const ox = x0 + pad.l + (aw - mw) / 2;
  const oy = y0 + pad.t;
  const xr = (r) => ox + (r + rMax) * sc;
  const yz = (z) => oy + (zMax - z) * sc;
  for (const item of mesh.elements) {
    let t = 0;
    for (const n of item.n) t += T[n];
    t /= 4;
    const x1 = xr(mesh.rEdges[item.i]);
    const x2 = xr(mesh.rEdges[item.i + 1]);
    const y1 = yz(mesh.zEdges[item.j]);
    const y2 = yz(mesh.zEdges[item.j + 1]);
    const rw = Math.max(Math.abs(x2 - x1), 0.4);
    const rh = Math.max(Math.abs(y2 - y1), 0.4);
    s.append(sEl("rect", { x: Math.min(x1, x2), y: Math.min(y1, y2), width: rw, height: rh, fill: heat(t, tmin, tmax) }));
    const xl = xr(-mesh.rEdges[item.i]);
    const xr2 = xr(-mesh.rEdges[item.i + 1]);
    s.append(sEl("rect", { x: Math.min(xl, xr2), y: Math.min(y1, y2), width: Math.max(Math.abs(xr2 - xl), 0.4), height: rh, fill: heat(t, tmin, tmax) }));
  }
  s.append(sEl("rect", { x: xr(-mesh.R), y: yz(mesh.zCoreTop), width: 2 * mesh.R * sc, height: (mesh.zCoreTop - mesh.zCore0) * sc, fill: "none", stroke: "#f8fafc", "stroke-width": 1.4 }));
  s.append(sEl("text", { x: x0 + 4, y: y0 + 12, fill: color, "font-size": 13, "font-weight": 700 }, name));
  const rTicks = niceTicks(-rMax, rMax, 4);
  const zTicks = niceTicks(0, zMax, 4);
  s.append(sEl("text", { x: ox + mw / 2, y: oy + mh + 22, fill: "#e2e8f0", "font-size": 10, "text-anchor": "middle" }, "r (m)"));
  rTicks.forEach((r) => {
    const x = xr(r);
    if (x < ox - 2 || x > ox + mw + 2) return;
    s.append(sEl("text", { x, y: oy + mh + 12, fill: "#e2e8f0", "font-size": 9, "text-anchor": "middle" }, num(r, 1)));
  });
  zTicks.forEach((z) => {
    s.append(sEl("text", { x: ox - 4, y: yz(z) + 3, fill: "#e2e8f0", "font-size": 9, "text-anchor": "end" }, num(z, 0)));
  });
  s.append(sEl("text", { x: x0 + 12, y: oy + mh / 2, fill: "#e2e8f0", "font-size": 10, transform: "rotate(-90 " + (x0 + 12) + " " + (oy + mh / 2) + ")" }, "z (m)"));
}

function figCharge(pack) {
  const plate = el("div", "plate");
  const W = 880;
  const H = 340;
  const s = svg(W, H, "Energia e temperatura da base");
  s.append(sEl("rect", { x: 0, y: 0, width: W, height: H, fill: "#ffffff" }));
  let emax = 1;
  let tbMax = 80;
  let tmax = 1;
  for (const key of pack.keys) {
    const st = pack.byKey[key];
    tmax = Math.max(tmax, st.days * 24);
    for (const p of st.curve) {
      emax = Math.max(emax, p.E / 1e9);
      tbMax = Math.max(tbMax, p.Tb, st.tlim);
    }
  }
  emax *= 1.12;
  tbMax *= 1.15;
  const pad = { l: 58, r: 52, t: 36, b: 40 };
  const w = W - pad.l - pad.r;
  const h = H - pad.t - pad.b;
  const X = (t) => pad.l + (t / tmax) * w;
  const Y = (e) => pad.t + (1 - e / emax) * h;
  const Yt = (tv) => pad.t + (1 - tv / tbMax) * h;
  niceTicks(0, tmax, 6).forEach((t) => {
    s.append(sEl("line", { x1: X(t), y1: pad.t, x2: X(t), y2: pad.t + h, stroke: "#e2e8f0" }));
    s.append(sEl("text", { x: X(t), y: pad.t + h + 16, "text-anchor": "middle", "font-size": 11, fill: "#1e293b" }, num(t, 0)));
  });
  niceTicks(0, emax, 5).forEach((e) => {
    s.append(sEl("line", { x1: pad.l, y1: Y(e), x2: pad.l + w, y2: Y(e), stroke: "#e2e8f0" }));
    s.append(sEl("text", { x: pad.l - 6, y: Y(e) + 4, "text-anchor": "end", "font-size": 11, fill: "#1e293b" }, num(e, 0)));
  });
  niceTicks(0, tbMax, 4).forEach((tv) => {
    s.append(sEl("text", { x: pad.l + w + 6, y: Yt(tv) + 4, "font-size": 11, fill: "#9d174d" }, num(tv, 0)));
  });
  const tlim = pack.byKey.hematita.tlim;
  s.append(sEl("line", { x1: pad.l, y1: Yt(tlim), x2: pad.l + w, y2: Yt(tlim), stroke: "#9d174d", "stroke-dasharray": "5 4" }));
  s.append(sEl("text", { x: pad.l + 6, y: Yt(tlim) - 4, fill: "#9d174d", "font-size": 11 }, "limite " + num(tlim, 0) + " °C"));
  pack.keys.forEach((key, i) => {
    const st = pack.byKey[key];
    let dE = "";
    let dT = "";
    st.curve.forEach((p, k) => {
      dE += (k ? "L" : "M") + X(p.tH).toFixed(2) + " " + Y(p.E / 1e9).toFixed(2) + " ";
      dT += (k ? "L" : "M") + X(p.tH).toFixed(2) + " " + Yt(p.Tb).toFixed(2) + " ";
    });
    s.append(sEl("path", { d: dE, fill: "none", stroke: INK[key], "stroke-width": 2.2 }));
    s.append(sEl("path", { d: dT, fill: "none", stroke: INK[key], "stroke-width": 1.4, "stroke-dasharray": "4 3" }));
    s.append(sEl("text", { x: pad.l + i * 140, y: 18, fill: INK[key], "font-size": 13, "font-weight": 700 }, st.core.name));
  });
  s.append(sEl("text", { x: 16, y: pad.t + h / 2, fill: "#1e293b", "font-size": 11, transform: "rotate(-90 16 " + (pad.t + h / 2) + ")" }, "E (GJ)"));
  s.append(sEl("text", { x: W - 14, y: pad.t + h / 2, fill: "#9d174d", "font-size": 11, transform: "rotate(90 " + (W - 14) + " " + (pad.t + h / 2) + ")" }, "T base (°C)"));
  s.append(sEl("text", { x: pad.l + w / 2, y: H - 8, "text-anchor": "middle", "font-size": 12, fill: "#1e293b" }, "t (h)  ·  contínua = energia do núcleo  ·  tracejada = T da base"));
  plate.append(s);
  plate.append(el("p", "caption", "Figura 13.2 — Energia do núcleo e temperatura da base. A linha rosa é o limite. Fonte: o autor, nesta execução."));
  return plate;
}

function figNewton(pack) {
  const plate = el("div", "plate");
  const W = 880;
  const H = 300;
  const s = svg(W, H, "Convergência de Newton");
  s.append(sEl("rect", { x: 0, y: 0, width: W, height: H, fill: "#ffffff" }));
  let n = 1;
  const logs = [];
  for (const key of pack.keys) {
    n = Math.max(n, pack.byKey[key].newtonHist.length);
    for (const v of pack.byKey[key].newtonHist) logs.push(Math.log10(Math.max(v, 1e-16)));
  }
  let lo = Math.min(...logs);
  let hi = Math.max(...logs);
  if (hi - lo < 0.4) { hi += 0.2; lo -= 0.2; }
  const pad = { l: 58, r: 16, t: 32, b: 40 };
  const w = W - pad.l - pad.r;
  const h = H - pad.t - pad.b;
  const X = (i) => pad.l + (n === 1 ? w / 2 : (i / (n - 1)) * w);
  const Y = (v) => pad.t + (hi - v) / (hi - lo) * h;
  niceTicks(1, n, 5).forEach((it) => {
    s.append(sEl("text", { x: X(it - 1), y: pad.t + h + 16, "text-anchor": "middle", "font-size": 11, fill: "#1e293b" }, String(Math.round(it))));
  });
  niceTicks(lo, hi, 5).forEach((v) => {
    s.append(sEl("line", { x1: pad.l, y1: Y(v), x2: pad.l + w, y2: Y(v), stroke: "#e2e8f0" }));
    s.append(sEl("text", { x: pad.l - 6, y: Y(v) + 4, "text-anchor": "end", "font-size": 11, fill: "#1e293b" }, num(v, 1)));
  });
  pack.keys.forEach((key, i) => {
    const hist = pack.byKey[key].newtonHist;
    let d = "";
    hist.forEach((v, k) => {
      const x = X(k);
      const y = Y(Math.log10(Math.max(v, 1e-16)));
      d += (k ? "L" : "M") + x.toFixed(2) + " " + y.toFixed(2) + " ";
      s.append(sEl("circle", { cx: x, cy: y, r: 3.5, fill: INK[key] }));
    });
    s.append(sEl("path", { d, fill: "none", stroke: INK[key], "stroke-width": 2 }));
    const p = pack.byKey[key].newtonOrder;
    s.append(sEl("text", { x: pad.l + i * 180, y: 18, fill: INK[key], "font-size": 13, "font-weight": 700 }, pack.byKey[key].core.name + "  p = " + (p == null ? "—" : num(p, 3))));
  });
  s.append(sEl("text", { x: 16, y: pad.t + h / 2, "font-size": 11, fill: "#1e293b", transform: "rotate(-90 16 " + (pad.t + h / 2) + ")" }, "log10 ||R||"));
  s.append(sEl("text", { x: pad.l + w / 2, y: H - 8, "text-anchor": "middle", "font-size": 12, fill: "#1e293b" }, "iteração de Newton no passo de maior resíduo inicial"));
  plate.append(s);
  plate.append(el("p", "caption", "Figura 13.3 — Decaimento de ||R||. p é a ordem nos três últimos resíduos desse passo. Fonte: o autor, nesta execução."));
  return plate;
}

function figLoss(pack) {
  const plate = el("div", "plate");
  const hem = pack.byKey.hematita;
  const top = facePack("top", hem);
  const base = facePack("base", hem);
  const W = 880;
  const H = 320;
  const s = svg(W, H, "Resistências e perdas");
  s.append(sEl("rect", { x: 0, y: 0, width: W, height: H, fill: "#ffffff" }));
  const colors = ["#fdba74", "#7dd3fc", "#86efac", "#cbd5e1"];
  function stackBar(x, y, packU, title) {
    const parts = packU.rows.map((r) => r.R).concat([packU.Rconv]);
    const names = packU.rows.map((r) => r.name).concat(["1/h"]);
    const sum = parts.reduce((a, b) => a + b, 0);
    const width = 280;
    let cursor = x;
    parts.forEach((part, i) => {
      const dw = width * part / sum;
      s.append(sEl("rect", { x: cursor, y, width: Math.max(dw, 0.5), height: 28, fill: colors[i % colors.length], stroke: "#0f172a" }));
      if (dw > 36) s.append(sEl("text", { x: cursor + dw / 2, y: y + 18, "text-anchor": "middle", "font-size": 10, fill: "#0f172a" }, num(part, 2)));
      cursor += dw;
    });
    s.append(sEl("text", { x, y: y - 6, "font-size": 12, fill: "#1e293b", "font-weight": 700 }, title + "  R'' = " + num(sum, 3) + "  U = " + num(1 / sum, 5)));
    s.append(sEl("text", { x, y: y + 46, "font-size": 10, fill: "#334155" }, names.join("  ·  ")));
  }
  stackBar(40, 48, top, "Topo e lateral");
  stackBar(40, 130, base, "Base");
  const maxQ = Math.max(...pack.keys.map((k) => pack.byKey[k].balance.Qout / 1e9), 1e-6);
  pack.keys.forEach((key, i) => {
    const q = pack.byKey[key].balance.Qout / 1e9;
    const bh = 120 * q / (maxQ * 1.15);
    const x = 520 + i * 90;
    s.append(sEl("rect", { x, y: 210 - bh, width: 48, height: bh, fill: INK[key] }));
    s.append(sEl("text", { x: x + 24, y: 200 - bh, "text-anchor": "middle", "font-size": 11, fill: "#1e293b" }, num(q, 3)));
    s.append(sEl("text", { x: x + 24, y: 228, "text-anchor": "middle", "font-size": 11, fill: INK[key] }, pack.byKey[key].core.name.split(" ")[0]));
  });
  s.append(sEl("text", { x: 520, y: 256, "font-size": 12, fill: "#1e293b" }, "Perda externa acumulada (GJ)"));
  plate.append(s);
  plate.append(el("p", "caption", "Figura 13.4 — Resistência equivalente por face e perda externa integrada. O número dentro da faixa é R'' da camada, em m²·K/W. Fonte: o autor, nesta execução."));
  return plate;
}

function figVolume(pack) {
  const plate = el("div", "plate");
  const a = volumeCompare(volumeSpec(pack, true));
  const b = volumeCompare(volumeSpec(pack, false));
  const W = 880;
  const H = 320;
  const s = svg(W, H, "Volumes com e sem estratégia");
  s.append(sEl("rect", { x: 0, y: 0, width: W, height: H, fill: "#ffffff" }));
  const vmax = Math.max(...a.rows.map((r) => r.V), ...b.rows.map((r) => r.V)) * 1.18;
  const pad = { l: 64, r: 16, t: 36, b: 48 };
  const slot = (W - pad.l - pad.r) / 3;
  const h = H - pad.t - pad.b;
  const Y = (v) => pad.t + (1 - v / vmax) * h;
  niceTicks(0, vmax, 5).forEach((v) => {
    s.append(sEl("line", { x1: pad.l, y1: Y(v), x2: W - pad.r, y2: Y(v), stroke: "#e2e8f0" }));
    s.append(sEl("text", { x: pad.l - 6, y: Y(v) + 4, "text-anchor": "end", "font-size": 11, fill: "#1e293b" }, num(v, 0)));
  });
  a.rows.forEach((r, i) => {
    const x = pad.l + i * slot + 18;
    const bw = 36;
    const yA = Y(r.V);
    const yB = Y(b.rows[i].V);
    s.append(sEl("rect", { x, y: yA, width: bw, height: pad.t + h - yA, fill: "#94a3b8" }));
    s.append(sEl("rect", { x: x + bw + 8, y: yB, width: bw, height: pad.t + h - yB, fill: INK[r.key] }));
    s.append(sEl("text", { x: x + bw / 2, y: yA - 4, "text-anchor": "middle", "font-size": 10, fill: "#1e293b" }, num(r.pct, 1) + "%"));
    s.append(sEl("text", { x: x + bw + 8 + bw / 2, y: yB - 4, "text-anchor": "middle", "font-size": 10, fill: "#1e293b" }, num(b.rows[i].pct, 1) + "%"));
    s.append(sEl("text", { x: x + bw, y: H - 16, "text-anchor": "middle", "font-size": 12, fill: "#1e293b" }, r.name.split(" ")[0]));
  });
  s.append(sEl("rect", { x: pad.l, y: 12, width: 14, height: 10, fill: "#94a3b8" }));
  s.append(sEl("text", { x: pad.l + 18, y: 21, "font-size": 12, fill: "#1e293b" }, "A · mesmo ΔT, 150 a 573 °C"));
  s.append(sEl("rect", { x: pad.l + 250, y: 12, width: 14, height: 10, fill: "#c2410c" }));
  s.append(sEl("text", { x: pad.l + 268, y: 21, "font-size": 12, fill: "#1e293b" }, "B · teto próprio"));
  s.append(sEl("text", { x: 16, y: pad.t + h / 2, "font-size": 11, fill: "#1e293b", transform: "rotate(-90 16 " + (pad.t + h / 2) + ")" }, "V (m³)"));
  plate.append(s);
  plate.append(el("p", "caption", "Figura 13.5 — Volume para a mesma energia de referência. O percentual é em relação à areia de cada cenário. Fonte: o autor, nesta execução."));
  return plate;
}

function sec13(pack) {
  const s = section(13, "Figuras");
  s.append(el("p", "after", "As figuras abaixo são SVG gerado pelos números desta execução. Não são as capturas do PDF de 4 de novembro."));
  s.append(figMap(pack));
  s.append(figCharge(pack));
  s.append(figNewton(pack));
  s.append(figLoss(pack));
  s.append(figVolume(pack));
  return s;
}

export function renderMemorial(root, pack) {
  root.replaceChildren();
  root.append(
    headerBlock(pack),
    sec0(pack), sec1(pack), sec2(pack), sec3(pack), sec4(pack), sec5(pack),
    sec6(pack), sec7(pack), sec8(pack), sec9(pack), sec10(pack), sec11(pack),
    sec12(), sec13(pack)
  );
  typeset(root);
}
