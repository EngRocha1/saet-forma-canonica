# Forma canônica — SAET

Laboratório estático da equação de difusão transiente 1D usada no armazenamento térmico em leito fixo (bateria de Carnot / SAET).

O que está desenhado é o campo `T(z, t)` produzido por:

- discretização espacial em volumes finitos ao longo da altura
- Euler implícito no tempo
- condição de Robin no topo e na base (sem Dirichlet)
- Newton–Raphson com Jacobiana tridiagonal quando `k = k(T)`

Dois regimes:

1. **Condução no sólido** (hematita, sílica). Em 12 m a penetração `√(αt)` fica na ordem de dezenas de centímetros em dois dias. A base permanece fria.
2. **Leito regenerativo** (Schumann, uma temperatura): `∂T/∂t + u ∂T/∂z = α ∂²T/∂z²`. A termoclina atravessa o leito porque há advecção.

Abra `index.html`. No GitHub Pages a mesma página é a raiz do repositório.

Autores do modelo físico de referência: Tarcísio Dias da Rocha, Marcos Antônio Tavares Lira (PPGEE/UFPI).
