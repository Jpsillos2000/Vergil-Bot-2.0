# Vergil Bot 2.0

Um bot para Discord com funcionalidades de música, desenvolvido em Node.js.

## Repositório

*   [https://github.com/Jpsillos2000/Vergil-Bot-2.0.git](https://github.com/Jpsillos2000/Vergil-Bot-2.0.git)

## Funcionalidades

*   Toca músicas em canais de voz.
*   Suporte a comandos de barra (slash commands).

## Comandos

*   `/play`: Toca uma música. (Funcionalidade inferida, precisa de verificação)

## Pré-requisitos

*   [Node.js](https://nodejs.org/)
*   [Docker](https://www.docker.com/) (Opcional, para rodar em um contêiner)

## Instalação

1.  Clone o repositório:
    ```bash
    git clone https://github.com/Jpsillos2000/Vergil-Bot-2.0.git
    cd Vergil-Bot-2.0
    ```

2.  Instale as dependências:
    ```bash
    npm install
    ```

3.  Configure suas credenciais:
    Crie um arquivo `.env` na raiz do projeto com o seguinte conteúdo:
    ```
    DISCORD_TOKEN=SEU_TOKEN_AQUI
    CLIENT_ID=SEU_CLIENT_ID_AQUI
    GUILD_ID=SEU_GUILD_ID_AQUI
    ```

## Uso

Para iniciar o bot em modo de desenvolvimento (com atualização automática ao salvar):
```bash
npm start
```

Para registrar os comandos de barra:
```bash
npm run deploy
```

Para apagar os comandos de barra:
```bash
npm run deleta
```

### Usando com Docker

1.  Construa a imagem:
    ```bash
    docker build -t vergil-bot .
    ```

2.  Inicie o contêiner:
    ```bash
    docker-compose up -d
    ```

## Dependências

*   `@discordjs/opus`: Opus bindings for Node.js
*   `@discordjs/voice`: Voice implementation for discord.js
*   `@snazzah/davey`: (Sem descrição encontrada)
*   `discord.js`: A powerful Node.js module for interacting with the Discord API
*   `ffmpeg-static`: ffmpeg static binaries for use with node projects
*   `libsodium-wrappers`: Low-level cryptographic library
*   `nodemon`: Monitor for any changes in your node.js application and automatically restart the server
*   `sodium`: A pure C/C++ implementation of libsodium

## Dev Dependências

*   `@eslint/js`: Core rules for ESLint
*   `eslint`: An AST-based pattern checker for JavaScript

## Licença

Este projeto está sob a licença ISC.

## Autor

(O autor não foi especificado no `package.json`)
