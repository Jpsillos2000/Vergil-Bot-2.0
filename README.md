# ⚡ Vergil Bot 2.0

<div align="center">

![Vergil Status](https://img.shields.io/badge/Status-Online-green?style=for-the-badge)
![Node Version](https://img.shields.io/badge/Node.js-v16.9+-blue?style=for-the-badge&logo=node.js)
![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2?style=for-the-badge&logo=discord)
![License](https://img.shields.io/badge/License-ISC-yellow?style=for-the-badge)

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

O Vergil nunca esquece uma data importante. O bot gerencia e parabeniza automaticamente os membros do servidor.

- **Persistência Inteligente:** Salva os dados localmente e evita mensagens duplicadas se o bot reiniciar.
- **Multi-Servidor:** Funciona em múltiplos servidores com configurações independentes.
- **Embed Personalizado:** Envia um cartão animado (GIF) anexado diretamente, garantindo que funcione sempre.

**Comandos:**
| Comando | Descrição | Permissão |
| :--- | :--- | :--- |
| `/aniversario configurar [canal]` | Define o canal de texto onde os parabéns serão enviados. | `Gerenciar Canais` |
| `/aniversario adicionar [usuario] [data]` | Cadastra ou atualiza o aniversário de alguém (Formato: DD/MM). | Livre |
| `/aniversario listar` | Exibe uma lista organizada de todos os aniversariantes do servidor. | Livre |

---

### 🎵 Música Avançada

Transforme seu canal de voz em uma arena de som com suporte a reprodução via YouTube.

- **Reprodução de Alta Qualidade:** Usa FFmpeg para processamento de áudio.
- **Fila Inteligente:** Suporte a adição de múltiplas músicas.
- **Controles:** Pause, Resume, Skip e Stop.

**Comandos:**
| Comando | Descrição |
| :--- | :--- |
| `/play [busca/link]` | Toca uma música do YouTube ou adiciona à fila. |
| `/stop` | Para a música e desconecta o bot. |
| `/skip` | Pula para a próxima música da fila. |
| `/pause` | Pausa a reprodução atual. |
| `/resume` | Retoma a reprodução pausada. |
| `/queue` | Mostra a fila de músicas atual. |

---

### 🎬 Virgilize

A funcionalidade assinatura do bot. Coloca o **Vergil** (Devil May Cry) dentro dos seus vídeos ou imagens.

- **Processamento de Vídeo:** Utiliza Python e OpenCV/FFmpeg para editar vídeos dinamicamente.
- **Green Screen:** Insere o Vergil em "chroma key" sobre o vídeo enviado.

**Comandos:**
| Comando | Descrição |
| :--- | :--- |
| `/virgilize [arquivo]` | Envie um vídeo ou imagem e receba uma versão "Motivated" com o Vergil. |

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
*   **Git**

### 2. Clonar o Repositório
```bash
git clone https://github.com/Jpsillos2000/Vergil-Bot-2.0.git
cd Vergil-Bot-2.0
```

### 3. Instalar Dependências
```bash
npm install
pip install -r requirements.txt  # Para as dependências Python do Virgilize
```

### 4. Configurar Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto e preencha:

```env
DISCORD_TOKEN=SEU_TOKEN_DO_BOT
CLIENT_ID=SEU_CLIENT_ID_DO_APP
GUILD_ID=ID_DO_SERVIDOR_DE_TESTE (Opcional, para deploy global deixe sem)
```

### 5. Iniciar
```bash
# Modo de Desenvolvimento (reinicia ao salvar arquivos)
npm run start

# Modo de Produção
node src/index.js
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

## 📂 Estrutura de Dados

*   `src/data/birthdays.json`: Armazena os aniversários de todos os servidores.
    *   *Nota:* Este arquivo é gerado automaticamente e **ignorado pelo Git** para segurança e privacidade dos dados.

---

<div align="center">

**Desenvolvido com ⚔️ Motivação**

</div>