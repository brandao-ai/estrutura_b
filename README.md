# Template de site (design da Brandão Engenharia)

Página única estática, sem build: `index.html` + `assets/css/style.css` + `assets/js/`.

## Como usar em outro site
1. Copie esta pasta para o novo repositório.
2. Em `assets/css/style.css`, edite só o bloco `:root`:
   - `--brand-*`, `--accent*`: cores da marca;
   - `--font-head`, `--font-body`: fontes (troque também o link do Google Fonts no HTML);
   - `--flow-<nome>-0..3`: paletas do degradê WebGL (escuro, médio, destaque, brilho);
   - `--glow-colors`: cores das bolinhas dos fundos claros (`r,g,b` separados por `|`);
   - `--tilt-glow`: brilho que segue o mouse nos cartões.
3. Os blocos `.feature--fire/--water/--olive` têm degradê CSS de reserva com as cores fixas; ajuste junto com as paletas.
4. Edite o conteúdo do `index.html`. No formulário, troque `data-whatsapp` e `data-email`.
5. Ao mudar CSS ou JS, aumente o `?v=` nos links.

## Efeitos
- **Degradê de fundo**: `<canvas id="bg-scene">` fixo; aparece nas partes translúcidas (`.hero`, `.section--dark`, `.cta`).
- **Blocos em destaque**: `<canvas class="feature__flow" data-flow="main|fire|water|olive">` dentro de `.feature`.
- **Bolinhas**: criadas sozinhas em toda `.section` que não seja `--dark`.
- **Entrada em 3D, título inclinando e cartões com mouse**: `main.js`. Use `data-reveal` e `data-tilt` para incluir outros elementos.
- "Reduzir movimento" do sistema deixa tudo parado.

## Testar
Abra `index.html` direto no navegador ou use `python3 -m http.server`. Confira em 1366px e 390px, sem rolagem horizontal.
