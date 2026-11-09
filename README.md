# SAET · Demonstrador 2D axissimétrico · XV CBPE / PPGEE-UFPI

> **Papel deste repositório:** protótipo **web de demonstração** para o XV Congresso Brasileiro de Planejamento Energético (XV CBPE, 2026).  
> **Não constitui** o código-fonte integral da tese nem o simulador de referência em Python/SciPy.

**Demo pública:** https://engrocha1.github.io/saet-forma-canonica/

---

## 1. O que este site é

Ferramenta **didática e interativa** para visualizar, no navegador:

- o campo \(T(r,z,t)\) em corte diametral de um reservatório cilíndrico (SAET / bateria de Carnot);
- a malha estruturada no domínio composto (núcleo de hematita + envelope isolante);
- a convergência do residual e a curva de carga com critério de integridade da termoclina;
- a geração de uma **memória de cálculo** em PDF para discussão no congresso.

Objetivo: **comunicação e verificação conceitual** das condições de contorno e da física do artigo — não substituir a plataforma computacional completa da pesquisa.

## 2. O que este site não é

| Afirmação do artigo (§2.11) | Neste demonstrador |
|----------------------------|-------------------|
| MEF Galerkin com matrizes **C** e **K** | Discretização por **volumes finitos** estruturados (residual por VC) |
| Newton–Raphson com Jacobiana esparsa SciPy | Iteração tipo Newton com **aproximação diagonal** (Jacobi) |
| Python + NumPy + SciPy (LIL/CSR) | **JavaScript** no navegador (GitHub Pages) |
| Matplotlib / Plotly | Canvas HTML5 |

A implementação **robusta** (MEF Galerkin, matrizes esparsas, solver Newton completo) integra o **projeto de tese** (PPGEE-UFPI) e permanece em repositório de trabalho, ainda **não disponibilizado publicamente**.

## 3. Modelo físico (alinhado ao artigo)

Equação no domínio axissimétrico:

ρ⋅Cp⋅∂T/∂t=1/r  ∂/∂r  (r⋅k⋅∂T/∂r)+∂/∂z(k⋅∂T/∂z)

| Item | Configuração do demonstrador |
|------|------------------------------|
| Malha | Estruturada **uniforme** \(\Delta r\), \(\Delta z\) no domínio composto |
| Materiais | Hematita (núcleo) + IFB / perlita / silicato / vermiculita (envelope) |
| \(k\) de face | Média **harmônica** nas interfaces |
| CCs | **Neumann** em \(r=0\) · **Robin** (injeção no topo do núcleo; perdas no contorno externo) |
| Tempo | Euler **implícito** |
| Nonlinearidade | Iterações sobre o residual de energia (queda de \(\|R\|\)) |

Parâmetros geométricos e termofísicos são editáveis na interface (incl. `materiais.json`).

## 4. Interface

- Campo \(T\) no plano \((r,z)\) e vista esquemática de ½/¾ de cilindro (casca externa = isolante)
- Botões **Setas q** e **Números T** (exibição opcional, para não poluir a figura)
- Horizonte em **dias**, curva de carga \(E(t)\), limite de termoclina (\(T_{\mathrm{base}}\))
- Terminal com \(\sqrt{\alpha t}\), Fo, interface núcleo–isolante
- **Memória de Cálculo (PDF):** temperaturas nodais amostradas, residual por iteração e diagonal de \(J\)

## 5. Como citar / como apresentar

**Uso recomendado na oral ou no slide:**

> Demonstrador interativo 2D elaborado para o XV CBPE. A implementação completa em Python/SciPy (MEF Galerkin, Jacobiana esparsa) integra o projeto de tese e ainda não está em repositório público.

**Citação sugerida do demonstrador:**

> ROCHA, T. D.; LIRA, M. A. T. *SAET — demonstrador 2D axissimétrico* (XV CBPE / PPGEE-UFPI), 2026. Disponível em: https://engrocha1.github.io/saet-forma-canonica/

## 6. Autoria e afiliação

| | |
|--|--|
| **Autor** | Tarcísio Dias da Rocha — mestrando, PPGEE-UFPI |
| **Orientador** | Prof. Dr. Marcos Antônio Tavares Lira — DEE / UFPI |
| **Evento** | XV CBPE — 04 a 06 de novembro de 2026 |
| **Trabalho** | Otimização geométrica, econômica e termofísica para SAET |

## 7. Licença e uso

Código deste repositório destinado a **fins acadêmicos de demonstração** no âmbito do XV CBPE e do PPGEE-UFPI. Reprodução com crédito aos autores. Resultados quantitativos definitivos devem reportar-se à implementação de referência da tese, quando publicada.
