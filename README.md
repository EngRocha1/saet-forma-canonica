# SAET · demonstrador Galerkin · XV CBPE / PPGEE-UFPI

Demo: https://engrocha1.github.io/saet-forma-canonica/

Protótipo de navegador para a qualificação no PPGEE-UFPI. Não é o código Python/SciPy da dissertação (lá k e cp podem depender de T e o solver da tese é outro). Este repositório implementa, em JavaScript, a forma fraca de Galerkin da mesma equação de difusão.

O sistema linear de cada correção de Newton é resolvido por eliminação de Gauss em banda. A ordem escrita no gráfico usa os três últimos resíduos, não a primeira queda. Areia, alumina e hematita entram em todos os gráficos. A memória traz R″ = e/k de cada camada de isolamento, a soma e o U.

## Volume dos três substratos

O primeiro gráfico compara areia, alumina e hematita para a mesma energia. Areia = 100%. Com a caixa isotérmica marcada, os três usam 150 °C a 573 °C. Desmarcada, cada um tem T mín e T máx. A areia não passa de 573 °C (inversão α–β do quartzo, 847 K). 575 °C não é o default. Alumina e hematita param em 1 000 °C.

## Discretização

Quadriláteros bilineares, integral 2×2 de Gauss com peso r. O núcleo usa n_r e n_z. Cada subcamada de isolamento tem sempre dois elementos, mesmo no mínimo dos controles.

## Newton–Raphson

A radiação εσ(T+273,15)⁴ torna o resíduo não linear. A Jacobiana leva a derivada 4εσ(T+273,15)³. O gráfico de resíduo é essa norma, não a do Gauss–Seidel. O Gauss–Seidel só resolve Jδ = −R e a taxa dele continua linear.

A ordem 2 é assintótica. No primeiro passo o campo sai de 25 °C, longe da raiz, e as primeiras quedas não precisam ser quadráticas. A memória lista ‖R‖ iteração a iteração.

## Convergência temporal

Na janela de 4 Δt a sonda do eixo é comparada em Δt, Δt/2 e Δt/4. A ordem observada fica ao lado do valor 1 do Euler implícito.

## Gráficos

| Figura | Leitura |
| --- | --- |
| Cilindro | r de −R_ext a +R_ext, z em metros, escala real. Detalhe do topo à parte |
| Perdas | kW na face interna de cada material |
| Energia | t (h) e E (GJ) no núcleo |
| Newton | log10 ‖R‖ por iteração |
| Tempo | erro da sonda contra o Δt mais fino |

Cada figura tem grade e coordenadas numéricas.

| Figura | Eixo horizontal | Eixo vertical |
| --- | --- | --- |
| Campo | r (m), do eixo até a face externa | z (m), da base até o topo |
| Energia | t (h) | E (GJ), só no núcleo |
| Resíduo | iteração m do Gauss–Seidel | log10 da norma do resíduo |

A cor do campo vai da menor temperatura do quadro à maior, com marcas em °C. Um valor negativo nesse eixo era oscilação numérica: o elemento do núcleo (cerca de 1,5 m) era mais grosso que a frente √(αt). O núcleo agora é graduado, com o primeiro intervalo de 5 cm no topo quente, e a massa é concentrada por soma de linha (Bathe, 2014).

## Memória de cálculo

Abaixo dos gráficos e no PDF, cada passo segue a ordem: fórmula, substituição dos números, resultado, referência. A referência não aparece antes do valor. Δt entra em segundos como `Δt_h × 3600`.

## O que mudou em relação ao demonstrador anterior

| Antes | Agora |
| --- | --- |
| Volumes finitos e fator axial `keff` (1 a 80) | Sem `keff`. Galerkin Q1 com massa concentrada (soma de linha) |
| Malha uniforme: 15 cm de IFB cabiam numa célula de ~1 m | Camadas com 2 elementos. Núcleo graduado: 5 cm no topo quente |
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
