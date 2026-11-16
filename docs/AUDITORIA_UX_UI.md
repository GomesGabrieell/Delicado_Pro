# Delicado Pro — Auditoria UX/UI e proposta para a primeira entrega

## Diagnóstico

A inspeção cobriu as rotas do Expo Router, suas telas e estados internos, os componentes compartilhados e a página pública de proposta. A análise de telas pequenas, teclado e acessibilidade desta auditoria parte do código. O roteiro de validação visual está no fim do documento.

| Tela ou fluxo | Achado | Mudança proposta |
| --- | --- | --- |
| Início | A foto de abertura e a grade de atalhos ocupam o primeiro espaço de leitura. Todos os módulos recebem o mesmo peso, embora as tarefas tenham urgências diferentes. Sem configuração, os atalhos levam à mesma orientação técnica. | Mostrar a empresa, uma ação principal e duas filas operacionais. Dar à configuração inicial uma entrada direta. |
| Navegação | A pilha concentra descoberta no Início. Para alternar entre módulos é preciso voltar. Algumas telas combinam o cabeçalho nativo, um título equivalente no conteúdo e um botão interno de retorno cuja função depende do estado. | Abas para destinos recorrentes. Usar a pilha em tarefas focadas, com retorno à origem. Mapear cada ação aos caminhos que efetivamente a atendem. |
| Entrada, Minha conta e Configurações | Entrar e criar conta usam botões de igual peso. O título da rota de perfil difere do conteúdo. O estado de configuração expõe instruções técnicas necessárias para o ambiente de desenvolvimento. | Em uma rodada futura, diferenciar a ação principal da troca de modo e alinhar os títulos. Manter a configuração em Mais e a orientação de instalação na entrada sem ambiente configurado. |
| Catálogo | A seleção de empresa é repetida em cada módulo. Grupos, troca de empresa, atualização e filtros precedem a lista. Cadastro e detalhe repetem ações em controles de peso parecido. A criação de categoria compete com o preenchimento do item. | Dar prioridade à busca, itens e ação de cadastro. Integrar filtros em uma superfície própria e exibir os ativos. Em uma rodada posterior, separar identificação, foto e informações específicas do grupo no formulário. |
| Calculadora | As etapas já existem, mas aparecem como chips equivalentes que quebram em várias linhas. Troca de modo, reinício, seleção de itens, quantidades e salvamento concorrem verticalmente. Para encontrar o resumo, é preciso localizar a etapa na lista. | Entrar pelo orçamento ou por um item do catálogo. Evoluir o fluxo para seleção de itens, parâmetros pertinentes ao perfil e revisão, com resumo acessível durante a composição. |
| Orçamentos | Busca, filtros, cadastro e troca de empresa dividem espaço na listagem. O detalhe acumula imagens, composição, histórico e ações como duplicar e arquivar. A atualização de status compete com a edição dos dados. | Expor a fila de trabalho no Início e conectar cada linha ao detalhe. Em outra rodada, promover a próxima ação válida em cada estado e organizar ações ocasionais num menu contextual. |
| Clientes | A busca alterna explicitamente entre nome e documento para perfis autorizados. A ficha divide a atenção entre dados cadastrais, orçamentos e auditoria. Listas usam um botão de consulta dentro de cada cartão. | Em outra rodada, tornar a linha inteira acionável e concentrar ficha e histórico no cliente. Manter o novo orçamento pré-vinculado ao cliente. |
| Propostas internas | Identidade comercial, emissão, compartilhamento, versões e respostas dividem a mesma superfície. O aviso sobre a cópia do link revela uma limitação operacional ao sair da tela. | Abrir emissão e versões pelo orçamento e permitir acompanhamento de respostas em Mais para perfis elegíveis. Revisar a gestão de links na rodada de propostas. |
| Proposta pública | A página distingue valor e condições, aceita imagens, oferece PDF e registra a resposta. As ações de aprovar, negociar e recusar se agrupam na mesma região. O resultado depende do token e do endpoint publicado. | Na rodada de propostas, reforçar a hierarquia das ações e validar a jornada externa, inclusive expiração e solicitação de revisão. |
| Agenda | O esquema inclui datas de evento no orçamento. A interface atual espalha essas datas por detalhes e históricos e não tem uma lista cronológica. | Usar as datas reais dos orçamentos em uma agenda de consulta, com o status visível para distinguir planejamento de confirmação comercial. |

### Telas estreitas e acessibilidade

- A foto e a grade em duas colunas disputam espaço vertical no Início. Em campos e filtros, a coluna de até 480 pontos e as quebras de linha preservam leitura, mas podem deslocar a lista ou a ação principal para longe da primeira dobra.
- Botões principais, campos e chips declaram mínimos de 44–48 pontos. O novo sistema usa 48 como referência para ações, com ícone e nome acessível e rótulos visíveis nas abas.
- Vários erros têm papel de alerta e os filtros expõem seleção. O estilo dos chips não diferencia claramente a pressão e a desativação. Usar estado selecionado, pressionado e desativado distinguíveis nos componentes novos, preservando nomes acessíveis sem depender de cor.
- Títulos de empresa, orçamentos e textos com fonte ampliada precisam quebrar sem sobrepor ações. Verificar foco visível, ordem de leitura, busca com teclado aberto e retorno das ações em cada módulo revisado.

## Arquitetura proposta

| Destino | Entrada e ação |
| --- | --- |
| Início | Consultar pendências e datas do contexto selecionado. Abrir um orçamento específico ou iniciar um rascunho. |
| Orçamentos | Consultar e criar. A edição do orçamento dá acesso à calculadora e à emissão de proposta conforme o perfil. |
| Agenda | Consultar datas próximas informadas nos orçamentos e abrir seus detalhes. A data é editada no próprio orçamento. |
| Catálogo | Encontrar produtos, consultar o acervo e iniciar uma composição a partir de um item. |
| Mais | Clientes, respostas de propostas quando houver vínculo elegível, Minha conta e Configurações. |

O atalho de composição avulsa fica no fluxo de criação de Orçamentos, com acesso às composições salvas. O retorno de detalhes abertos pelo Início, pela Agenda ou pela ficha de cliente usa a pilha e preserva a origem.

## Sistema visual

- Grafite para títulos, marca e botão principal. Branco para superfícies de trabalho e off-white para o fundo. Azul acinzentado e fundo azul suave para seleção, ações textuais e foco. Vermelho reservado a erros, com mensagem além da cor.
- Tipografia do sistema em Android, iOS e web, com pesos e alturas de linha consistentes. Título de tela em 32, títulos de seção em 20, texto em 15–16 e metadados em 13. Hierarquia adequada a rótulos longos e ampliação de fonte.
- Escala de 4, 8, 12, 16, 24 e 32 pontos. Cantos de 10 a 16 pontos. Usar linhas divisórias e agrupamentos de dados antes de adicionar superfícies. Reservar sombra sutil para componentes sobrepostos.
- Feather com traço uniforme, pressões com feedback imediato e transições nativas de navegação. Evitar animação contínua fora de indicadores de carregamento.
- Ação primária preenchida, ação secundária textual ou contornada e linhas acionáveis inteiras. Estados de espera, vazio e erro com próxima ação quando houver.

## Proposta de Início

Cabeçalho compacto com a marca e acesso à conta. Em seguida, título **Início**, empresa em contexto e **Novo orçamento**. Em largura ampla, a ação fica ao lado do título e as duas listas podem aparecer em colunas. Em celular, o conteúdo lê de cima para baixo:

1. **Orçamentos pendentes** exibe os rascunhos e orçamentos prontos para revisão mais recentes, com título, código e estado. O atalho abre a listagem filtrada.
2. **Próximos eventos** exibe as datas futuras ou de hoje informadas nos orçamentos ativos, em ordem cronológica. Cada linha abre o orçamento correspondente e o atalho leva à Agenda.

As consultas usam apenas a empresa selecionada e a sessão corrente, com RLS existente. O painel usa dados operacionais disponíveis a todos os vínculos ativos, sem consultar custos ou totais. O acesso às respostas de proposta em Mais depende de vínculo de proprietário ou administrador. Sem vínculo, o Início orienta a acessar o Catálogo para criar uma empresa. Falhas de consulta oferecem recuperação e listas vazias são apresentadas apenas após a consulta concluir.

## Validação da primeira entrega

Verificar composição estreita e ampla, sessão ausente, conta sem empresa, troca entre empresas, filas com registros e sem registros, falha e nova tentativa, permissão de funcionário, criação de rascunho, acesso à calculadora e retorno da Agenda ou de um detalhe à origem. Rodar checagem TypeScript, lint, testes existentes e empacotamento Expo. Validar em Android e iOS com leitor de tela, teclado aberto e texto ampliado antes de aprovar visualmente a próxima rodada.

### Resultado da implementação

- O teste isolado no Chromium cobriu configuração inicial, entrada com sessão simulada, cinco abas a 320 px, filtro de pendentes, entrada na calculadora, Agenda com retorno do detalhe, Catálogo, Mais, Configurações, seleção de empresa, falha com nova tentativa e criação de rascunho. Também conferiu a interface de funcionário e de conta sem empresa.
- As capturas de 360 e 1120 px usam registros sintéticos do teste. A jornada interceptou as requisições e não gravou no Supabase.
- A Agenda lista orçamentos ativos datados a partir de hoje. Para o painel, a fila de pendentes reúne rascunhos e orçamentos prontos para revisão. O status comercial exibido é o do orçamento.
- A validação em aparelhos, com leitor de tela e em uma sessão integrada ao Supabase, continua pendente. O redesign dos módulos segue após a revisão visual desta entrega.
