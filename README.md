# Delicado Pro

Fundação mobile da Fase 1. Sem credenciais, o aplicativo permite navegar entre a tela de boas-vindas e a de configuração. Com um projeto Supabase configurado e uma conta existente, permite entrar, consultar a sessão e sair.

## Estrutura

| Caminho | Responsabilidade |
| --- | --- |
| `src/app/` | Rotas Expo Router e proteção por sessão. |
| `src/navigation/` | Destinos do painel, parâmetros de rota e contexto da sessão. |
| `src/screens/`, `src/components/` e `src/theme.ts` | Telas, componentes compartilhados e paleta visual. |
| `src/auth/` e `src/services/` | Ciclo de vida da sessão e cliente Supabase. |
| `src/catalog/` | Telas, validação e integração do Catálogo com o Supabase. |
| `src/calculator/` | Carrinho, composições e cálculo financeiro da Calculadora. |
| `supabase/migrations/` e `supabase/tests/` | Migrações da fundação e do Catálogo e testes pgTAP. |
| `docs/` | Escopo e proposta de segurança multiempresa. |

## Preparar o ambiente

Use Node.js 24. O projeto parte do Expo SDK 58, React Native 0.88, React 19.3 e TypeScript 6.

```powershell
Set-Location C:\appJulia
npm ci
Copy-Item .env.example .env
```

Preencha `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` com a URL e a chave `sb_publishable_` do painel **Connect** do Supabase. Reinicie o Metro após alterar o arquivo. As variáveis `EXPO_PUBLIC_` são incorporadas ao bundle. Use uma conta de teste existente no Auth, com o provedor e-mail e senha habilitado. Para testar a tela de configuração, deixe as variáveis vazias.

## Prévia ao vivo com Fast Refresh

Para abrir a prévia no navegador deste computador, execute `npm start -- --web --localhost --port 8082` e acesse [localhost:8082](http://localhost:8082). O modo de dispositivo do Chrome ou Edge (`F12`, depois `Ctrl+Shift+M`) permite visualizar a largura de uma tela de celular. O acesso aos módulos usa a conta e o Supabase configurados no `.env`.

No Windows, abra um terminal na raiz do projeto e mantenha o Metro em execução:

```powershell
Set-Location C:\appJulia
npm start -- --go --lan
```

Salve mudanças em `src/` com o aplicativo aberto. O Fast Refresh aplica as alterações de JavaScript e TypeScript automaticamente. Se necessário, ative **Fast Refresh** no menu de desenvolvimento ou pressione `r` no terminal para recarregar. Mudanças em dependências nativas ou na configuração nativa exigem reconstruir a build de desenvolvimento.

No Android físico, instale o Expo Go compatível com o SDK 58, conecte o celular ao mesmo Wi-Fi do computador e escaneie o QR code pelo Expo Go. Se a rede bloquear a comunicação, encerre o Metro com `Ctrl+C` e tente `npm start -- --go --tunnel`. O Expo pode solicitar login para criar o túnel.

[Fast Refresh e conexão do Expo](https://docs.expo.dev/get-started/start-developing/) · [Versões do Expo Go](https://expo.dev/go)

## Executar no emulador Android

Instale o Android Studio. No **SDK Manager**, instale **Android Emulator**, **Android SDK Platform-Tools** e uma imagem de sistema. No **Device Manager**, crie e inicie um dispositivo virtual. No PowerShell, aponte para o caminho mostrado no SDK Manager. O exemplo usa o caminho padrão do Windows:

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:Path"
adb devices
npm start -- --go --lan
```

Pressione `a` no terminal do Metro para abrir o app no emulador. Se o Metro já estiver aberto nesse terminal, use a sessão existente. Para salvar as variáveis entre sessões, configure-as nas variáveis de ambiente do usuário do Windows.

[Configuração do Android Studio e emulador](https://docs.expo.dev/workflow/android-studio-emulator/)

### Build de desenvolvimento no Android

Com Android Studio, SDK, JDK e um emulador ativo ou aparelho conectado via depuração USB, execute:

```sh
npm run android
```

O comando compila e instala a versão de desenvolvimento. Use `npm run android -- --device` para selecionar um aparelho. Nas próximas sessões, use `npm start -- --dev-client --lan` para conectar a build instalada ao Metro.

## Executar no iPhone

No Windows, use uma build de desenvolvimento assinada pelo EAS. Com uma conta Expo vinculada ao projeto e acesso ao Apple Developer Program, registre o iPhone e gere a build:

```sh
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest device:create
npx eas-cli@latest build --platform ios --profile development
```

Instale a build pelo link do EAS e ative o Modo Desenvolvedor no iPhone quando solicitado. Na mesma rede do computador, abra o QR code exibido por `npm start -- --dev-client --lan`. Se o Metro já estiver em execução com Expo Go, pressione `s` para trocar o QR code para a build de desenvolvimento.

O Expo Go para o SDK 58 no iPhone requer uma versão compatível distribuída via TestFlight com `npx eas-cli@latest go`. Para esse fluxo, entre na mesma conta Expo na CLI e no iPhone. [Opções para iPhone físico](https://docs.expo.dev/get-started/set-up-your-environment/?device=physical&platform=ios)

Para compilar localmente no macOS, instale o Xcode e execute `npm run ios -- --device`. Selecione o iPhone e configure a assinatura quando solicitado.

### Instalar uma build via EAS

Com acesso à conta Expo do projeto, inicialize o vínculo EAS e gere a build de prévia da plataforma desejada. O perfil `preview` gera um APK no Android e usa distribuição ad hoc no iPhone, com Apple Developer Program e registro do aparelho. Os identificadores iniciais estão em `app.json`. Confirme a disponibilidade de `com.delicadopro.app` na sua conta antes de assinar a build.

Caso a pasta ainda esteja sem Git, inicialize o repositório com `git init` antes de usar o EAS.

```sh
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --platform android --profile preview
npx eas-cli@latest device:create
npx eas-cli@latest build --platform ios --profile preview
```

Para incluir a configuração Supabase na build, cadastre as duas variáveis públicas no ambiente `preview` do projeto EAS. Instale no aparelho pelo link gerado. A build de prévia inclui o bundle JavaScript e roda sem Metro.

[Builds de desenvolvimento](https://docs.expo.dev/develop/development-builds/create-a-build/) · [Distribuição interna](https://docs.expo.dev/build/internal-distribution/) · [Variáveis no EAS](https://docs.expo.dev/eas/environment-variables/)

## Verificações

```sh
npm run typecheck
npx expo install --check
npx expo-doctor
npx expo export --platform all
```

## Validar o Catálogo

Use um projeto Supabase de desenvolvimento. Para executar em um ambiente local novo com Docker e Supabase CLI, rode:

```sh
npx supabase init
npx supabase start
npx supabase migration up --local
npx supabase test db
npx supabase status
```

Execute `init` uma vez. Use a chave publicável e a URL da API no `.env`. Para acesso por dispositivo físico, ajuste a URL local para o IP do computador na mesma rede e confirme que o aparelho alcança a porta da API. Para um projeto hospedado, aplique as migrações pendentes na ordem dos nomes após aprovação.

1. No Supabase Auth, crie uma conta de teste com e-mail e senha. Reinicie o Metro, entre no app e abra **Início → Catálogo**. Crie uma empresa, selecione-a e confirme a lista vazia.
2. Em **Balões**, cadastre um item, confirme o custo unitário calculado e selecione uma foto. Abra os detalhes, edite, arquive e reative pelo filtro **Arquivados**.
3. Em **Acervo**, selecione uma categoria inicial ou crie uma categoria e cadastre um item próprio ou alugado. Em **Materiais complementares**, informe a quantidade, a unidade e o custo total daquela quantidade. Verifique a pesquisa por texto, os filtros e a ordenação.
4. Com uma segunda conta Auth, associe o usuário como `member` na empresa de teste via RPC `set_company_member` chamada com a sessão do proprietário. Entre com a segunda conta e confirme a leitura, inclusive da foto. Ações de cadastro e edição ficam disponíveis para `owner` e `admin`. Com um vínculo em outra empresa, confirme que o catálogo é independente.

O upload grava JPEG de até 5 MB em um bucket privado. O app usa links de visualização com validade de 60 segundos. As categorias iniciais são gravadas pelo banco quando a empresa é criada. O catálogo começa sem itens.

## Validar a Calculadora

Consulte as [regras adotadas](docs/REGRAS_CALCULADORA.md). Aplique a migração da Calculadora no Supabase de desenvolvimento e cadastre produtos ativos no Catálogo da empresa.

1. Entre como administrador ou proprietário e abra **Início → Calculadora**. Selecione a empresa e adicione produtos pelas etapas **Balões**, **Acervo** e **Materiais complementares**.
2. Altere quantidades, teste os dois modos de embalagem e remova um item. Preencha as etapas de despesas, transporte e mão de obra conforme o evento.
3. Em **Formação do preço**, informe um percentual específico ou configure e salve o padrão da empresa. Compare o resumo antes e depois de um desconto. Para validar o alerta de prejuízo, aplique um desconto que deixe o preço abaixo do custo.
4. Entre como funcionário, salve a composição e reabra-a em **Composições salvas**. Entre novamente como administrador da mesma empresa para revisá-la. Confira que o funcionário vê apenas produtos e quantidades e que uma conta de outra empresa não vê a composição.

Execute `npm run test:calculator` para testar o motor financeiro e `npx supabase test db` para verificar as permissões e o isolamento.

## Validar Orçamentos no Android e iPhone

Aplique as migrações pendentes até `20261113000400_orcamentos.sql` no Supabase de desenvolvimento e configure o `.env`. No Android, abra o QR de `npm start -- --go --lan` no Expo Go compatível. No iPhone, use a build de desenvolvimento do projeto e `npm start -- --dev-client --lan`, conforme a seção de execução no iPhone.

1. Entre e abra **Início → Orçamentos**. Escolha a empresa, crie um rascunho, vincule um cliente e informe data, local, decoração e pagamento. Salve e anote o código.
2. Abra o orçamento, edite os dados e anexe uma imagem. Reabra o aplicativo e busque pelo código para conferir a persistência e o histórico.
3. Como administrador, abra a calculadora pelo orçamento, use itens reais e registre o cálculo na etapa **Resumo**. Altere um custo no Catálogo e confira que a consulta do orçamento mantém os valores registrados. Um novo cálculo salvo explicitamente substitui o anterior.
4. Marque **Pronto para revisão**, confira que é preciso reabrir o rascunho para editar, e duplique. A cópia recebe um novo código. Filtre pelos estados e confira o histórico.
5. Entre como funcionário da mesma empresa. Confira a criação e edição de rascunhos e a consulta de imagens. Verifique que os controles financeiros e de estado restrito ficam indisponíveis. Entre com uma conta de outra empresa para verificar o isolamento.

Os estados desta fase são Rascunho, Pronto para revisão e Arquivado. Pronto para revisão exige cliente, data, local e cálculo registrado. O histórico registra operações. O código usa o ano de emissão no fuso de São Paulo e um contador por empresa. A duplicação por administrador preserva a composição e o resumo, e a cópia feita por funcionário conserva os dados operacionais. A suíte `supabase/tests/quotes.test.sql` cobre as regras do banco.

## Validar Clientes no Android e iPhone

Aplique as migrações pendentes até `20261113000500_clientes.sql` em um Supabase de desenvolvimento e configure o `.env`. No Android, abra o QR code de `npm start -- --go --lan`. No iPhone, use a build de desenvolvimento com `npm start -- --dev-client --lan`.

1. Entre como proprietário ou administrador e abra **Início → Clientes**. Selecione a empresa, cadastre um cliente com os dados autorizados para teste e consulte-o por nome e documento. Tente cadastrar o mesmo documento novamente para conferir a validação de duplicidade.
2. Edite os dados, feche e reabra o aplicativo e confira o cadastro e a auditoria. A trilha guarda autor, data, operação e nomes dos campos alterados.
3. No cadastro, toque em **Novo orçamento**, confirme que o cliente está selecionado e salve. Volte ao cadastro e abra o orçamento pelo histórico. Arquive o cliente, confira que ele aparece no filtro **Arquivados** e que o histórico permanece acessível. Reative para habilitar novos vínculos.
4. Entre como funcionário para conferir o acesso ao nome e aos orçamentos da empresa. O funcionário pode vincular clientes ativos e criar um cadastro básico pelo fluxo de Orçamentos. Dados pessoais, busca por documento, edição do cadastro e arquivamento são restritos a administradores e proprietários. Use outra empresa para conferir o isolamento.

A migração amplia a tabela `quote_clients` preservando os IDs. Novos módulos podem usar o vínculo composto `(company_id, client_id)`, como Orçamentos, para agregar seus próprios registros ao histórico com RLS. O app exibe somente os orçamentos existentes. O nome é único por empresa conforme a regra anterior, e o documento normalizado, quando informado, também é único por empresa, inclusive para arquivados.

Execute `node --test tests/clients.test.mjs` para testar as validações locais e `npx supabase test db` para testar persistência, permissões e isolamento. [Cálculo dos dígitos verificadores do CNPJ alfanumérico](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj)

## Propostas comerciais

### Site comercial e pedidos de orçamento

Na raiz do projeto, execute `node public-proposal/serve.mjs` e abra
[o site comercial local](http://127.0.0.1:8786/). O servidor lê a URL e a chave publicável do Supabase do `.env`.

Para habilitar o botão da tela **Contato** no aplicativo, preencha `EXPO_PUBLIC_CONTACT_PAGE_URL` com a URL completa da página `contato.html` do site comercial e gere um novo bundle.

1. Abra **Solicitar orçamento**, entre com uma conta de e-mail confirmado e preencha os dados do evento.
   Em **Continuar para o catálogo**, selecione os itens, ajuste as quantidades e volte para revisar o pedido.
   Para cadastro e recuperação de senha, permita `http://127.0.0.1:8786/orcamento.html` no Supabase Auth.
   Abra o e-mail no mesmo navegador e na mesma origem em que iniciou o fluxo para concluir o PKCE.
2. Após revisão e aplicação autorizada das migrações `20261116000100_solicitacoes_site.sql` e
   `20261116000200_catalogo_site.sql`, cadastre em
   `private.website_portals` o slug `delicado-pro` e o UUID da empresa receptora. Use `DELICADO_PORTAL_SLUG`
   no ambiente local se o slug cadastrado for outro.
3. No app, com uma conta proprietária ativa dessa empresa, abra **Orçamentos → Pedidos do site**.
   Abra o pedido, confira os dados e use **Criar orçamento** para abrir um rascunho vinculado ao cliente.

O formulário usa o e-mail confirmado do usuário e o banco resolve a empresa receptora pelo slug cadastrado.
Com a migração `20261116001100_cliente_na_solicitacao.sql`, o envio do pedido cria ou reutiliza o cadastro
em **Clientes** da empresa receptora. A equipe acompanha a solicitação e decide quando criar o orçamento.
Pedidos anteriores à migração recebem o vínculo quando forem convertidos, caso ainda estejam sem orçamento.
O catálogo exibe os itens ativos dessa empresa e suas fotos disponíveis. Os custos internos não são enviados ao site.
Somente proprietários ativos da empresa podem consultar e administrar os pedidos.
Uma tentativa sem confirmação permanece no rascunho, com a mesma chave e o mesmo conteúdo para confirmar o envio.
A migração `20261116000300_restringir_envio_legado_site.sql` restringe a chamada direta da função antiga.
Antes de aplicar, confira se integrações externas ainda a chamam e execute `supabase/tests/website_requests.test.sql`
em uma instância de teste com as migrações aplicadas. O teste usa uma transação revertida ao final.
O fluxo de resposta a uma proposta já emitida fica em `proposta.html`. O redirecionamento da página inicial aceita o formato dos links antigos. A consulta depende da Edge Function publicada.

O app React Native emite versões comerciais a partir de **Orçamentos → Propostas comerciais**. A pasta [public-proposal](public-proposal/) é a página independente que o cliente abre no navegador.

O endereço do portal no Sites é `https://delicado-pro-propostas.gabriel-3218.chatgpt.site`. Os dados de cada proposta só são carregados com o link emitido pelo app. Configure `PROPOSAL_WEB_ORIGIN` com esse endereço na Edge Function e, após testar a integração, use o mesmo endereço em `EXPO_PUBLIC_PROPOSAL_PAGE_URL` ao gerar o APK Android.

1. Aplique as migrações pendentes até `20261113000600_propostas.sql` no Supabase de desenvolvimento autorizado. Na CLI vinculada a esse projeto, configure a origem HTTPS da página e publique a Edge Function:

   ```sh
   npx supabase secrets set PROPOSAL_WEB_ORIGIN=https://propostas.seudominio.com
   npx supabase functions deploy public-proposal --no-verify-jwt
   ```

   A função valida o token da proposta em cada operação. Use a origem exata da página, sem caminho nem barra final. A chave de serviço fica no ambiente da função. Em um projeto de teste dedicado à prévia local, a origem do site é `http://127.0.0.1:8786`. Uma versão Android de distribuição requer a URL HTTPS da proposta.
2. Em `public-proposal/config.js`, configure `endpoint` com a URL da função, por exemplo `https://<projeto>.supabase.co/functions/v1/public-proposal`. Sirva apenas a pasta `public-proposal/` em HTTPS e preencha `EXPO_PUBLIC_PROPOSAL_PAGE_URL` no `.env` do app com o endereço completo dessa página. Reinicie o Expo. Para produção, desabilite analytics nessa página e configure `Referrer-Policy: no-referrer` e `X-Robots-Tag: noindex, nofollow, noarchive` no host.
3. Como administrador ou proprietário, abra um orçamento **Pronto para revisão** com cliente, cálculo, descrição e condições de pagamento. Abra **Propostas comerciais**, salve nome, cor e WhatsApp com DDI em **Identidade comercial** e emita. Copie o link nessa tela e use **Compartilhar pelo WhatsApp** para concluir o envio. A emissão é o registro de envio no sistema e inicia a validade de 48 horas. O WhatsApp exige o envio manual da mensagem.
4. Abra o link completo em outro navegador sem login. Confira o conteúdo e baixe o PDF. No Android e iPhone, o app também oferece compartilhamento do PDF pela folha do sistema. Valide propostas distintas para **Aprovar**, **Negociar** e **Não aprovar**, incluindo a pergunta sobre nova proposta e a mensagem do WhatsApp.
5. No app, abra **Propostas → Novas** e atualize a lista. Confira a resposta e seu horário e marque como lida. As notificações ficam nessa caixa de entrada. Confira também que um link alterado, revogado ou expirado não permite consulta, resposta nem PDF.

Cada emissão cria uma versão com conteúdo comercial congelado. As versões anteriores sem resposta perdem o link quando uma nova versão é emitida. A resposta não altera o estado do orçamento. O token fica no fragmento da URL, e o banco guarda seu hash. Imagens usam links assinados de curta duração. O PDF aceita até 12 MB de imagens em conjunto. A mensagem de agradecimento está em `public-proposal/proposal.js`. O prompt mestre disponível no repositório ainda não especifica seu texto.

Execute `npx supabase test db` para validar emissão, segurança e respostas. A exportação do Expo verifica os bundles. Teste o envio pelo WhatsApp e o download do PDF em dispositivos após publicar a página e a função.

## Publicação na Cloudflare Workers

Na origem publicada do portal, salve a rota `/admin` nos favoritos para acessar a área da empresa. O painel pede login quando necessário e exige vínculo ativo. O rodapé do site comercial oferece o link **Meus orçamentos** para o Portal do Cliente.

Com Node.js 24, rode os comandos abaixo a partir da raiz do projeto. O build lê a URL do Supabase e a chave publicável do ambiente ou do `.env`. O Wrangler publica o site comercial, o Portal do Cliente e o Expo Web na mesma origem.

```powershell
npm ci
npm run cloudflare:build
npx wrangler@4.163.0 login
npx wrangler@4.163.0 deploy
```

Use `npx wrangler@4.163.0 dev` depois do build para conferir as rotas localmente. Antes de divulgar o endereço hospedado, adicione a URL de retorno `https://<origem>/orcamento.html` aos redirecionamentos do Supabase Auth e inclua a origem em `PROPOSAL_WEB_ORIGIN` quando a função `public-proposal` estiver publicada. Preserve as outras origens em uso. O catálogo e o portal dependem das migrações correspondentes no Supabase, que devem ser avaliadas e aplicadas separadamente.
