# SAET · 2D axissimétrico · XV CBPE / PPGEE-UFPI

Laboratório do campo **T(r, z, t)** em ¼ de cilindro (bateria de Carnot / SAET).

**Demo:** https://engrocha1.github.io/saet-forma-canonica/

## Modelo

- EDP cilíndrica axissimétrica: ρCp ∂T/∂t = (1/r)∂/∂r(r k ∂T/∂r) + ∂/∂z(k ∂T/∂z)
- Malha FV centrada (padrão **5 × 10 = 50 nós**), R = 6 m, L = 12 m
- Neumann em r = 0 · Robin em r = R, z = 0 e z = L
- Euler implícito + Newton–Raphson (sistema global N×N)
- Histórico completo de ‖R‖ por iteração e resíduos por nó

## Interface

- Campo 2D com setas de fluxo (−k∇T), Play/Pause, slider temporal
- Gráfico de convergência Newton e mapa de |Rᵢ|
- **Memória de Cálculo (PDF)** com todos os passos de Newton armazenados
- Controles de n_r e n_z

## Autoria

- **Autor:** Tarcísio Dias da Rocha — mestrando PPGEE-UFPI
- **Orientador:** Prof. Dr. Marcos Antônio Tavares Lira — DEE/UFPI
- **Congresso:** XV CBPE (04–06 nov 2026)
