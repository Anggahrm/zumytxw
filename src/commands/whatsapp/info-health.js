import { healthMonitor } from '../../lib/utils.js';
import config from '../../config.js';

const handler = {};

handler.name = 'health';
handler.aliases = ['status-system', 'monitor'];
handler.description = 'Menampilkan status kesehatan sistem bot';
handler.tags = ['info'];
handler.groupOnly = false;
handler.adminOnly = false;
handler.ownerOnly = true; // Only owner can check health

handler.execute = async ({ m, sock }) => {
    try {
        const health = healthMonitor.getStatus();
        const nodeVersion = process.version;
        const platform = process.platform;
        
        const healthEmoji = health.status === 'healthy' ? '🟢' : 
                           health.status === 'warning' ? '🟡' : '🔴';
        
        const statusText = `${healthEmoji} *SYSTEM HEALTH MONITOR*

📊 *Status*: ${health.status.toUpperCase()}
⏱️ *Uptime*: ${health.uptime}
📈 *Requests*: ${health.requestCount}
❌ *Errors*: ${health.errorCount}
📉 *Error Rate*: ${health.errorRate}
💾 *Memory*: ${health.memoryUsage}

🤖 *Bot Info*:
• Name: ${config.whatsapp.botInfo.name}
• Node.js: ${nodeVersion}
• Platform: ${platform}
• Environment: ${config.app.environment}

${health.lastError ? `⚠️ *Last Error*: ${health.lastError.message}\n• Time: ${new Date(health.lastError.timestamp).toLocaleString('id-ID')}` : '✅ No recent errors'}

_Powered by ZumyTXW Health Monitor_`;

        await m.reply(statusText);
    } catch (error) {
        await m.reply('❌ Gagal mengambil status sistem: ' + error.message);
    }
};

export default handler;