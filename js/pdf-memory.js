import { FORMULAS } from "./formulas.js";

export function saveMemory(state) {
  const jsPDF = window.jspdf && window.jspdf.jsPDF;
  if (!jsPDF) { window.alert("jsPDF não carregou."); return; }
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const m = 14;
  let y = 16;
  const line = (t, size = 10) => {
    doc.setFont("times", "normal");
    doc.setFontSize(size);
    const parts = doc.splitTextToSize(t, 182);
    if (y + parts.length * 5 > 285) { doc.addPage(); y = 16; }
    doc.text(parts, m, y);
    y += parts.length * 5 + 1.5;
  };
  line("Memória de cálculo — demonstrador SAET (Galerkin)", 14);
  line("XV CBPE / PPGEE-UFPI. Não é o código Python da dissertação.", 11);
  line("Núcleo: " + state.core.name + " | ρ_sólido = " + state.core.rhoSolid + " kg/m³ | ρ_leito = " + state.core.rho.toFixed(1) + " kg/m³ | cp = " + state.core.cp + " J/(kg·K) | k = " + state.core.k + " W/(m·K) | ε = " + state.core.eps);
  line("Modo de malha: " + state.mode + ". Elementos " + state.mesh.nr + " × " + state.mesh.nz + ". Menor elemento de camada: " + (state.mesh.minLayerM == null ? "não se aplica (resistência equivalente)" : state.mesh.minLayerM.toFixed(3) + " m") + ".");
  line("Passo de tempo Δt = " + state.dtHours + " h (" + (state.dtHours * 3600) + " s). Δt é o incremento do Euler implícito, não uma diferença de temperatura. Horizonte = " + state.days + " d (" + state.steps + " passos).");
  line("T_carga = " + state.Tcharge + " °C (resistiva, Robin no topo do núcleo). h_injeção = " + state.hTop + " W/(m²·K). h_ext = " + state.hExt + ".");
  if (state.mode === "equivalente") {
    line("U_topo = " + state.Utop.toExponential(3) + " | U_lateral = " + state.Ulat.toExponential(3) + " | U_base = " + state.Ubase.toExponential(3) + " W/(m²·K), com 1/U = Σ e/k + 1/h_ext.");
  }
  line("α = " + state.alpha.toExponential(3) + " m²/s | √(α t_horizonte) = " + state.depth.toFixed(3) + " m | Bi(h_topo, R/2, k) = " + state.biot.toFixed(2) + ".");
  line("E útil até o limite da termoclina = " + (state.eUseful / 1e9).toFixed(3) + " GJ. Fim da termoclina: " + (state.tBreak == null ? "não ocorreu no horizonte" : state.tBreak.toFixed(1) + " h") + ".");
  line("Solver do último passo: Gauss–Seidel, " + state.lastHist.length + " iterações, ‖R‖ final = " + state.lastHist[state.lastHist.length - 1].toExponential(3) + ", razão ‖R‖_m+1/‖R‖_m = " + (state.lastRate == null ? "—" : state.lastRate.toFixed(3)) + ". Taxa linear. Não é convergência quadrática de Newton–Raphson.");
  y += 2;
  line("Fórmulas usadas", 12);
  for (const f of FORMULAS) line(f.title + ": " + f.expr + "  [" + f.ref + "]");
  line("Carga sem escoamento de gás no leito. O sCO2 de um ciclo futuro não entra neste domínio.");
  doc.save("Memoria_SAET_Galerkin_PPGEE_UFPI.pdf");
}
