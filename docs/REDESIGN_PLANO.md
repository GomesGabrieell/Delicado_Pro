# Delicado Pro — Plano de redesign por etapas

**Estado:** auditoria para aprovação. O diagnóstico e o inventário estão em [REDESIGN_AUDITORIA.md](REDESIGN_AUDITORIA.md).

## 1. Checkpoint antes da implementação

O commit `318fb57` é o ancestral atual. Para recuperar a versão que está sendo avaliada, o checkpoint precisa incluir as alterações locais e as novas rotas, componentes e arquivos de UUID que ainda não são rastreados. Os arquivos desta auditoria também podem ser incluídos, como registro da base aprovada.

Após aprovação, a sequência sugerida é criar uma branch local a partir da árvore atual, revisar e registrar o snapshot. Execute em PowerShell, em `C:\appJulia`. Se já houver uma branch ou tag com esses nomes, escolha outros nomes antes de seguir.

```powershell
git status --short --branch
git diff --stat
git ls-files --others --exclude-standard
git check-ignore -- .env
git switch -c codex/checkpoint-delicado-pre-redesign
git add -u -- src
git add -- 'src/app/(principal)' src/app/orcamento.tsx src/components/WorkspaceControls.tsx src/dashboard src/navigation/useCompanies.ts src/services/randomUUID.ts src/services/randomUUID.web.ts docs/AUDITORIA_UX_UI.md docs/PLANEJAMENTO_UX_UI.md docs/REDESIGN_AUDITORIA.md docs/REDESIGN_PLANO.md
git diff --cached --check
git diff --cached --name-status
git diff --cached
```

Confirme que a revisão inclui as rotas reorganizadas, os arquivos ainda sem rastreamento e a correção de UUID. Se houver alterações legítimas novas, revise e inclua cada caminho em separado. Verifique que o índice está livre de segredos, tokens, configurações privadas e dados de clientes. O arquivo `.env` estava ignorado na auditoria.

```powershell
git commit -m "Registra checkpoint antes do redesign do Delicado Pro"
git tag -a delicado-pre-redesign -m "Base local aprovada para o redesign"
git log -1 --oneline
git status --short --branch
git switch -c codex/redesign-delicado
```

O ponteiro da branch de checkpoint e a tag ficam disponíveis localmente. Para consultar a base sem trocar a cópia de desenvolvimento, use `git show delicado-pre-redesign`. Se quiser executá-la em paralelo, crie outra árvore de trabalho com `git worktree add --detach C:/appJulia-checkpoint delicado-pre-redesign`. O backup externo, se necessário, deve preservar a confidencialidade do repositório. Nenhuma branch, tag ou commit foi criado nesta etapa.

## 2. Direção de experiência

Usar como referência a facilidade de reconhecer destinos, retomar uma tarefa e perceber o resultado de uma ação em aplicativos como WhatsApp. Aplicar esses princípios ao trabalho diário da empresa com navegação estável, listas de leitura rápida, agrupamento por tarefa, ações contextuais e resposta imediata a carregamento, erro e salvamento. Usar os tokens do Delicado Pro para preservar sua identidade.

- **Gestão mobile:** manter Início, Orçamentos, Agenda, Catálogo e Mais como ponto de partida para revisão. Clientes e respostas de propostas ficam em Mais. A Calculadora permanece ligada à composição e ao orçamento. Propor empresa ativa visível e retorno coerente ao ponto de origem.
- **Gestão web:** usar a mesma conta, permissões, entidades e rotas compatíveis. Avaliar navegação lateral e listas mais amplas quando o layout web tiver ficha própria.
- **Site público:** planejar descoberta e portfólio editorial separadamente do catálogo de operação. Publicação, leitura pública e mídia exigem revisão de modelo e acesso em etapa própria.
- **Portal de propostas:** manter entrada por link individual e versão emitida. Revisar apresentação e decisão do cliente preservando os contratos de consulta, resposta, revogação e PDF.

## 3. Ordem e mapa de arquivos

Os caminhos abaixo indicam os arquivos de interface previstos e os contratos que devem ser verificados. Cada linha é uma rodada de revisão. Quando houver várias superfícies, aprovar lista, detalhe e formulário separadamente antes de editar cada uma. Mudança compartilhada que alterar a experiência de outra tela entra em revisão própria.

| Rodada | Entrega | Arquivos previstos para alteração | Contratos a verificar |
| --- | --- | --- | --- |
| 01 | Auditoria e plano | `docs/REDESIGN_AUDITORIA.md`, `docs/REDESIGN_PLANO.md`. | Estado do Git, rotas, autorização e testes existentes. |
| 02 | Navegação de gestão e contexto da empresa | `src/app/(principal)/_layout.tsx`, `src/navigation/routes.ts`, `src/navigation/useCompanies.ts`. `src/app/_layout.tsx` e os pontos de entrada de cada módulo apenas na rodada aprovada e se a integração exigir. | Compatibilidade de links, retorno e alternância de empresa, restauração da sessão, vínculo ativo. Preservar as proteções do layout e os contratos do Supabase. |
| 03 | Início e adoção inicial do design system | `src/app/(principal)/index.tsx`, `src/screens/Dashboard.tsx`, `src/theme.ts`, `src/components/WorkspaceControls.tsx`. `src/dashboard/EventRow.tsx` só na revisão do componente compartilhado. | Filas de pendência e eventos reais, contexto de empresa, ausência de empresa, nova tentativa, abertura de orçamento. Uma variante nova pode evitar repercussão em telas pendentes. |
| 04 | Orçamentos | `src/app/(principal)/orcamentos.tsx`, `src/app/orcamento.tsx`, `src/quotes/QuotesScreen.tsx`. | Consultas, filtros, criação, vínculo de cliente, detalhe, composição, anexos, duplicação, arquivamento e transições. Preservar `src/quotes/repository.ts` como contrato salvo ajuste de integração aprovado. |
| 05 | Calculadora | `src/app/calculadora.tsx`, `src/calculator/CalculatorScreen.tsx`, `src/calculator/FinancialSteps.tsx`. | Três entradas, rascunhos salvos, resumo, itens indisponíveis e papéis. Preservar `src/calculator/finance.ts`, a representação de valores e os contratos de `src/calculator/repository.ts`. |
| 06 | Agenda | `src/app/(principal)/agenda.tsx`, `src/dashboard/EventRow.tsx`. | Ordenação, data local, paginação, status do orçamento e retorno. A edição da data permanece no orçamento. |
| 07 | Catálogo interno | `src/app/(principal)/catalogo.tsx`, `src/catalog/CatalogScreen.tsx`, `src/catalog/ItemForm.tsx`. Avaliar variantes em `src/catalog/controls.tsx` durante a adoção do design system. | Busca, filtros, categorias, fotos privadas, cadastro em HTTP e HTTPS, arquivamento e entrada na calculadora. Preservar `src/catalog/model.ts`, `repository.ts` e os adaptadores de foto e UUID. |
| 08 | Clientes | `src/app/clientes.tsx`, `src/clients/ClientsScreen.tsx`. | Lista, busca, documento e auditoria por papel, edição, arquivamento e orçamento vinculado. Preservar validações e RPCs em `src/clients/model.ts` e `repository.ts`. |
| 09 | Propostas internas | `src/app/propostas.tsx`, `src/proposals/ProposalsScreen.tsx`. | Requisitos de emissão, identidade, token, versões, compartilhamento, revogação e caixa de respostas. |
| 10 | Portal de propostas | `public-proposal/index.html`, `public-proposal/proposal.css`, `public-proposal/proposal.js`. | Contrato da Edge Function em `supabase/functions/public-proposal/`, imagens assinadas, estados do link, aprovação, negociação, recusa e PDF. Configuração de publicação via `public-proposal/config.js` somente no ambiente autorizado. |
| 11 | Mais, Minha conta, Configurações e Entrada | `src/app/(principal)/mais.tsx`, `src/app/perfil.tsx`, `src/screens/AccountScreen.tsx`, `src/app/configuracoes.tsx`, `src/app/entrar.tsx`, `src/screens/SignInScreen.tsx`. | Módulos por papel, distinção entre instalação e conta, cadastro, sessão e saída. `src/auth/useSession.ts` e `src/services/supabase.ts` ficam fora das mudanças visuais. |
| 12 | Layout do painel web | `src/app/(principal)/_layout.tsx`, `src/components/Screen.tsx` e componente web novo proposto em `src/navigation/`. | Foco de teclado, histórico do navegador, rotas existentes, mesmas permissões e contas do app. Aprovar a navegação web antes de adaptar cada tela. |
| 13 | Site público e gestão do portfólio | Proposta de novos caminhos `public-site/`, `src/portfolio/` e rota de gestão em `src/app/`. O mapa exato depende da aprovação do escopo. | Isolamento do catálogo privado, campos públicos, mídia e ciclo de publicação. Se houver migração, apresentar proposta de modelo e RLS e aguardar aprovação específica antes de implementar e aplicar. |

Analise o impacto em `src/components/ActionButton.tsx`, `src/components/Screen.tsx` e `src/catalog/controls.tsx` antes de alterar variantes existentes. Os arquivos de `supabase/migrations/` e as regras de finanças, sessão e permissões são referências de preservação para a remodelagem visual.

## 4. Riscos e evidências de preservação

| Risco | Evidência exigida por rodada quando aplicável |
| --- | --- |
| Perda de mudanças locais | Snapshot revisado com arquivos novos e rastreados. Diferença da rodada contém caminhos aprovados. |
| Vazamento ou acesso indevido entre empresas | Exercitar administrador, membro, vínculo revogado e conta de outra empresa. Verificar requisições e acesso no banco, além da visibilidade do menu. |
| Mudança no valor de orçamento ou perda de rascunho | Reabrir composição salva e orçamento existente. Conferir valores registrados e criação atômica pela Calculadora. Rodar os testes de cálculo e os testes SQL pertinentes em ambiente isolado autorizado. |
| Navegação quebrada ou estado perdido | Conferir rotas diretas, retorno do detalhe, mudança de guia, troca de empresa, informação local ainda em edição e preservação de filtro e posição. |
| Regressão em mídia e proposta | Verificar seleção, upload e reabertura de fotos. Testar HTTP por IP e HTTPS, UUID, versões, link válido, revogado e expirado, resposta e PDF conforme plataforma. |
| Ações inacessíveis ou feedback ausente | Verificar navegação por toque e teclado, leitor de tela, fonte ampliada, telas estreitas, carregamento, vazio, falha, nova tentativa e sucesso. |

## 5. Critério de início e parada

Para a próxima decisão, aprovar a ordem e o checkpoint. Antes de alterar uma interface, apresentar a ficha individual com objetivo, perfil, conteúdo, componentes, ações, entradas e saídas, integrações, proposta visual e critérios de aceitação. Depois de implementar a tela aprovada, rodar TypeScript, lint, testes existentes e a jornada relevante. Documentar arquivos, resultados e pendências e aguardar nova aprovação.

**Ponto atual:** entrega dos dois documentos da Etapa 01. Implementação, criação do checkpoint e mudanças no banco aguardam aprovação.
