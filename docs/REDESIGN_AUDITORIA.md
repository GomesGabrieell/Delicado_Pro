# Delicado Pro — Auditoria e preservação

## Base inspecionada

O projeto em `C:\appJulia` usa Expo SDK 58, React Native, TypeScript, Expo Router e Supabase. `src/app/` declara rotas e proteções. `src/screens/` abriga Entrada, Início e Conta. Catálogo, Calculadora, Clientes, Orçamentos e Propostas têm módulos próprios. `src/auth/`, `src/navigation/`, `src/services/` e `src/components/` concentram as responsabilidades transversais. `public-proposal/` é a interface externa em HTML, CSS e JavaScript. `supabase/` contém migrações, testes e a Edge Function.

A base examinada é a árvore de trabalho, com alterações locais sobre `318fb57` na branch `main`, que Git reportou em paridade com a referência local `origin/main`. Havia 21 caminhos rastreados alterados ou removidos e arquivos ainda sem rastreamento, entre eles o grupo de abas, o novo detalhe de orçamento, componentes compartilhados e a correção de UUID para web em HTTP. A área de preparo estava vazia. As três exclusões de rotas na raiz correspondem à reorganização dos caminhos de Início, Catálogo e Orçamentos. A auditoria considera as versões locais em uso. O estado remoto do servidor Git não foi consultado.

## Rotas, telas e integrações a preservar

| Caminho | Telas, estados e ações | Serviço ou contrato |
| --- | --- | --- |
| `/` | Início, seleção de empresa, pendências, próximos eventos, novo orçamento, conta e configuração inicial. Estados de carregamento, erro e ausência de empresa. | Vínculos ativos em `company_members`; filas de `quotes`. Sem configuração do cliente, oferece acesso a Configurações. |
| `/entrar` | Login, cadastro, instruções de confirmação e erros. | Supabase Auth por e-mail e senha. Sessão restaurada na inicialização. |
| `/orcamentos` | Lista, seleção de empresa, busca, filtros, paginação, criação por formulário ou calculadora. Abre edição e detalhe interno. | `quotes`, com busca por título, código ou local. Links antigos com empresa e cliente ou orçamento redirecionam para `/orcamento`. |
| `/orcamento` | Editor e detalhe acessados por Início, Agenda, Clientes ou Calculadora. Mostra dados, composição e histórico. Permite vincular ou criar cliente, editar rascunho, duplicar, anexar imagens e alterar estado conforme papel. | `quotes`, `quote_clients`, `quote_history`, `quote_financials`, `quote_images`, Storage privado e RPCs de composição, duplicação e anexos. A atualização usa a versão do registro onde prevista. |
| `/agenda` | Lista cronológica paginada, seletor de empresa e abertura do orçamento relacionado. | `quotes.event_date` dos orçamentos ativos a partir de hoje. A alteração da data ocorre no orçamento. |
| `/catalogo` | Seleção ou criação de empresa, grupos de itens, busca, filtros, lista, detalhe, edição, foto, categoria, arquivamento e composição com item predefinido. | `create_company`, `catalog_items`, `catalog_categories`, `catalog_financials` e Storage `catalog-images`. |
| `/calculadora` | Seleção de empresa, busca de itens, carrinho, composições salvas, etapas financeiras e resumo. Entrada avulsa, via item ou por orçamento. | Catálogo, `calculator_drafts`, `calculator_defaults`, `set_calculator_default`, `save_quote_composition` e `create_quote_from_calculator`. Cálculo em `src/calculator/finance.ts`, com validações no banco para a persistência. |
| `/clientes` | Seleção de empresa, lista, busca, ficha, criação, edição, arquivamento, auditoria e histórico de orçamentos. Abre orçamento novo com cliente vinculado. | `quote_clients`, `quotes`, `client_audit` e RPCs de detalhe restrito, busca por documento, salvamento e arquivamento. |
| `/propostas` | Caixa de respostas por empresa ou emissão e versões de um orçamento. Edita identidade, emite, compartilha, consulta, revoga e marca resposta como lida. | `proposal_branding`, `commercial_proposals`, `save_proposal_brand`, `issue_proposal`, `manage_proposal` e função de PDF. |
| `/mais` | Clientes, Respostas de propostas conforme vínculo, Minha conta e Configurações. | A sessão e os vínculos ativos orientam a visibilidade do menu. |
| `/perfil` | E-mail da sessão e saída. | Encerramento local pelo Supabase Auth e limpeza das rotas protegidas pelo layout. |
| `/configuracoes` | Estado da conexão e link externo se o projeto estiver ausente. Acesso permitido antes de autenticar. | Exibe o estado da configuração Expo. O link abre o painel Supabase. |
| `public-proposal/index.html` | Proposta por link, aprovação, negociação, recusa, pedido de nova versão, WhatsApp, PDF, confirmação e falhas de acesso. | Token no fragmento, validação via Edge Function `public-proposal`, RPCs restritas, imagens assinadas e PDF. `public-proposal/config.js` contém endpoint vazio no repositório. |

**Navegação principal:** Início, Orçamentos, Agenda, Catálogo e Mais. A Calculadora é acessível por Orçamentos e Catálogo. A versão Expo Web reutiliza as rotas internas. Site institucional, portfólio publicável e painel com layout próprio para telas largas seguem como propostas registradas em [PLANEJAMENTO_UX_UI.md](PLANEJAMENTO_UX_UI.md).

## Componentes e dependências compartilhadas

| Arquivos | Uso a preservar ou revisar |
| --- | --- |
| `src/theme.ts`, `src/components/Screen.tsx`, `src/components/ActionButton.tsx` | Tokens, tipografia, áreas seguras, rolagem com teclado, cabeçalho e ação primária. |
| `src/components/WorkspaceControls.tsx` | Ação com ícone, linha acionável, grupos de lista, seletor de empresa e estados de carregamento, vazio e erro. |
| `src/catalog/controls.tsx` | Campo, chip e estilos de agrupamento usados em cinco módulos. Alterar um componente compartilhado pode afetar telas fora da rodada atual. |
| `src/dashboard/EventRow.tsx`, `src/dashboard/useQuoteFeed.ts` | Linha de evento e carregamento das filas de Início e Agenda. |
| `src/navigation/useCompanies.ts`, `useRouteSession.ts`, `routes.ts` | Empresa em contexto, sessão para rotas, validação de IDs e navegação de retorno. |
| `src/components/confirmAction.ts`, `confirmAction.web.ts` | Confirmação nativa e web para operações como duplicar e arquivar. |
| `src/services/localPhoto*.ts`, `randomUUID*.ts`, `sessionStorage*.ts` | Adaptações nativo/web. O UUID web já tem alternativa criptográfica para acesso HTTP pelo IP da rede local. |

## Diagnóstico priorizado

| Prioridade | Achado | Risco ou efeito |
| --- | --- | --- |
| Alta | Início, Agenda e Orçamentos compartilham a empresa. Catálogo, Clientes, Calculadora avulsa e Propostas ainda têm seleções próprias. O cadastro da primeira empresa começa dentro do Catálogo. | Contexto varia por módulo. A futura unificação precisa preservar a empresa do registro ao abrir um link e revalidar o vínculo. |
| Alta | Abertura de orçamento usa estado interno ou rota singular; título da pilha e cabeçalho interno podem se repetir. | Voltar, troca de guia e link direto devem preservar a origem, os filtros e a empresa. Mudanças amplas de rota podem quebrar entradas já usadas. |
| Alta | A revisão e a emissão têm pré-requisitos de banco. A interface nem sempre explica os requisitos antes do clique. Cadastro rápido de cliente e criação de categoria persistem antes do salvamento do formulário principal. | A pessoa pode achar que cancelou toda a operação ou descobrir tarde que a proposta ainda não pode ser emitida. |
| Média | **Calculadora:** chips de etapas, seleção de itens, quantidades, composições salvas, reinício e ações financeiras concentram controles. **Detalhe de orçamento:** dados, imagens, composição, valores, histórico e transições competem na mesma tela. | Próxima ação difícil de identificar. Reduzir o volume por etapa sem perder valores e estados já registrados. |
| Média | **Catálogo:** grupo, filtros, ordenação, atualização e troca de empresa disputam espaço. **Clientes:** dados pessoais, orçamentos e auditoria aparecem na mesma ficha. **Propostas:** identidade, emissão, versões e respostas usam a mesma superfície. | Baixa hierarquia visual e excesso de movimentos em telas pequenas. Distribuir informações por tarefa e revelar detalhes no contexto. |
| Média | A fila de pendências usa status do orçamento. A Agenda usa data dos orçamentos ativos, inclusive rascunhos. Propostas têm estados de resposta próprios. | A data pode ser interpretada como evento confirmado. Os rótulos precisam refletir qual entidade e estado cada lista apresenta. |
| Média | Listas repetem ações textuais por registro e vários módulos usam chips com aparência semelhante para filtrar, navegar e executar comandos. | A descoberta piora com fonte ampliada e telas estreitas. Foco, ordem de leitura, toque e estados precisam de validação em aparelhos. |

**Botões sem funcionamento.** A inspeção estática encontrou manipuladores nos controles revisados, incluindo os da página externa. A emissão de um orçamento ainda em rascunho é recusada pelo banco quando tentada. A leitura da proposta depende de endpoint e token válidos. O compartilhamento e o PDF no app dependem da plataforma. A entrega efetiva de e-mail de confirmação, o upload real de fotos e a integração completa do portal ficaram fora desta verificação. A caixa interna de respostas é o canal de acompanhamento encontrado no código.

## Autenticação, permissões e isolamento

- O cliente é criado com URL e chave publicável do projeto. A sessão usa armazenamento local no navegador e o adaptador Expo SQLite no nativo. As rotas internas exigem sessão; a identidade não substitui a verificação do vínculo. A seleção da empresa é um contexto de interface.
- O SQL restringe as operações por `auth.uid()`, empresa, papel e vínculo ativo. RLS, grants por coluna, RPCs e referências entre registros da mesma empresa dão cobertura complementar. As restrições encontradas no repositório precisam ser confirmadas no ambiente integrado.
- Proprietário e administrador podem gravar o catálogo, acessar custos e cálculos, gerenciar dados restritos de clientes e operar propostas conforme as permissões vigentes. Membros ativos consultam dados operacionais, podem compor e salvar rascunhos de orçamento e vincular ou cadastrar cliente por nome no fluxo de orçamento. Custos, documentos restritos de clientes e emissão de proposta têm controles adicionais no banco.
- O acesso público à proposta passa pela Edge Function. As RPCs públicas de leitura e resposta são executáveis pelo papel de serviço usado no backend. A interface externa recebe dados comerciais da versão emitida, com validade e revogação controladas no banco. Preservar hash do token, dados autorizados, expiração e URLs assinadas.
- A correção local de UUID em HTTP resolve compatibilidade da geração de identificadores. Ela deve entrar no checkpoint e na matriz de regressão para cadastro e anexo. Preservar os caminhos nativos e web.

## Testes e lacunas

| Suíte existente | Cobertura |
| --- | --- |
| `tests/calculator.test.mjs` e `tests/clients.test.mjs` | Seis casos de cálculo com valores exatos, embalagem, acréscimos e desconto. Três casos de validação e normalização de clientes e documentos. |
| `supabase/tests/tenant_isolation.test.sql` | Fundação multiempresa, permissões por vínculo e revogação. |
| `supabase/tests/catalog_isolation.test.sql`, `calculator_isolation.test.sql` | Catálogo, Storage, custos, rascunhos e limites de acesso. |
| `supabase/tests/quotes.test.sql`, `calculator_quote_flow.test.sql` | Estados, histórico, custos registrados, duplicação e criação atômica pela calculadora. |
| `supabase/tests/clients.test.sql`, `proposals.test.sql` | Dados restritos e auditoria de clientes. Emissão, versão, expiração, revogação, leitura e resposta das propostas. |

As sete suítes SQL declaram 139 asserções pgTAP e usam transações revertidas. Foram inventariadas, sem execução nesta etapa. O TypeScript e os nove testes JavaScript passaram, com avisos do Node sobre o formato de módulo nos testes. O lint passou com dez avisos de dependências de hooks usados em recargas. Checagem de whitespace do Git sem erros. A revisão das telas e das políticas foi estática, sem banco hospedado ou dados gravados.

**Lacunas de regressão:** não há suíte de interface versionada para login e recuperação de sessão, retorno e deep links, escopo de empresa e papel após troca ou revogação, upload real, envio da proposta, PDF ou comportamento em Android e iOS. Incluir também o caso já observado de cadastro em HTTP pelo IP local, foco de teclado na web, fontes ampliadas, TalkBack e VoiceOver. A estratégia e os arquivos por etapa estão em [REDESIGN_PLANO.md](REDESIGN_PLANO.md).
