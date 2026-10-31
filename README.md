# Forma canônica — SAET (XV CBPE / PPGEE-UFPI)

Laboratório estático da equação de difusão transiente 1D usada no armazenamento térmico em leito fixo (bateria de Carnot / SAET).

**Demo (GitHub Pages):** https://engrocha1.github.io/saet-forma-canonica/

## O que a página mostra

Campo `T(z, t)` produzido por:

- discretização espacial axial (volumes finitos / Galerkin)
- Euler implícito no tempo
- condição de **Robin** no topo e na base (sem Dirichlet)
- **Newton–Raphson** com Jacobiana tridiagonal quando `k = k(T)`
- painel direito: log de residual, gráfico de convergência quadrática, amostra de **J**, matrizes **Ke** e **Ce**, dados do artigo e da UFPI

## Regimes

1. **Condução no sólido** (hematita, sílica). Em 12 m a penetração `√(αt)` fica na ordem de dezenas de centímetros em dois dias. A base permanece fria — isso é física, não bug.
2. **Leito regenerativo** (Schumann, uma temperatura): `∂T/∂t + u ∂T/∂z = α ∂²T/∂z²`. A termoclina atravessa o leito porque há advecção.

## Artigo de referência (XV CBPE)

- Título: *Otimização geométrica, econômica e termofísica para sistemas de armazenamento de energia térmica (SAET)*
- Autor: **Tarcísio Dias da Rocha** (mestrando PPGEE-UFPI)
- Orientador: **Prof. Dr. Marcos Antônio Tavares Lira** (Professor Associado, DEE/UFPI)
- Congresso: XV CBPE, 04–06 novembro 2026
- Caso de referência no texto: R = 6 m, H = 12 m (h = 2r), hematita, T₀ = 25 °C, carga 1000 °C no nó 0, ar 37 °C, solo 25 °C; CCs Robin + Neumann em r = 0 por simetria

## Uso

Abra `index.html` localmente ou a URL do GitHub Pages. Nenhum build é necessário.
