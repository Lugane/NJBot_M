// backend/transcreverAudio.js
// backend/transcreverAudio.js
const vosk = require("vosk");
const fs = require("fs");
const wav = require("wav");
const path = require("path");
const os = require("os");
const { execFile } = require("child_process");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;

const MODEL_PATH = "./vosk-model-small-pt-0.3";
const SAMPLE_RATE = 16000;

// Verifica se o modelo existe
if (!fs.existsSync(MODEL_PATH)) {
  console.error("❌ Modelo Vosk não encontrado:", MODEL_PATH);
  process.exit(1);
}

const model = new vosk.Model(MODEL_PATH);

/**
 * Converte buffer OGG/Opus para WAV PCM 16kHz mono usando FFmpeg
 * @param {Buffer} oggBuffer
 * @returns {Promise<Buffer>}
 */
async function converterOggParaWav(oggBuffer) {
  return new Promise((resolve, reject) => {
    const inputPath = path.join(os.tmpdir(), `input-${Date.now()}.ogg`);
    const outputPath = path.join(os.tmpdir(), `output-${Date.now()}.wav`);

    fs.writeFileSync(inputPath, oggBuffer);

    execFile(ffmpegPath, [
      "-y",
      "-i", inputPath,
      "-ar", SAMPLE_RATE.toString(),
      "-ac", "1",
      "-f", "wav",
      outputPath
    ], (err) => {
      if (err) return reject(err);

      const wavBuffer = fs.readFileSync(outputPath);
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
      resolve(wavBuffer);
    });
  });
}

/**
 * Transcreve áudio WAV ou buffer de áudio OGG/Opus
 * @param {Buffer|string} input - buffer ou caminho do arquivo
 * @returns {Promise<string>} - texto transcrito
 */
async function transcreverAudio(input) {
  return new Promise(async (resolve, reject) => {
    try {
      let fileBuffer = input;

      // Se for buffer, converte para WAV PCM 16kHz mono
      if (Buffer.isBuffer(input)) {
        fileBuffer = await converterOggParaWav(input);
      }

      const tempPath = path.join(os.tmpdir(), `audio-${Date.now()}.wav`);
      fs.writeFileSync(tempPath, fileBuffer);

      const wfReader = new wav.Reader();

      wfReader.on("format", (format) => {
        if (format.sampleRate !== SAMPLE_RATE || format.audioFormat !== 1) {
          return reject(
            new Error("⚠️ O áudio precisa estar em WAV PCM 16kHz mono")
          );
        }

        const rec = new vosk.Recognizer({ model, sampleRate: SAMPLE_RATE });

        wfReader.on("data", (data) => rec.acceptWaveform(data));

        wfReader.on("end", () => {
          const result = rec.finalResult();
          rec.free();
          fs.unlinkSync(tempPath);
          resolve(result.text);
        });
      });

      fs.createReadStream(tempPath).pipe(wfReader);

    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { transcreverAudio, converterOggParaWav };
