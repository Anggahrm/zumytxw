import { readdirSync } from 'fs';
import path from 'path';
import chalk from 'chalk';

export const commands = new Map();

export async function loadCommands() {
    const commandFiles = readdirSync('./src/commands/whatsapp').filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        try {
            const filePath = path.join(process.cwd(), 'src', 'commands', 'whatsapp', file);
            const commandModule = await import(`file://${filePath}`);
            const command = commandModule.default;

            if (command && command.name) {
                commands.set(command.name, command);
            }
        } catch (error) {
            console.error(chalk.red(`Gagal memuat perintah ${file}:`), error);
        }
    }
    console.log(chalk.blue(`[COMMANDS] Berhasil memuat ${commands.size} perintah.`));
}

export function getCommand(commandName) {
    const command = commands.get(commandName);
    if (command) return command;

    for (const cmd of commands.values()) {
        if (cmd.aliases && cmd.aliases.includes(commandName)) {
            return cmd;
        }
    }
    return undefined;
}