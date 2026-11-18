import { FORMULAS } from "./formulas.js";
import { SOLIDS, INSULATORS, applyJson, coreProps } from "./materials.js";
import { simulateAll } from "./simulate.js";
import { drawField, drawCharge, drawResidual, drawLosses, drawTemporal, drawVolume, drawDepth, drawWall, drawBase } from "./charts.js";
import { frontReport } from "./profiles.js";
import { volumeCompare, volumeText, TMAX } from "./volume.js";
import { createPlayer } from "./animate.js";
import { buildTrioMemory } from "./memory.js";
import { saveMemory } from "./pdf-memory.js";

const $ = (id) => document.getElementById(id);
let state = null;

const player = createPlayer({
  draw(i) {
    if (!state || !state.byKey) return;
    const active = state.byKey[state.active];
    const frame = active.frames[Math.min(i, active.frames.length - 1)];
    drawField($("c-field"), state, i);
    drawLosses($("c-loss"), state, i);
    drawDepth($("c-depth"), state, i);
    drawWall($("c-wall"), state, i);
    drawBase($("c-base"), state, i);
    $("v-prog").textContent = frame.tH.toFixed(1) + " h";
    $("prog").value = String(Math.round(100 * i / Math.max(active.frames.length - 1, 1)));
    $("s-tmax").textContent = frame.Tt.toFixed(1) + " °C";
    $("s-tbase").textContent = frame.Tb.toFixed(1) + " °C";
  },
  onPlay(playing) { $("btn-play").textContent = playing ? "Pausa" : "Play"; }
});

function num(id) { return +$(id).value; }

function volumeSpec(input) {
  const solids = {};
  for (const key of ["areia", "alumina", "hematita"]) {
    solids[key] = { name: SOLIDS[key].name, rho: input.solids[key].rho, cp: input.solids[key].cp };
  }
  return {
    eps: input.eps,
    R: input.R,
    L: input.L,
    isothermal: $("iso").checked,
    solids,
    ranges: {
      areia: { tmin: num("areia-tmin"), tmax: num("areia-tmax") },
      alumina: { tmin: num("alumina-tmin"), tmax: num("alumina-tmax") },
      hematita: { tmin: num("hematita-tmin"), tmax: num("hematita-tmax") }
    }
  };
}

function clampTempInputs() {
  for (const key of ["areia", "alumina", "hematita"]) {
    const cap = TMAX[key];
    const tmax = $(key + "-tmax");
    const tmin = $(key + "-tmin");
    if (+tmax.value > cap) tmax.value = String(cap);
    if (+tmin.value < 0) tmin.value = "0";
    if (+tmin.value >= +tmax.value) tmin.value = String(+tmax.value - 1);
  }
}

function paintVolume(input) {
  clampTempInputs();
  $("ranges").hidden = $("iso").checked;
  const pack = volumeCompare(volumeSpec(input));
  drawVolume($("c-vol"), pack);
  const text = volumeText(pack);
  $("vol-box").textContent = text;
  return text;
}

function readInput() {
  const key = $("core-sel").value;
  const sliders = {
    areia: { k: num("ka"), rho: num("ra"), cp: num("cpa") },
    alumina: { k: num("kal"), rho: num("ral"), cp: num("cpal") },
    hematita: { k: num("kh"), rho: num("rh"), cp: num("cph") }
  };
  const eps = num("eps");
  return {
    mode: "refinada",
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
    epsRad: num("epsr"),
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
  $("v-epsr").textContent = (+$("epsr").value).toFixed(2);
  $("v-eps").textContent = (+$("eps").value).toFixed(2);
  ["e1","e2","e3","eb1","eb2","eb3"].forEach((id) => { $("v-" + id).textContent = $(id).value + " cm"; });
  ["ka","kal","kh","ki"].forEach((id) => { $("v-" + id).textContent = (+$(id).value).toFixed(2); });
  ["kp","ks","kv"].forEach((id) => { $("v-" + id).textContent = (+$(id).value).toFixed(3); });
  ["ra","ral","rh","cpa","cpal","cph"].forEach((id) => { $("v-" + id).textContent = $(id).value; });
  const dt = $("dt").value;
  $("dt-callout").textContent = "Δt = " + dt + " h é o passo de tempo do Euler implícito. Cada passo avança o relógio em " + dt + " h. Não é ΔT de temperatura.";
}

function energyReport(pack) {
  const lines = ["Energia armazenada no núcleo, E = ∫ ρ cp (T − T0) 2π r dr dz. O número em joule é o da última linha da curva, sem arredondar para o gráfico."];
  for (const key of pack.keys) {
    const s = pack.byKey[key];
    const frame = s.frames[s.frames.length - 1];
    const r = frontReport(s.mesh, frame.T, s);
    const front = r.zHalf == null ? "a frente não cruza a média topo-base" : "frente (média topo-base) a " + r.zHalf.toFixed(3) + " m da face quente";
    const where = r.zLim == null ? "a isoterma de " + s.tlim.toFixed(1) + " °C não aparece no núcleo" : "a isoterma de " + s.tlim.toFixed(1) + " °C está a " + r.zLim.toFixed(3) + " m da face quente; restam " + r.remaining.toFixed(3) + " m de núcleo abaixo dela";
    const base = r.reached ? "T_base = " + r.Tb.toFixed(3) + " °C e já passou do limite" : "T_base = " + r.Tb.toFixed(3) + " °C e ainda está abaixo do limite";
    lines.push(s.core.name + ": E = " + r.E.toExponential(8) + " J = " + (r.E / 1e9).toFixed(6) + " GJ; T_médio da energia = " + r.Tmean.toFixed(3) + " °C; T_topo = " + r.Tt.toFixed(3) + " °C; " + front + "; " + where + "; " + base);
  }
  return lines.join("\n");
}

function terminal() {
  const lines = ["Três substratos. Jδ = −R por eliminação em banda. A ordem usa os três últimos resíduos."];
  for (const key of state.keys) {
    const s = state.byKey[key];
    const last = s.newtonHist[s.newtonHist.length - 1];
    const e = s.curve[s.curve.length - 1].E / 1e9;
    lines.push(s.core.name + ": p_Newton " + (s.newtonOrder == null ? "—" : s.newtonOrder.toFixed(3)) + " · p_tempo " + (s.temporal.p == null ? "—" : s.temporal.p.toFixed(2)) + " · E " + e.toFixed(2) + " GJ · ‖R‖ " + last.toExponential(2));
  }
  $("term-log").textContent = lines.join("\n");
  const active = state.byKey[state.active];
  const tail = active.newtonHist[active.newtonHist.length - 1];
  $("term-status").textContent = tail < 1e-4 ? "Newton ok" : "ver resíduo";
}

function run() {
  updateLabels();
  const input = readInput();
  $("cmp-box").textContent = "Calculando a energia dos três substratos…";
  const volumeNote = paintVolume(input);
  $("term-log").textContent = "Calculando…";
  window.setTimeout(() => {
    try {
      const cores = {};
      for (const key of ["areia", "alumina", "hematita"]) cores[key] = coreProps(key, input.solids[key], input.eps);
      state = simulateAll(input, cores);
      state.volumeNote = volumeNote;
      const active = state.byKey[state.active];
      drawCharge($("c-charge"), state);
      drawResidual($("c-res"), state);
      drawTemporal($("c-time"), state);
      $("memory-box").textContent = buildTrioMemory(state);
      $("cmp-box").textContent = energyReport(state);
      terminal();
      player.last(active.frames.length);
      $("s-n").textContent = String(active.mesh.nn);
      $("s-mesh").textContent = active.mesh.nr + "×" + active.mesh.nz;
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
  const ids = ["R","L","days","dt","tlim","tc","ht","hext","epsr","eps","e1","e2","e3","eb1","eb2","eb3","ka","ra","cpa","kal","ral","cpal","kh","rh","cph","ki","kp","ks","kv"];
  for (const id of ids) {
    $(id).addEventListener("input", updateLabels);
    $(id).addEventListener("change", run);
  }
  $("iso").addEventListener("change", () => { paintVolume(readInput()); });
  for (const key of ["areia", "alumina", "hematita"]) {
    $(key + "-tmin").addEventListener("change", () => paintVolume(readInput()));
    $(key + "-tmax").addEventListener("change", () => paintVolume(readInput()));
  }
  ["nr","nz","core-sel"].forEach((id) => $(id).addEventListener("change", run));
  $("btn-play").addEventListener("click", () => state && player.toggle(state.byKey[state.active].frames.length));
  $("btn-reset").addEventListener("click", () => state && player.show(0, state.byKey[state.active].frames.length));
  $("prog").addEventListener("input", () => state && player.scrub(+$("prog").value / 100, state.byKey[state.active].frames.length));
  $("btn-pdf").addEventListener("click", () => state && saveMemory(state));
  $("btn-formulas").addEventListener("click", () => $("formula-panel").showModal());
  $("formula-close").addEventListener("click", () => $("formula-panel").close());
}

renderFormulas();
bind();
updateLabels();
fetch("materiais.json").then((r) => r.json()).then(applyJson).catch(() => {}).finally(run);
