# Portal de acesso unificado — Delicado Pro

## Serviço 1 — Identidade e autorização

O site e a administração Expo Web compartilham a origem e a sessão PKCE do Supabase Auth. O aplicativo Android/iOS mantém seu armazenamento e fluxo de sessão. Toda nova conta criada por cadastro no site ou no aplicativo começa como cliente. O cadastro cria a identidade no Supabase Auth e o acesso à equipe exige um vínculo ativo concedido por alguém autorizado. No site, contas sem vínculo ativo vão ao Portal do Cliente. Uma pessoa com vínculo ativo pode usar as duas áreas e escolher entre as empresas autorizadas.

O redirecionamento é conveniência de navegação. A autorização continua no banco: `auth.users` identifica a conta, `profiles.user_id` mantém o perfil, `company_members` liga usuários a empresas e `private.role_permissions` define as operações permitidas por papel. A equipe vê o escopo da empresa selecionada e a troca de empresa não concede acesso. As telas do app continuam usando a chave publicável e o JWT da sessão.

O diagnóstico do esquema encontrou `create_company` acessível a qualquer conta com sessão. A migração restringe a criação a proprietários ativos. O primeiro proprietário de uma nova organização precisa ser provisionado por um operador autorizado ou entrar com vínculo estabelecido; isso muda o fluxo antigo de criação autônoma para usuários novos. Proprietários existentes mantêm acesso e podem criar outra empresa. Convites administrativos só podem ser emitidos por perfis com a permissão correspondente, nunca criam um proprietário e exigem token de uso único, prazo e e-mail confirmado do destinatário. A autoridade de quem convidou é conferida no aceite.

## Serviço 2 — Portal do Cliente

| Rota | Funcionalidade |
| --- | --- |
| `/login`, `/cadastro` | Entrada, cadastro e recuperação no Supabase Auth |
| `/cliente` | Resumo de solicitações, propostas pendentes e próximos eventos |
| `/cliente/orcamentos`, `/cliente/orcamentos/:id` | Busca, estágio do atendimento, materiais, histórico e propostas vinculadas |
| `/cliente/propostas` | Valores e condições, decisões, histórico e download do PDF |
| `/cliente/eventos`, `/cliente/perfil` | Eventos confirmados, dados cadastrais, senha e encerramento de sessão |

`website_requests.customer_id` identifica a conta proprietária da solicitação. Os cadastros operacionais em `clients` continuam isolados por empresa e não se tornam credenciais. A ligação entre solicitação, orçamento e proposta passa por `quotes.source_request_id`, pela empresa correspondente e pela identidade autenticada. As consultas do cliente retornam uma seleção explícita de campos comerciais; custos e preço interno dos materiais ficam no ambiente da empresa. Resposta pelo portal e por link individual usa o mesmo bloqueio de gravação para impedir decisões duplicadas. O PDF autenticado verifica a sessão na Edge Function e o vínculo no banco.

Para um pedido antigo sem dono autenticado, o proprietário primeiro confere a identidade e o comprovante do pedido; depois pode emitir um link de uso único no detalhe administrativo. O cliente vincula o registro pelo link e com o e-mail confirmado correspondente. Não há associação em massa por e-mail. Pedidos que já têm dono não podem ser transferidos por esse fluxo. Um link substituído, vencido ou utilizado não funciona mais.

Eventos exigem confirmação explícita pela empresa em um orçamento pronto, com data, local e cliente vinculado. Aceitar a proposta registra a decisão comercial e não confirma o evento automaticamente.

## Serviço 3 — Área Administrativa Web

As rotas `/admin` e `/admin/{solicitacoes,orcamentos,clientes,agenda,catalogo,propostas,equipe}` carregam o Expo Web. O menu lateral no desktop vira menu compacto em telas menores. Dashboard, pedidos, agenda, orçamentos, calculadora, clientes, catálogo e propostas reutilizam telas, componentes ou serviços do aplicativo. Algumas ações de edição navegam para rotas compartilhadas com o aplicativo; essas rotas também recebem o bundle Expo.

A gestão de pedidos mantém o papel de proprietário e reutiliza a conversão transacional em orçamento, com referência ao pedido original e proteção contra duplicidade. A administração web acrescenta busca aos filtros e à paginação. Em equipe, o proprietário gerencia administradores e membros; administradores podem gerenciar membros dentro das permissões existentes. A publicação de produtos é independente da edição do catálogo interno: ocultar retira da consulta pública e da seleção de novos pedidos, sem excluir o item, seu histórico ou os custos internos.

## Migrations e compatibilidade

| Migration | Impacto |
| --- | --- |
| `20261116000700_portal_acesso.sql` | Restringe criação de empresas; convites e consulta de equipe com escopo e permissões |
| `20261116000800_portal_cliente.sql` | Telefone do perfil, consultas de escopo próprio, confirmação de eventos, respostas e autorização do PDF |
| `20261116000900_publicacao_catalogo.sql` | Visibilidade pública por item; mantém visibilidade inicial anterior para preservar comportamento |
| `20261116001000_vinculo_pedidos_legados.sql` | Vínculo voluntário após verificação de um pedido legado; nenhum preenchimento em massa |

Aplicar em ordem, depois de conferir quais migrações anteriores de solicitações, conversão e materiais de proposta já constam no destino. As quatro não reescrevem os dados existentes. A alteração comportamental é o provisionamento da primeira empresa; migrações e a Edge Function devem ser validadas juntas em homologação antes de disponibilizar o cadastro comercial. Clientes antigos sem vínculo comprovado podem ter uma lista inicialmente vazia; propostas sem pedido associado continuam no fluxo de link individual.

## Operação local e homologação

```powershell
npm run portal:build -- --max-workers 2
node public-proposal/serve.mjs
```

No ambiente local, use a porta 8786. O site comercial e o Expo devem ser servidos pela mesma origem em homologação e, depois, por HTTPS em produção. Preserve o fallback das rotas de cliente e admin e mantenha a chave de serviço só no servidor. Revise a lista de redirecionamentos do Auth para `/orcamento.html` nas origens autorizadas (confirmação e recuperação). Revise entrega de e-mail, expiração, configuração da função `public-proposal`, cabeçalhos e acesso com diferentes papéis em homologação.

Validação local: TypeScript, exportação Expo Web, 12 testes Node e 211 asserções pgTAP em banco isolado com as migrações. No navegador, foram conferidos login, formulário de cadastro, bloqueio de visitante em rotas privadas e painel, listagem, detalhe e recarga do cliente com sessão de teste e consultas ao banco isolado. Detalhe do pedido conferido em 320, 768 e 1440 px sem rolagem horizontal. As políticas e operações de escrita foram verificadas no banco local; a entrega de e-mail, o download autenticado pelo endereço hospedado, a operação administrativa com usuários reais e os dispositivos nativos permanecem para homologação. Nenhuma migração ou publicação foi executada no ambiente remoto.
