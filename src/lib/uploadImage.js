import fetch from 'node-fetch';
import axios from 'axios';
import FormData from 'form-data';
import { fileTypeFromBuffer } from 'file-type';

const pomf = async (buffer) => {
    const { ext, mime } = (await fileTypeFromBuffer(buffer)) || {};
    const form = new FormData();
    form.append("files[]", buffer, { filename: `tmp.${ext}`, contentType: mime });
    try {
        const { data } = await axios.post("https://pomf.lain.la/upload.php", form, {
            headers: form.getHeaders(),
        });
        if (!data.success || !data.files || data.files.length === 0) {
            throw new Error('Upload ke pomf.lain.la gagal: format respons tidak valid.');
        }
        return data.files[0].url;
    } catch (error) {
        throw error;
    }
};

const fileIO = async (buffer) => {
    const { ext } = (await fileTypeFromBuffer(buffer)) || {};
    const form = new FormData();
    form.append('file', buffer, `tmp.${ext}`);
    const res = await fetch('https://file.io/?expires=1d', {
        method: 'POST',
        body: form
    });
    const json = await res.json();
    if (!json.success) throw json;
    return json.link;
};

export async function uploadImage(buffer) {
    let lastError = null;

    for (const uploadService of [pomf, fileIO]) {
        try {
            const result = await uploadService(buffer);
            return result;
        } catch (e) {
            lastError = e;
            console.error(`Gagal mengunggah menggunakan ${uploadService.name}:`, e.message);
        }
    }

    if (lastError) {
        throw new Error(`Semua layanan upload gagal. Error terakhir: ${lastError.message}`);
    }

    throw new Error('Tidak dapat mengunggah file.');
}