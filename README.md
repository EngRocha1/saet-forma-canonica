# SAET · demonstrador Galerkin · XV CBPE / PPGEE-UFPI

Demo: https://engrocha1.github.io/saet-forma-canonica/

Protótipo de navegador para a qualificação no PPGEE-UFPI. Não é o código Python/SciPy da dissertação (lá k e cp podem depender de T e o solver da tese é outro). Este repositório implementa, em JavaScript, a forma fraca de Galerkin da mesma equação de difusão.

## O que mudou em relação ao demonstrador anterior

| Antes | Agora |
| --- | --- |
| Volumes finitos e fator axial `keff` (1 a 80) | Sem `keff`. Galerkin Q1, massa consistente |
| Malha uniforme: 15 cm de IFB cabiam numa célula de ~1 m | Modo **refinada**: 2 elementos em cada subcamada (15 cm → dois de 7,5 cm) |
| Isolante só desenhado | Modo **resistência equivalente**: `1/U = Σ(e/k) + 1/h` (Incropera et al., 2014) |
| Rótulo “Newton” e convergência quadrática | Gauss–Seidel. O gráfico é `log‖R‖` do solver **linear**. A razão `‖R‖_{m+1}/‖R‖_m` fica no terminal |
| `Δt` parecia diferença de temperatura | Caixa própria: **Δt é o passo de tempo do Euler implícito** |
| Um único arquivo | `css/` e `js/` separados |

## Pastas

| Arquivo | Responsabilidade |
| --- | --- |
| `index.html` | Marcação |
| `css/app.css` | Aparência, foco, contraste, layout |
| `js/formulas.js` | Todas as relações usadas, sem estado |
| `js/materials.js` | Areia, alumina, hematita, isolantes, ε |
| `js/mesh.js` | Malha refinada ou domínio só do núcleo |
| `js/galerkin.js` | Matrizes C e K, Euler implícito, Gauss–Seidel, energia |
| `js/simulate.js` | Laço no tempo e termoclina |
| `js/charts.js` | Canvas |
| `js/animate.js` | Play, pausa e progresso. Não calcula física |
| `js/pdf-memory.js` | Memória de cálculo |
| `js/ui.js` | Liga os controles ao cálculo |
| `materiais.json` | k dos isolantes e ρ, cp de referência |

A média harmônica de face não é reaplicada. No Galerkin, cada elemento tem o seu k e a continuidade de fluxo na interface fica na forma fraca (Özisik, 1993; Bathe, 2014).

## Equação e tempo

ρ cp ∂T/∂t = (1/r) ∂/∂r (r k ∂T/∂r) + ∂/∂z (k ∂T/∂z)

O passo Δt entra só aqui:

(C/Δt + K) T^{n+1} = (C/Δt) T^n + b

Δt é lido em horas na tela e convertido a segundos na matriz. Não é um salto de temperatura.

## Materiais

ρ_leito = (1 − ε) ρ_sólido, com ε = 0,40 na abertura (dissertação, Eq. 2).

| Núcleo | ρ sólido | cp | Fonte na dissertação |
| --- | ---: | ---: | --- |
| Areia de sílica | 2650 kg/m³ | 885 J/(kg·K) | §10.2.1, Incropera et al. (2014) |
| Alumina calcinada | 3970 kg/m³ | 1000 J/(kg·K) | §10.2.2 |
| Hematita | 5150 kg/m³ | 800 J/(kg·K) | §10.2.3 |

k inicial 1,2 W/(m·K) é o valor efetivo do leito no controle, não a condutividade do cristal e não um multiplicador.

A carga é resistiva (Robin no topo do núcleo). Não há escoamento de gás no leito.

## Gráfico de resíduo

Permanece porque mostra se o sistema linear de cada passo foi resolvido. Não é convergência quadrática: k, ρ e cp são constantes dentro do passo, então Newton–Raphson não tem o que fazer. O texto da figura diz isso.

## Citação

ROCHA, T. D.; LIRA, M. A. T. SAET — demonstrador Galerkin 2D (XV CBPE / PPGEE-UFPI), 2026. https://engrocha1.github.io/saet-forma-canonica/
