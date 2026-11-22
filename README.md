# SAET · demonstrador Galerkin · XV CBPE / PPGEE-UFPI

Página: https://engrocha1.github.io/saet-forma-canonica/

Este repositório é o demonstrador de navegador usado na qualificação. Não é o código Python da dissertação. A equação resolvida aqui é a condução axissimétrica, com k, ρ e cp constantes, carga resistiva no topo do núcleo e perdas nas faces externas. Não há escoamento de gás, não há modelo de Schumann e não há fator de condutividade.

## O que a tela declara

| Controle | Default | Papel |
| --- | --- | --- |
| R, L | 6 m, 12 m | Núcleo. h = 2r só neste default |
| Δt | 2 h | Passo do Euler implícito, em horas na tela e em segundos na matriz |
| T de carga | 1 000 °C | Temperatura do Robin de injeção, não um limite de liga |
| h de injeção | 100 W/(m²·K) | Não é potência contratada |
| h externo | 10 W/(m²·K) | Convecção nas faces externas |
| T ambiente | 37 °C | Topo e lateral |
| T do solo | 25 °C | Base, só convecção. A base não irradia |
| T inicial | 25 °C | Sólido inteiro em t = 0. A energia usa este T0 |
| ε de radiação | 0,80 | Topo e lateral. σ = 5,67×10⁻⁸ |
| ε de leito | 0,40 | ρ_leito = (1 − ε) ρ_sólido |
| Areia / alumina / hematita | 2 650 / 3 970 / 5 150 kg/m³ | Sólido. O leito fica em 1 590 / 2 382 / 3 090 |
| cp | 885 / 1 000 / 800 J/(kg·K) | Constantes. Não há cp(T) |
| k do núcleo | 1,2 W/(m·K) | Valor do controle. Não é k de cristal e não é multiplicador |
| Isolantes | IFB 0,15; perlita 0,051; silicato 0,059; vermiculita 0,065 | Constantes de catálogo. k(T) não está implementado |

Cada subcamada de isolamento tem dois elementos, mesmo no mínimo do controle. O núcleo é graduado: o primeiro intervalo na face quente é de 5 cm.

## Equação

ρ cp ∂T/∂t = (1/r) ∂/∂r (r k ∂T/∂r) + ∂/∂z (k ∂T/∂z)

A forma fraca usa o peso r. O eixo tem fluxo nulo natural. O avanço é

(C/Δt + K) T^{n+1} = (C/Δt) T^n + b

A radiação torna o resíduo não linear. A Jacobiana leva 4εσ(T+273,15)³. Jδ = −R sai por eliminação de Gauss em banda. Não há Gauss–Seidel e não há atualização só pela diagonal.

A ordem escrita no gráfico usa os três últimos resíduos do passo de maior resíduo inicial. No default, a hematita dá 1,978. Em Δt = 0,5 h o mesmo estimador dá cerca de 1,6, porque o passo fica menos não linear. A ordem temporal, perto de 0,8, é a do Euler implícito, não a de Newton.

## O que os números do default dizem

Caso R = 6 m, L = 12 m, 4 dias, Δt = 2 h, ε = 0,40, carga a 1 000 °C.

A potência inicial do Robin é h (T_carga − T0) π R² = 11,027 MW. No fim do horizonte ela cai para cerca de 0,20 MW na hematita. Nenhuma das duas é potência de usina: a primeira é o fluxo com o sólido ainda frio; a segunda é o que ainda entra quando o topo já esquentou.

A energia do núcleo, ∫ ρ cp (T − T0) dV, fica em 94,9879 GJ na areia, 123,5888 GJ na alumina e 125,8906 GJ na hematita. A base permanece a 25 °C. A isoterma de 80 °C da hematita está a 1,271 m da face quente. √(αt) da hematita é 0,410 m. Não há termoclina transportada por gás.

O balanço do domínio, no mesmo caso, fecha assim para a hematita: ∫P dt = 141,540 GJ, energia do núcleo mais o isolamento = 140,663 GJ, perdas nas faces externas = 0,902 GJ. O resíduo fica em 0,02% de ∫P dt, porque a integral usa o fluxo no fim de cada passo. A energia desenhada no gráfico é só a do núcleo. Não se soma perda lateral “como maior parcela” sem ler o quadro de perdas daquele instante.

O volume isotérmico, 150 °C a 573 °C, deixa a hematita com 56,92% do volume da areia. Com teto próprio, areia a 573 °C e hematita a 1 000 °C, a hematita fica com 28,33%. 573 °C é a inversão α–β do quartzo. 540 °C e 575 °C não são usados. 73,94% não é um resultado deste código.

## O que este repositório não faz

Não dimensiona curtailment, não lê o ONS e não calcula R$/kWh. Não recalcula h = 2r com U diferente em cada face: o U de topo e de lateral, neste default, é 0,084006 W/(m²·K) e o da base é 0,057914 W/(m²·K). Não há ensaio de hematita, não há k(T) e não há rendimento eletricidade–eletricidade. O ciclo de potência não entra no leito.

Um build anterior deste mesmo endereço usava volumes finitos, iteração só na diagonal e um fator axial. Esse fator não existe neste código. Quem ler um PDF antigo da memória de cálculo não está lendo este commit.

## Pastas

| Arquivo | Responsabilidade |
| --- | --- |
| `index.html` | Marcação e controles |
| `css/app.css` | Aparência |
| `js/formulas.js` | Relações, sem estado |
| `js/materials.js` | Três núcleos e isolantes |
| `js/mesh.js` | Malha com nó em cada camada |
| `js/galerkin.js` | C, K, Newton, eliminação, energia, potência e perdas |
| `js/simulate.js` | Os três substratos, o tempo e o balanço |
| `js/profiles.js` | Eixo, parede e base, lidos dos nós |
| `js/charts.js` | Canvas. Não monta matriz |
| `js/memory.js` | Fórmula, substituição, resultado |
| `js/volume.js` | Comparação de volume |
| `js/animate.js` | Play. Não calcula física |
| `js/ui.js` | Liga o controle ao cálculo |
| `materiais.json` | Valores de partida |

## Citação

ROCHA, T. D.; LIRA, M. A. T. SAET — demonstrador Galerkin 2D (XV CBPE / PPGEE-UFPI), 2026. https://engrocha1.github.io/saet-forma-canonica/
