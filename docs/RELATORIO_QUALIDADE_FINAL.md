# Delicado Pro — Relatório de qualidade do redesign

Revisão em 14 de novembro de 2026. O escopo cobre as etapas 02, 04, 05, 06, 08, 09 e 10 solicitadas. O projeto usa o mesmo cliente Supabase, as mesmas políticas SQL e as fórmulas financeiras existentes.

## Funcionalidades verificadas

| Área | Resultado e evidência |
| --- | --- |
| Design System | Os 14 componentes permanecem disponíveis na demonstração autenticada. A jornada anterior da prévia testou busca, filtros, validação, carregamento, erro, diálogo e painel inferior a 320 px. |
| Início | Empresa ativa, saudação no horário de Brasília, ações rápidas, datas de eventos, contagem por estado e links para detalhes. O último cálculo registrado e retornos de propostas aparecem para proprietário e administrador. A mudança de papel para membro foi exercitada no navegador com API simulada. |
| Solicitações e Clientes | A lista comercial usa versões emitidas e respostas persistidas em `commercial_proposals`. Tem pesquisa por cliente ou título, filtros e indicador de resposta não lida. O detalhe mostra os eventos comerciais registrados e abre o orçamento, com suas referências, ou um novo orçamento para o cliente vinculado. O teste de interface exercitou marcar resposta como lida, busca e abertura da ficha de cliente com respostas simuladas. |
| Orçamentos e Calculadora | O editor tem etapas de cliente, evento e condições. Salvar cria ou atualiza o rascunho no contrato existente. A Calculadora guia composição, gastos e resumo em sequência e usa as RPCs atuais de manutenção da composição e cálculo. No navegador, foram exercitados título obrigatório, data inválida, retorno sem perda de campo, criação simulada e navegação de etapas da Calculadora. |
| Propostas | Abas internas Proposta, Detalhes e Histórico. A versão emitida mostra conteúdo congelado. A aba Detalhes identifica os itens e anexos do orçamento atual como tal. Os controles usam o WhatsApp com mensagem preenchida, compartilhamento nativo e rascunho no aplicativo de e-mail quando há link emitido. A emissão informa quando a URL do portal está ausente e exige orçamento pronto para revisão. |
| Portal do cliente | Visual claro, controles de pelo menos 48 px e links internos que preservam o token no fragmento. Em navegador a 320 px, a função simulada recebeu o token correto e a recusa com pedido de revisão. O teste também percorreu PDF simulado e link indisponível. |
| Agenda, Perfil e Configurações | A Agenda consulta datas de orçamentos ativos, com filtro validado por dia, vazio, recuperação e detalhe. O filtro por data foi exercitado pela interface. Perfil oferece confirmação antes de sair e Configurações explicita o estado do ambiente. A entrada e as telas existentes adotaram cores, formulários e botões compartilhados. |

## Achados por gravidade

| Gravidade | Problema | Estado |
| --- | --- | --- |
| Alta | A Calculadora podia renderizar texto vazio durante a carga de um orçamento e disparar o aviso de execução do Expo no web. | Corrigido com guardas booleanas. A jornada voltou a passar no Chromium. |
| Alta | Ausência de ambiente completo para emissão e resposta real no portal. A URL pública no ambiente local e o endpoint no repositório estão vazios. | Pendente de configuração e teste integrado. A interface informa o requisito e condiciona a emissão. |
| Alta | Falta de modelo persistente para solicitação comercial anterior ao orçamento. As opções Nova e Em análise exigem entidade e transições próprias. Resposta nova é um indicador de leitura e não um estágio comercial da solicitação. | A lista usa os registros existentes. Permanecem pendentes o modelo, as transições e as políticas para solicitação inicial. |
| Alta | Isolamento, revogação de vínculo, persistência e funções de proposta no Supabase hospedado precisam de teste integrado. | Revisão estática feita. Políticas, migrations e funções de backend fora do diff desta entrega. A simulação de perfil no navegador verifica a interface, enquanto a autorização real depende das políticas do banco. |
| Média | E-mail transacional depende de serviço e configuração. WhatsApp oferece abertura com mensagem. | Rascunho local de e-mail e abertura do WhatsApp implementados. Entrega, compartilhamento nativo e PDF real pendentes de teste no ambiente configurado. |
| Média | O snapshot público tem decoração, valor, condições e imagens, mas não inclui uma lista congelada de itens. | Itens do orçamento aparecem no detalhe interno, identificados como dados atuais. Exibir itens da versão no portal requer extensão do contrato público e validação de quais campos podem ser divulgados. |
| Média | A usabilidade com fonte ampliada, VoiceOver, TalkBack, teclado nativo e diferentes áreas seguras depende de teste em aparelhos. | Pendente em Android e iPhone. Empacotamento e teste web são registrados separadamente. |
| Baixa | Dez avisos de dependências usadas para acionar recargas com hooks. | Lint executado sem erros. Avisos seguem registrados. |

## Testes e limites

- Executados no workspace: TypeScript, lint, nove testes existentes de cálculo e validação de clientes, checagem de sintaxe do JavaScript do portal e `git diff --check`.
- Exportação Expo para web, Android e iOS verificada. A exportação comprova o empacotamento dos bundles.
- Jornadas do Chromium usaram respostas sintéticas interceptadas em testes explícitos. Nenhum cliente, orçamento, proposta ou resposta de teste foi gravado no Supabase do usuário.
- As sete suítes pgTAP existentes foram inventariadas. A execução SQL, o teste com sessão real no Supabase, o cadastro e a edição persistidos de ponta a ponta, a entrega real de e-mail, o envio real pelo WhatsApp e os testes em aparelhos ficaram pendentes. A máquina não apresentou ADB, Docker, PostgreSQL CLI ou uma distribuição WSL disponível.
- Eventos, Contratos, Financeiro, Relatórios e Funcionários como módulos independentes ficaram fora da remodelagem por ausência de telas implementadas. A Agenda mantém os dados de evento já existentes nos orçamentos.

## Arquivos da entrega

- Dashboard e dados: `src/screens/Dashboard.tsx`, `src/dashboard/useQuoteFeed.ts`, `src/quotes/repository.ts`, `src/proposals/repository.ts`.
- Comercial e clientes: `src/app/solicitacoes.tsx`, `src/app/clientes.tsx`, `src/clients/ClientsScreen.tsx`, `src/app/(principal)/mais.tsx`.
- Orçamentos e cálculo: `src/quotes/QuotesScreen.tsx`, `src/calculator/CalculatorScreen.tsx`.
- Propostas: `src/proposals/ProposalsScreen.tsx`, `public-proposal/index.html`, `public-proposal/proposal.css`, `public-proposal/proposal.js`.
- Consistência: `src/app/(principal)/agenda.tsx`, `src/app/(principal)/_layout.tsx`, `src/app/_layout.tsx`, `src/app/configuracoes.tsx`, `src/screens/AccountScreen.tsx`, `src/catalog/controls.tsx`, `src/components/Screen.tsx`, `src/components/ActionButton.tsx`, `src/design-system/Content.tsx`, `src/theme.ts`. A linha de evento anterior foi substituída pelo `ListItem` compartilhado.

## Próxima fase

Configurar a página e a função de propostas em ambiente de teste, rodar pgTAP em banco descartável e validar com proprietário, membro, vínculo revogado e conta de outra empresa. Exercitar upload, cálculo registrado, emissão, compartilhamento, respostas, PDF e acessibilidade em aparelhos. Definir o modelo de solicitação inicial e as permissões para seus estados antes de implementar sua persistência. A evidência atual cobre compilação, empacotamento, testes existentes e jornadas web simuladas.
