# Vergil-Bot-2.0

## The Son of Sparda, now in your Discord Server!

Vergil-Bot-2.0 is a versatile Discord bot designed to bring the power and style of Vergil from Devil May Cry directly into your server. This bot combines robust Discord integration with advanced media processing, YouTube playback, and AI capabilities, all themed around the iconic character.

## Features

*   **Vergil-themed Interactions:** Engage with unique commands and responses inspired by Vergil.
*   **Voice Channel Integration:** Join voice channels, play audio, and manage voice states.
*   **YouTube Playback:** Play YouTube videos and manage queues directly in your voice channels.
*   **Media Processing:** Utilize FFmpeg for advanced audio/video manipulation (e.g., the "virgilize" command).
*   **AI Capabilities:** Leverage OpenAI for intelligent responses and interactions.
*   **Slash Commands:** Easy-to-use and discoverable commands via Discord's slash command interface.
*   **Docker Support:** Easily deploy and manage the bot using Docker.

## Technologies Used

*   **Node.js:** The JavaScript runtime environment for the bot's core logic.
*   **Discord.js:** A powerful library to interact with the Discord API.
*   **Python:** Used for specific functionalities, such as the `virgilize.py` script.
*   **FFmpeg:** Essential for audio and video processing, enabling features like YouTube playback and media manipulation.
*   **OpenAI:** Provides AI functionalities for enhanced bot interactions.
*   **Docker:** For containerization and simplified deployment.

## Prerequisites

Before you begin, ensure you have the following installed:

*   **Node.js** (v18.x or higher recommended)
*   **npm** (Node Package Manager, usually comes with Node.js)
*   **Python** (v3.x recommended)
*   **FFmpeg**: Ensure FFmpeg is installed and accessible in your system's PATH.
    *   **Linux:** `sudo apt install ffmpeg`
    *   **macOS:** `brew install ffmpeg`
    *   **Windows:** Download from [ffmpeg.org](https://ffmpeg.org/download.html) and add to PATH.
*   **Git**

## Getting Started

Follow these steps to set up and run Vergil-Bot-2.0 on your local machine or with Docker.

### Local Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Jpsillos2000/Vergil-Bot-2.0.git
    cd Vergil-Bot-2.0
    ```

2.  **Install Node.js dependencies:**
    ```bash
    npm install
    ```

3.  **Create a `.env` file:**
    Create a file named `.env` in the root directory of the project and add your Discord bot token and OpenAI API key:
    ```
    DISCORD_TOKEN=YOUR_DISCORD_BOT_TOKEN
    OPENAI_API_KEY=YOUR_OPENAI_API_KEY
    # Add any other environment variables here, if needed
    ```
    *Replace `YOUR_DISCORD_BOT_TOKEN` with your actual Discord bot token.*
    *Replace `YOUR_OPENAI_API_KEY` with your actual OpenAI API key.*

4.  **Deploy Slash Commands:**
    Before starting the bot for the first time, you need to deploy its slash commands to Discord:
    ```bash
    npm run deploy
    ```

5.  **Start the bot:**
    ```bash
    npm start
    ```
    This command will run `deleteCommands.js`, `deployCommands.js`, and then start `index.js` with `nodemon` for development.

### Docker Setup

1.  **Build the Docker image:**
    ```bash
    docker-compose build
    ```

2.  **Create a `.env` file:**
    Same as in the local setup, create a `.env` file with `DISCORD_TOKEN` and `OPENAI_API_KEY`.

3.  **Run the Docker containers:**
    ```bash
    docker-compose up -d
    ```
    This will start the bot in a detached Docker container.

## Usage

1.  **Invite the bot to your Discord server.** (Make sure you have "Manage Server" permissions to invite bots).
2.  **Ensure the bot has the necessary permissions** to join voice channels, speak, and send messages.
3.  **Use slash commands** (e.g., `/play <youtube_link>`, `/virgilize <text>`) to interact with the bot. Check Discord's command interface for available commands.

## Contributing

Contributions are welcome! If you have suggestions or want to improve the bot:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Commit your changes (`git commit -m 'Add new feature'`).
5.  Push to the branch (`git push origin feature/your-feature-name`).
6.  Open a Pull Request.

## License

This project is licensed under the ISC License. See the `LICENSE` file for more details.