import { FORMULAS } from "./formulas.js";
import { SOLIDS, INSULATORS, applyJson, coreProps } from "./materials.js";
import { simulate } from "./simulate.js";
import { drawField, drawCharge, drawResidual } from "./charts.js";
import { createPlayer } from "./animate.js";
import { saveMemory } from "./pdf-memory.js";

const $ = (id) => document.getElementById(id);
let state = null;

const player = createPlayer({
  draw(i) {
    if (!state) return;
    const frame = state.frames[i];
    drawField($("c-field"), state, frame);
    $("v-prog").textContent = frame.tH.toFixed(1) + " h";
    $("prog").value = String(Math.round(100 * i / Math.max(state.frames.length - 1, 1)));
    $("s-tmax").textContent = frame.Tt.toFixed(1) + " °C";
    $("s-tbase").textContent = frame.Tb.toFixed(1) + " °C";
  },
  onPlay(playing) { $("btn-play").textContent = playing ? "Pausa" : "Play"; }
});

function num(id) { return +$(id).value; }

function readInput() {
  const key = $("core-sel").value;
  const sliders = {
    areia: { k: num("ka"), rho: num("ra"), cp: num("cpa") },
    alumina: { k: num("kal"), rho: num("ral"), cp: num("cpal") },
    hematita: { k: num("kh"), rho: num("rh"), cp: num("cph") }
  };
  const eps = num("eps");
  return {
    mode: $("mode-sel").value,
    R: num("R"),
    L: num("L"),
    nCoreR: num("nr"),
    nCoreZ: num("nz"),
    days: num("days"),
    dtHours: num("dt"),
    tlim: num("tlim"),
    Tcharge: num("tc"),
    hTop: num("ht"),
    hExt: num("hext"),
    core: coreProps(key, sliders[key], eps),
    thick: {
      e1: num("e1") / 100, e2: num("e2") / 100, e3: num("e3") / 100,
      eb1: num("eb1") / 100, eb2: num("eb2") / 100, eb3: num("eb3") / 100
    },
    kIns: {
      ifb: num("ki"), perlita: num("kp"), silicato: num("ks"), vermiculita: num("kv")
    },
    solids: sliders,
    eps
  };
}

function updateLabels() {
  $("v-R").textContent = $("R").value + " m";
  $("v-L").textContent = $("L").value + " m";
  $("v-days").textContent = $("days").value + " d";
  $("v-dt").textContent = $("dt").value + " h";
  $("v-tlim").textContent = $("tlim").value + " °C";
  $("v-tc").textContent = $("tc").value + " °C";
  $("v-ht").textContent = $("ht").value;
  $("v-hext").textContent = $("hext").value;
  $("v-eps").textContent = (+$("eps").value).toFixed(2);
  ["e1","e2","e3","eb1","eb2","eb3"].forEach((id) => { $("v-" + id).textContent = $(id).value + " cm"; });
  ["ka","kal","kh","ki"].forEach((id) => { $("v-" + id).textContent = (+$(id).value).toFixed(2); });
  ["kp","ks","kv"].forEach((id) => { $("v-" + id).textContent = (+$(id).value).toFixed(3); });
  ["ra","ral","rh","cpa","cpal","cph"].forEach((id) => { $("v-" + id).textContent = $(id).value; });
  const dt = $("dt").value;
  $("dt-callout").textContent = "Δt = " + dt + " h é o passo de tempo do Euler implícito. Cada passo avança o relógio em " + dt + " h. Não é ΔT de temperatura.";
}

function comparison(input) {
  const lines = ["Capacidade do leito, mesma ε = " + input.eps.toFixed(2) + ". O campo desenhado é só o núcleo selecionado."];
  for (const key of ["areia", "alumina", "hematita"]) {
    const c = coreProps(key, input.solids[key], input.eps);
    lines.push(c.name + ": ρ_s " + c.rhoSolid + " · ρ_leito " + c.rho.toFixed(0) + " · cp " + c.cp + " · k " + c.k.toFixed(2));
  }
  $("cmp-box").textContent = lines.join("\n");
}

function terminal(input) {
  const m = state.mesh;
  const layer = m.minLayerM == null ? "camadas fora da malha (U equivalente)" : "menor Δ de camada = " + m.minLayerM.toFixed(3) + " m";
  const rate = state.lastRate == null ? "—" : state.lastRate.toFixed(3);
  $("term-log").textContent = [
    "Galerkin Q1 · Euler implícito · Gauss–Seidel",
    "modo " + state.mode + " · elementos " + m.nr + "×" + m.nz + " · " + layer,
    "Δt = " + state.dtHours + " h · passos = " + state.steps + " · horizonte = " + state.days + " d",
    "α = " + state.alpha.toExponential(3) + " m²/s · √(αt) = " + state.depth.toFixed(3) + " m",
    "Bi = " + state.biot.toFixed(2) + " (h_topo, Lc=R/2, k do controle)",
    "E_útil = " + (state.eUseful / 1e9).toFixed(3) + " GJ",
    "termoclina: " + (state.tBreak == null ? "intacta no horizonte" : "limite em " + state.tBreak.toFixed(1) + " h"),
    "último passo: ‖R‖ " + state.lastHist[state.lastHist.length - 1].toExponential(2) + " · razão " + rate + " · " + (state.lastConv ? "atingiu a tolerância" : "não atingiu a tolerância"),
    "A razão perto de uma constante indica convergência linear do solver. Não é Newton quadrático."
  ].join("\n");
  $("term-status").textContent = state.lastConv ? "resíduo ok" : "ver resíduo";
}

function run() {
  updateLabels();
  const input = readInput();
  comparison(input);
  $("term-log").textContent = "Calculando…";
  window.setTimeout(() => {
    try {
      state = simulate(input);
      drawCharge($("c-charge"), state);
      drawResidual($("c-res"), state);
      terminal(input);
      player.last(state.frames.length);
      $("s-n").textContent = String(state.mesh.nn);
      $("s-mesh").textContent = state.mesh.nr + "×" + state.mesh.nz;
    } catch (err) {
      console.error(err);
      $("term-log").textContent = "Erro: " + err.message;
    }
  }, 30);
}

function renderFormulas() {
  const root = $("formula-list");
  for (const f of FORMULAS) {
    const art = document.createElement("article");
    art.innerHTML = "<h3></h3><p class='expr'></p><p class='ref'></p>";
    art.querySelector("h3").textContent = f.title;
    art.querySelector(".expr").textContent = f.expr;
    art.querySelector(".ref").textContent = f.ref;
    root.appendChild(art);
  }
}

function bind() {
  const ids = ["R","L","days","dt","tlim","tc","ht","hext","eps","e1","e2","e3","eb1","eb2","eb3","ka","ra","cpa","kal","ral","cpal","kh","rh","cph","ki","kp","ks","kv"];
  for (const id of ids) {
    $(id).addEventListener("input", updateLabels);
    $(id).addEventListener("change", run);
  }
  ["nr","nz","core-sel","mode-sel"].forEach((id) => $(id).addEventListener("change", run));
  $("btn-play").addEventListener("click", () => state && player.toggle(state.frames.length));
  $("btn-reset").addEventListener("click", () => state && player.show(0, state.frames.length));
  $("prog").addEventListener("input", () => state && player.scrub(+$("prog").value / 100, state.frames.length));
  $("btn-pdf").addEventListener("click", () => state && saveMemory(state));
  $("btn-formulas").addEventListener("click", () => $("formula-panel").showModal());
  $("formula-close").addEventListener("click", () => $("formula-panel").close());
}

renderFormulas();
bind();
updateLabels();
fetch("materiais.json").then((r) => r.json()).then(applyJson).catch(() => {}).finally(run);
