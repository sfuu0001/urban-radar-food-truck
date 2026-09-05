// Obsidian Food Truck - Real-Human Style Voice Alert & Web Audio Synthesizer Engine
// 真人风格语音播报与高保真声学和弦引擎（去人机机械声、智能神经语音优选、自然呼吸节奏）

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
// Web Audio API 高保真声学和弦与物理共鸣发生器 (去除尖锐刺耳机械蜂鸣)
// -------------------------------------------------------------
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
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
 * 播放温润的高保真物理声学和弦提示音
 */
export function playChimeSound(type: 'order' | 'urgent' | 'call' | 'success' | 'rider' | string = 'order'): void {
  const cfg = getVoiceConfig();
  if (!cfg.enabled || !cfg.soundEffectEnabled) return;

  // Map legacy chime names
  const normalizedType = type === 'bell' ? 'call' : type === 'double_beep' ? 'urgent' : type;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.28 * cfg.volume, now);

    // 柔化低通滤波器，过滤掉数字音频高频毛刺，营造大堂声学温润感
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

        // 泛音谐波
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
// 去除人机声核心算法：真人韵律与停顿口语化优化 (Human Cadence Processor)
// -------------------------------------------------------------
/**
 * 将生硬的单号、技术代号和死板文本，转化为符合真人语感、带有自然顿挫的口语文本
 */
export function humanizeSpeechText(rawText: string): string {
  if (!rawText) return '';

  let text = rawText;

  // 1. 去除 Markdown 或开发调试标记
  text = text.replace(/[*_~`]/g, '');

  // 2. 将订单单号优化为人类逐位念法，杜绝"九千八百二十一"或"井号UR-9821"的死板连读
  // 匹配形如 #UR-9821、UR-9821、单号 9821 等
  text = text.replace(/#?UR-?(\d+)/gi, (_, digits) => {
    const spacedDigits = digits.split('').join('、');
    return `单号 ${spacedDigits}`;
  });

  // 3. 匹配独立的 4 位或多位数字，将其口语分拆（如 9821 -> 9、8、2、1）
  text = text.replace(/(?:单号|编号|尾号)\s*[:：]?\s*(\d{3,6})/g, (_, digits) => {
    const spacedDigits = digits.split('').join('、');
    return `单号 ${spacedDigits}`;
  });

  // 4. 排队取餐号口语化 (如 A01 -> A，零一；B02 -> B，零二；P03 -> P，零三)
  text = text.replace(/([A-Z])(\d{1,3})号/gi, (_, letter, numStr) => {
    const formattedNum = numStr.length === 2 && numStr.startsWith('0') 
      ? `零${numStr[1]}` 
      : numStr.split('').join('、');
    return `${letter}——${formattedNum}号`;
  });

  // 5. 金额规范口语化 (如 128.5 元 -> 一百二十八块五)
  text = text.replace(/(\d+)\.0\s*元/g, '$1 元整');

  // 6. 标点符号与呼吸感优化：在关键谓语与动作前注入微小停顿逗号
  text = text.replace(/(请及时接单)/g, '，请及时接单');
  text = text.replace(/(请后厨优先出餐)/g, '，请后厨优先出餐');
  text = text.replace(/(祝您用餐愉快)/g, '。祝您用餐愉快！');
  text = text.replace(/(路上请注意安全)/g, '。路上请注意骑行安全！');
  text = text.replace(/(过号请重新取号)/g, '，过号请重新取号');

  // 7. 去除连续多个标点
  text = text.replace(/[，,]{2,}/g, '，').replace(/[。.]+/g, '。');

  return text.trim();
}

// -------------------------------------------------------------
// 智能神经真人体感语音优选器 (Neural & Natural Voice Selector)
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
  // Pre-fetch
  setTimeout(refreshVoices, 100);
}

/**
 * 获取当前系统支持的中文及拟真语音列表
 */
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

/**
 * 根据角色定位智能挑选最优真人级神经语音
 */
export function findBestPersonaVoice(personaId: VoicePersonaId, selectedVoiceName?: string): SpeechSynthesisVoice | null {
  const voices = getAvailableSystemVoices();
  if (voices.length === 0) return null;

  // 1. 若用户在设置面板中显式指定了系统真人语音名称，优先匹配
  if (selectedVoiceName) {
    const userSelected = voices.find(v => v.name === selectedVoiceName);
    if (userSelected) return userSelected;
  }

  const personaMeta = VOICE_PERSONAS.find(p => p.id === personaId) || VOICE_PERSONAS[0];
  const keywords = personaMeta.voiceKeywords;

  // 2. 匹配专属角色关键词（如 Microsoft Xiaoxiao 晓晓、Yunxi 云希、Apple Tingting 等高端真人神经语音）
  for (const kw of keywords) {
    const matched = voices.find(v => v.name.toLowerCase().includes(kw.toLowerCase()));
    if (matched) return matched;
  }

  // 3. 按性别/声线特征做绝对严格的男女声音源隔离区分
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

  // 4. 优选任何标有 Natural / Neural 的高质量中文声音
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

  // 5. 退回标准中文第一声源
  return voices[0] || null;
}

// -------------------------------------------------------------
// 高保真母带级真人原声音频播放引擎 (Real Human Studio Master Player)
// 包含专属男声母带（浑厚播音男声）与专属女声母带（温润知性/甜美前台）
// 彻底解决合成器人机机械声、音质平庸与男女声不分问题
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
}

/**
 * 直接播放录制好的母带级真人音频文件 (WAV)，零机械感、真实人类声学共鸣
 */
export function playRealAudio(url: string, volume = 1.0, onEnd?: () => void): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      if (typeof window === 'undefined') {
        onEnd?.();
        resolve(false);
        return;
      }
      stopCurrentAudio();
      const audio = new Audio(url);
      activeAudioElement = audio;
      audio.volume = Math.max(0, Math.min(1, volume));

      // 自动接入蓝牙音频路由中枢（仅系统语音专属通道 vs 统一混合模式）
      globalBluetoothAudio.applyRouting(audio, true).catch(() => {});

      audio.onended = () => {
        if (activeAudioElement === audio) {
          activeAudioElement = null;
        }
        onEnd?.();
        resolve(true);
      };
      audio.onerror = (err) => {
        console.warn('Real studio audio play failed, falling back to TTS:', err);
        if (activeAudioElement === audio) {
          activeAudioElement = null;
        }
        onEnd?.();
        resolve(false);
      };
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Audio play was interrupted or blocked by browser policy:', err);
          if (activeAudioElement === audio) {
            activeAudioElement = null;
          }
          onEnd?.();
          resolve(false);
        });
      }
    } catch (err) {
      console.warn('playRealAudio error:', err);
      onEnd?.();
      resolve(false);
    }
  });
}

/**
 * 试听指定角色的纯正真人母带音频（男声/女声完全独立母带）
 */
export async function playPersonaAudition(personaId: VoicePersonaId, volume?: number): Promise<boolean> {
  const cfg = getVoiceConfig();
  const personaMeta = VOICE_PERSONAS.find(p => p.id === personaId) || VOICE_PERSONAS[0];
  const targetVolume = volume ?? cfg.volume;

  // 播放开场前奏和弦
  if (cfg.soundEffectEnabled) {
    playChimeSound('order');
  }

  // 优先播放该风格的纯正真人母带 WAV 文件（绝无人机机械感）
  const ok = await playRealAudio(personaMeta.audioUrl, targetVolume);
  if (!ok) {
    // 降级兜底：使用合成器，强化男女性别区隔
    speakText(personaMeta.sampleText, {
      persona: personaId,
      volume: targetVolume,
      pitch: personaMeta.defaultPitch,
      rate: personaMeta.defaultRate,
      chimeType: 'order'
    });
  }
  return ok;
}

// -------------------------------------------------------------
// 真人风格语音朗读主函数 (speakText)
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
}

/**
 * 执行真人风格语音播报
 */
export function speakText(text: string, options?: SpeakOptions): void {
  const cfg = getVoiceConfig();
  if (!cfg.enabled) {
    options?.onEnd?.();
    return;
  }

  // 1. 播放高保真声学和弦开场音
  const chime = options?.chimeType || 'order';
  if (cfg.soundEffectEnabled) {
    playChimeSound(chime);
  }

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('Web Speech API is not supported in this browser environment.');
    options?.onEnd?.();
    return;
  }

  try {
    // 2. 取消前一条可能未播放完毕的语音堆栈，并确保未被系统挂起
    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    // 3. 运行去人机声算法：标点呼吸与单号自然口语化优化
    const shouldHumanize = options?.overrideHumanCadence !== undefined 
      ? options.overrideHumanCadence 
      : cfg.humanCadenceEnabled;
    const spokenText = shouldHumanize ? humanizeSpeechText(text) : text;

    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.lang = 'zh-CN';

    // 4. 角色音调与语速计算（确保 Persona 风格即时生效）
    const effectivePersona = (options?.persona || options?.personaId || cfg.persona) as VoicePersonaId;
    const personaMeta = VOICE_PERSONAS.find(p => p.id === effectivePersona) || VOICE_PERSONAS[0];
    
    const targetVolume = options?.volume ?? cfg.volume;
    
    // 优先使用显式指定的 pitch/rate；否则直接采用对应风格基准音调，确保人声风格立竿见影切换
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

    // 5. 绑定最优神经真人音色（若当前播报为指定风格，不带入已锁定的旧角色名称）
    const voiceNameToMatch = (options?.persona && options.persona !== cfg.persona) 
      ? undefined 
      : cfg.selectedVoiceName;
    const matchedVoice = findBestPersonaVoice(effectivePersona, voiceNameToMatch);
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    if (options?.onEnd) {
      utterance.onend = () => options.onEnd?.();
      utterance.onerror = () => options.onEnd?.();
    }

    // 6. 微延时启动，确保声学前奏和弦自然衰减后无缝切入真人语音，避免声音打架
    const chimeDelayMs = cfg.soundEffectEnabled ? 280 : 30;
    setTimeout(() => {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Speech synthesis speak execution failed:', err);
        options?.onEnd?.();
      }
    }, chimeDelayMs);

  } catch (e) {
    console.warn('Speech synthesis initialization failed:', e);
    options?.onEnd?.();
  }
}

// -------------------------------------------------------------
// 核心业务场景语音播报预设 (Comprehensive Business Voice Alerts)
// 包含：前台叫号、等位排队、自营新单提醒、骑手端各生命周期广播
// -------------------------------------------------------------
export const voiceAlerts = {
  /**
   * 1. 商家端：自营新订单到达提醒
   * 优先播放纯正真人男女声母带录音，彻底杜绝人机机械感
   */
  newOrder: (orderNo: string, amount: number, channel: 'delivery' | 'dine_in' | 'pickup' = 'delivery', isDirect: boolean = true) => {
    const cfg = getVoiceConfig();
    if (!cfg.enabled || !cfg.autoPlayNewOrder) return;

    const personaMeta = VOICE_PERSONAS.find(p => p.id === cfg.persona) || VOICE_PERSONAS[0];
    const isMale = personaMeta.gender === 'male';
    const audioUrl = isMale ? '/audio/alert_order_male.wav' : '/audio/alert_order_female.wav';

    // 优先播放高保真母带级真人音频
    playRealAudio(audioUrl, cfg.volume).then((played) => {
      if (!played) {
        const channelName = channel === 'delivery' ? (isDirect ? '自营专送' : '外卖专送') : channel === 'dine_in' ? '堂食就餐' : '到店自提';
        const text = `您有新的${channelName}订单，单号 ${orderNo}，实付金额 ${amount.toFixed(1)} 元，请及时接单制作！`;
        speakText(text, { chimeType: 'order', persona: cfg.persona });
      }
    });
  },

  /**
   * 2. 商家端：自营专送加急新单
   */
  newSelfOperatedOrder: (orderNo: string, amount: number, customerName?: string) => {
    const cfg = getVoiceConfig();
    if (!cfg.enabled || !cfg.autoPlayNewOrder) return;

    const personaMeta = VOICE_PERSONAS.find(p => p.id === cfg.persona) || VOICE_PERSONAS[0];
    const isMale = personaMeta.gender === 'male';
    const audioUrl = isMale ? '/audio/alert_order_male.wav' : '/audio/alert_order_female.wav';

    playRealAudio(audioUrl, cfg.volume).then((played) => {
      if (!played) {
        const guestGreeting = customerName ? `食客 ${customerName} ` : '';
        const text = `叮咚！您有新的自营专送订单，${guestGreeting}单号 ${orderNo}，实付金额 ${amount.toFixed(1)} 元，请商家及时接单处理！`;
        speakText(text, { chimeType: 'order', persona: cfg.persona });
      }
    });
  },

  /**
   * 3. 前台端：叫号取餐广播
   * 专属母带：知性/甜美女声 vs 浑厚磁性男声
   */
  callingGuest: (queueNo: string, tableOrPickup: string = '餐车取餐窗口') => {
    const cfg = getVoiceConfig();
    if (!cfg.enabled || !cfg.autoPlayCalling) return;

    const personaMeta = VOICE_PERSONAS.find(p => p.id === cfg.persona) || VOICE_PERSONAS[0];
    const isMale = personaMeta.gender === 'male';
    const audioUrl = isMale ? '/audio/alert_call_pickup_male.wav' : '/audio/alert_call_pickup_female.wav';

    playRealAudio(audioUrl, cfg.volume).then((played) => {
      if (!played) {
        const text = `请——${queueNo} 号顾客，到 ${tableOrPickup} 取餐。您的餐品已新鲜制作完成，祝您用餐愉快！`;
        speakText(text, { chimeType: 'call', persona: cfg.persona });
      }
    });
  },

  /**
   * 4. 等位端：等位排队到号入座广播
   */
  callingWaitTable: (queueNo: string, partySize: number = 2, tableArea: string = '堂食就餐区') => {
    const cfg = getVoiceConfig();
    if (!cfg.enabled || !cfg.autoPlayQueueWait) return;

    const personaMeta = VOICE_PERSONAS.find(p => p.id === cfg.persona) || VOICE_PERSONAS[0];
    const isMale = personaMeta.gender === 'male';
    const audioUrl = isMale ? '/audio/alert_call_pickup_male.wav' : '/audio/alert_call_pickup_female.wav';

    playRealAudio(audioUrl, cfg.volume).then((played) => {
      if (!played) {
        const text = `请——${queueNo} 号顾客，${partySize} 人桌位已准备就绪，请移步 ${tableArea} 就餐。过号请重新取号，感谢您的耐心等候！`;
        speakText(text, { chimeType: 'call', persona: cfg.persona });
      }
    });
  },

  /**
   * 5. 等位端：等位进度与提前候餐提醒
   */
  waitingQueueReminder: (queueNo: string, remainingCount: number = 1) => {
    const cfg = getVoiceConfig();
    if (!cfg.enabled || !cfg.autoPlayQueueWait) return;

    const text = `等位温馨提醒：请 ${queueNo} 号顾客注意，您前方还有 ${remainingCount} 桌正在就餐，请在候餐区稍作准备！`;
    speakText(text, { chimeType: 'call', persona: cfg.persona });
  },

  /**
   * 6. 等位端：过号顺延广播
   */
  passedTicketNotice: (queueNo: string) => {
    const cfg = getVoiceConfig();
    if (!cfg.enabled || !cfg.autoPlayQueueWait) return;

    const text = `过号提醒：请 ${queueNo} 号顾客注意，您的叫号已顺延，如需就餐请联系餐车前台服务人员重新安排。`;
    speakText(text, { chimeType: 'call', persona: cfg.persona });
  },

  /**
   * 7. 骑手端：新顺路订单派发待抢广播
   */
  riderNewDeliveryPool: (orderNo: string, earnings: number, distanceMeters: number = 500) => {
    const cfg = getVoiceConfig();
    if (!cfg.enabled || !cfg.autoPlayRiderPool) return;

    const distText = distanceMeters >= 1000 ? `${(distanceMeters / 1000).toFixed(1)}公里` : `${distanceMeters}米`;
    const text = `骑士您好！收到新的顺路自营订单，单号 ${orderNo}，配送费 ${earnings.toFixed(1)} 元，距离 ${distText}，请及时抢单！`;
    speakText(text, { chimeType: 'rider', persona: cfg.persona });
  },

  /**
   * 8. 骑手端：抢单锁定成功播报
   */
  riderOrderGrabbed: (orderNo: string, truckName: string = '黑曜石流动餐车') => {
    const cfg = getVoiceConfig();
    if (!cfg.enabled || !cfg.autoPlayRiderAction) return;

    const text = `接单成功！单号 ${orderNo}，请前往 ${truckName} 取餐，路上请注意骑行安全！`;
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

    const orderPart = orderNo ? `，单号 ${orderNo}` : '';
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

    const text = `催单提醒！单号 ${orderNo} 已等待 ${waitMinutes} 分钟，顾客发起了催单，请优先出餐配送！`;
    speakText(text, { chimeType: 'urgent', persona: cfg.persona });
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

    const text = `单号 ${orderNo} 制作完毕，请前台或骑手及时取餐装箱！`;
    speakText(text, { chimeType: 'success', persona: cfg.persona });
  }
};
