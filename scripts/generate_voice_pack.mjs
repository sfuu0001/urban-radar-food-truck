import fs from 'fs';
import path from 'path';
import { GoogleGenAI, Modality } from '@google/genai';

function pcmToWav(pcmBuffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  pcmBuffer.copy(buffer, 44);
  return buffer;
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const OUT_DIR = path.resolve('public/audio');
fs.mkdirSync(OUT_DIR, { recursive: true });

const TASKS = [
  {
    file: 'audition_gentle_female.wav',
    voice: 'Kore',
    gender: 'female',
    text: '您好，欢迎光临流动餐车！真人知性女声为您提供亲切细致的播报服务。'
  },
  {
    file: 'audition_sweet_frontdesk.wav',
    voice: 'Kore',
    gender: 'female',
    text: '叮咚！欢迎光临，我是甜美前台领位，请问今天想吃点什么呢？'
  },
  {
    file: 'audition_steady_male.wav',
    voice: 'Charon',
    gender: 'male',
    text: '您好，我是沉稳专业男声播报员，专注为后厨制作、出餐提醒与安全运营提供清晰指令。'
  },
  {
    file: 'audition_speedy_rider.wav',
    voice: 'Puck',
    gender: 'male',
    text: '骑士您好！极速专送调度指令已准备，接单即走，保障每一单快速准时送达！'
  },
  {
    file: 'audition_energetic_rep.wav',
    voice: 'Kore',
    gender: 'female',
    text: '您好！我是元气活力客服，已开启加急提醒与快速响应通道，祝您用餐愉快！'
  },
  {
    file: 'alert_order_female.wav',
    voice: 'Kore',
    gender: 'female',
    text: '叮咚！您有新的自营专送订单，请及时接单处理！'
  },
  {
    file: 'alert_order_male.wav',
    voice: 'Charon',
    gender: 'male',
    text: '叮咚！您有新的外卖订单，请及时接单处理！'
  },
  {
    file: 'alert_call_pickup_female.wav',
    voice: 'Kore',
    gender: 'female',
    text: '请 A01 号顾客到餐车前台取餐！'
  },
  {
    file: 'alert_call_pickup_male.wav',
    voice: 'Charon',
    gender: 'male',
    text: '请 A01 号顾客到餐车前台取餐！'
  },
  {
    file: 'alert_call_table_female.wav',
    voice: 'Kore',
    gender: 'female',
    text: '请 B02 号顾客，两位就餐，桌位已准备就绪，请入座！'
  },
  {
    file: 'alert_call_table_male.wav',
    voice: 'Charon',
    gender: 'male',
    text: '请 B02 号顾客，两位就餐，请到堂食区就座！'
  },
  {
    file: 'alert_urgent_male.wav',
    voice: 'Charon',
    gender: 'male',
    text: '催单提醒！顾客发起了加急催单，请后厨优先出餐！'
  },
  {
    file: 'alert_rider_grab_male.wav',
    voice: 'Puck',
    gender: 'male',
    text: '骑士您好！收到新的顺路订单，配送费已锁定，请及时抢单！'
  },
  {
    file: 'alert_delivered_male.wav',
    voice: 'Puck',
    gender: 'male',
    text: '订单已确认妥投送达！配送佣金已即时入账！'
  }
];

async function generateWithRetry(task) {
  const filePath = path.join(OUT_DIR, task.file);
  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1000) {
    console.log(`[SKIP] Already exists: ${task.file}`);
    return;
  }

  let success = false;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      console.log(`[START] Generating ${task.file} (Voice: ${task.voice}, Attempt: ${attempt})...`);
      const res = await ai.models.generateContent({
        model: 'gemini-3.1-flash-tts-preview',
        contents: [{ parts: [{ text: task.text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: task.voice }
            }
          }
        }
      });
      const b64 = res.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!b64) throw new Error('No audio data returned');
      const pcm = Buffer.from(b64, 'base64');
      const wav = pcmToWav(pcm);
      fs.writeFileSync(filePath, wav);
      console.log(`[SUCCESS] Saved ${task.file}, size: ${wav.length} bytes`);
      success = true;
      break;
    } catch (err) {
      console.warn(`[WARN] Attempt ${attempt} failed: ${err.message}`);
      const waitSeconds = attempt * 25;
      console.log(`[WAIT] Sleeping for ${waitSeconds}s to respect rate limits...`);
      await new Promise(r => setTimeout(r, waitSeconds * 1000));
    }
  }
  if (!success) {
    console.error(`[ERROR] Failed to generate ${task.file}`);
  }
}

async function run() {
  for (const task of TASKS) {
    await generateWithRetry(task);
    // Delay between items to avoid hitting 3 req/min limit
    await new Promise(r => setTimeout(r, 22000));
  }
  console.log('All audio generation tasks completed.');
}

run();
