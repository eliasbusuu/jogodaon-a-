# 🐆 Jogo da Onça 3D

Jogo de tabuleiro (Adugo) em 3D que roda direto no navegador, no computador e no celular, com partidas online por **sala privada** e modo contra o computador (fácil, médio, difícil).

**Não precisa de conta, servidor nem configuração.** O online usa [PeerJS](https://peerjs.com) (WebRTC): os dois jogadores se conectam direto um ao outro, usando o código da sala. Por isso funciona em hospedagem estática, como o GitHub Pages.

## Publicar no GitHub Pages

1. Crie uma conta em https://github.com (se ainda não tiver) e clique em **New repository**. Nome sugerido: `jogo-da-onca`. Deixe **Public**.
2. Na página do repositório vazio, clique em **uploading an existing file**, arraste **todos os arquivos desta pasta** (`index.html`, `style.css`, `game.js`, `board3d.js`, `pieces3d.js`, `rules.js`, `ai.js`, `multiplayer.js`, `sounds.js`, `package.json` e este `README.md`) e clique em **Commit changes**. Os arquivos precisam ficar na raiz do repositório, não dentro de uma subpasta.
3. Vá em **Settings → Pages**. Em *Build and deployment*, escolha **Deploy from a branch**, branch **main**, pasta **/ (root)** e clique em **Save**.
4. Espere 1 a 2 minutos. O endereço aparece no topo da mesma página e é no formato:
   `https://SEU-USUARIO.github.io/jogo-da-onca/`
5. Abra o link para conferir. É esse link que você envia para os amigos.

## Jogar com um amigo

1. Abra o link, toque em **CRIAR SALA**, digite seu nome e escolha seu lado (onça, cachorros ou sorteio).
2. Aparece um código como `ONCA-4821`. Toque em **COPIAR CÓDIGO** e mande para seu amigo, junto com o link do jogo.
3. Seu amigo abre o link, toca em **ENTRAR EM UMA SALA**, digita o nome e o código.
4. A partida começa sozinha quando ele entrar. Quem não consegue mover na vez vê "Vez do adversário".

Se alguém atualizar a página, ela volta sozinha para a partida (por até 12 horas). Se o anfitrião fechar a aba e voltar, o convidado reconecta automaticamente. Ao final, **NOVA PARTIDA** troca os lados.

## Testar no seu computador (opcional)

Os módulos JavaScript não abrem por duplo clique no arquivo. Use um servidor local:

```
python -m http.server 8000
```

e abra http://localhost:8000.

## Placar e tela cheia

- O **placar** soma as partidas ganhas (você × adversário) e fica salvo no aparelho. Contra o computador há um placar único; online, um por sala (continua em **NOVA PARTIDA** e ao atualizar a página). Não há botão para zerar: no online o placar volta a zero encerrando a sala e criando outra.
- **TELA CHEIA** aparece no menu e durante a partida (não existe no iPhone, cujo Safari não permite).

## Regras implementadas

- 31 pontos: quadrado 5×5 com diagonais + triângulo de 6 pontos que sai do ponto central da base. Peças só andam por linhas existentes.
- 14 cachorros (já começam no tabuleiro, nas 3 primeiras fileiras) e 1 onça (começa no centro e joga primeiro).
- A onça captura saltando em linha reta sobre um cachorro até o ponto vazio seguinte. Capturas em sequência são permitidas (botão **ENCERRAR JOGADA** para parar).
- Vitória da onça com 5 capturas; vitória dos cachorros ao bloquear todos os movimentos da onça.

Toda a lógica está em `rules.js` (sem dependências), e é a mesma usada pelo jogo, pela IA e para validar as jogadas online.

## Arquivos

| Arquivo | Função |
|---|---|
| `index.html`, `style.css` | Tela inicial, janelas, interface |
| `game.js` | Controle da partida, turnos, interface |
| `rules.js` | Tabuleiro, movimentos, capturas, vitória |
| `board3d.js` | Tabuleiro 3D, câmera, destaques, cliques |
| `pieces3d.js` | Onça-pintada e 14 cachorros em 3D, animações |
| `multiplayer.js` | Salas online (PeerJS), validação, reconexão |
| `ai.js` | Computador (minimax com poda alfa-beta) |
| `sounds.js` | Efeitos sonoros sintetizados |

## Segurança do online

O anfitrião é a autoridade: toda jogada do convidado é checada com `rules.js` antes de valer, então o convidado não consegue mover peças fora das regras nem jogar fora da vez. Não há senhas nem credenciais no código.

## Limitações conhecidas

- Depende dos servidores públicos gratuitos do PeerJS (só para o primeiro contato) e de WebRTC. Em redes muito restritivas (algumas redes corporativas ou de operadoras) a conexão direta pode falhar; nesse caso, troque de rede (ex.: Wi-Fi ↔ dados móveis).
- Se o anfitrião fechar o jogo, a sala some (não há servidor guardando partidas). Ele pode reabrir a mesma página em até 12 horas para retomar.
- A desconexão é percebida quando o navegador do adversário fecha a conexão; em queda brusca de internet pode demorar alguns segundos.
- Os modelos 3D são feitos por código (formas simples), não são modelos escaneados.
