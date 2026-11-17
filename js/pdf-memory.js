import { buildMemory } from "./memory.js";

export function saveMemory(state) {
  const jsPDF = window.jspdf && window.jspdf.jsPDF;
  if (!jsPDF) { window.alert("jsPDF não carregou."); return; }
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const text = buildMemory(state).split("\n");
  let y = 16;
  doc.setFont("times", "normal");
  doc.setFontSize(11);
  for (const raw of text) {
    const parts = doc.splitTextToSize(raw.length ? raw : " ", 182);
    if (y + parts.length * 5 > 285) { doc.addPage(); y = 16; }
    doc.text(parts, 14, y);
    y += raw.length ? parts.length * 5 + 1.2 : 2;
  }
  doc.save("Memoria_SAET_Galerkin_PPGEE_UFPI.pdf");
}
