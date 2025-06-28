import { startTelegramBot } from './bots/telegramBot.js';
import { loadStoredSessions } from './bots/whatsappBot.js';
import { loadCommands } from './handlers/commandHandler.js';
import chalk from 'chalk';
import fs from 'fs';
import config from './config.js';

const ensureDirectoryExistence = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(chalk.green(`Created directory: ${dirPath}`));
    }
};

async function main() {
    console.log(chalk.blue.bold('--- Telegram WhatsApp Bot Manager ---'));

    ensureDirectoryExistence(config.session.path);
    ensureDirectoryExistence(config.database.path);

    await loadCommands();
    
    const whatsAppBots = await loadStoredSessions();

    startTelegramBot(whatsAppBots);
    
    console.log(chalk.green.bold('\nApplication started successfully!'));
    console.log(chalk.yellow('Telegram Bot is running and managing WhatsApp bots.'));
}

main().catch(err => {
    console.error(chalk.red.bold('An unexpected error occurred:'), err);
    process.exit(1);
});