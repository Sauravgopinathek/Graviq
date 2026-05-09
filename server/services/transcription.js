const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const os = require('os');

const groqClient = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || 'missing-groq-api-key',
  baseURL: 'https://api.groq.com/openai/v1',
});

const WHISPER_MODEL = 'whisper-large-v3';

/**
 * Map a MIME type to a file extension that Groq/Whisper accepts.
 * Supported formats: mp3, mp4, mpeg, mpga, m4a, wav, webm, ogg, flac
 */
function mimeToExtension(mimeType) {
  const map = {
    'audio/webm': '.webm',
    'audio/ogg': '.ogg',
    'audio/wav': '.wav',
    'audio/wave': '.wav',
    'audio/x-wav': '.wav',
    'audio/mp3': '.mp3',
    'audio/mpeg': '.mp3',
    'audio/mp4': '.mp4',
    'audio/m4a': '.m4a',
    'audio/flac': '.flac',
    'audio/x-flac': '.flac',
    'video/webm': '.webm',
  };

  // Handle mime types with codecs like "audio/webm;codecs=opus"
  const baseMime = (mimeType || '').split(';')[0].trim().toLowerCase();
  return map[baseMime] || '.webm';
}

/**
 * Transcribe an audio buffer using Groq Whisper.
 * @param {Buffer} audioBuffer - The raw audio data
 * @param {string} mimeType - The MIME type of the audio (e.g. "audio/webm")
 * @returns {Promise<string>} The transcribed text
 */
async function transcribeAudio(audioBuffer, mimeType) {
  const ext = mimeToExtension(mimeType);
  const tmpFilePath = path.join(os.tmpdir(), `graviq_audio_${Date.now()}${ext}`);

  try {
    // Write audio buffer to a temp file
    fs.writeFileSync(tmpFilePath, audioBuffer);

    const transcription = await groqClient.audio.transcriptions.create({
      file: fs.createReadStream(tmpFilePath),
      model: WHISPER_MODEL,
      language: 'en', // Can be made configurable per bot
      response_format: 'text',
    });

    // The response is the transcribed text string when response_format is 'text'
    const text = typeof transcription === 'string'
      ? transcription.trim()
      : (transcription.text || '').trim();

    if (!text) {
      throw new Error('Transcription returned empty text');
    }

    return text;
  } catch (err) {
    console.error('Groq Whisper transcription error:', err.message);
    throw new Error(`Transcription failed: ${err.message}`);
  } finally {
    // Clean up temp file
    try {
      if (fs.existsSync(tmpFilePath)) {
        fs.unlinkSync(tmpFilePath);
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}

module.exports = { transcribeAudio };
