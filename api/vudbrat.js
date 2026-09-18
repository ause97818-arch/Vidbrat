const { createCanvas } = require('canvas');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');

ffmpeg.setFfmpegPath(ffmpegPath);

module.exports = async (req, res) => {
    const textQuery = req.query.text || "heyy i am happy 🙂❤️‍🩹";
    const tmpDir = '/tmp';
    const outputVideoPath = path.join(tmpDir, 'output.mp4');

    try {
        // 1. Canvas setup (Video resolution: 720x1280 - Vertical/Reels format)
        const width = 720;
        const height = 1280;
        const fps = 30;
        const duration = 4; // 4 seconds video
        const totalFrames = fps * duration;

        // Frames save karne ke liye temporary folder
        const framesDir = path.join(tmpDir, 'frames');
        if (!fs.existsSync(framesDir)) {
            fs.mkdirSync(framesDir, { recursive: true });
        }

        // 2. Generate Frames with Popup & Glow Animation
        for (let i = 0; i < totalFrames; i++) {
            const canvas = createCanvas(width, height);
            const ctx = canvas.getContext('2d');

            // Dark Background
            ctx.fillStyle = '#0f0f0f';
            ctx.fillRect(0, 0, width, height);

            // Animation Progress (Popup effect calculation)
            let progress = i / totalFrames;
            let scale = Math.min(1, progress * 3); // Quick zoom-in popup

            ctx.save();
            ctx.translate(width / 2, height / 2);
            ctx.scale(scale, scale);

            // Glowing / Shining border effect around the box
            ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
            ctx.shadowBlur = 20 + Math.sin(i * 0.2) * 10; // Pulsing light effect

            // White Card Background
            ctx.fillStyle = '#ffffff';
            ctx.roundRect = (x, y, w, h, r) => {
                ctx.beginPath();
                ctx.moveTo(x + r, y);
                ctx.arcTo(x + w, y, x + w, y + h, r);
                ctx.arcTo(x + w, y + h, x, y + h, r);
                ctx.arcTo(x, y + h, x, y, r);
                ctx.arcTo(x, y, x + w, y, r);
                ctx.closePath();
                ctx.fill();
            };
            
            // Draw Box
            const boxWidth = 550;
            const boxHeight = 400;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);
            
            ctx.restore();

            // Text Setup (Supporting Emojis & Symbols)
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 36px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Text wrapping for long sentences
            wrapText(ctx, textQuery, width / 2, height / 2, boxWidth - 60, 50);

            // Watermark / Footer text (Jaise video me tha)
            ctx.fillStyle = '#777777';
            ctx.font = '20px sans-serif';
            ctx.fillText("created by: VudBrat API", width / 2, height / 2 + 250);

            // Save frame file
            const framePath = path.join(framesDir, `frame_${String(i).padStart(4, '0')}.png`);
            const buffer = canvas.toBuffer('image/png');
            fs.writeFileSync(framePath, buffer);
        }

        // 3. Compile Frames into MP4 using FFmpeg
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

        // 4. Send Video Response
        const videoBuffer = fs.readFileSync(outputVideoPath);
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', 'inline; filename="vudbrat.mp4"');
        res.send(videoBuffer);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Video generation failed", details: error.message });
    }
};

// Helper function to handle text wrapping inside the box
function wrapText(context, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let lines = [];

    for (let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + ' ';
        let metrics = context.measureText(testLine);
        let testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
        } else {
            line = testLine;
        }
    }
    lines.push(line);

    // Center align multiline text vertically
    let startY = y - ((lines.length - 1) * lineHeight) / 2;
    for (let k = 0; k < lines.length; k++) {
        context.fillText(lines[k], x, startY + (k * lineHeight));
    }
}

