import React, { useState } from 'react';
import {
  MapPin,
  Camera,
  FileText,
  Radio,
  Zap,
  Flame,
  AlertTriangle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Copy,
  ExternalLink,
  Volume2,
  Bike,
  Store,
  User,
  ShoppingBag,
  Sparkles,
  ChevronRight,
  Maximize2,
  Check,
  Award,
  AlertCircle
} from 'lucide-react';
import { matchDishImageUrl } from '../../utils/dishImageMatcher';

export interface MaterialMessageBubbleProps {
  text: string;
  isSelf: boolean;
  senderRole?: 'user' | 'rider' | 'merchant' | 'platform' | 'system';
  senderName?: string;
  time?: string;
  type?: string;
  voiceDuration?: number;
  voiceTranscribed?: string;
  voiceWaveform?: number[];
  statusChangeInfo?: {
    fromStatus?: string;
    toStatus?: string;
    title?: string;
    description?: string;
    actionOperator?: string;
    operatorRole?: string;
  };
  onQuickAction?: (actionType: string, payload?: any) => void;
  showToast?: (title: string, desc?: string) => void;
  playWalkieTalkieBeep?: () => void;
  playChimeSound?: () => void;
}

// 检查是否为纯 Emoji 消息 (1 到 4 个常用 Emoji)
function isPureEmojiMessage(str: string): boolean {
  const trimmed = str.trim();
  if (!trimmed || trimmed.length > 16) return false;
  // 正则匹配常见 Emoji 与相关符号
  const emojiRegex = /^(\p{Extended_Pictographic}|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83E[\uDD00-\uDDFF]|\s)+$/u;
  return emojiRegex.test(trimmed) && !trimmed.includes('【') && !trimmed.includes(':');
}

export const MaterialMessageBubble: React.FC<MaterialMessageBubbleProps> = ({
  text,
  isSelf,
  senderRole = 'user',
  senderName = '',
  time = '',
  type = 'text',
  voiceDuration = 5,
  voiceTranscribed = '',
  voiceWaveform = [16, 24, 32, 20, 28, 40, 36, 18, 26, 30, 22, 14, 28],
  statusChangeInfo,
  onQuickAction,
  showToast = () => {},
  playWalkieTalkieBeep = () => {},
  playChimeSound = () => {}
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const copyToClipboard = (content: string, label: string) => {
    try {
      navigator.clipboard.writeText(content);
      setCopiedKey(label);
      showToast('已复制到剪贴板', `${label}: ${content}`);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      showToast('复制失败', '请手动选中复制');
    }
  };

  // 0. 语音消息渲染 (type === 'voice')
  if (type === 'voice') {
    const toggleVoice = () => {
      playWalkieTalkieBeep();
      setIsAudioPlaying(!isAudioPlaying);
      if (!isAudioPlaying) {
        setTimeout(() => setIsAudioPlaying(false), (voiceDuration || 5) * 1000);
      }
    };

    const cleanTranscription = (voiceTranscribed || text || '')
      .replace(/^【语音消息】：?/, '')
      .replace(/^【语音已转文字】：?/, '')
      .replace(/^语音转文字：/, '')
      .trim();

    return (
      <div className={`w-[220px] sm:w-[250px] p-2.5 rounded-xl font-sans space-y-2 ${
        isSelf 
          ? 'text-white' 
          : 'text-neutral-900'
      }`}>
        <div className="flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={toggleVoice}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition active:scale-95 shrink-0 ${
              isSelf
                ? 'bg-white text-neutral-900 hover:bg-neutral-100 shadow-2xs'
                : 'bg-neutral-900 text-white hover:bg-black shadow-2xs'
            }`}
          >
            <Volume2 className={`w-3.5 h-3.5 ${isAudioPlaying ? 'animate-bounce' : ''}`} />
            <span className="font-mono">{isAudioPlaying ? '播放中' : `${voiceDuration || 5}" 语音`}</span>
          </button>

          {/* 拟态声波波形 */}
          <div className="flex items-center gap-0.5 flex-1 justify-end h-5 px-1">
            {voiceWaveform.map((h, i) => (
              <span
                key={i}
                className={`w-0.5 rounded-full transition-all duration-150 ${
                  isSelf
                    ? isAudioPlaying ? 'bg-white animate-pulse' : 'bg-white/30'
                    : isAudioPlaying ? 'bg-neutral-900 animate-pulse' : 'bg-neutral-300'
                }`}
                style={{
                  height: isAudioPlaying ? `${Math.min(100, h * 2.2)}%` : `${Math.max(25, h * 0.45)}%`
                }}
              />
            ))}
          </div>
        </div>

        {cleanTranscription && (
          <div className={`pt-1.5 border-t text-[11.5px] leading-relaxed truncate ${
            isSelf ? 'border-white/15 text-white/80' : 'border-neutral-100 text-neutral-600'
          }`} title={cleanTranscription}>
            {cleanTranscription}
          </div>
        )}
      </div>
    );
  }

  // 0.1 状态变更卡片 (type === 'status_change')
  if (type === 'status_change' && statusChangeInfo) {
    return (
      <div className="w-[260px] sm:w-[290px] bg-white border border-neutral-200/90 rounded-2xl p-3 shadow-2xs font-sans space-y-2 text-neutral-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-neutral-900 text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span>{statusChangeInfo.title || '状态流转变更'}</span>
          </div>
          <span className="text-[10px] font-mono text-neutral-400">系统流转</span>
        </div>
        <p className="text-neutral-600 text-xs leading-relaxed">
          {statusChangeInfo.description || text}
        </p>
        <div className="pt-1.5 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400">
          <span>{statusChangeInfo.actionOperator || '主厨王师傅'}</span>
          <span className="font-mono text-[10px]">{time}</span>
        </div>
      </div>
    );
  }

  // 0.2 餐车桌台协同互动卡片 (text.startsWith('【餐车交互·') || text.includes('来自食客桌台协同消息'))
  if (text.startsWith('【餐车交互·') || text.includes('来自食客桌台协同消息')) {
    const actionMatch = text.match(/【餐车交互·([^】]+)】/);
    const actionTag = actionMatch ? actionMatch[1] : '桌台互动';
    const truckMatch = text.match(/当前绑定餐车：([^，\n]+)/);
    const truckName = truckMatch ? truckMatch[1] : '流动餐车';
    
    // 清理正文内容
    let cleanText = text
      .replace(/【餐车交互·[^】]+】/, '')
      .replace(/来自食客桌台协同消息：/, '')
      .replace(/，当前绑定餐车：.*$/, '')
      .trim();
    if (!cleanText) cleanText = actionTag;

    const isUrgent = actionTag.includes('催单') || actionTag.includes('急');

    return (
      <div className="w-[260px] sm:w-[290px] font-sans rounded-2xl overflow-hidden shadow-2xs border border-neutral-200/90 bg-white text-neutral-900">
        <div className="px-3 py-1.5 flex items-center justify-between border-b border-neutral-100 bg-neutral-50/80">
          <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
            <Sparkles className={`w-3.5 h-3.5 ${isUrgent ? 'text-amber-600' : 'text-emerald-600'}`} />
            <span>食客桌台协同</span>
          </div>
          <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${
            isUrgent ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
          }`}>
            {actionTag}
          </span>
        </div>

        <div className="p-3 space-y-2">
          <p className="text-xs font-medium leading-relaxed text-neutral-800">
            {cleanText}
          </p>
          <div className="pt-1.5 border-t border-neutral-100 flex items-center justify-between text-[10px] text-neutral-400">
            <span className="truncate max-w-[170px]">{truckName}</span>
            <span className="font-mono">{time}</span>
          </div>
        </div>
      </div>
    );
  }

  // 1. 纯 Emoji 消息渲染 (去边框的大表情视觉)
  if (isPureEmojiMessage(text)) {
    return (
      <div className="py-1 px-2 select-none">
        <div className="text-3xl sm:text-4xl tracking-wider filter drop-shadow-xs hover:scale-110 transition-transform duration-200 cursor-default animate-in zoom-in-90">
          {text}
        </div>
      </div>
    );
  }

  // 2. 拍照存证留存图片气泡 (含 [IMAGE]:)
  if (text.includes('[IMAGE]:')) {
    const [descPart, imgUrl] = text.split('[IMAGE]:');
    const cleanImgUrl = imgUrl?.trim() || '';
    const lines = descPart.trim().split('\n');
    const titleLine = lines[0]?.replace(/^📷【?/, '').replace(/】?$/, '') || '现场存证凭据';
    const otherLines = lines.slice(1);

    return (
      <div className="space-y-2 max-w-[270px] sm:max-w-[300px] font-sans bg-white p-2.5 rounded-2xl border border-neutral-200/90 shadow-2xs">
        {/* 存证信息头 */}
        <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-neutral-100">
          <div className="flex items-center gap-1.5 min-w-0">
            <Camera className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span className="text-xs font-bold text-neutral-900 truncate">
              {titleLine}
            </span>
          </div>
          <span className="text-[10px] font-mono text-neutral-400 shrink-0">
            {time}
          </span>
        </div>

        {/* 详细文字说明 */}
        {otherLines.length > 0 && (
          <div className="text-[11px] leading-relaxed text-neutral-600 space-y-0.5 bg-neutral-50 p-1.5 rounded-lg">
            {otherLines.map((line, idx) => (
              <div key={idx} className="truncate">
                {line}
              </div>
            ))}
          </div>
        )}

        {/* 存证主图卡片 */}
        {cleanImgUrl && (
          <div className="relative rounded-xl overflow-hidden border border-neutral-200 bg-neutral-900 group">
            <img
              src={cleanImgUrl}
              alt="存证留存"
              className="w-full h-36 sm:h-40 object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
              onClick={() => setPreviewImage(cleanImgUrl)}
            />
            <div className="absolute bottom-1.5 right-1.5 bg-black/60 backdrop-blur-xs text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
              点击放大
            </div>
          </div>
        )}

        {/* 放大预览弹窗 */}
        {previewImage && (
          <div
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <div className="relative max-w-lg w-full bg-neutral-900 rounded-2xl overflow-hidden border border-white/20 shadow-2xl p-2" onClick={(e) => e.stopPropagation()}>
              <img
                src={previewImage}
                alt="存证大图"
                className="w-full max-h-[75vh] object-contain rounded-xl"
              />
              <div className="p-3 text-white flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold">{titleLine}</div>
                  <div className="text-[10px] text-white/70 font-mono">
                    时间: {time}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-xs rounded-lg cursor-pointer transition"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. 订单账单核销卡与电子发票申请凭证
  if (text.startsWith('🧾【协同账单核销卡】') || text.startsWith('🧾【顾客申请对账与开票】')) {
    const isCustomerRequest = text.startsWith('🧾【顾客申请对账与开票】');
    
    // 提取字段
    const orderNoMatch = text.match(/订单编号：#?([A-Za-z0-9-]+)/);
    const amountMatch = text.match(/(实付总额|核对金额)：¥?([0-9.]+)/);
    const codeMatch = text.match(/分单核销码：#?([0-9]+)/);
    const addressMatch = text.match(/送达地址：(.+)/);
    const summaryMatch = text.match(/商品明细：(.+)/);

    const orderNo = orderNoMatch ? orderNoMatch[1] : 'UR-9821';
    const amount = amountMatch ? amountMatch[2] : '186.00';
    const verifyCode = codeMatch ? codeMatch[1] : orderNo.slice(-4) || '8829';
    const address = addressMatch ? addressMatch[1] : '科技园区 A 座北塔 1204 室';
    const summary = summaryMatch ? summaryMatch[1] : '碳烤和牛小汉堡双重奏等';

    return (
      <div className="w-[260px] sm:w-[290px] font-sans rounded-2xl overflow-hidden border border-neutral-200/90 bg-white shadow-2xs text-neutral-900">
        {/* 凭证顶部 */}
        <div className="px-3 py-2 flex items-center justify-between border-b border-neutral-100 bg-neutral-50/80">
          <div className="flex items-center gap-1.5 font-bold text-xs text-neutral-900">
            <FileText className="w-3.5 h-3.5 text-amber-600" />
            <span>{isCustomerRequest ? '对账与开票申请' : '协同核销账单'}</span>
          </div>
          <span className="text-[10px] font-mono text-neutral-500">
            #{orderNo}
          </span>
        </div>

        {/* 核心金额与核销码 */}
        <div className="p-3 space-y-2.5">
          <div className="flex items-baseline justify-between bg-neutral-50 p-2.5 rounded-xl border border-neutral-150">
            <div>
              <span className="text-[10px] text-neutral-500 block">
                {isCustomerRequest ? '结算金额' : '实付金额'}
              </span>
              <div className="flex items-baseline gap-0.5 text-neutral-900 font-mono font-bold text-lg">
                <span className="text-xs">¥</span>
                <span>{amount}</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-neutral-500 block">核销码</span>
              <div className="flex items-center justify-end gap-1">
                <span className="font-mono text-base font-bold text-neutral-900">
                  #{verifyCode}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(verifyCode, '核销码')}
                  className="p-1 text-neutral-400 hover:text-neutral-900 rounded cursor-pointer transition"
                  title="复制核销码"
                >
                  {copiedKey === '核销码' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          <div className="text-[11px] space-y-1 text-neutral-600">
            <div className="flex items-start justify-between gap-1">
              <span className="text-neutral-400 shrink-0">商品:</span>
              <span className="font-medium text-neutral-800 text-right truncate max-w-[190px]">{summary}</span>
            </div>
            <div className="flex items-start justify-between gap-1">
              <span className="text-neutral-400 shrink-0">地址:</span>
              <span className="text-neutral-600 text-right truncate max-w-[190px]">{address}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. 菜品素材气泡 (主厨推荐加单 / 顾客加单咨询)
  if (text.startsWith('🍲【主厨推荐加单】') || text.startsWith('🍲【顾客加单咨询】')) {
    const isCustomerInquiry = text.startsWith('🍲【顾客加单咨询】');

    const nameMatch = text.match(/(单品品名|咨询单品)：(.+)/);
    const priceMatch = text.match(/(加单特惠|单品特惠)：¥?([0-9.]+)/);
    const noteMatch = text.match(/(主厨寄语|顾客留言)：(.+)/);

    const dishName = nameMatch ? nameMatch[2].trim() : '经典黑椒炭烤和牛小汉堡';
    const price = priceMatch ? priceMatch[2].trim() : '48.00';
    const note = noteMatch
      ? noteMatch[2].trim()
      : isCustomerInquiry
      ? '请问后厨现在还来得及现做加单吗？如来得及请合并烘烤！'
      : '秘制香气浓郁，与当前订单合并烘烤，无须等待极速出单！';

    const dishImgUrl = matchDishImageUrl({ name: dishName });

    return (
      <div className="w-[260px] sm:w-[290px] font-sans rounded-2xl overflow-hidden border border-neutral-200/90 bg-white shadow-2xs text-neutral-900">
        <div className="relative h-24 w-full bg-neutral-900 overflow-hidden">
          <img
            src={dishImgUrl}
            alt={dishName}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute top-2 left-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white bg-black/50 backdrop-blur-xs">
              {isCustomerInquiry ? '💡 加单咨询' : '🔥 主厨推荐'}
            </span>
          </div>
          <div className="absolute bottom-2 left-2 right-2 flex items-baseline justify-between text-white">
            <span className="font-bold text-xs truncate max-w-[180px]">{dishName}</span>
            <div className="font-mono font-bold text-sm text-amber-300">
              ¥{price}
            </div>
          </div>
        </div>

        <div className="p-2.5 space-y-2">
          <p className="text-[11px] leading-relaxed text-neutral-600 bg-neutral-50 p-2 rounded-lg">
            {note}
          </p>

          <div className="flex items-center justify-between pt-1 border-t border-neutral-100">
            <span className="text-[10px] text-neutral-400">合单烘烤 · 同批送达</span>
            <button
              type="button"
              onClick={() => {
                if (onQuickAction) {
                  onQuickAction('confirm_dish', { name: dishName, price });
                } else {
                  showToast('加单意向已记录', `已通知档口主厨跟进【${dishName}】的制作`);
                }
              }}
              className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-black text-white font-medium text-xs cursor-pointer active:scale-95 transition"
            >
              {isCustomerInquiry ? '确认制作' : '确认加点'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 5. 协同售后工单气泡
  if (text.startsWith('📑【协同售后工单】')) {
    const lines = text.split('\n');
    const portLine = lines.find((l) => l.includes('发起端口：'))?.replace('发起端口：', '') || '食客端';
    const typeLine = lines.find((l) => l.includes('工单类型：'))?.replace('工单类型：', '') || '少餐漏送补发';
    const descLine = lines.find((l) => l.includes('问题描述：'))?.replace('问题描述：', '') || '餐品需核对补发';

    return (
      <div className="w-[260px] sm:w-[290px] font-sans rounded-2xl overflow-hidden border border-rose-200 bg-white shadow-2xs text-neutral-900">
        <div className="bg-rose-50 border-b border-rose-100 px-3 py-1.5 flex items-center justify-between text-rose-900">
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>售后工单</span>
          </div>
          <span className="text-[10px] font-mono text-rose-600">
            {portLine}
          </span>
        </div>

        <div className="p-2.5 space-y-2">
          <div className="text-xs font-bold text-neutral-900">
            事项：{typeLine}
          </div>
          <div className="text-[11px] text-neutral-600 bg-neutral-50 p-2 rounded-lg leading-relaxed">
            {descLine}
          </div>
        </div>
      </div>
    );
  }

  // 6. 地理坐标与 GPS 信标存证气泡
  if (
    text.startsWith('📍【送达位置坐标存证】') ||
    text.startsWith('📍【车载实时GPS巡航坐标】') ||
    text.startsWith('📍【餐车停泊取餐口坐标】') ||
    text.startsWith('📍【平台基准地理信标】')
  ) {
    const isRiderGPS = text.startsWith('📍【车载实时GPS巡航坐标】');
    const isMerchantStation = text.startsWith('📍【餐车停泊取餐口坐标】');
    const isUserDestination = text.startsWith('📍【送达位置坐标存证】');

    const lines = text.split('\n');
    const cleanLines = lines.slice(1);

    return (
      <div className="w-[260px] sm:w-[290px] font-sans rounded-2xl overflow-hidden border border-neutral-200/90 bg-white shadow-2xs text-neutral-900">
        <div className="px-3 py-1.5 flex items-center justify-between border-b border-neutral-100 bg-neutral-50/80">
          <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-900">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              {isUserDestination
                ? '送达坐标存证'
                : isRiderGPS
                ? '骑手实时GPS'
                : isMerchantStation
                ? '餐车泊位坐标'
                : '地理基准信标'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-neutral-400">{time}</span>
        </div>

        <div className="p-2.5 space-y-2">
          <div className="p-2 bg-neutral-50 rounded-xl text-[11px] space-y-1 font-mono text-neutral-800">
            {cleanLines.map((line, idx) => (
              <div key={idx} className="truncate leading-snug">
                {line}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end pt-0.5">
            <button
              type="button"
              onClick={() => {
                showToast('坐标已定位', '雷达地图已自动聚焦并高亮该位置');
              }}
              className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-black text-white text-xs font-medium cursor-pointer transition active:scale-95"
            >
              地图居中
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 7. 车载无线电对讲短语广播 (⚡)
  if (text.startsWith('⚡ [车载对讲播报]') || text.startsWith('⚡ [后厨对讲播报]') || text.startsWith('⚡ [平台调度广播]')) {
    const isRider = text.includes('车载对讲');
    const isKitchen = text.includes('后厨对讲');
    const speechContent = text.replace(/^⚡ \[[^\]]+\] /, '');

    const togglePlay = () => {
      playWalkieTalkieBeep();
      setIsAudioPlaying(true);
      setTimeout(() => setIsAudioPlaying(false), 3000);
    };

    return (
      <div className="w-[260px] sm:w-[290px] font-sans rounded-2xl overflow-hidden border border-neutral-200/90 bg-white shadow-2xs text-neutral-900">
        <div className="px-3 py-1.5 flex items-center justify-between border-b border-neutral-100 bg-neutral-50/80">
          <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-900">
            <Radio className="w-3.5 h-3.5 text-amber-500" />
            <span>{isRider ? '车载对讲广播' : isKitchen ? '后厨出单对讲' : '调度中枢广播'}</span>
          </div>
          <span className="text-[10px] font-mono text-neutral-400">{time}</span>
        </div>

        <div className="p-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2 bg-neutral-50 p-2 rounded-xl">
            <button
              type="button"
              onClick={togglePlay}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-900 hover:bg-black text-white text-xs font-medium cursor-pointer transition active:scale-95 shrink-0"
            >
              <Volume2 className={`w-3.5 h-3.5 ${isAudioPlaying ? 'animate-bounce' : ''}`} />
              <span>{isAudioPlaying ? '播放中' : '播放对讲'}</span>
            </button>

            <div className="flex items-center gap-0.5 flex-1 justify-end h-4">
              {[18, 32, 45, 24, 60, 48, 20, 36, 52, 28, 14].map((h, i) => (
                <span
                  key={i}
                  className={`w-0.5 rounded-full transition-all duration-200 ${
                    isAudioPlaying ? 'bg-amber-600 animate-pulse' : 'bg-neutral-300'
                  }`}
                  style={{ height: isAudioPlaying ? `${Math.min(100, h * 1.6)}%` : `${h * 0.4}%` }}
                />
              ))}
            </div>
          </div>

          <div className="text-xs leading-relaxed text-neutral-800 italic px-1">
            "{speechContent}"
          </div>
        </div>
      </div>
    );
  }

  // 8. 最高优先级催单与监管通报 (🚨 / 📢)
  if (text.startsWith('🚨【最高优先级加急催单】') || text.startsWith('📢【平台监管督促履约】')) {
    const isCustomerUrge = text.startsWith('🚨');

    return (
      <div className="w-[260px] sm:w-[290px] font-sans rounded-2xl overflow-hidden border border-rose-200 bg-rose-50/60 text-neutral-900 shadow-2xs">
        <div className="px-3 py-1.5 flex items-center justify-between border-b border-rose-100 bg-rose-100/70 text-rose-900">
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
            <span>{isCustomerUrge ? '加急催单提醒' : '平台监管督办'}</span>
          </div>
          <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-rose-600 text-white font-mono">
            加急
          </span>
        </div>

        <div className="p-2.5 space-y-1.5">
          <div className="text-xs leading-relaxed font-medium text-rose-950">
            {text.replace(/^🚨【[^】]+】\s*/, '').replace(/^📢【[^】]+】\s*/, '') || text}
          </div>
          <div className="text-[10px] text-rose-700/80 font-mono text-right">
            {time}
          </div>
        </div>
      </div>
    );
  }

  // 9. 路况与出炉通报 (🚦 / 🔥)
  if (text.startsWith('🚦【专线骑手路况报备】') || text.startsWith('🔥【现烤出炉进度通报】')) {
    const isTraffic = text.startsWith('🚦');

    return (
      <div className="w-[260px] sm:w-[290px] font-sans rounded-2xl overflow-hidden border border-neutral-200/90 bg-white shadow-2xs text-neutral-900">
        <div className="px-3 py-1.5 flex items-center justify-between border-b border-neutral-100 bg-neutral-50/80">
          <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
            {isTraffic ? <Bike className="w-3.5 h-3.5 text-amber-600" /> : <Flame className="w-3.5 h-3.5 text-rose-600" />}
            <span>{isTraffic ? '骑手路况报备' : '现烤出炉通报'}</span>
          </div>
          <span className="text-[10px] font-mono text-neutral-400">{time}</span>
        </div>

        <div className="p-2.5">
          <div className="text-xs leading-relaxed text-neutral-800">
            {text.replace(/^🚦【[^】]+】\s*/, '').replace(/^🔥【[^】]+】\s*/, '') || text}
          </div>
        </div>
      </div>
    );
  }

  // 10. 履约态势短语 (提取【...】标签徽章化)
  const bracketMatch = text.match(/^【([^】]+)】(.*)/);
  if (bracketMatch) {
    const tag = bracketMatch[1];
    const rest = bracketMatch[2];

    return (
      <div className="font-sans space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-800 border border-neutral-200">
            {tag}
          </span>
        </div>
        <div className="text-[12.5px] leading-relaxed pt-0.5">{rest || text}</div>
      </div>
    );
  }

  // 11. 口味加料与特殊需求便签气泡 (🌶️, 🧅, 🧊, 🥢, 📦 等)
  if (
    text.startsWith('🌶️') ||
    text.startsWith('🧅') ||
    text.startsWith('🧊') ||
    text.startsWith('🥢') ||
    text.startsWith('📦')
  ) {
    const symbol = text.slice(0, 2);
    const content = text.slice(2).trim();

    return (
      <div className="font-sans max-w-[260px] sm:max-w-[290px] rounded-xl border border-amber-200 bg-amber-50/60 p-2.5 shadow-2xs space-y-1 text-neutral-800">
        <div className="flex items-center justify-between border-b border-amber-200/60 pb-1">
          <div className="flex items-center gap-1.5">
            <span className="text-base">{symbol}</span>
            <span className="text-xs font-bold text-amber-950">口味与打包备注</span>
          </div>
          <span className="text-[9.5px] font-mono text-amber-800 bg-amber-100 px-1 py-0.2 rounded">后厨注意</span>
        </div>
        <div className="text-xs font-medium text-neutral-900 leading-relaxed pt-0.5">
          {content}
        </div>
      </div>
    );
  }

  // 12. 默认普通气泡 (自然换行与文字)
  return <div className="whitespace-pre-wrap break-words leading-relaxed font-sans">{text}</div>;
};

export default MaterialMessageBubble;
