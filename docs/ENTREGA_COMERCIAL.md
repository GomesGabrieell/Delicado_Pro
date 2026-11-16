# Entrega comercial do Delicado Pro

O site local roda em `http://127.0.0.1:8786`. Esta entrega foi organizada em quatro serviços de trabalho. O ambiente isolado usou dados sintéticos, PostgreSQL via PGlite, uma sessão Auth de teste no navegador e a função de propostas executada em Deno.

## Serviço 1 — Jornada autenticada de orçamento

- Evento, decoração, contato, revisão e confirmação têm navegação própria e validação por etapa. O catálogo retorna à etapa de decoração com o rascunho salvo na aba.
- O e-mail mostrado no formulário vem da sessão. O banco confere o e-mail em `auth.users`. O WhatsApp é opcional e validado no formulário e na função nova. O cliente confirma apenas após receber o ID persistido.
- A mesma chave e o mesmo conteúdo são preservados em reenvios. O navegador informa validações antes do envio e distingue uma rejeição de um envio ainda sem confirmação.
- A migração 20261116000400 adiciona detalhes estruturados. Enquanto ela não for aplicada, o portal registra as informações adicionais no campo de texto pela função existente. O histórico mantém sua forma original.
- Arquivos: `public-proposal/orcamento.html`, `orcamento.js`, `site.css`, `tests/website-request-retry.test.mjs` e a migração 20261116000400.

### Proposta de envio sem senha para aprovação separada

A alternativa de menor risco é usar link de acesso ou código por e-mail do Supabase Auth. Isso reduz a fricção da senha e conserva a identidade verificada, a RLS e a idempotência. Antes de adotar, validar o retorno ao rascunho, a entrega SMTP, a política de criação de contas e o reenvio de códigos.

Um envio sem identidade exigiria uma função de ingresso separada com captcha validado no servidor, limites persistentes de requisições, chave de idempotência, limite de tamanho e validação de cada campo e item. A função resolveria o portal por configuração confiável e devolveria apenas uma referência à criação. Visitantes não receberiam acesso de leitura às solicitações. Também seria necessário decidir como verificar a propriedade do e-mail antes de reaproveitar contatos no CRM. Nenhuma dessas políticas foi ativada.

## Serviço 2 — Conversão para o aplicativo

- A migração 20261116000500 adiciona um vínculo único da cotação ao pedido, com chave estrangeira que exige a mesma empresa. Um bloqueio de linha e a transação serializam pedidos repetidos e mantêm a conversão atômica.
- A conversão reutiliza um cliente ativo com correspondência única de e-mail verificado. Homônimos não são mesclados. Se houver mais de uma correspondência por e-mail, a equipe precisa resolver os cadastros.
- Somente o papel já autorizado a administrar pedidos do site consegue converter. O rascunho usa a composição existente e não recebe um cálculo financeiro automático. Materiais arquivados ficam no pedido original. Observações internas e WhatsApp não são copiados para a descrição comercial.
- O app mostra a situação, o histórico disponível, a ação **Criar orçamento** e o link de volta ao pedido original. O status do orçamento começa em **Rascunho**. Um pedido novo convertido entra em **Em análise**. Um pedido encerrado conserva seu estado.
- Pedidos antigos continuam legíveis. O histórico de transições começa na implantação porque as mudanças anteriores não foram registradas nessa tabela.
- Arquivos: `src/websiteRequests/WebsiteRequestsScreen.tsx`, `src/app/solicitacoes.tsx`, `src/quotes/QuotesScreen.tsx`, `src/quotes/repository.ts`, a migração 20261116000500 e `supabase/tests/website_request_conversion.test.sql`.

## Serviço 3 — Proposta pública, PDF e respostas

- A listagem no projeto Supabase de produção retornou zero funções e a rota configurada respondeu `NOT_FOUND`. O 404 é causado pela ausência de deploy da Edge Function.
- O PDF e a página exibem os materiais e quantidades do snapshot, com identificadores e custos internos excluídos. As propostas antigas continuam sendo abertas sem a seção de materiais.
- A função usa origem configurada, credencial de servidor e validação do token no banco. O token individual tem validade de 48 horas, é armazenado como hash e pode ser revogado. Repetir a mesma resposta conserva o registro; uma resposta diferente depois da primeira é rejeitada.
- O link pode ser compartilhado por WhatsApp e por rascunho no aplicativo de e-mail. A entrega do e-mail depende do aplicativo do dispositivo e da empresa. A resposta fica disponível no histórico comercial.
- Arquivos: `supabase/config.toml`, `supabase/functions/public-proposal/index.ts`, `pdf.mjs`, migração 20261116000600, `supabase/tests/proposals.test.sql`, `public-proposal/proposta.html`, `proposal.js`, `proposal.css`, `serve.mjs`, `src/proposals/repository.ts` e `.env.example`.

## Serviço 4 — Evidências e publicação

| Verificação | Resultado |
| --- | --- |
| Navegador | Home, login e entrada da proposta conferidos em 320, 768 e 1440 px. Menu móvel fechou com Escape e devolveu o foco. Imagens carregaram e não houve rolagem horizontal nas telas medidas. |
| Jornada autenticada de teste | Em 390 px, a cidade vazia foi sinalizada. Tipo, data, local, convidados, serviços, inspirações, contato e quantidades chegaram à revisão. O catálogo preservou o rascunho. A correção da cidade apareceu no banco. O ID saiu da gravação real. |
| Integração isolada do app | Consultas com o papel proprietário leram o pedido e a resposta. A função de conversão criou o rascunho, a função existente da calculadora salvou a composição e a função de emissão criou a proposta. As telas do app precisam ser percorridas em aparelho na homologação. |
| Proposta HTTP | Browser abriu o token e solicitou alterações. A resposta persistiu. O Deno retornou PDF válido. Resposta conflitante retornou 409, origem não autorizada retornou 403 e token inexistente retornou 404. |
| SQL e JavaScript | 174 verificações pgTAP em PostgreSQL isolado, 12 testes Node, TypeScript do app e checagem Deno. O ambiente simulou a sessão Auth e a interface HTTP do Supabase. Não houve envio de e-mails, carga concorrente com conexões distintas nem uso de dados reais no ambiente isolado. |
| Performance e acessibilidade | WebP responsivo, dimensões das imagens, carregamento tardio abaixo da abertura e cache curto de recursos estáticos. Feedback em regiões de status, rótulos de campos, foco e navegação por teclado. Ainda faltam medições de desempenho e teste com leitor de tela em dispositivos reais. |

### Checklist antes de publicar

- [ ] Aprovar destino, migrações e deploy. Confirmar quais versões já foram aplicadas. A 20261116000300 restringe a função de envio antiga e deve entrar antes das novas. Revisar os grants e rodar a suíte na homologação.
- [ ] Escolher a hospedagem HTTPS. Para hospedar a pasta como arquivos estáticos, incluir os recursos que o servidor local gera, inclusive o SDK em `/supabase.js` e a configuração pública em `/orcamento-config.js`. Configurar o portal remetente vinculado à empresa correta.
- [ ] No Auth, validar a URL do site, a URL exata de retorno do orçamento e as regras de confirmação. Testar cadastro, recuperação de senha e entrega de e-mail com a infraestrutura real. Rever limites e proteção antiautomação com a equipe de produção.
- [ ] Na função, autorizar a origem HTTPS da página em `PROPOSAL_WEB_ORIGIN` e confirmar as variáveis de servidor fornecidas pelo Supabase. O gateway permite chamadas sem JWT à função de proposta porque ela valida o token individual. A chave de serviço fica no runtime do Supabase.
- [ ] Publicar a função com a configuração deste repositório após autorização. Conferir a URL efetiva no site e ajustar `EXPO_PUBLIC_PROPOSAL_PAGE_URL` no app. `DELICADO_PROPOSAL_ENDPOINT` permite trocar o endpoint servido localmente durante a homologação.
- [ ] Fazer o teste pós-deploy com conta e dados de homologação: login, envio, consulta no app, conversão repetida, cálculo, emissão HTTPS, PDF, aceitação, alterações e recusa. Confirmar que tokens expirados e revogados não abrem e que um segundo tenant não lê dados da empresa.
- [ ] Confirmar navegação no Android e no iOS, links de WhatsApp e e-mail, leitores de tela e desempenho em uma conexão móvel. Revisar o plano de recuperação se alguma etapa divergir da homologação.
