# ⚡ Vergil Bot 2.0

<div align="center">

![Vergil Status](https://img.shields.io/badge/Status-Online-green?style=for-the-badge)
![Node Version](https://img.shields.io/badge/Node.js-v16.9+-blue?style=for-the-badge&logo=node.js)
![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2?style=for-the-badge&logo=discord)
![License](https://img.shields.io/badge/License-ISC-yellow?style=for-the-badge)

<img src="https://media1.tenor.com/m/24R1W5-yU48AAAAC/dmc-devil-may-cry.gif" width="600" alt="Vergil Anime Gif">

**"I need more power!"** - *Vergil*

Um bot multifuncional para Discord focado em **Entretenimento**, **Música** e **Gerenciamento de Comunidade**. Desenvolvido para trazer motivação e funcionalidades robustas para o seu servidor.

</div>

---

## 📋 Índice

- [Funcionalidades](#-funcionalidades)
  - [🎂 Sistema de Aniversários](#-sistema-de-aniversários)
  - [🎵 Música Avançada](#-música-avançada)
  - [🎬 Virgilize (Edição de Vídeo)](#-virgilize)
  - [🛠️ Utilitários](#-utilitários)
- [Instalação e Configuração](#-instalação-e-configuração)
- [Deploy](#-deploy)

---

## 🚀 Funcionalidades

### 🎂 Sistema de Aniversários

O Vergil nunca esquece uma data importante. O bot gerencia e parabeniza automaticamente os membros do servidor através de um **Painel Interativo Moderno**.

- **Painel Unificado:** Controle tudo (Adicionar, Remover, Listar, Configurar) em um único Embed que se atualiza automaticamente.
- **Verificação Imediata:** Se o aniversário for hoje, o bot já envia os parabéns na hora.
- **Paginação:** Lista organizada com navegação por páginas.
- **Embed Personalizado:** Envia um cartão animado (GIF) anexado diretamente.

**Comando Único:**
`/aniversario` - Abre o painel interativo de gerenciamento.

---

### 🎵 Música Avançada

<div align="center">
  <img src="https://media.tenor.com/images/f0e8d7b85c140433828191b313468a73/tenor.gif" width="400" alt="Vergil Vibing">
</div>

Transforme seu canal de voz em uma arena de som com suporte a reprodução via YouTube, arquivos e links diretos.

-   **Interface Interativa:** Um painel de controle dinâmico que permanece no canal, permitindo controle total da reprodução diretamente pelos botões.
-   **Reprodução de Alta Qualidade:** Utiliza FFmpeg para processamento de áudio, garantindo a melhor experiência sonora.
-   **Fila Inteligente:** Adicione várias músicas à fila. O player avança automaticamente e oferece visualização e gerenciamento interativo da fila.

**Comando Principal:**

| Comando | Descrição |
| :--- | :--- |
| `/play [busca/link/arquivo]` | Inicia a reprodução de uma música ou adiciona-a à fila. Você pode usar: um link do YouTube/SoundCloud, um arquivo de mídia anexado, ou selecionar uma das músicas pré-definidas. |

---

### 🎬 Virgilize

A funcionalidade assinatura do bot. Coloca o **Vergil** (Devil May Cry) dentro dos seus vídeos ou imagens, aplicando o famoso meme "To Be Continued" ou cortes motivacionais.

- **Suporte a Docker e Local:** Roda perfeitamente tanto em containers quanto na sua máquina.
- **Processamento de Vídeo:** Utiliza Python (MoviePy + OpenCV) para editar vídeos dinamicamente.
- **Download Inteligente:** Baixa vídeos do YouTube (com recorte de tempo) ou usa anexos do Discord.

**Comandos:**
| Comando | Descrição |
| :--- | :--- |
| `/virgilize youtube [link] [inicio] [fim]` | Cria o meme a partir de um vídeo do YouTube. |
| `/virgilize attachment [arquivo] [inicio] [fim]` | Cria o meme a partir de um vídeo enviado. |

---

### 🛠️ Utilitários

Ferramentas para administração e manutenção do bot.

**Comandos:**
| Comando | Descrição |
| :--- | :--- |
| `/reload [comando]` | Recarrega um comando específico sem precisar reiniciar o bot (útil para desenvolvimento). |

---

## 🛠️ Instalação e Configuração

Siga estes passos para rodar o Vergil Bot 2.0 na sua máquina ou servidor.

### 1. Pré-requisitos
*   **Node.js** (v16.9.0 ou superior)
*   **Python 3.8+** (para o comando `/virgilize`)
*   **FFmpeg** (Essencial para Música e Vídeo). [Como instalar FFmpeg](https://ffmpeg.org/download.html).
*   **Docker** (Opcional, mas recomendado para evitar problemas de dependência).

### 2. Instalação (Via Docker - Recomendado)

```bash
# Clone o repositório
git clone https://github.com/Jpsillos2000/Vergil-Bot-2.0.git
cd Vergil-Bot-2.0

# Crie o arquivo .env com suas chaves (DISCORD_TOKEN, CLIENT_ID, GUILD_ID)
touch .env 

# Suba o container (isso instalará todas as dependências automaticamente)
docker-compose up --build -d
```

### 3. Instalação (Manual / Local)

```bash
# Clone
git clone https://github.com/Jpsillos2000/Vergil-Bot-2.0.git
cd Vergil-Bot-2.0

# Instale dependências Node
npm install

# Crie um ambiente Python e instale dependências
python3 -m venv .venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate   # Windows
pip install -r requirements.txt

# Inicie o bot
npm start
```

---

## 📦 Deploy (Registrar Comandos)

Sempre que criar ou editar comandos novos, você precisa registrá-los no Discord:

```bash
npm run deploy
```

Para apagar comandos antigos ou duplicados:
```bash
npm run deleta
```

---

<div align="center">

**Desenvolvido com ⚔️ Motivação**

<img src="https://media1.tenor.com/m/Xk0w2iK0m58AAAAd/vergil-dmc5.gif" width="100%" alt="Vergil Motivation">

</div>