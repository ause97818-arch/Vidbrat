const express = require('express');
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

        const fps = 30;
        const duration = 3; // 3 seconds video
        const totalFrames = fps * duration;

        // Generate Frames using SVG (Bulletproof for emojis and text)
        for (let i = 0; i < totalFrames; i++) {
            let progress = i / totalFrames;
            let scale = Math.min(1, progress * 3); // Popup animation effect

            // Simple SVG template for exact Brat style box
            const svgContent = `
            <svg width="720" height="1280" xmlns="http://www.w3.org/2000/svg">
                <rect width="720" height="1280" fill="#0f0f0f"/>
                <g transform="translate(360, 640) scale(${scale}) translate(-360, -640)">
                    <!-- White Box -->
                    <rect x="85" y="440" width="550" height="400" fill="#ffffff" filter="drop-shadow(0px 0px 15px rgba(255,255,255,0.7))"/>
                    <!-- Text & Emojis -->
                    <text x="360" y="620" font-family="Arial, sans-serif" font-size="38" font-weight="bold" fill="#000000" text-anchor="middle">
                        ${escapeXml(textQuery)}
                    </text>
                    <!-- Watermark -->
                    <text x="360" y="790" font-family="Arial, sans-serif" font-size="18" fill="#666666" text-anchor="middle">
                        created by: VudBrat API
                    </text>
                </g>
            </svg>`;

            const framePath = path.join(framesDir, `frame_${String(i).padStart(4, '0')}.svg`);
            fs.writeFileSync(framePath, svgContent);
        }

        // Convert SVG frames to MP4 using FFmpeg
        await new Promise((resolve, reject) => {
            ffmpeg()
                .input(path.join(framesDir, 'frame_%04d.svg'))
                .inputFPS(fps)
                .output(outputVideoPath)
                .videoCodec('libx264')
                .outputOptions('-pix_fmt yuv420p')
                .on('end', resolve)
                .on('error', reject)
                .run();
        });

        // Send video response
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', 'inline; filename="vudbrat.mp4"');
        const videoStream = fs.createReadStream(outputVideoPath);
        videoStream.pipe(res);

        videoStream.on('close', () => {
            try {
                fs.rmSync(framesDir, { recursive: true, force: true });
                fs.unlinkSync(outputVideoPath);
            } catch (e) {}
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Video generation failed", details: error.message });
    }
});

function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
