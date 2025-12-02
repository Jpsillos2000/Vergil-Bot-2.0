# Vergil Bot 2.0

Um bot de Discord multifuncional desenvolvido em Node.js, focado em música e entretenimento.

## 🚀 Funcionalidades

### 🎂 Sistema de Aniversários
O bot possui um sistema automático para parabenizar membros do servidor.

*   **Parabéns Automático:** Envia uma mensagem com Embed e GIF no canal configurado.
*   **Suporte Multi-Servidor:** Configurações independentes para cada servidor.
*   **Persistência:** Dados salvos localmente em JSON.

#### Comandos de Aniversário:
*   `/aniversario configurar [canal]` - Define em qual canal as mensagens de parabéns serão enviadas (Requer permissão de Gerenciar Canais).
*   `/aniversario adicionar [usuario] [data]` - Adiciona ou atualiza o aniversário de um usuário (Formato: DD/MM).
*   `/aniversario listar` - Mostra a lista de aniversariantes do servidor ordenados por data.

### 🎵 Música
(Funcionalidades de música baseadas no `discord.js` e `ytdl`)
*   Reprodução de áudio em canais de voz.

## 🛠️ Instalação e Configuração

1.  **Pré-requisitos:**
    *   Node.js (v16.9.0 ou superior)
    *   FFmpeg instalado no sistema (para reprodução de áudio e processamento de GIFs)

2.  **Instalação:**
    ```bash
    git clone https://github.com/Jpsillos2000/Vergil-Bot-2.0.git
    cd Vergil-Bot-2.0
    npm install
    ```

3.  **Configuração:**
    Crie um arquivo `.env` na raiz do projeto com o seguinte conteúdo:
    ```env
    DISCORD_TOKEN=seu_token_aqui
    CLIENT_ID=seu_client_id_aqui
    GUILD_ID=id_do_servidor_de_teste (opcional)
    ```

4.  **Rodando o Bot:**
    *   Desenvolvimento: `npm start`
    *   Deploy de comandos: `npm run deploy`

## 📂 Estrutura de Dados
Os aniversários são armazenados em `src/data/birthdays.json`. Este arquivo é criado automaticamente na primeira execução e **não** é rastreado pelo Git para manter a privacidade e configurações locais de cada instância.

## 📝 Licença
Este projeto está sob a licença ISC.
