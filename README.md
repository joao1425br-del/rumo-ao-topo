# Rumo ao Topo — carreira de jogador de futebol (Android)

Stack: HTML5 + JavaScript (módulos ES) empacotado com Capacitor -> APK. Lógica do jogo em `www/js/core/` (sem dependência de interface, testável em Node).

## Rodar testes (Node 18+)
    node tests/test.mjs

## Gerar APK (NÃO testado neste ambiente: requer rede, Node e Android Studio)
    npm init -y
    npm i @capacitor/core @capacitor/cli @capacitor/android
    npx cap init "Rumo ao Topo" com.exemplo.rumoaotopo --web-dir=www
    npx cap add android
    npx cap sync
    npx cap open android      # Build > Build APK(s)

Para travar o app em paisagem: em android/app/src/main/AndroidManifest.xml, na tag <activity>, adicione
    android:screenOrientation="sensorLandscape"
(Em telas em pé o layout se adapta: o menu lateral vira barra inferior.)

## Etapa 1 — status
Concluído e testado: Copa Libertadores (32 clubes: 4 primeiros da Série A + campeão da Copa do Brasil + 28 clubes sul-americanos; 8 grupos de 4, oitavas/quartas/semis ida e volta, final única; clubes de fora são simulados ao fundo), evolução mais rápida com pontos de habilidade (4 por nível, +pontos extras na pré-temporada para jovens, atributos mais caros quanto mais altos, distribuição automática ou manual), loja de equipamentos (chuteiras de ritmo/chute/drible/passe, caneleira, colete, luvas, 3 níveis) e equipe de apoio (personal trainer, nutricionista, fisioterapeuta), Série A e Série B reais (40 clubes, 38 rodadas cada), acesso (4 primeiros da B) e rebaixamento (4 últimos da A) com consequências (moral, propostas de clubes da Série A para quem foi bem), Copa do Brasil com 24 clubes (20 da A + 4 melhores da B), envelhecimento real (sem XP após os 30, declínio crescente a partir dos 31), aposentadoria opcional entre 36 e 40 anos e obrigatória aos 41, tela de resumo da carreira (até 24 temporadas), Brasileirão Série A 2026 com os 20 clubes reais (força estimada), 38 rodadas em turno e returno, Copa do Brasil em mata-mata (ida e volta, final única), seleção nacional (convocação por overall e fase, 3 Datas FIFA por temporada), mini personagens com camisas dos clubes e replay do gol, painel de criação de personagem (abas Dados/Rosto/Cabelo/Olhos, boneco ao lado atualizando ao vivo, aleatório e padrão, camisa 1–99, 6 estilos de cabelo, 8 cores, 3 formatos de olhos, 3 bocas, acessórios), layout em paisagem (barra superior com perfil/XP/dinheiro, menu lateral, home com cartões Carreira/Jogo Rápido/Conquistas), Jogo Rápido (amistoso que não altera a carreira), interface estilo anime (personagem em ilustração com 4 estilos de cabelo, cores de pele/cabelo/olhos, radar de atributos), novas temporadas (envelhecimento, evolução, clubes mudam), troféus e prêmios (campeão, craque, artilheiro, revelação), renovação de contrato, treino semanal (técnico/físico/descanso), lesões, propostas de clubes maiores, transferência, contrato com salário e bônus por gol, partida ao vivo em 2D (campo, jogadores, bola, relógio, velocidades 1x/2x/4x e Pular), criação de jogador (overall 50–60), escolha de clube, calendário (14 rodadas), simulação de partidas, tabela, evolução por XP, titular/reserva, salvamento automático, Continuar/Nova Carreira.
Etapa 2 (novidades): **Série C** (20 clubes; sobem os 4 primeiros; sem Série D, ninguém cai), **rebaixamento da Série B** (4 últimos vão para a C), **playoff de acesso da Série B** (1º e 2º sobem direto; 3º x 6º e 4º x 5º em ida e volta, vencedores sobem; datas no calendário de quem joga a B), **Pré-Libertadores** (5º e 6º da Série A x os 2 estrangeiros mais fracos, ida e volta, antes da rodada 1; os vencedores completam os 32 da Libertadores) e **Copa Sul-Americana** (16 clubes: 7º–14º da Série A + 8 terceiros dos grupos da Libertadores; oitavas/quartas/semis ida e volta, final única). Novos clubes iniciais (2 da C), troféus (campeão da C, acesso C→B, Sul-Americana) e abas na tela Competições. Saves antigos são migrados (a Série C entra com a tabela zerada).
Pendente: tabela oficial da CBF (os confrontos de cada rodada são gerados, não são os oficiais), campeão da Sul-Americana não ganha vaga na Libertadores (simplificação), jogadores reais (os nomes de jogadores são fictícios; só 18 clubes da A têm titulares reais), Torneios extras, arte ilustrada de fundo/personagens (colocar imagens em www/assets), mais ligas e divisões, visual avançado da partida (camisas listradas), sons/animações extras, APK real. A composição e as forças da Série C são estimativas.


Observação: os titulares de 18 clubes da Série A têm nomes reais (cadastrados de memória em ROSTERS, data.js; podem estar desatualizados). Os demais são fictícios. Nomes de clubes reais e escudos exigem licença para publicação comercial. O jogo usa só os nomes e as cores dos clubes (sem escudos); as forças são estimativas do autor.


## Som e visual
- Visual **neon esportivo** (camada "SKIN v2" no fim de `www/css/style.css`): holofotes, bordas animadas, botões com brilho, barras listradas, faíscas no menu. Para voltar ao visual antigo, apague essa camada. Respeita "reduzir movimento" do sistema.
- `www/js/sfx.js`: apito, torcida, gol e cliques sintetizados (WebAudio, sem arquivos). Botão 🔊 na partida ao vivo.
- Partida: torcida nas arquibancadas com as cores dos clubes, rede nos gols, confete e tremor no gol, replay com zoom e legenda.


## Lances decisivos (jogabilidade interativa)
Durante a partida ao vivo o relógio **para** em até 4 lances por jogo (com 9+ minutos entre eles) e você escolhe a ação. As chances dependem dos seus atributos, da forma física e da moral:
- **Atacantes/meias/pontas** (bola sobra pra você): Chutar, Passar (assistência) ou Driblar.
- **Defensores/volantes** (ataque do rival): Fechar espaço (seguro), Desarmar (arriscado, mas gera contra-ataque) ou Falta tática (pode dar cartão).
- **Goleiro** (finalização no seu gol): Fechar o ângulo, Voar no canto ou Sair do gol.
Cada lance mexe na sua nota (e, por isso, no XP). Botão **🎯 ON/OFF** na partida liga e desliga os lances (a preferência fica salva); com OFF o jogo funciona como antes. **Pular** resolve os lances restantes no automático.

Como funciona por baixo: `simulateMatch(..., { interactive: true, decisions: [ids] })` devolve `moments` (cada um com `auto: true` se ainda não decidido). A simulação é determinística, então depois de cada escolha a rodada é **refeita do snapshot** com as mesmas decisões: o jogo é idêntico até aquele minuto e só muda dali em diante. Na carreira, a partida do jogador usa um gerador próprio (1 sorteio do principal), então os outros jogos da rodada nunca mudam. Equilíbrio medido em 1500 jogos por posição: gols do time e sofridos ficam a ±0,1 do modo normal.
