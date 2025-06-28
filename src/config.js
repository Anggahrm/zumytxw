export default {
    // Telegram Configuration
    telegram: {
        botToken: 'xxx', // Ganti dengan token Anda, buat di botfather
        ownerId: 6026583608 // Ganti dengan ID Telegram Anda
    },
    
    // WhatsApp Configuration
    whatsapp: {
        ownerNumbers: ['6285123865643'], // Nomor owner dalam format internasional
        botInfo: {
            name: 'ZumyNext Multi-Device',
            author: 'anggahrm',
            website: 'https://zumynext.tech',
            thumbnail: 'https://files.catbox.moe/p5q4ro.jpg'
        }
    },

    apiKeys: {
        betabotz: '' //buat sendiri di betabotz api
    },

    database: {
        path: './databases'
    },
    
    session: {
        path: './sessions'
    }
};
