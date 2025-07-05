# ZumyTXW - Telegram WhatsApp Bot Manager

A sophisticated WhatsApp bot manager controlled via Telegram, built with Node.js and Baileys.

## ✨ Features

- 🤖 **Multi-Bot Management**: Manage multiple WhatsApp bots from a single Telegram interface
- 🔐 **Role-based Access**: Different user roles with varying bot limits
- 📱 **Pairing Code**: Easy bot setup with pairing codes instead of QR scanning
- 🗄️ **Persistent Storage**: JSON-based database for user data and settings
- 🛡️ **Security**: Input validation, rate limiting, and error handling
- 🎨 **Rich Commands**: Sticker creation, TikTok downloader, store management
- 🔄 **Auto-reconnect**: Automatic reconnection for WhatsApp bots
- 📊 **Status Monitoring**: Real-time bot status tracking

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Telegram Bot Token (from [@BotFather](https://t.me/botfather))
- BetaBotz API Key (optional, for TikTok downloader)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd zumytxw
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
   TELEGRAM_OWNER_ID=your_telegram_user_id_here
   WHATSAPP_OWNER_NUMBERS=6285123865643,6281234567890
   BETABOTZ_API_KEY=your_betabotz_api_key_here
   ```

4. **Start the application**
   ```bash
   npm start
   ```

## 📋 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TELEGRAM_BOT_TOKEN` | Your Telegram bot token | ✅ |
| `TELEGRAM_OWNER_ID` | Your Telegram user ID | ✅ |
| `WHATSAPP_OWNER_NUMBERS` | Comma-separated WhatsApp owner numbers | ✅ |
| `BETABOTZ_API_KEY` | API key for TikTok downloader | ❌ |
| `BOT_NAME` | Bot display name | ❌ |
| `BOT_AUTHOR` | Bot author name | ❌ |
| `DATABASE_PATH` | Database storage path | ❌ |
| `SESSION_PATH` | Session storage path | ❌ |

### User Roles

- **Free**: 1 bot limit
- **Premium**: 3 bot limit  
- **VIP**: 5 bot limit
- **Developer**: Unlimited bots + admin commands

## 🎯 Telegram Commands

### User Commands
- `/start` or `/menu` - Show main menu
- `/add <phone_number>` - Add new WhatsApp bot
- `/list` - List your bots and their status
- `/delete <phone_number>` - Delete a bot
- `/restart <phone_number>` - Restart a bot

### Developer Commands
- `/setrole <user_id> <role>` - Change user role

## 🤖 WhatsApp Commands

### Main Commands
- `!menu` or `!help` - Show command menu
- `!status` - Show bot status

### Sticker Commands
- `!sticker` or `!s` - Create sticker from image/video
- `!brat <text>` - Create "brat" style sticker

### Store Management (Group Admin Only)
- `!addlist <name>` - Add item to group store
- `!dellist <name>` - Remove item from store
- `!list` - Show all store items

### Downloader Commands
- `!tiktok <url>` - Download TikTok video

## 🏗️ Project Structure

```
src/
├── bots/
│   ├── telegramBot.js      # Telegram bot logic
│   └── whatsappBot.js      # WhatsApp bot creation & management
├── commands/
│   └── whatsapp/           # WhatsApp command handlers
├── handlers/
│   ├── commandHandler.js   # Command loading & routing
│   ├── messageHandler.js   # Message processing
│   └── connectionHandler.js # Connection management
├── lib/
│   ├── database.js         # Database management
│   ├── logger.js           # Logging utilities
│   ├── utils.js            # Utility functions
│   ├── serialize.js        # Message serialization
│   ├── simple.js           # WhatsApp socket wrapper
│   ├── sticker.js          # Sticker creation
│   └── uploadImage.js      # Image upload utilities
├── config.js               # Configuration management
└── index.js                # Application entry point
```

## 🔧 Development

### Adding New Commands

1. Create a new file in `src/commands/whatsapp/`
2. Export a command object with required properties:

```javascript
const handler = {};

handler.name = 'commandname';
handler.aliases = ['alias1', 'alias2'];
handler.description = 'Command description';
handler.tags = ['category'];
handler.groupOnly = false; // Optional
handler.adminOnly = false; // Optional

handler.execute = async ({ m, sock, db, text, args }) => {
    // Command logic here
    await m.reply('Response message');
};

export default handler;
```

### Database Structure

The application uses JSON files for data persistence:

- `databases/telegram_database.json` - Telegram user data
- `databases/<phone>/database.json` - WhatsApp bot data per number
- `sessions/<phone>/` - WhatsApp session data per number

## 🛡️ Security Features

- **Input Validation**: All user inputs are validated and sanitized
- **Rate Limiting**: Prevents API abuse
- **Error Handling**: Structured error handling with user-friendly messages
- **Path Validation**: Prevents directory traversal attacks
- **Environment Variables**: Sensitive data stored securely

## 🔄 Error Handling

The application includes comprehensive error handling:

- Automatic reconnection for WhatsApp bots
- Graceful degradation when services are unavailable
- User-friendly error messages
- Detailed logging for debugging

## 📝 Logging

Structured logging with different levels:
- `error` - Critical errors
- `warn` - Warning messages
- `info` - General information
- `debug` - Debug information

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Credits

- **Original Author**: anggahrm
- **Improved by**: Gemini AI
- **Framework**: [Baileys](https://github.com/whiskeysockets/Baileys) for WhatsApp integration
- **Telegram**: [Telegraf](https://telegraf.js.org/) for Telegram bot

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Contact the maintainers

---

**⚠️ Disclaimer**: This bot is for educational purposes. Use responsibly and comply with WhatsApp's Terms of Service.