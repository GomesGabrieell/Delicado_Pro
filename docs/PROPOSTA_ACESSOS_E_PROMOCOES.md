# Acessos e promoções para revisão

## Cadastro e equipe

- **Cadastrar minha empresa** abre uma conta de proprietário. Após confirmar o e-mail, o primeiro login conclui o cadastro da empresa e do proprietário em uma única transação. Repetir a operação retorna o mesmo vínculo. Contas atuais mantêm seus vínculos. A migração deve identificar contas com mais de um vínculo ativo antes de adotar a regra de um espaço de trabalho por conta.
- **Solicitar vínculo** permite à pessoa criar sua própria conta e informar um código da empresa. A solicitação fica pendente até aprovação. O código identifica o destino e pode expirar ou ser revogado. O fluxo usa e-mail confirmado e evita divulgar nomes ou e-mails de empresas durante a busca.
- **Mais → Equipe e acessos** reúne solicitações pendentes, convites, funcionários ativos, edição de permissões e revogação. O proprietário também pode convidar um funcionário pelo e-mail. O funcionário define a própria senha no fluxo de autenticação. A aprovação grava o vínculo e as permissões na mesma transação.

| Controle por funcionário | Operações |
| --- | --- |
| Catálogo | Visualizar itens e, separadamente, cadastrar, editar e arquivar. |
| Clientes | Consultar clientes, acessar documentos e contatos, cadastrar, editar e arquivar conforme as permissões atribuídas. |
| Orçamentos | Visualizar, criar, editar e revisar conforme as permissões atribuídas. A agenda usa a permissão de visualização. |
| Calculadora | Usar a composição e, com permissão adicional, ver os custos e registrar o cálculo financeiro. |
| Propostas | Emitir, consultar ou revogar conforme as permissões atribuídas. A emissão libera as opções de compartilhamento no app. |
| Promoções | Consultar campanhas e, com permissão adicional, criar, editar ou cancelar. |

O proprietário pode iniciar a aprovação com visualização de clientes e orçamentos e uso da calculadora para composição. Pode alterar a seleção antes de aprovar ou depois. Permissões de equipe são reservadas ao proprietário por padrão. O banco exige vínculo ativo e a autorização da operação em tabelas, arquivos e RPCs. Conceder ou revogar acesso exige a autorização correspondente na empresa e não permite elevar o próprio acesso. A revogação vale para as chamadas seguintes, inclusive com a mesma sessão. Os testes devem verificar a ausência de acesso por chamada direta, entre empresas e após revogação.

## Carrinho e orçamento

O carrinho permite revisar itens e quantidades, selecionar o cliente e gerar um rascunho. A Calculadora usa essa composição para registrar o total e o desconto do orçamento em reais ou em percentual. A proposta já usa o total registrado quando é emitida. A evolução do banco deve permitir gerar um rascunho com composição e cliente em uma única transação, com identificador da operação para repetir uma tentativa sem duplicar o orçamento.

## Promoções

- **Mais → Promoções** permite nomear uma campanha, selecionar os itens, informar o percentual de desconto e definir início e fim. O horário da empresa orienta o preenchimento. A vigência usa o relógio do banco, com início inclusivo e término exclusivo.
- Campanhas ativas exibem os itens abrangidos e a vigência. Quando campanhas válidas coincidirem para um item, aplicar o maior percentual uma única vez. O desconto do orçamento incide em seguida sobre o subtotal resultante, juntamente com as demais parcelas calculadas pelas regras da Calculadora.
- Aplicar a promoção à parcela de venda do item. O custo permanece disponível para o cálculo de margem. O resumo deve exibir o desconto promocional, o desconto do orçamento e o total final. O banco revalida a promoção no registro do cálculo e grava os valores aplicados no orçamento para revisão e emissão posteriores.
- Cobrir em testes o começo e o fim da vigência, campanhas concorrentes, recálculo de rascunhos, permissões por empresa, arredondamento e o total exibido ao cliente.

As regras acima aguardam revisão antes da implementação das migrações correspondentes. A aplicação de migrações depende de aprovação.
