# Arquitetura do KURIO

## Aplicação e transporte

React e TypeScript renderizam a interface. Vite empacota o frontend. A estilização combina Tailwind e CSS compartilhado. TanStack Router organiza as rotas, seus parâmetros de busca e o retorno do login aos fluxos protegidos. TanStack Query gerencia o cache e o ciclo das requisições REST feitas via Axios. O MSW intercepta as chamadas no navegador com `mockServiceWorker.js` e simula o transporte WebSocket usado pelo cliente Socket.IO.

## Contratos REST

Os caminhos abaixo têm prefixo `/api`. Os handlers em `src/mocks/` são a referência para os formatos e erros. Valores em ETH trafegam como strings decimais. As quantidades são inteiras e os cálculos de valores usam inteiros em wei.

| Recurso | Operações e comportamento |
| --- | --- |
| Catálogo | `GET /nfts` recebe `q`, `sort`, `availability`, `view`, `collection`, `network`, `minPrice`, `maxPrice` e `page`. `GET /nfts/:id` retorna o NFT e suas edições, ou 404. `GET /nfts/featured`, `/nfts/sidebar-featured`, `/nfts/collection-highlights` e `/nfts/related` alimentam os destaques e recomendações. |
| Conta e sessão | `POST /accounts` cadastra uma conta com e-mail e senha. `POST /session` autentica, `GET /session` retorna `user` e `expiresAt` e `DELETE /session` encerra a sessão. A ausência ou expiração retorna 401 nas operações protegidas. |
| Perfil e carteiras | `GET /profile` consulta os dados, `PATCH /profile` atualiza o perfil e o avatar, e `PUT /profile/password` altera a senha. `GET /wallets` lista as carteiras e suas redes, `PUT /wallets/:id` cadastra ou atualiza um endereço e seus metadados, e `POST /wallet-connection` simula a autorização com `walletId`, `networkId` e `approved`. |
| Favoritos | `GET /favorites` consulta os IDs. `PUT /favorites/:id` inclui o NFT, e `DELETE /favorites/:id` remove. |
| Carrinho | `GET /cart` retorna itens, cupom e totais. `POST /cart/items` inclui um NFT com edição e quantidade. `PATCH /cart/items/:nftId/:editionId` muda a quantidade e `DELETE` no mesmo caminho remove a edição. `PUT /cart/coupon` aplica um código, e `DELETE /cart/coupon` o remove. |
| Cotação e pedido | `POST /checkout/quote` retorna a cotação recalculada ou rejeita indisponibilidade. `POST /orders` recebe `walletId`, `networkId`, `reviewedQuote` e uma observação opcional. A chave `Idempotency-Key` identifica a tentativa. `GET /orders/:id` retorna o pedido, e `POST /orders/:id/payment` recebe `approved` para simular seu resultado. |

## Sessão, carrinho e cache

O mock guarda a sessão no navegador com ID de usuário e expiração. Senhas cadastradas ou alteradas são derivadas com PBKDF2 e salt. A credencial de demonstração é fictícia. Favoritos, perfil, carteiras e pedidos usam chaves separadas por usuário. O carrinho anônimo é migrado para a conta no login. Após aprovação, o mock remove do carrinho apenas as unidades compradas. Uma recusa preserva os itens.

O catálogo usa os filtros da URL na chave da consulta. Mudanças de filtro reiniciam a paginação. As consultas encaminham o sinal de cancelamento ao Axios quando o recurso aceita cancelamento. Login e logout cancelam e limpam consultas ligadas à conta. Os favoritos usam atualização otimista com reversão se a requisição falhar. Falhas recuperáveis na interface oferecem uma nova tentativa.

O pedido guarda a cotação aprovada, a carteira, a rede e o resultado. A API compara a cotação revisada com o estado atual antes de criar o pedido. A tentativa usa uma chave de idempotência preservada em `sessionStorage`. Se a primeira resposta expirar após gravar o pedido, o reenvio recupera o mesmo registro. O recibo usa o snapshot salvo no pedido.

## Socket.IO e reconciliação

O MSW simula o handshake e as mensagens de aplicação em `/kurio-realtime`. Os eventos carregam `eventId`, `version` e o identificador do recurso.

| Evento | Reação da interface |
| --- | --- |
| `nft.updated` | Descarta versões iguais ou anteriores à última vista para o NFT. Invalida catálogo, detalhe e carrinho e avisa sobre a alteração. Uma cotação anterior deixa de habilitar a confirmação. |
| `order.updated` | Filtra pelo ID do pedido e pela versão. Consulta novamente o pedido e o carrinho. O mock restringe o evento à sessão que acompanha o pedido. |

Ao reconectar, o cliente reconsulta os recursos ativos via REST. Os componentes removem seus listeners e desconectam o socket ao desmontar. A assinatura privada do pedido também observa o ciclo da sessão. O transporte simulado existe para reproduzir os fluxos no navegador, com dados locais por origem.

## Interface e limites da demonstração

A navegação compacta permanece ativa abaixo de 700 px. O rodapé permite que as carteiras quebrem linha em telas estreitas. No recibo simulado, **Ver no Etherscan** aparece desabilitado, pois o identificador `sim-…` é local. Os fluxos usam carteiras e pagamentos fictícios. O diálogo de login usa o elemento nativo `dialog` para foco e fechamento por teclado.

Os arquivos de referência do Playwright foram capturados no Chrome para Windows. A auditoria Lighthouse mede Home e detalhe, três vezes por perfil, com o build otimizado e os mocks ativos.
