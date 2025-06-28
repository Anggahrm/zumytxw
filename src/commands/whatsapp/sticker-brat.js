import axios from 'axios';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeExif } from '../../lib/sticker.js';

const execAsync = promisify(exec);

const handler = {};

handler.name = 'brat';
handler.aliases = [];
handler.description = 'Membuat stiker "brat" dari teks.';
handler.tags = ['sticker'];

handler.execute = async ({ m, sock, text }) => {
    if (!text) return m.reply('> Balas atau ketik pesan untuk membuat stiker brat.');
    
    await m.reply('⏳ Sedang membuat stiker...');

    try {
        if (text.includes('--animated')) {
            const words = text.replace("--animated", "").trim().split(" ");
            const tempDir = './tmp';
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

            const files = [];
            for (let i = 0; i < words.length; i++) {
                const phrase = words.slice(0, i + 1).join(" ");
                const { data } = await axios.get(`https://aqul-brat.hf.space/api/brat?text=${encodeURIComponent(phrase)}`, { responseType: 'arraybuffer' });
                const filePath = `${tempDir}/brat_${i}.mp4`;
                fs.writeFileSync(filePath, data);
                files.push(filePath);
            }

            const fileListPath = `${tempDir}/ffmpeg-list.txt`;
            let content = files.map(file => `file '${file}'\nduration 0.5\n`).join('');
            content += `file '${files[files.length - 1]}'\nduration 3\n`;
            fs.writeFileSync(fileListPath, content);

            const outputPath = `${tempDir}/output.mp4`;
            await execAsync(`ffmpeg -y -f concat -safe 0 -i ${fileListPath} -vf "fps=30" -c:v libx264 -preset veryfast -pix_fmt yuv420p -t 00:00:10 ${outputPath}`);

            const sticker = await writeExif({ mimetype: 'video/mp4', data: fs.readFileSync(outputPath) }, { packName: 'Brat Bot', packPublish: 'Anim' });
            await sock.sendMessage(m.chat, { sticker });

            [...files, fileListPath, outputPath].forEach(file => fs.existsSync(file) && fs.unlinkSync(file));

        } else {
            const { data } = await axios.get(`https://aqul-brat.hf.space/api/brat?text=${encodeURIComponent(text)}`, { responseType: 'arraybuffer' });
            const sticker = await writeExif({ mimetype: 'image/jpeg', data }, { packName: 'Brat Bot', packPublish: 'Static' });
            await sock.sendMessage(m.chat, { sticker });
        }
    } catch (error) {
        console.error('Error in brat command:', error);
        await m.reply('❌ Gagal membuat stiker brat. API mungkin sedang bermasalah.');
    }
};

export default handler;