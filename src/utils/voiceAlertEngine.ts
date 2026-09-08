// Obsidian Food Truck - Real-Human Style Voice Alert & Web Audio Synthesizer Engine
// 真人风格语音播报与高保真声学和弦引擎（去人机机械声、智能神经语音优选、自然呼吸节奏、广播队列管理、自动播放激活）

import { globalBluetoothAudio } from './bluetoothAudioEngine';

export type VoicePersonaId = 
  | 'gentle_female'     // 知性温柔女声 (大堂经理级，温润优雅，天然去机械感)
  | 'steady_male'       // 稳重专业男声 (新闻级播报，浑厚从容，字正腔圆)
  | 'vitality_cheer'    // 热情活力客服 (元气明快，适合快节奏自营出单)
  | 'sweet_frontdesk'   // 甜美前台领位 (甜润清亮，专为前台叫号与等位排队)
  | 'rider_speed';      // 极速骑手调度 (清晰穿透，专为户外骑行与车载耳机调校)

export type ChimeStyleId = 
  | 'crystal_bell'      // 大堂水晶和弦 (三音暖声和弦，优雅高贵)
  | 'classic_dingdong'  // 餐厅招牌双音 (标准经典叮咚)
  | 'rider_uplift'      // 骑士穿透双音 (高频明亮跃升音，穿透街道杂音)
  | 'urgent_double'     // 急促温和双闪 (急迫但不刺耳的提示和弦)
  | 'soft_success';     // 妥投完工和弦 (温暖轻快的四度和弦)

export interface VoicePersonaConfig {
  id: VoicePersonaId;
  name: string;
  title: string;
  gender: 'female' | 'male';
  genderLabel: string;
  description: string;
  badge: string;
  avatarIcon: string;
  audioUrl: string;
  sampleText: string;
  defaultPitch: number;
  defaultRate: number;
  voiceKeywords: string[];
}

export const VOICE_PERSONAS: VoicePersonaConfig[] = [
  {
    id: 'gentle_female',
    name: '知性温润女声',
    title: '大堂经理音色',
    gender: 'female',
    genderLabel: '真人女声 · 知性大堂',
    description: '语调亲切温婉、吐字自然流畅，母带级高保真真人女声录音，完全杜绝低端人机电音感。',
    badge: '推荐 · 默认真人体感',
    avatarIcon: '🎙️',
    audioUrl: '/audio/audition_gentle_female.wav',
    sampleText: '您好，欢迎光临流动餐车！真人知性女声为您提供亲切细致的播报服务。',
    defaultPitch: 1.02,
    defaultRate: 0.96,
    voiceKeywords: ['Xiaoxiao', 'Xiaoyi', 'Tingting', 'Sin-ji', 'Mei-Jia', 'Female', '女', 'zh-CN-XiaoxiaoNeural', 'Microsoft Xiaoxiao', 'zh-CN-Xiaoxiao']
  },
  {
    id: 'sweet_frontdesk',
    name: '甜美前台领位',
    title: '迎宾等位专属',
    gender: 'female',
    genderLabel: '真人女声 · 甜美迎宾',
    description: '清脆甜美、轻柔亲和，宛如迎宾小姐姐现场呼叫，营造宾至如归的就餐体验。',
    badge: '叫号与等位推荐',
    avatarIcon: '🛎️',
    audioUrl: '/audio/audition_sweet_frontdesk.wav',
    sampleText: '叮咚！欢迎光临，我是甜美前台领位，请问今天想吃点什么呢？',
    defaultPitch: 1.22,
    defaultRate: 0.98,
    voiceKeywords: ['Xiaoyan', 'Xiaoni', 'Xiaomeng', 'Xiaohan', 'Yu-shu', 'Tingting', 'Mei-Jia', 'Female', '女', 'zh-CN-XiaoyanNeural', 'Microsoft Xiaoyan']
  },
  {
    id: 'steady_male',
    name: '稳重专业男声',
    title: '资深播音员音色',
    gender: 'male',
    genderLabel: '真人男声 · 沉稳浑厚',
    description: '浑厚沉着、雄性磁性，完全脱离机械音，与女声呈现鲜明性别反差，适合后厨大单。',
    badge: '后厨沉稳男声',
    avatarIcon: '👔',
    audioUrl: '/audio/audition_steady_male.wav',
    sampleText: '您好，这是纯正的真人沉稳男声，专注为后厨制作与安全运营提供清晰指令！',
    defaultPitch: 0.70,
    defaultRate: 0.94,
    voiceKeywords: ['Yunxi', 'Yunjian', 'Yunyang', 'Kangkang', 'Li-mu', 'Haohao', 'Lairong', 'Danny', 'Male', '男', 'zh-CN-YunxiNeural', 'Microsoft Yunxi', 'zh-CN-YunjianNeural']
  },
  {
    id: 'vitality_cheer',
    name: '热情活力客服',
    title: '元气快餐出单音色',
    gender: 'female',
    genderLabel: '真人女声 · 元气客服',
    description: '饱满热情、阳光活泼，瞬间唤醒听觉，高峰期出餐不沉闷。',
    badge: '自营爆单推荐',
    avatarIcon: '⚡',
    audioUrl: '/audio/audition_energetic_rep.wav',
    sampleText: '您好，这是纯正的真人元气女声，快速接单出餐！',
    defaultPitch: 1.14,
    defaultRate: 1.10,
    voiceKeywords: ['Xiaoni', 'Xiaomeng', 'Google 普通话', 'HiuGaai', 'Zhiwei', 'zh-CN-XiaoniNeural', 'Natural', 'Neural']
  },
  {
    id: 'rider_speed',
    name: '极速骑士调度',
    title: '专送穿透男声',
    gender: 'male',
    genderLabel: '真人男声 · 极速青年',
    description: '干脆利落、穿透力强，专门针对户外骑行佩戴耳机或嘈杂街道调校的刚健男声。',
    badge: '骑手调度男声',
    avatarIcon: '🛵',
    audioUrl: '/audio/audition_speedy_rider.wav',
    sampleText: '骑士您好，这是纯正的真人男声调度，极速专送指令已准备！',
    defaultPitch: 0.78,
    defaultRate: 1.12,
    voiceKeywords: ['Yunyang', 'Yunjian', 'Yunxi', 'Zhiwei', 'Kangkang', 'Li-mu', 'Male', '男', 'zh-CN-YunyangNeural']
  }
];

export interface VoiceConfig {
  enabled: boolean;
  volume: number; // 0.1 to 1.0
  rate: number; // 0.7 to 1.4
  pitch: number; // 0.8 to 1.3
  persona: VoicePersonaId;
  selectedVoiceName?: string;
  chimeStyle: ChimeStyleId;
  soundEffectEnabled: boolean;
  humanCadenceEnabled: boolean; // 自然人声呼吸韵律与停顿优化 (核心去机械声)
  
  // 业务场景独立开关
  autoPlayNewOrder: boolean;   // 商家端：自营新订单播报
  autoPlayUrgent: boolean;     // 商家端：顾客催单与超时预警
  autoPlayCalling: boolean;    // 前台端：取餐叫号广播
  autoPlayQueueWait: boolean;  // 等位端：排队叫号与进度提醒
  autoPlayRiderPool: boolean;  // 骑手端：新顺路订单派发待抢
  autoPlayRiderAction: boolean;// 骑手端：抢单/取餐/妥投状态播报
}

const STORAGE_KEY = 'obsidian_merchant_voice_config_v2';

const DEFAULT_CONFIG: VoiceConfig = {
  enabled: true,
  volume: 1.0,
  rate: 1.0,
  pitch: 1.0,
  persona: 'gentle_female',
  chimeStyle: 'crystal_bell',
  soundEffectEnabled: true,
  humanCadenceEnabled: true,
  autoPlayNewOrder: true,
  autoPlayUrgent: true,
  autoPlayCalling: true,
  autoPlayQueueWait: true,
  autoPlayRiderPool: true,
  autoPlayRiderAction: true
};

let inMemoryVoiceConfig: VoiceConfig | null = null;

export function getVoiceConfig(): VoiceConfig {
  if (inMemoryVoiceConfig) {
    return inMemoryVoiceConfig;
  }
  if (typeof window === 'undefined') {
    return DEFAULT_CONFIG;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const legacyRaw = localStorage.getItem('obsidian_merchant_voice_config');
      if (legacyRaw) {
        const legacy = JSON.parse(legacyRaw);
        inMemoryVoiceConfig = { ...DEFAULT_CONFIG, ...legacy };
        return inMemoryVoiceConfig;
      }
      inMemoryVoiceConfig = DEFAULT_CONFIG;
      return DEFAULT_CONFIG;
    }
    inMemoryVoiceConfig = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    return inMemoryVoiceConfig;
  } catch (e) {
    return inMemoryVoiceConfig || DEFAULT_CONFIG;
  }
}

export function saveVoiceConfig(config: VoiceConfig): void {
  inMemoryVoiceConfig = config;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    localStorage.setItem('obsidian_merchant_voice_config', JSON.stringify(config));
  } catch (e) {
    // ignore
  }
}

// -------------------------------------------------------------
// Web Audio API 高保真声学和弦与物理共鸣发生器
// -------------------------------------------------------------
let audioCtx: AudioContext | null = null;
let isAudioUnlocked = false;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * 全局用户手势激活器：解除浏览器对 Web Audio 和 SpeechSynthesis 的自动播放拦截
 */
export function unlockAudioContext(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      // 静音唤醒 speechSynthesis，避免首次真实呼叫被系统挂起
      if ('speechSynthesis' in window) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }

      isAudioUnlocked = true;
      resolve(true);
    } catch (e) {
      resolve(false);
    }
  });
}

// 自动在全局挂载首个交互唤醒监听器
if (typeof window !== 'undefined') {
  const handleUserFirstGesture = () => {
    unlockAudioContext();
    window.removeEventListener('pointerdown', handleUserFirstGesture);
    window.removeEventListener('keydown', handleUserFirstGesture);
    window.removeEventListener('touchstart', handleUserFirstGesture);
  };
  window.addEventListener('pointerdown', handleUserFirstGesture, { passive: true, once: true });
  window.addEventListener('keydown', handleUserFirstGesture, { passive: true, once: true });
  window.addEventListener('touchstart', handleUserFirstGesture, { passive: true, once: true });
}

/**
 * 播放温润的高保真物理声学和弦提示音
 */
export function playChimeSound(type: 'order' | 'urgent' | 'call' | 'success' | 'rider' | string = 'order'): void {
  const cfg = getVoiceConfig();
  if (!cfg.enabled || !cfg.soundEffectEnabled) return;

  const normalizedType = type === 'bell' ? 'call' : type === 'double_beep' ? 'urgent' : type;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.28 * cfg.volume, now);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3200, now);
    filter.Q.setValueAtTime(0.8, now);

    masterGain.connect(filter);
    filter.connect(ctx.destination);

    if (normalizedType === 'order') {
      // 大堂经典三音和弦 (E5 -> G#5 -> B5, 优雅入座/自营新单提醒)
      const notes = [
        { freq: 659.25, time: 0, dur: 0.45 },     // E5
        { freq: 830.61, time: 0.12, dur: 0.45 },   // G#5
        { freq: 987.77, time: 0.24, dur: 0.65 }    // B5
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);

        const harmonic = ctx.createOscillator();
        harmonic.type = 'triangle';
        harmonic.frequency.setValueAtTime(freq * 2, now + time);
        const harmonicGain = ctx.createGain();
        harmonicGain.gain.setValueAtTime(0.08, now + time);
        harmonicGain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

        noteGain.gain.setValueAtTime(0.3, now + time);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

        osc.connect(noteGain);
        harmonic.connect(harmonicGain);
        noteGain.connect(masterGain);
        harmonicGain.connect(masterGain);

        osc.start(now + time);
        harmonic.start(now + time);
        osc.stop(now + time + dur);
        harmonic.stop(now + time + dur);
      });

    } else if (normalizedType === 'call') {
      // 航站楼 / 贵宾餐厅专属舒缓双音 (C5 -> G5)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const g1 = ctx.createGain();
      const g2 = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      g1.gain.setValueAtTime(0.35, now);
      g1.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(783.99, now + 0.18); // G5
      g2.gain.setValueAtTime(0.35, now + 0.18);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

      osc1.connect(g1);
      osc2.connect(g2);
      g1.connect(masterGain);
      g2.connect(masterGain);

      osc1.start(now);
      osc2.start(now + 0.18);
      osc1.stop(now + 0.55);
      osc2.stop(now + 0.75);

    } else if (normalizedType === 'urgent') {
      // 急促但不刺耳的双调频声学警报 (A5 -> D6)
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1174.66, now + 0.1);
      osc.frequency.setValueAtTime(880, now + 0.22);
      osc.frequency.setValueAtTime(1174.66, now + 0.32);

      g.gain.setValueAtTime(0.4, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      osc.connect(g);
      g.connect(masterGain);

      osc.start(now);
      osc.stop(now + 0.55);

    } else if (normalizedType === 'rider') {
      // 骑手户外专属跃升双音 (F#5 -> C#6，穿透风噪)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const g1 = ctx.createGain();
      const g2 = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(739.99, now); // F#5
      g1.gain.setValueAtTime(0.4, now);
      g1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1108.73, now + 0.12); // C#6
      g2.gain.setValueAtTime(0.42, now + 0.12);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc1.connect(g1);
      osc2.connect(g2);
      g1.connect(masterGain);
      g2.connect(masterGain);

      osc1.start(now);
      osc2.start(now + 0.12);
      osc1.stop(now + 0.3);
      osc2.stop(now + 0.5);

    } else {
      // 成功 / 妥投完工舒缓四度和弦 (D5 -> A5)
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.setValueAtTime(880, now + 0.14);

      g.gain.setValueAtTime(0.3, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(g);
      g.connect(masterGain);

      osc.start(now);
      osc.stop(now + 0.45);
    }
  } catch (e) {
    console.warn('Web Audio chime error:', e);
  }
}

// -------------------------------------------------------------
// 取餐号与等位排队号高自然度口语化发音格式化
// -------------------------------------------------------------
const DIGIT_CHINESE: Record<string, string> = {
  '0': '零',
  '1': '一',
  '2': '二',
  '3': '三',
  '4': '四',
  '5': '五',
  '6': '六',
  '7': '七',
  '8': '八',
  '9': '九'
};

/**
 * 专门将前台取餐号或等位号转换为自然流畅的人耳发音文本
 * 例：
 *   "P01" -> "P——零一"
 *   "A03" -> "A——零三"
 *   "B12" -> "B——十二"
 *   "C08" -> "C——零八"
 *   "8806" -> "八、八、零、六"
 *   "#UR-9821" -> "单号 九、八、二、一"
 */
export function formatQueueNumberForSpeech(rawNo: string): string {
  if (!rawNo) return '';
  let clean = rawNo.trim().toUpperCase();

  // 1. 去除 # 前缀
  if (clean.startsWith('#')) {
    clean = clean.substring(1);
  }

  // 2. 匹配如 UR-9821 或 9821 等外卖自营单号
  if (clean.startsWith('UR-')) {
    const digits = clean.replace('UR-', '');
    const spoken = digits.split('').map(d => DIGIT_CHINESE[d] || d).join('、');
    return `单号 ${spoken}`;
  }

  // 3. 匹配字母+数字（如 P01, P12, A03, B02, C15 等经典前台取餐号与等位排队号）
  const letterMatch = clean.match(/^([A-Z])(\d{1,3})$/);
  if (letterMatch) {
    const letter = letterMatch[1];
    const numStr = letterMatch[2];
    let numSpoken = '';

    if (numStr.length === 1) {
      numSpoken = DIGIT_CHINESE[numStr] || numStr;
    } else if (numStr.length === 2) {
      if (numStr.startsWith('0')) {
        numSpoken = `零${DIGIT_CHINESE[numStr[1]] || numStr[1]}`;
      } else {
        const val = parseInt(numStr, 10);
        if (val === 10) numSpoken = '十';
        else if (val > 10 && val < 20) numSpoken = `十${DIGIT_CHINESE[numStr[1]]}`;
        else {
          numSpoken = `${DIGIT_CHINESE[numStr[0]]}十${numStr[1] === '0' ? '' : DIGIT_CHINESE[numStr[1]]}`;
        }
      }
    } else {
      numSpoken = numStr.split('').map(d => DIGIT_CHINESE[d] || d).join('、');
    }

    return `${letter}——${numSpoken}`;
  }

  // 4. 纯 4 位提货核销码（如 8806）
  if (/^\d{3,6}$/.test(clean)) {
    return clean.split('').map(d => DIGIT_CHINESE[d] || d).join('、');
  }

  return clean;
}

// -------------------------------------------------------------
// 去除人机声核心算法：真人韵律与停顿口语化优化 (Human Cadence Processor)
// -------------------------------------------------------------
export function humanizeSpeechText(rawText: string): string {
  if (!rawText) return '';

  let text = rawText;

  // 1. 去除 Markdown 或开发标记
  text = text.replace(/[*_~`]/g, '');

  // 2. 规范订单单号
  text = text.replace(/#?UR-?(\d+)/gi, (_, digits) => {
    const spacedDigits = digits.split('').map((d: string) => DIGIT_CHINESE[d] || d).join('、');
    return `单号 ${spacedDigits}`;
  });

  // 3. 匹配独立的 4 位或多位数字，将其口语分拆（如 9821 -> 9、8、2、1）
  text = text.replace(/(?:单号|编号|尾号|提货码)\s*[:：]?\s*(\d{3,6})/g, (_, digits) => {
    const spacedDigits = digits.split('').map((d: string) => DIGIT_CHINESE[d] || d).join('、');
    return `单号 ${spacedDigits}`;
  });

  // 4. 排队取餐号与等位号口语化 (如 A01 -> A——零一；P08 -> P——零八)
  text = text.replace(/([A-Z])(\d{1,3})\s*号/gi, (_, letter, numStr) => {
    const formatted = formatQueueNumberForSpeech(`${letter}${numStr}`);
    return `${formatted}号`;
  });

  // 5. 金额规范口语化 (如 128.0 元 -> 128 元整)
  text = text.replace(/(\d+)\.0\s*元/g, '$1 元整');

  // 6. 标点符号与呼吸感优化：在关键动作前注入微小停顿逗号
  text = text.replace(/(请及时接单)/g, '，请及时接单');
  text = text.replace(/(请后厨优先出餐)/g, '，请后厨优先出餐');
  text = text.replace(/(祝您用餐愉快)/g, '。祝您用餐愉快！');
  text = text.replace(/(路上请注意骑行安全)/g, '。路上请注意安全！');
  text = text.replace(/(过号请重新取号)/g, '，过号请重新取号');

  // 7. 去除连续标点
  text = text.replace(/[，,]{2,}/g, '，').replace(/[。.]+/g, '。');

  return text.trim();
}

// -------------------------------------------------------------
// 智能神经真人体感语音优选器
// -------------------------------------------------------------
let cachedVoices: SpeechSynthesisVoice[] = [];

function refreshVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return [];
  }
  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    cachedVoices = voices;
  }
  return cachedVoices;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    refreshVoices();
  };
  setTimeout(refreshVoices, 100);
}

export function getAvailableSystemVoices(): SpeechSynthesisVoice[] {
  const voices = refreshVoices();
  const filtered = voices.filter(v => {
    const l = (v.lang || '').toLowerCase();
    const n = (v.name || '').toLowerCase();
    return (
      l.includes('zh') || 
      l.includes('cmn') || 
      n.includes('chinese') || 
      n.includes('mandarin') || 
      n.includes('普通话') || 
      n.includes('中文') ||
      n.includes('xiaoxiao') || 
      n.includes('yunxi') || 
      n.includes('tingting') ||
      n.includes('yunjian') ||
      n.includes('kangkang') ||
      n.includes('xiaoni') ||
      n.includes('xiaoyan')
    );
  });
  return filtered.length > 0 ? filtered : voices;
}

export function findBestPersonaVoice(personaId: VoicePersonaId, selectedVoiceName?: string): SpeechSynthesisVoice | null {
  const voices = getAvailableSystemVoices();
  if (voices.length === 0) return null;

  if (selectedVoiceName) {
    const userSelected = voices.find(v => v.name === selectedVoiceName);
    if (userSelected) return userSelected;
  }

  const personaMeta = VOICE_PERSONAS.find(p => p.id === personaId) || VOICE_PERSONAS[0];
  const keywords = personaMeta.voiceKeywords;

  for (const kw of keywords) {
    const matched = voices.find(v => v.name.toLowerCase().includes(kw.toLowerCase()));
    if (matched) return matched;
  }

  const isMale = personaMeta.gender === 'male';
  if (isMale) {
    const maleVoice = voices.find(v => {
      const n = v.name.toLowerCase();
      const hasMale = (
        n.includes('male') || 
        n.includes('yunxi') || 
        n.includes('yunjian') || 
        n.includes('yunyang') || 
        n.includes('kangkang') || 
        n.includes('li-mu') || 
        n.includes('男') || 
        n.includes('danny')
      );
      const hasFemale = (
        n.includes('female') || 
        n.includes('女') || 
        n.includes('xiaoxiao') || 
        n.includes('tingting') || 
        n.includes('xiaoyi') || 
        n.includes('sin-ji') || 
        n.includes('mei-jia') ||
        n.includes('xiaoni') ||
        n.includes('xiaoyan')
      );
      return hasMale && !hasFemale;
    });
    if (maleVoice) return maleVoice;
  } else {
    const femaleVoice = voices.find(v => {
      const n = v.name.toLowerCase();
      return (
        n.includes('female') || 
        n.includes('xiaoxiao') || 
        n.includes('xiaoyi') || 
        n.includes('xiaoyan') || 
        n.includes('xiaoni') || 
        n.includes('tingting') || 
        n.includes('sin-ji') || 
        n.includes('mei-jia') || 
        n.includes('女')
      );
    });
    if (femaleVoice) return femaleVoice;
  }

  const neuralVoice = voices.find(v => {
    const n = v.name.toLowerCase();
    const isNeural = n.includes('neural') || n.includes('natural') || n.includes('siri');
    if (!isNeural) return false;
    if (isMale && (n.includes('female') || n.includes('女') || n.includes('xiaoxiao') || n.includes('tingting'))) {
      return false;
    }
    return true;
  });
  if (neuralVoice) return neuralVoice;

  return voices[0] || null;
}

// -------------------------------------------------------------
// 高保真母带级真人原声音频播放器 (带错误安全回退与防卡死守卫)
// -------------------------------------------------------------
let activeAudioElement: HTMLAudioElement | null = null;

export function stopCurrentAudio(): void {
  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
    } catch (e) {
      // ignore
    }
    activeAudioElement = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      // ignore
    }
  }
  // 清理当前正在排队但尚未播放的广播队列
  broadcastQueue.length = 0;
  isProcessingQueue = false;
}

/**
 * 播放母带级真人预录音频文件 (WAV)，带全量错误捕获与超时回退
 */
export function playRealAudio(url: string, volume = 1.0, onEnd?: () => void): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      onEnd?.();
      resolve(false);
      return;
    }

    try {
      stopCurrentAudio();
      const audio = new Audio(url);
      activeAudioElement = audio;
      audio.volume = Math.max(0, Math.min(1, volume));

      // 接入蓝牙音频路由中枢
      globalBluetoothAudio.applyRouting(audio, true).catch(() => {});

      let isFinished = false;
      const cleanup = (success: boolean) => {
        if (isFinished) return;
        isFinished = true;
        clearTimeout(guardTimeout);
        if (activeAudioElement === audio) {
          activeAudioElement = null;
        }
        onEnd?.();
        resolve(success);
      };

      // 4.5 秒防卡死守卫
      const guardTimeout = setTimeout(() => {
        cleanup(false);
      }, 4500);

      audio.onended = () => cleanup(true);
      audio.onerror = () => {
        cleanup(false);
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          cleanup(false);
        });
      }
    } catch (err) {
      onEnd?.();
      resolve(false);
    }
  });
}

/**
 * 试听指定角色的纯正真人母带音频
 */
export async function playPersonaAudition(personaId: VoicePersonaId, volume?: number): Promise<boolean> {
  const cfg = getVoiceConfig();
  const personaMeta = VOICE_PERSONAS.find(p => p.id === personaId) || VOICE_PERSONAS[0];
  const targetVolume = volume ?? cfg.volume;

  if (cfg.soundEffectEnabled) {
    playChimeSound('order');
  }

  const ok = await playRealAudio(personaMeta.audioUrl, targetVolume);
  if (!ok) {
    speakText(personaMeta.sampleText, {
      persona: personaId,
      volume: targetVolume,
      pitch: personaMeta.defaultPitch,
      rate: personaMeta.defaultRate,
      chimeType: 'order',
      interrupt: true
    });
  }
  return ok;
}

// -------------------------------------------------------------
// 智能语音广播队列引擎 (解决多叫号打架、掐断、播放不生效、V8 GC 垃圾回收 Bug)
// -------------------------------------------------------------
export interface SpeakOptions {
  chimeType?: 'order' | 'urgent' | 'call' | 'success' | 'rider' | string;
  persona?: VoicePersonaId;
  personaId?: VoicePersonaId | string;
  rate?: number;
  pitch?: number;
  volume?: number;
  onEnd?: () => void;
  overrideHumanCadence?: boolean;
  interrupt?: boolean; // 是否打断当前语音立即播放 (默认 false，排队依次播报)
  repeat?: number;    // 连叫播报次数 (例如前台双重连叫传 2)
}

interface QueueItem {
  id: string;
  text: string;
  options?: SpeakOptions;
  remainingRepeats: number;
}

const broadcastQueue: QueueItem[] = [];
let isProcessingQueue = false;

// 解决 V8 GC 垃圾回收把正在播放的 SpeechSynthesisUtterance 实例销毁的致命 Bug
const activeUtterances = new Set<SpeechSynthesisUtterance>();

// 定时保活脉冲：Chrome 后台挂起时唤醒 speechSynthesis
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  setInterval(() => {
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch (e) {
      // ignore
    }
  }, 4000);
}

function processNextBroadcast(): void {
  if (broadcastQueue.length === 0) {
    isProcessingQueue = false;
    return;
  }

  isProcessingQueue = true;
  const currentItem = broadcastQueue[0];

  executeSingleUtterance(currentItem.text, currentItem.options, () => {
    // 处理重复叫号逻辑
    if (currentItem.remainingRepeats > 1) {
      currentItem.remainingRepeats -= 1;
      // 重复叫号间隔 1.2 秒
      setTimeout(() => {
        processNextBroadcast();
      }, 1200);
    } else {
      broadcastQueue.shift();
      // 下一条广播间隔 350ms，避免声音打架
      setTimeout(() => {
        processNextBroadcast();
      }, 350);
    }
  });
}

function executeSingleUtterance(text: string, options?: SpeakOptions, onFinish?: () => void): void {
  const cfg = getVoiceConfig();
  if (!cfg.enabled) {
    options?.onEnd?.();
    onFinish?.();
    return;
  }

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    options?.onEnd?.();
    onFinish?.();
    return;
  }

  // 1. 播放声学前奏和弦
  const chime = options?.chimeType || 'call';
  if (cfg.soundEffectEnabled) {
    playChimeSound(chime);
  }

  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const shouldHumanize = options?.overrideHumanCadence !== undefined 
      ? options.overrideHumanCadence 
      : cfg.humanCadenceEnabled;
    const spokenText = shouldHumanize ? humanizeSpeechText(text) : text;

    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.lang = 'zh-CN';

    // 保存全局强引用，防止 V8 GC 提前回收
    activeUtterances.add(utterance);

    const effectivePersona = (options?.persona || options?.personaId || cfg.persona) as VoicePersonaId;
    const personaMeta = VOICE_PERSONAS.find(p => p.id === effectivePersona) || VOICE_PERSONAS[0];
    
    const targetVolume = options?.volume ?? cfg.volume;
    
    let targetPitch = personaMeta.defaultPitch;
    if (options?.pitch !== undefined) {
      targetPitch = options.pitch;
    } else if (cfg.pitch && Math.abs(cfg.pitch - 1.0) > 0.02 && effectivePersona === cfg.persona) {
      targetPitch = cfg.pitch;
    }

    let targetRate = personaMeta.defaultRate;
    if (options?.rate !== undefined) {
      targetRate = options.rate;
    } else if (cfg.rate && Math.abs(cfg.rate - 1.0) > 0.02 && effectivePersona === cfg.persona) {
      targetRate = cfg.rate;
    }

    utterance.volume = Math.min(1.0, Math.max(0.1, targetVolume));
    utterance.rate = Math.min(1.5, Math.max(0.6, targetRate));
    utterance.pitch = Math.min(1.5, Math.max(0.6, targetPitch));

    const voiceNameToMatch = (options?.persona && options.persona !== cfg.persona) 
      ? undefined 
      : cfg.selectedVoiceName;
    const matchedVoice = findBestPersonaVoice(effectivePersona, voiceNameToMatch);
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    let isDone = false;
    const finishUtterance = () => {
      if (isDone) return;
      isDone = true;
      clearTimeout(safetyTimer);
      activeUtterances.delete(utterance);
      options?.onEnd?.();
      onFinish?.();
    };

    utterance.onend = finishUtterance;
    utterance.onerror = finishUtterance;

    // 根据文本长度动态计算超时看门狗时间（汉字每字约 0.25 秒 + 5 秒富余缓冲）
    const maxDurationMs = Math.max(6000, spokenText.length * 350 + 5000);
    const safetyTimer = setTimeout(() => {
      finishUtterance();
    }, maxDurationMs);

    const chimeDelayMs = cfg.soundEffectEnabled ? 300 : 40;
    setTimeout(() => {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        finishUtterance();
      }
    }, chimeDelayMs);

  } catch (e) {
    options?.onEnd?.();
    onFinish?.();
  }
}

/**
 * 执行真人风格语音播报（智能广播队列管理）
 */
export function speakText(text: string, options?: SpeakOptions): void {
  const cfg = getVoiceConfig();
  if (!cfg.enabled) {
    options?.onEnd?.();
    return;
  }

  // 紧急打断当前语音
  if (options?.interrupt) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    broadcastQueue.length = 0;
    isProcessingQueue = false;
  }

  const repeatCount = Math.max(1, options?.repeat || 1);
  const queueItem: QueueItem = {
    id: `${Date.now()}_${Math.random()}`,
    text,
    options,
    remainingRepeats: repeatCount
  };

  broadcastQueue.push(queueItem);

  if (!isProcessingQueue) {
    processNextBroadcast();
  }
}

// -------------------------------------------------------------
// 核心业务场景语音播报预设 (Comprehensive Business Voice Alerts)
// 包含：前台取餐叫号、等位入座呼叫、等位候餐进度、过号顺延、自营新单、骑手调度
// -------------------------------------------------------------
export const voiceAlerts = {
  speakText,

  /**
   * 1. 商家端：自营新订单到达提醒
   */
  newOrder: (orderNo: string, amount: number, channel: 'delivery' | 'dine_in' | 'pickup' = 'delivery', isDirect: boolean = true) => {
    const cfg = getVoiceConfig();
    if (!cfg.enabled || !cfg.autoPlayNewOrder) return;

    const channelName = channel === 'delivery' ? (isDirect ? '自营专送' : '外卖专送') : channel === 'dine_in' ? '堂食就餐' : '到店自提';
    const formattedNo = formatQueueNumberForSpeech(orderNo);
    const text = `您有新的${channelName}订单，${formattedNo}，实付金额 ${amount.toFixed(1)} 元，请及时接单制作！`;
    speakText(text, { chimeType: 'order', persona: cfg.persona });
  },

  /**
   * 2. 商家端：自营专送加急新单
   */
  newSelfOperatedOrder: (orderNo: string, amount: number, customerName?: string) => {
    const cfg = getVoiceConfig();
    if (!cfg.enabled || !cfg.autoPlayNewOrder) return;

    const guestGreeting = customerName ? `食客 ${customerName} ` : '';
    const formattedNo = formatQueueNumberForSpeech(orderNo);
    const text = `叮咚！您有新的自营专送订单，${guestGreeting}${formattedNo}，实付金额 ${amount.toFixed(1)} 元，请商家及时接单处理！`;
    speakText(text, { chimeType: 'order', persona: cfg.persona });
  },

  /**
   * 3. 前台端：叫号取餐广播 (彻底解决播放错号、播放成写死录音问题)
   * 规范念出真实号码：如 P01、P08、#8806、自提 15 号
   */
  callingGuest: (queueNo: string, tableOrPickup: string = '餐车取餐窗口', repeatTimes: number = 1) => {
    const cfg = getVoiceConfig();
    if (!cfg.enabled || !cfg.autoPlayCalling) return;

    const formattedNo = formatQueueNumberForSpeech(queueNo);
    const text = `请——${formattedNo} 号顾客，到 ${tableOrPickup} 取餐。您的餐品已新鲜制作完成，祝您用餐愉快！`;
    speakText(text, { 
      chimeType: 'call', 
      persona: cfg.persona, 
      repeat: repeatTimes 
    });
  },

  /**
   * 4. 等位端：等位排队到号入座广播 (彻底解决播错成取餐语音的问题)
   * 准确念出等位号码、就餐人数与指引就餐区
   */
  callingWaitTable: (queueNo: string, partySize: number = 2, tableArea: string = '堂食就餐区', repeatTimes: number = 1) => {
    const cfg = getVoiceConfig();
    if (!cfg.enabled || !cfg.autoPlayQueueWait) return;

    const formattedNo = formatQueueNumberForSpeech(queueNo);
    const text = `请——${formattedNo} 号顾客，${partySize} 位贵宾，桌位已准备就绪，请移步 ${tableArea} 就座用餐。过号请重新取号，感谢您的耐心等候！`;
    speakText(text, { 
      chimeType: 'call', 
      persona: cfg.persona, 
      repeat: repeatTimes 
    });
  },

  /**
   * 5. 等位端：等位进度与提前候餐提醒
   */
  waitingQueueReminder: (queueNo: string, remainingCount: number = 1) => {
    const cfg = getVoiceConfig();
    if (!cfg.enabled || !cfg.autoPlayQueueWait) return;

    const formattedNo = formatQueueNumberForSpeech(queueNo);
    const text = `等位温馨提醒：请 ${formattedNo} 号顾客注意，您前方还有 ${remainingCount} 桌正在就餐，请在候餐区稍作准备！`;
    speakText(text, { chimeType: 'call', persona: cfg.persona });
  },

  /**
   * 6. 等位端：过号顺延广播
   */
  passedTicketNotice: (queueNo: string) => {
    const cfg = getVoiceConfig();
    if (!cfg.enabled || !cfg.autoPlayQueueWait) return;

    const formattedNo = formatQueueNumberForSpeech(queueNo);
    const text = `过号提醒：请 ${formattedNo} 号顾客注意，您的排队叫号已顺延，如需就餐请联系餐车前台服务人员重新安排。`;
    speakText(text, { chimeType: 'call', persona: cfg.persona });
  },

  /**
   * 7. 骑手端：新顺路订单派发待抢广播
   */
  riderNewDeliveryPool: (orderNo: string, earnings: number, distanceMeters: number = 500) => {
    const cfg = getVoiceConfig();
    if (!cfg.enabled || !cfg.autoPlayRiderPool) return;

    const distText = distanceMeters >= 1000 ? `${(distanceMeters / 1000).toFixed(1)}公里` : `${distanceMeters}米`;
    const formattedNo = formatQueueNumberForSpeech(orderNo);
    const text = `骑士您好！收到新的顺路自营订单，${formattedNo}，配送费 ${earnings.toFixed(1)} 元，距离 ${distText}，请及时抢单！`;
    speakText(text, { chimeType: 'rider', persona: cfg.persona });
  },

  /**
   * 8. 骑手端：抢单锁定成功播报
   */
  riderOrderGrabbed: (orderNo: string, truckName: string = '黑曜石流动餐车') => {
    const cfg = getVoiceConfig();
    if (!cfg.enabled || !cfg.autoPlayRiderAction) return;

    const formattedNo = formatQueueNumberForSpeech(orderNo);
    const text = `接单成功！${formattedNo}，请前往 ${truckName} 取餐，路上请注意骑行安全！`;
    speakText(text, { chimeType: 'rider', persona: cfg.persona });
  },

  riderOrderAccepted: (orderNo: string, truckName: string = '黑曜石流动餐车') => {
    voiceAlerts.riderOrderGrabbed(orderNo, truckName);
  },

  /**
   * 9. 骑手端：已到达餐车取餐点播报
   */
  riderArrivedTruck: (truckName: string = '黑曜石流动餐车', orderNo?: string) => {
    const cfg = getVoiceConfig();
    if (!cfg.enabled || !cfg.autoPlayRiderAction) return;

    const orderPart = orderNo ? `，${formatQueueNumberForSpeech(orderNo)}` : '';
    const text = `您已到达 ${truckName}${orderPart}，请与餐车主理人核对取餐码，妥善放入恒温箱！`;
    speakText(text, { chimeType: 'rider', persona: cfg.persona });
  },

  riderArrivedPickup: (orderNo: string, truckName: string = '黑曜石流动餐车') => {
    voiceAlerts.riderArrivedTruck(truckName, orderNo);
  },

  /**
   * 10. 骑手端：妥投成功确认播报
   */
  riderOrderDelivered: (orderNo: string, earnings: number) => {
    const cfg = getVoiceConfig();
    if (!cfg.enabled || !cfg.autoPlayRiderAction) return;

    const text = `订单已确认妥投送达！配送佣金 ${earnings.toFixed(1)} 元已即时入账。感谢您的辛苦付出，请注意返程安全！`;
    speakText(text, { chimeType: 'success', persona: cfg.persona });
  },

  /**
   * 11. 商家/骑手加急催单播报
   */
  urgentOrder: (orderNo: string, waitMinutes: number) => {
    const cfg = getVoiceConfig();
    if (!cfg.enabled || !cfg.autoPlayUrgent) return;

    const formattedNo = formatQueueNumberForSpeech(orderNo);
    const text = `催单提醒！${formattedNo} 已等待 ${waitMinutes} 分钟，顾客发起了催单，请优先出餐配送！`;
    speakText(text, { chimeType: 'urgent', persona: cfg.persona, interrupt: true });
  },

  /**
   * 12. 堂食加菜提醒
   */
  tableAddDish: (tableCode: string, dishCount: number) => {
    const cfg = getVoiceConfig();
    if (!cfg.enabled) return;

    const text = `桌台 ${tableCode} 加菜 ${dishCount} 份，后厨已收到加单，请留意制作！`;
    speakText(text, { chimeType: 'order', persona: cfg.persona });
  },

  /**
   * 13. 餐品制作完成出餐提醒
   */
  orderCompleted: (orderNo: string) => {
    const cfg = getVoiceConfig();
    if (!cfg.enabled) return;

    const formattedNo = formatQueueNumberForSpeech(orderNo);
    const text = `${formattedNo} 制作完毕，请前台或骑手及时取餐装箱！`;
    speakText(text, { chimeType: 'success', persona: cfg.persona });
  },

  /**
   * 14. 后厨出餐并即时呼叫取餐/传菜
   */
  kdsReadyAndCall: (ticketNo: string, targetType: 'pickup' | 'dine_in' | 'delivery' = 'pickup', targetName?: string) => {
    const cfg = getVoiceConfig();
    if (!cfg.enabled) return;

    const formattedNo = formatQueueNumberForSpeech(ticketNo);
    let text = `请 ${formattedNo} 号顾客，到餐车前台取餐，您的餐品已新鲜现制出炉！`;
    if (targetType === 'dine_in') {
      text = `叮咚！${targetName || formattedNo} 桌菜品已备齐出餐，请传菜员及时上菜！`;
    } else if (targetType === 'delivery') {
      text = `叮咚！外卖专送单号 ${formattedNo} 已打包出餐，请专线骑手到餐车取餐！`;
    }
    speakText(text, { chimeType: 'call', persona: cfg.persona });
  },

  /**
   * 15. 订单看板：呼叫外卖/专送骑手
   */
  callRiderForOrder: (orderNo: string, carrierName: string = '专线/美团骑手') => {
    const cfg = getVoiceConfig();
    if (!cfg.enabled) return;

    const cleanNo = formatQueueNumberForSpeech(orderNo);
    const text = `请${carrierName}注意，${cleanNo} 已打包出餐，请尽快到流动餐车站台取餐配送！`;
    speakText(text, { chimeType: 'rider', persona: cfg.persona });
  },

  /**
   * 16. 保温餐柜入柜指引广播
   */
  smartLockerPickupGuidance: (pickupCode: string, lockerBox: string = '03号保温格口') => {
    const cfg = getVoiceConfig();
    if (!cfg.enabled) return;

    const formattedCode = formatQueueNumberForSpeech(pickupCode);
    const text = `叮咚！凭提货码 ${formattedCode} 的顾客，您的餐品已放入 ${lockerBox}，恒温保鲜，凭码即可随时开门自提！`;
    speakText(text, { chimeType: 'call', persona: cfg.persona });
  },

  /**
   * 17. 扫码枪核销成功语音反馈
   */
  scannerVerifySuccess: (codeOrName: string, tip: string = '核销出库完成') => {
    const cfg = getVoiceConfig();
    if (!cfg.enabled) return;

    const text = `核销成功！${codeOrName} ${tip}，祝您用餐愉快！`;
    speakText(text, { chimeType: 'success', persona: cfg.persona });
  }
};

// -------------------------------------------------------------
// 语音播报引擎一键体检与自愈修复诊断器
// -------------------------------------------------------------
export interface VoiceEngineDiagnosis {
  webAudioSupported: boolean;
  audioContextState: string;
  speechSynthesisSupported: boolean;
  speechSynthesisState: 'ready' | 'speaking' | 'paused' | 'unavailable';
  availableVoicesCount: number;
  isMuted: boolean;
  volumePercent: number;
  currentPersona: VoicePersonaConfig;
  autoPlayCallingEnabled: boolean;
  autoPlayQueueWaitEnabled: boolean;
  repaired: boolean;
}

export async function diagnoseAndRepairVoiceEngine(): Promise<VoiceEngineDiagnosis> {
  const cfg = getVoiceConfig();
  const personaMeta = VOICE_PERSONAS.find(p => p.id === cfg.persona) || VOICE_PERSONAS[0];

  const diagnosis: VoiceEngineDiagnosis = {
    webAudioSupported: typeof window !== 'undefined' && ('AudioContext' in window || 'webkitAudioContext' in window),
    audioContextState: 'unknown',
    speechSynthesisSupported: typeof window !== 'undefined' && 'speechSynthesis' in window,
    speechSynthesisState: 'unavailable',
    availableVoicesCount: 0,
    isMuted: !cfg.enabled || cfg.volume <= 0.01,
    volumePercent: Math.round(cfg.volume * 100),
    currentPersona: personaMeta,
    autoPlayCallingEnabled: cfg.autoPlayCalling,
    autoPlayQueueWaitEnabled: cfg.autoPlayQueueWait,
    repaired: false
  };

  if (typeof window === 'undefined') return diagnosis;

  // 1. Web Audio 检查与修复
  try {
    const ctx = getAudioContext();
    if (ctx) {
      diagnosis.audioContextState = ctx.state;
      if (ctx.state === 'suspended') {
        await ctx.resume().catch(() => {});
        diagnosis.audioContextState = ctx.state;
        diagnosis.repaired = true;
      }
    }
  } catch (e) {
    diagnosis.audioContextState = 'error';
  }

  // 2. SpeechSynthesis 检查与挂起复位
  if ('speechSynthesis' in window) {
    try {
      const isPaused = window.speechSynthesis.paused;
      const isSpeaking = window.speechSynthesis.speaking;

      if (isPaused) {
        window.speechSynthesis.resume();
        diagnosis.repaired = true;
      }

      diagnosis.speechSynthesisState = isSpeaking ? 'speaking' : isPaused ? 'paused' : 'ready';

      const voices = getAvailableSystemVoices();
      diagnosis.availableVoicesCount = voices.length;
    } catch (e) {
      diagnosis.speechSynthesisState = 'unavailable';
    }
  }

  // 3. 播放极短的高保真水晶和弦提示音作为自愈物理验证
  try {
    playChimeSound('call');
  } catch (e) {}

  return diagnosis;
}
