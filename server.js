const express = require('express');
const { createCanvas } = require('canvas');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');

ffmpeg.setFfmpegPath(ffmpegPath);
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/api/vudbrat', async (req, res) => {
    const textQuery = req.query.text || "heyy i am happy 🙂❤️‍🩹";
    const tmpDir = '/tmp';
    const uniqueId = Date.now();
    const outputVideoPath = path.join(tmpDir, `vudbrat_${uniqueId}.mp4`);
    const framesDir = path.join(tmpDir, `frames_${uniqueId}`);

    try {
        if (!fs.existsSync(framesDir)) {
            fs.mkdirSync(framesDir, { recursive: true });
        }

        const width = 720;
        const height = 1280;
        const fps = 30;
        const duration = 3; // 3 seconds video
        const totalFrames = fps * duration;

        // 1. Generate PNG frames using Canvas (Docker environment supports canvas perfectly)
        for (let i = 0; i < totalFrames; i++) {
            const canvas = createCanvas(width, height);
            const ctx = canvas.getContext('2d');

            // Dark Background
            ctx.fillStyle = '#0f0f0f';
            ctx.fillRect(0, 0, width, height);

            let progress = i / totalFrames;
            let scale = Math.min(1, progress * 3); // Popup animation

            ctx.save();
            ctx.translate(width / 2, height / 2);
            ctx.scale(scale, scale);

            const boxWidth = 550;
            const boxHeight = 400;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);
            ctx.restore();

            // Text and Emojis Setup
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 36px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            wrapText(ctx, textQuery, width / 2, height / 2, boxWidth - 60, 50);

            // Watermark
            ctx.fillStyle = '#777777';
            ctx.font = '20px sans-serif';
            ctx.fillText("created by: VudBrat API", width / 2, height / 2 + 250);

            const framePath = path.join(framesDir, `frame_${String(i).padStart(4, '0')}.png`);
            fs.writeFileSync(framePath, canvas.toBuffer('image/png'));
        }

        // 2. Compile PNG frames into MP4 using FFmpeg
        await new Promise((resolve, reject) => {
            ffmpeg()
                .input(path.join(framesDir, 'frame_%04d.png'))
                .inputFPS(fps)
                .output(outputVideoPath)
                .videoCodec('libx264')
                .outputOptions('-pix_fmt yuv420p')
                .on('end', resolve)
                .on('error', reject)
                .run();
        });

        // 3. Upload generated video to your CDN API
        const videoBuffer = fs.readFileSync(outputVideoPath);
        const blob = new Blob([videoBuffer], { type: 'video/mp4' });
        const formData = new FormData();
        formData.append('file', blob, `vudbrat_${uniqueId}.mp4`);

        const cdnResponse = await fetch('https://cdnfiles.zone.id/api/upload', {
            method: 'POST',
            body: formData
        });

        const cdnResult = await cdnResponse.json();

        // 4. Cleanup local temp files
        try {
            fs.rmSync(framesDir, { recursive: true, force: true });
            fs.unlinkSync(outputVideoPath);
        } catch (e) {}

        // 5. Send final CDN response back to the user
        res.json({
            status: "success",
            message: "Video generated and uploaded successfully!",
            data: cdnResult
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Video generation failed", details: error.message });
    }
});

function wrapText(context, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let lines = [];

    for (let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + ' ';
        let metrics = context.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
        } else {
            line = testLine;
        }
    }
    lines.push(line);

    let startY = y - ((lines.length - 1) * lineHeight) / 2;
    for (let k = 0; k < lines.length; k++) {
        context.fillText(lines[k], x, startY + (k * lineHeight));
    }
}

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
