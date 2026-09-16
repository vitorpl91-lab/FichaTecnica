# Como publicar — Sisteminha de Ficha Técnica (Home Burger)

Três peças, nessa ordem: **Planilha → Apps Script → GitHub Pages**.

---

## 1. Criar a planilha

1. Crie uma planilha nova no Google Sheets (pode deixar em branco, nome que quiser — ex: "Home Burger — Ficha Técnica").
2. Copie o **ID da planilha**: é o trecho da URL entre `/d/` e `/edit`.
   `https://docs.google.com/spreadsheets/d/`**`ESSE_TRECHO_AQUI`**`/edit`

---

## 2. Configurar o Apps Script (o "servidor")

1. Na própria planilha: menu **Extensões → Apps Script**.
2. Apague o conteúdo padrão do `Código.gs` e cole o conteúdo do arquivo `Code.gs` deste projeto.
3. No topo do código, troque:
   ```js
   var SHEET_ID = 'COLE_AQUI_O_ID_DA_SUA_PLANILHA';
   ```
   pelo ID que você copiou no passo 1.
4. Salve (ícone de disquete ou `Ctrl+S`).
5. No menu de funções (barra superior do editor, ao lado do ícone de rodar ▶), selecione **`configurarPlanilha`** e clique em **Executar**.
   - Na primeira vez, o Google vai pedir autorização — aceite (é a sua própria planilha).
   - Isso cria as 4 abas (`Insumos`, `FichaTecnica`, `FichaIngredientes`, `Configuracoes`) já com os cabeçalhos certos e as duas linhas iniciais de Custo Fixo (15%) e Despesa Variável (8%) em `Configuracoes`. Você pode ajustar esses dois valores depois direto pelo app, na tela de Configurações.
6. Publicar como Web App: **Implantar → Nova implantação**.
   - Tipo: **App da Web**.
   - Executar como: **Eu** (sua conta).
   - Quem tem acesso: **Qualquer pessoa** (necessário para o front-end no GitHub Pages conseguir chamar — não expõe a planilha publicamente, só os endpoints que o `Code.gs` define).
   - Clique em **Implantar** e copie a **URL do app da Web** (termina em `/exec`).

> Sempre que você editar o `Code.gs` depois, salvar sozinho **não** atualiza essa URL publicada — é preciso ir em **Implantar → Gerenciar implantações → editar (ícone de lápis) → Nova versão → Implantar** de novo.

---

## 3. Ligar o front-end na URL do Apps Script

1. Abra o arquivo `index.html` deste projeto.
2. Encontre a linha (perto do topo do `<script>`):
   ```js
   var API_BASE_URL = 'COLE_AQUI_A_URL_DO_SEU_APPS_SCRIPT';
   ```
3. Troque pela URL que você copiou no passo 2.6 (a que termina em `/exec`).
4. Salve o arquivo.

---

## 4. Publicar no GitHub Pages

1. Crie um repositório novo no GitHub (pode ser privado ou público).
2. Suba o `index.html` (com a URL já colada) para a raiz do repositório. Não precisa subir o `Code.gs` nem este `COMO-PUBLICAR.md` — mas não custa nada manter os três juntos no repo para referência futura.
3. Vá em **Settings → Pages** do repositório.
4. Em **Source**, escolha a branch principal (`main`) e a pasta `/ (root)`.
5. Salve. Em alguns minutos o GitHub mostra a URL pública (algo como `https://seu-usuario.github.io/nome-do-repo/`).
6. Abra essa URL — é o sisteminha rodando de verdade, lendo e gravando na sua planilha.

---

## O que esperar

- Ao abrir o app, ele carrega os dados da planilha (tela de "Carregando…"). Se aparecer um erro ali, quase sempre é a `API_BASE_URL` errada ou o deploy do Apps Script sem acesso liberado — revise o passo 2.6.
- Qualquer edição (preço, ficha, ingrediente, configurações) atualiza a tela na hora e agenda uma gravação na planilha cerca de 1 segundo depois — o texto no topo da Ficha Técnica mostra "Alterações pendentes… / Salvando… / Salvo na planilha".
- **Não edite a planilha manualmente enquanto usa o app** — a forma como o `Code.gs` grava (reescreve as abas inteiras a cada salvamento) sobrescreveria uma edição manual feita entre uma gravação e outra. Para consultar os dados, abrir e ler a planilha é seguro a qualquer momento — só não edite direto nela.
- Cada vez que você mudar o `index.html` (visual, novo ajuste etc.), é só subir o arquivo atualizado pro GitHub de novo — o GitHub Pages republica sozinho.
