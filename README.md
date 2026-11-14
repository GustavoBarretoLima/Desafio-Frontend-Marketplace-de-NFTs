# KURIO — Marketplace de NFTs

Aplicação frontend do desafio da Jungle. A interface responsiva segue como referência o protótipo do Figma e permite simular a compra de NFTs, do catálogo ao recibo.

## Executar localmente

Use Node.js 22 e npm. Na pasta do projeto, execute:

```powershell
npm ci
npm run dev
```

Abra a URL exibida pelo Vite no terminal. Os mocks já ficam ativos no modo de desenvolvimento. Para entrar com a conta de demonstração, use o e-mail `teste@test.com` e a senha `teste`. O cupom `KURIO10` pode ser aplicado no carrinho.

## Fluxos implementados

- **Catálogo e detalhes** com busca, disponibilidade, ordenação e paginação na URL, galeria com ampliação e seleção de edição e quantidade.
- **Conta do colecionador** com cadastro, login, edição de perfil e carteiras, troca de senha e favoritos por conta.
- **Carrinho e checkout** com atualização de quantidade, cupom, conexão simulada da carteira, revisão da cotação e envio do pedido.
- **Acompanhamento do pedido** com simulação de aprovação ou recusa, recibo e tratamento de alterações de estoque em tempo real.

## Stack

React, TypeScript, Vite e Tailwind CSS. O TanStack Router controla as rotas e os filtros na URL. O TanStack Query gerencia o cache das requisições feitas por Axios. O MSW simula a API e os eventos em tempo real usados pelo cliente Socket.IO. As operações da demonstração rodam no navegador e o pagamento é simulado.

## Build e testes

```powershell
npm run lint
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

O Playwright executa os fluxos nos projetos desktop e mobile. Para abrir o relatório após a execução, use `npx playwright show-report`.

Para conferir o build de demonstração com os mocks ativos:

```powershell
npm run build:demo
npm run preview
```

## Regressão visual

As imagens de referência em `tests/visual.spec.ts-snapshots/` foram geradas com Google Chrome no Windows. O Playwright usa os viewports desktop (1440 × 900) e mobile (390 × 844).

```powershell
$env:PLAYWRIGHT_CHANNEL = "chrome"
npm run test:e2e -- tests/visual.spec.ts --update-snapshots=none
```

Use `--update-snapshots` para atualizar as imagens após revisar uma mudança visual intencional.

## Auditoria Lighthouse

Com o Google Chrome instalado, execute `npm run audit:lighthouse`. O comando verifica os tipos, gera o build com MSW no cenário padrão e abre o preview local na porta 4173. Se o Chrome estiver em um caminho diferente, defina `CHROME_PATH` com o caminho do executável.

O script mede a Home e o detalhe do Emerald Ape três vezes por perfil, em mobile e desktop. Cada execução grava relatórios HTML e JSON em `lighthouse-reports/`, além de um `summary.json` com as medianas das pontuações, LCP, CLS e TBT.

## Cenários dos mocks

Defina a variável antes de iniciar o Vite. Em PowerShell, por exemplo, use `$env:VITE_MOCK_NFT_UPDATE = "true"` e execute `npm run dev`. Reinicie o servidor após alterar as variáveis.

| Variável | Efeito |
| --- | --- |
| `VITE_ENABLE_MOCKS=true` | Inclui o MSW no build para demonstração. No modo dev ele já está ativo. |
| `VITE_MOCK_NFT_UPDATE=true` | Atualiza o Emerald Ape após 20 segundos da primeira conexão e emite `nft.updated`. Adicione duas unidades antes do evento para testar a invalidação da cotação. |
| `VITE_MOCK_ORDER_TIMEOUT=true` | Atrasa a resposta do primeiro envio após gravar o pedido. Use **Tentar envio novamente** para recuperar o mesmo pedido. |
| `VITE_MOCK_FAVORITES_FAILURE=true` | Retorna HTTP 503 ao alterar favoritos e permite conferir a reversão do estado otimista. |
| `VITE_E2E_SCENARIOS=true` | Habilita controles de teste para falha de catálogo, repetição de eventos e desconexão simulada. O Playwright define a variável automaticamente. |

Para testar um cupom expirado, use `KURIOEXPIRADO`. Na página de acompanhamento, escolha **Simular aprovação** ou **Simular recusa** para verificar os resultados. Para testar duas contas, cadastre uma segunda conta fictícia e alterne com o login de demonstração.

Para restaurar o cenário inicial, abra uma janela anônima nova ou limpe os dados do site do endereço local no navegador e recarregue. Isso remove os dados simulados desse endereço, incluindo contas, carrinhos e pedidos. Encerre o Vite e remova a variável do cenário, por exemplo com `Remove-Item Env:VITE_MOCK_NFT_UPDATE`, para voltar à configuração padrão.

## Execução da suíte completa no Windows

```powershell
$env:PLAYWRIGHT_CHANNEL = "chrome"
$env:PLAYWRIGHT_BASE_PORT = "5265"
npm run test:e2e -- --update-snapshots=none --workers=2
```

`PLAYWRIGHT_BASE_PORT` é opcional. Escolha uma porta livre seguida de outras três portas livres. O valor padrão é 5185. O Playwright inicia quatro servidores com cenários e caches isolados. O relatório HTML fica em `playwright-report/` e os traces das falhas ficam em `test-results/`.

## Preparação da publicação

Importe o repositório na Vercel. O `vercel.json` define o build de demonstração, a pasta `dist/` e o fallback das rotas do aplicativo. Após publicar, confira acesso direto e recarga das rotas, login fictício, carrinho, checkout, recibo e eventos no navegador. A entrega inclui a URL pública e o link do repositório.

Consulte [ARCHITECTURE.md](ARCHITECTURE.md) para os contratos da API e as decisões de implementação.

## Referências

- [Enunciado oficial](https://github.com/junglegaming/frontend-challenge)
- [Figma do desafio](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1)
