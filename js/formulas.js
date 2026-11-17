/** Fórmulas usadas no demonstrador. Nenhuma é um fator oculto. */

export const FORMULAS = [
  {
    id: "edp",
    title: "Difusão axissimétrica",
    expr: "ρ cp ∂T/∂t = (1/r) ∂/∂r (r k ∂T/∂r) + ∂/∂z (k ∂T/∂z)",
    ref: "Dissertação, Eq. (19); Incropera et al. (2014); Özisik (1993)"
  },
  {
    id: "fraca",
    title: "Forma fraca de Galerkin",
    expr: "∫ Ni ρ cp (∂T/∂t) r dA + ∫ k ∇Ni · ∇T r dA = ∫_Γ Ni h (Tref − T) r dℓ",
    ref: "Özisik (1993); Bathe (2014). O fluxo nulo em r = 0 é natural."
  },
  {
    id: "euler",
    title: "Euler implícito",
    expr: "(C/Δt + K) T^{n+1} = (C/Δt) T^n + b(Tref)",
    ref: "Bathe (2014). Δt é o passo de tempo, em horas na interface e em segundos na matriz."
  },
  {
    id: "solver",
    title: "Solver linear",
    expr: "C concentrada por soma de linha. Gauss–Seidel em (C/Δt + K). Taxa linear.",
    ref: "Bathe (2014), massa concentrada. Evita temperatura negativa quando a frente é mais fina que o elemento. Não é Newton–Raphson."
  },
  {
    id: "eps",
    title: "Densidade de leito",
    expr: "ρ_leito = (1 − ε) ρ_sólido",
    ref: "Dissertação, Eq. (2), ε = 0,40. O controle nasce nesse valor e pode ser movido."
  },
  {
    id: "alpha",
    title: "Difusividade",
    expr: "α = k / (ρ_leito cp)",
    ref: "Özisik (1993). k é o valor do controle, sem multiplicador."
  },
  {
    id: "frente",
    title: "Ordem da frente por condução",
    expr: "δ ~ √(α t)",
    ref: "Incropera et al. (2014), sólido semi-infinito. É ordem de grandeza, não a solução do cilindro."
  },
  {
    id: "U",
    title: "Resistência equivalente da camada",
    expr: "1/U = Σ (e_i / k_i) + 1/h_ext",
    ref: "Incropera et al. (2014), parede composta em série. Usada só no modo resistência equivalente."
  },
  {
    id: "robin",
    title: "Contorno de Robin",
    expr: "−k ∂T/∂n = h (T − Tref)",
    ref: "Incropera et al. (2014); Çengel e Ghajar (2020). Carga resistiva: Tref = T_carga no topo do núcleo."
  },
  {
    id: "energia",
    title: "Energia no núcleo",
    expr: "E = ∫_núcleo ρ_leito cp (T − T0) 2π r dr dz",
    ref: "Balanço de energia no volume do leito. Não inclui o isolante."
  },
  {
    id: "biot",
    title: "Número de Biot",
    expr: "Bi = h Lc / k",
    ref: "Incropera et al. (2014). Bi > 0,1 afasta o modelo concentrado. Lc mostrado = R/2."
  }
];

export function harmonicFace(k1, k2) {
  if (k1 <= 0 || k2 <= 0) return 0;
  return 2 / (1 / k1 + 1 / k2);
}

export function bedDensity(rhoSolid, eps) {
  const e = Math.min(0.95, Math.max(0, eps));
  return (1 - e) * rhoSolid;
}

export function diffusivity(k, rho, cp) {
  return k / Math.max(rho * cp, 1e-30);
}

export function conductionDepth(alpha, tSeconds) {
  return Math.sqrt(Math.max(alpha, 0) * Math.max(tSeconds, 0));
}

export function seriesU(layers, hExt) {
  let R = 0;
  for (const layer of layers) R += layer.e / Math.max(layer.k, 1e-12);
  R += 1 / Math.max(hExt, 1e-12);
  return 1 / R;
}

export function biot(h, Lc, k) {
  return (h * Lc) / Math.max(k, 1e-12);
}
