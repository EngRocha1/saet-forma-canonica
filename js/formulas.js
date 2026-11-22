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
    title: "Newton–Raphson",
    expr: "R(T) = C/Δt (T − T_antigo) + K T − b + R_rad(T). J δ = −R.",
    ref: "Bathe (2014). J inclui ∂(εσT^4)/∂T. Jδ = −R é resolvido por eliminação de Gauss em banda, não por Gauss–Seidel."
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
    ref: "Incropera et al. (2014), parede composta em série. É conferência da pilha. A malha não é substituída por esse U."
  },
  {
    id: "robin",
    title: "Contorno com radiação",
    expr: "−k ∂T/∂n = h (T − T∞) + ε σ [(T+273,15)^4 − (T∞+273,15)^4]",
    ref: "Dissertação. σ = 5,67×10⁻⁸. ε é dado de contorno. A base enterrada não leva o termo em T^4."
  },
  {
    id: "energia",
    title: "Energia no núcleo",
    expr: "E = ∫_núcleo ρ_leito cp (T − T0) 2π r dr dz",
    ref: "Balanço de energia no volume do leito. Não inclui o isolante."
  },
  {
    id: "potencia",
    title: "Potência da carga resistiva",
    expr: "P = ∫_topo h (T_carga − T) 2π r dr",
    ref: "Robin no topo do núcleo. Em t = 0, com T = T0, P = h (T_carga − T0) π R². Não é potência contratada de usina."
  },
  {
    id: "balanco",
    title: "Balanço do domínio",
    expr: "∫ P dt = E_domínio + ∫ (q_conv + q_rad) dA dt + resíduo numérico",
    ref: "E_domínio inclui núcleo e isolamento. E do gráfico é só o núcleo. A base não irradia; troca com T_solo por convecção."
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

export function seriesBreakdown(layers, hExt) {
  const rows = layers.map((layer) => ({
    name: layer.name,
    e: layer.e,
    k: layer.k,
    R: layer.e / Math.max(layer.k, 1e-12)
  }));
  const Rcond = rows.reduce((sum, row) => sum + row.R, 0);
  const Rconv = 1 / Math.max(hExt, 1e-12);
  const Rtot = Rcond + Rconv;
  return { rows, Rcond, Rconv, Rtot, U: 1 / Rtot };
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
