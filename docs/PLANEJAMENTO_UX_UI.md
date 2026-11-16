# Delicado Pro — Planejamento UX/UI por tela

**Primeira entrega para aprovação.** Este documento descreve o aplicativo atual e propõe a arquitetura das três experiências. Cada tela terá uma ficha de revisão própria antes da implementação.

## 1. Inventário atual

A revisão cobre as rotas do Expo Router, os estados internos de listas, detalhes e formulários, os controles compartilhados, a página de proposta e os contratos de banco relevantes. A coluna de funcionalidades descreve o que o código conecta aos serviços. A disponibilidade de cada operação depende da configuração e das migrações do ambiente.

| Interface e caminho atual | Estados ou telas acessíveis | Funcionalidades conectadas |
| --- | --- | --- |
| Entrada · `/entrar` | Entrar, criar conta, instrução após cadastro | Autenticação por e-mail e senha e cadastro com Supabase Auth. O app restaura a sessão e protege as rotas de gestão. |
| Início · `/` | Área de trabalho, carregamento, erro, conta sem empresa e configuração inicial quando o Supabase está ausente | Seleciona empresa entre vínculos ativos, consulta pendências e datas de evento e abre orçamento, agenda, conta e novo rascunho. Sem empresa, encaminha ao Catálogo para criá-la. |
| Orçamentos · `/orcamentos` e `/orcamento` | Seleção de empresa, lista, busca e filtros, novo, edição, detalhe e histórico | Salva rascunhos, vincula cliente, anexa imagens, consulta composição, duplica e altera estado conforme permissões. Abre a calculadora e as propostas. A rota singular atende entradas diretas vindas do Início, Agenda, Clientes e Calculadora. |
| Agenda · `/agenda` | Seleção de empresa e lista cronológica paginada | Consulta datas a partir de hoje em orçamentos ativos. Abre o orçamento de origem. A data é editada no orçamento. |
| Catálogo · `/catalogo` | Seleção e criação de empresa, lista, filtros, detalhe, novo e edição de item | Cadastra balões, acervo e materiais. Busca, filtra, ordena, gerencia categorias, fotos e arquivamento conforme permissões. Inicia uma composição com o item selecionado. |
| Calculadora · `/calculadora` | Seleção de empresa, carrinho, busca de itens, composições salvas, etapas de custo e resumo | Adiciona e remove itens, ajusta quantidades, salva e recupera composições. Registra cálculo em orçamento ou cria rascunho com a composição. Custos, lucro e ajustes financeiros dependem do vínculo. |
| Clientes · `/clientes` | Seleção de empresa, lista, busca, ficha, novo, edição, histórico de orçamentos e auditoria | Consulta clientes e abre ou cria orçamento vinculado. O acesso a documento, dados completos, edição, arquivamento e auditoria depende da permissão. O orçamento também oferece cadastro rápido por nome. |
| Propostas internas · `/propostas` | Seleção de empresa, caixa de respostas, identidade comercial e propostas por orçamento | Salva identidade e WhatsApp, emite e revoga versões, compartilha link, abre a proposta e marca respostas como lidas. O compartilhamento nativo e o PDF dentro do app têm controles específicos por plataforma. |
| Mais · `/mais` | Menu secundário | Clientes, Respostas de propostas para vínculos elegíveis, Minha conta e Configurações. |
| Minha conta · `/perfil` | E-mail da sessão e saída | Encerra a sessão local pelo Supabase Auth e retorna à entrada. |
| Configurações · `/configuracoes` | Estado da conexão e orientação de instalação | Informa se URL e chave publicável estão configuradas. Sem configuração, oferece um link para criação de projeto no Supabase. |
| Portal de proposta · `public-proposal/index.html` | Carregamento, leitura, decisão, pedido de nova versão, resposta registrada e falha de acesso | Usa a Edge Function para ler a versão pelo token, responder e baixar PDF. A negociação também pode levar ao WhatsApp. O `endpoint` no arquivo local está vazio. A publicação integrada não foi verificada nesta entrega. |

O Expo Web oferece a versão em navegador das telas de gestão do aplicativo. O código atual ainda não contém um site público de empresa, um portfólio publicável ou um layout de gestão específico para telas largas. A pasta `public-proposal` contém a experiência de acesso individual por link.

### Menus, entradas e saídas

- **Barra principal** — Início, Orçamentos, Agenda, Catálogo e Mais. As quatro últimas abas são protegidas por sessão. Sem ambiente configurado, o Início oferece o caminho para a tela de configuração.
- **Início** — Minha conta, seletor de empresa, Novo orçamento, fila de pendências e próximos eventos. As filas abrem a lista filtrada, a Agenda ou um detalhe específico.
- **Orçamentos** — lista, criação pelo formulário ou pela calculadora, detalhe, composição, histórico e propostas. Clientes e Agenda abrem registros específicos com a empresa de origem. Links antigos com os identificadores em `/orcamentos` redirecionam para o detalhe.
- **Catálogo** — grupos, filtros, detalhe, edição e **Usar na calculadora**. **Clientes** — filtros, ficha, auditoria, orçamento novo com cliente selecionado e histórico vinculado.
- **Mais** — Clientes, Respostas de propostas, Minha conta e Configurações. Na proposta comercial, o link emitido abre uma experiência separada no navegador.
- **Portal** — Aprovar, Negociar, Não aprovar, solicitar nova proposta ou encerrar, voltar da confirmação, conversar no WhatsApp quando aplicável e baixar PDF.

### Componentes reutilizados

| Componente | Uso e oportunidade |
| --- | --- |
| `theme.ts` | Paleta, tipografia, espaçamento, raios e referência de área de toque. Base para as fichas de revisão. |
| `Screen` | Área segura, rolagem, cabeçalho e largura de conteúdo. A coluna de 480 pontos funciona para formulários curtos e subutiliza o espaço das listas no painel web. |
| `ActionButton` e `WorkspaceAction` | Ações preenchidas e ações com ícones ou texto. Consolidar variantes gradualmente quando uma tela estiver aprovada. |
| `WorkspaceList`, `WorkspaceRow` e `WorkspaceState` | Listas acionáveis, estados vazios, carregamento e nova tentativa em Início, Agenda e Mais. |
| `CompanyPicker` e `useCompanies` | Seleção compartilhada entre Início, Agenda e Orçamentos. Outros módulos mantêm seleções próprias. |
| `Field`, `Chip` e `catalogStyles` | Campos, filtros, ações e superfícies reutilizadas em Catálogo, Calculadora, Orçamentos, Clientes e Propostas. A reutilização atual dá peso semelhante a filtros, navegação e comandos. |
| `EventRow` e `useQuoteFeed` | Apresentação de um orçamento datado e carregamento das filas recentes. |
| `confirmAction` | Confirmação de operações em Android, iOS e web. A página externa usa HTML, CSS e feedback próprios. |

## 2. Problemas de navegação e usabilidade

| Prioridade | Evidência no código | Consequência e proposta |
| --- | --- | --- |
| Alta | A empresa é compartilhada em três abas. Catálogo, Clientes, Calculadora avulsa e Propostas ainda resolvem o vínculo separadamente. Criação de empresa começa pelo Catálogo. | A pessoa pode mudar de contexto ao trocar de módulo. Propõe-se um seletor persistente e rotulado no ambiente de gestão, com onboarding próprio para conta sem empresa. A entrada por detalhe mantém a empresa do registro e exige vínculo válido. |
| Alta | Orçamento é aberto no estado interno da aba ou na rota singular. O comportamento de voltar e a combinação de título nativo com cabeçalho interno variam conforme a origem. Alguns caminhos empilham a Calculadora ou Propostas sobre o detalhe existente. | Padronizar entrada e saída de detalhes. Restaurar empresa, filtro e posição da lista de origem e dar destino previsível a um link aberto diretamente no web. |
| Alta | A emissão de proposta aparece para perfis elegíveis mesmo quando o orçamento ainda é rascunho. O banco também exige dados comerciais, cálculo e WhatsApp. A interface pede confirmação antes de algumas dessas validações retornarem. | Explicar os requisitos no detalhe ou na preparação da proposta, com ação para corrigir cada pendência. A RPC continua responsável por validar a emissão. |
| Alta | **Cadastrar e vincular** grava um cliente ao ser acionado no formulário de orçamento, independentemente do salvamento posterior do rascunho. Criar categoria no formulário de item também grava separadamente. | A pessoa pode cancelar o formulário principal e ainda encontrar registros novos. Tornar explícito o salvamento imediato e revisar o fluxo em cada formulário antes de propor qualquer mudança de persistência. |
| Média | Pendências no Início reúne rascunhos e prontos para revisão. A decisão de uma proposta fica em outra entidade. A Agenda inclui datas de rascunhos e propostas de evento ainda em negociação. | Nomear as filas de acordo com o que consultam e distinguir estado do orçamento, resposta da proposta e confirmação do evento. Qualquer regra para eventos confirmados requer definição do negócio. |
| Média | Há troca de empresa, atualização, filtros, paginação e ações de item em chips visualmente semelhantes. Na Calculadora, muitas etapas, ações de composição e campos disputam espaço. | Separar filtro, ação principal e menu contextual. Reduzir repetição de rótulos e cartões. Revisar a Calculadora como sequência com resumo acessível e preservação das regras financeiras. |
| Média | Propostas internas reúnem identidade, emissão, compartilhamento, versões e respostas. O token da emissão fica no estado da tela e o banco guarda seu hash. O portal afirma que a empresa foi avisada, enquanto o retorno observado consta da caixa interna. | Mover identidade comercial para gestão da empresa, distinguir emissão de acompanhamento e alinhar a mensagem ao canal efetivamente implementado. Avaliar qualquer opção de reenviar link dentro do modelo de segurança existente. |
| Média | Páginas de gestão usam título da pilha e título de conteúdo em várias entradas. Listas repetem botões como **Consultar**, **Abrir** e **Voltar**, e o Início e Mais duplicam **Minha conta**. | Priorizar uma linha acionável por registro e uma saída visível por jornada. No painel web, usar conta no cabeçalho. No app, usar Mais como destino estável para conta e configurações. |
| Média | A tela de Configurações exibe configuração técnica, acessível inclusive sem sessão. A entrada contém cadastro e login com peso semelhante. | Separar estado operacional da instalação de preferências da empresa e da conta. Rever instruções e ação primária de entrada na ficha de autenticação. |
| Média | Componentes têm mínimos declarados de 44–48 pontos em várias áreas. A densidade de chips, o contraste, o foco e a ampliação de fonte precisam de verificação nas telas envolvidas. | Validar leitura e área de toque em Android e iOS, além de teclado, foco e textos longos na web. Incluir carregamento, erro, vazio e retorno nos cenários da tela aprovada. |

### Controles sem ação e ações condicionadas

Nenhum botão visível sem manipulador foi identificado nas rotas e nos módulos inspecionados, incluindo o portal. Há ações com execução condicionada por sessão, vínculo, estado do registro, plataforma ou configuração. A emissão depende de revisão prévia do orçamento, a leitura da proposta depende do endpoint configurado e o compartilhamento de PDF no app depende da plataforma. O problema é a comunicação dessas condições antes do clique. O monograma do Início e os ícones que acompanham as linhas funcionam como identificação visual.

## 3. Arquitetura de informação proposta

### Aplicativo e painel web de gestão

Uma única conta Supabase Auth dá acesso às duas interfaces. Cada dispositivo ou navegador mantém a própria sessão. A autorização continua baseada em vínculos ativos e permissões da empresa, com RLS na leitura e na escrita. Mostrar ou ocultar uma ação no menu serve à usabilidade. A validação de acesso continua no banco ou no serviço existente.

- **Estrutura comum** — empresa ativa, área de trabalho, orçamentos, agenda, catálogo interno, clientes e propostas. Ao trocar de empresa, aplicar o novo contexto às listas e validar ações e deep links contra a empresa do registro. Abrir uma entidade pelo endereço deve preservar sua identificação, com erro orientado quando o vínculo ou o registro estiver indisponível.
- **Jornada comercial** — orçamento novo → dados e cliente → composição e cálculo quando autorizado → revisão → emissão de versão → acompanhamento de resposta. A Calculadora permanece contextual. A caixa de propostas atende acompanhamento transversal pelo perfil autorizado.
- **Jornada operacional** — Início ou Agenda → evento datado → orçamento de origem. Manter rótulos para registros ainda em planejamento.
- **Gestão do site** — Portfólio como módulo de gestão separado, sujeito a aprovação própria. Entradas propostas para lista de projetos, edição, prévia e publicação. A ação de publicar aparece somente para quem tiver a permissão aprovada por empresa.

### Site público para clientes

Experiência de descoberta, com endereço da empresa, apresentação, portfólio de decorações, detalhe de projeto, serviço e contato. O visitante explora trabalhos publicados, abre um projeto e pode entrar em contato ou solicitar orçamento por um canal que estiver implementado e configurado.

| Catálogo interno | Portfólio público |
| --- | --- |
| Balões, acervo e materiais usados na operação e na calculadora. | Projetos de decoração escolhidos para divulgação. |
| Itens, quantidades, custos e imagens internas, conforme vínculo. | Título, descrição, categoria, fotos aprovadas para divulgação, ordem e identificação pública da empresa. |
| Leitura e escrita sob as permissões de gestão. | Edição e publicação sob vínculo autorizado. Visitantes leem apenas os campos públicos dos projetos publicados. |

O fluxo editorial proposto é **Rascunho → Prévia privada → Publicar → Despublicar**. Editar um projeto já publicado deve permitir revisar as mudanças antes da nova publicação. A projeção pública da empresa expõe somente os campos destinados à divulgação, com mídia própria e retirada da vitrine após despublicação. Catálogo, clientes, orçamentos, fotos privadas e custos seguem sob controle interno. O modelo de dados, as políticas de publicação e o acesso às imagens precisam de revisão e aprovação antes de qualquer migração.

### Portal de propostas para clientes

Experiência transacional privada associada ao link e à versão emitida. A empresa compartilha o endereço. Quem recebe vê a versão comercial, condições, validade, referências e valor de venda, registra a decisão e consulta o resultado. Preservar o token, o controle de expiração e revogação, a versão congelada, a proteção contra indexação e os limites de dados da Edge Function.

O site pode divulgar um canal comercial. O portal abre diretamente pelo link enviado e opera sem exigir conta de gestão. As jornadas do cliente permanecem distintas, com o site navegável e a proposta individual fora dos menus públicos.

## 4. Recomendação para o menu principal

| Superfície | Menu recomendado | Ações contextuais |
| --- | --- | --- |
| Aplicativo | **Início · Orçamentos · Agenda · Catálogo · Mais**. Em Mais, agrupar Clientes e Propostas em Comercial e Conta e Configurações em Administração. Incluir Portfólio depois de suas ações estarem disponíveis. | Novo orçamento no Início e na lista. Calculadora a partir do orçamento e de item do Catálogo. Emissão e versões no detalhe do orçamento. |
| Painel web | Barra lateral com **Início, Orçamentos, Agenda, Clientes, Propostas e Catálogo**, filtrada por permissões. Agrupar Portfólio e Configurações da empresa em Gestão conforme forem aprovados. Empresa ativa e conta no cabeçalho. | Usar a largura maior para busca, filtros, listas e conteúdo do detalhe, com os mesmos conceitos e estados do app. |
| Site público | **Início · Portfólio · Contato**. Acrescentar Serviços quando houver conteúdo aprovado. | Consultar projeto publicado e acionar o canal de contato configurado. |
| Portal de propostas | Cabeçalho com marca da empresa e referência da versão. | Aprovar, negociar, recusar com opção de solicitar nova proposta e baixar PDF conforme status e validade. |

Para esta entrega, proponho manter as cinco abas no celular, adotar a barra lateral no painel web, centralizar o contexto de empresa e aprovar a separação entre catálogo interno, site público e portal de propostas.

## 5. Revisão individual e ponto de parada

Após aprovação da arquitetura, a próxima entrega proposta é a ficha da tela **Início**. Cada ficha deve apresentar objetivo, perfil de usuário, informações exibidas, componentes, ações e feedback de cada controle, entradas e saídas, integrações e permissões, proposta visual e critérios de aceitação observáveis. Estados internos de um módulo entram na ficha da superfície que os exibe ou recebem ficha própria quando constituírem uma jornada distinta.

Aprovar uma ficha autoriza somente a tela tratada. Se a implementação depender de mudança em outra tela, autenticação, permissões ou regras financeiras, apresentar a dependência para revisão. Após implementar a tela autorizada, verificar as ações reais e os estados de erro, vazio e carregamento, registrar os testes e aguardar autorização para a próxima.

**Verificação desta entrega** — inspeção estática de rotas, manipuladores, componentes, contratos de banco e página pública. A integração com ambiente hospedado, o comportamento em aparelhos e a leitura assistiva ficam para as fichas e implementações aprovadas.
