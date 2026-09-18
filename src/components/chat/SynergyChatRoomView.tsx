import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Order, DishItem } from '../../types';
import {
  sendOrderChatMessage,
  subscribeOrderChat,
  getOrderChatMessages,
  syncOrderChatFromCloud,
  ChatMessageItem
} from '../../utils/chatHub';
import { getCanonicalOrderNo } from '../../utils/orderNormalizer';
import { safeGetStorage } from '../../utils/safeStorage';
import { INITIAL_ORDERS } from '../../data/mockData';
import { MaterialMessageBubble } from './MaterialMessageBubble';
import { matchDishImageUrl } from '../../utils/dishImageMatcher';
import {
  ShieldCheck,
  Sparkles,
  Flame,
  Bike,
  Store,
  User,
  Camera,
  Radio,
  MapPin,
  Zap,
  Copy,
  Check,
  ChevronRight,
  FileText,
  Award,
  AlertCircle,
  ShoppingBag,
  CornerDownLeft,
  Volume2,
  Clock,
  Mic,
  Send,
  Smile,
  Sliders,
  Shield,
  AlertTriangle
} from 'lucide-react';

const playWalkieTalkieBeep = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  } catch {
    // ignore
  }
};

const playChimeSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.08);
      gain.gain.setValueAtTime(0.12, ctx.currentTime + index * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.08 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + index * 0.08);
      osc.stop(ctx.currentTime + index * 0.08 + 0.26);
    });
  } catch {
    // ignore
  }
};

export interface SynergyChatRoomViewProps {
  order?: Order;
  orderNo?: string;
  onBack?: () => void;
  onOpenStore?: () => void;
  showToast?: (title: string, desc?: string) => void;
  viewerRole?: 'user' | 'rider' | 'merchant' | 'platform';
  embedded?: boolean;
  hideHeader?: boolean;
  activeChannel?: 'all' | 'rider' | 'merchant';
  onChannelChange?: (channel: 'all' | 'rider' | 'merchant') => void;
  isCallActive?: boolean;
  onToggleCall?: () => void;
}

export const SynergyChatRoomView: React.FC<SynergyChatRoomViewProps> = ({
  order,
  orderNo = 'UR-9821',
  onBack,
  onOpenStore,
  showToast = () => {},
  viewerRole = 'user',
  embedded = false,
  hideHeader = false,
  activeChannel: activeChannelProp,
  onChannelChange,
  isCallActive: isCallActiveProp,
  onToggleCall
}) => {
  const currentOrderNo = getCanonicalOrderNo(order?.orderNo || orderNo);

  // 严格区分当前使用端口与角色（食客端 / 骑手端 / 商家端 / 平台端），严禁越权操作
  const [activeRole, setActiveRole] = useState<'user' | 'rider' | 'merchant' | 'platform'>(viewerRole);

  useEffect(() => {
    setActiveRole(viewerRole);
  }, [viewerRole]);

  // 状态与筛选 (支持外部受控 activeChannelProp)
  const [internalChannel, setInternalChannel] = useState<'all' | 'rider' | 'merchant'>('all');
  const activeChannel = activeChannelProp !== undefined ? activeChannelProp : internalChannel;
  const setActiveChannel = (ch: 'all' | 'rider' | 'merchant') => {
    setInternalChannel(ch);
    if (onChannelChange) onChannelChange(ch);
  };

  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isOrderBannerExpanded, setIsOrderBannerExpanded] = useState(false);
  const [slaVisible, setSlaVisible] = useState(true);
  const [isUrged, setIsUrged] = useState(false);
  const [urgeToastVisible, setUrgeToastVisible] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);

  // 底部输入框 3 个核心按钮的展开状态与素材库交互
  const [isEmojiLibraryOpen, setIsEmojiLibraryOpen] = useState(false);
  const [isTacticalTrayOpen, setIsTacticalTrayOpen] = useState(false);
  const [isMaterialToolsOpen, setIsMaterialToolsOpen] = useState(false);

  // 素材库子标签
  const [activeEmojiCategory, setActiveEmojiCategory] = useState<'emojis' | 'status' | 'custom'>('emojis');
  const [activeTacticalTab, setActiveTacticalTab] = useState<'actions' | 'phrases' | 'evidence'>('actions');
  const [activePhraseCategory, setActivePhraseCategory] = useState<'dispatch' | 'food' | 'address' | 'rush'>('dispatch');
  const [activeToolsTab, setActiveToolsTab] = useState<'invoice' | 'dishes' | 'workorder' | 'audio'>('invoice');

  // 通话仿真
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // 文件上传 Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 消息列表与订阅
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 订单数据整合
  const fullOrder = React.useMemo(() => {
    const rawOrder = order as any;
    if (rawOrder && rawOrder.items && rawOrder.items.length > 0) {
      return rawOrder;
    }
    const allOrders = safeGetStorage<Order[]>('obsidian_truck_orders', INITIAL_ORDERS);
    const matched = allOrders.find((o) => o.orderNo === currentOrderNo || o.id === currentOrderNo);
    return matched || rawOrder || {
      orderNo: 'UR-9821',
      totalAmount: 186.0,
      status: 'cooking',
      deliveryAddress: '科技园区 A 座北塔 1204 室',
      etaMinutes: 4,
      items: [
        { id: '1', name: '碳烤和牛小汉堡双重奏', price: 48, quantity: 1 },
        { id: '2', name: '极夜西西里青柠微气泡', price: 16, quantity: 2 },
        { id: '3', name: '黑曜石松露金黄脆薯', price: 18, quantity: 1 }
      ]
    };
  }, [order, currentOrderNo]);

  // 加载初始消息并监听新消息
  useEffect(() => {
    const msgs = getOrderChatMessages(currentOrderNo, fullOrder);
    setMessages(msgs);

    syncOrderChatFromCloud(currentOrderNo, fullOrder).then((cloudMsgs) => {
      if (cloudMsgs && cloudMsgs.length > 0) {
        setMessages(cloudMsgs);
      }
    });

    const unsubscribe = subscribeOrderChat(currentOrderNo, (newMsgs) => {
      setMessages(newMsgs);
    });
    return () => unsubscribe();
  }, [currentOrderNo, fullOrder]);

  // 滚动至最新 (带双重保险与视口直接定位)
  const scrollToBottom = React.useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior });
    }
    const viewport = document.getElementById('synergy-message-viewport');
    if (viewport) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior });
    }
  }, []);

  useEffect(() => {
    scrollToBottom('smooth');
    const timer = setTimeout(() => {
      scrollToBottom('smooth');
    }, 120);
    return () => clearTimeout(timer);
  }, [messages, isTacticalTrayOpen, isEmojiLibraryOpen, isMaterialToolsOpen, urgeToastVisible, scrollToBottom]);

  // 通话计时
  useEffect(() => {
    let interval: any = null;
    if (isCallActive) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [isCallActive]);

  // 播放对讲音频
  const togglePlayRiderAudio = () => {
    if (isPlayingAudio) {
      setIsPlayingAudio(false);
      return;
    }
    try {
      playWalkieTalkieBeep();
    } catch {
      // ignore
    }
    setIsPlayingAudio(true);
    setAudioProgress(0);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 1;
      setAudioProgress(progress);
      if (progress >= 5) {
        clearInterval(interval);
        setIsPlayingAudio(false);
      }
    }, 1000);
  };

  // 发送文字消息
  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const senderName = activeRole === 'rider'
      ? '陈志远 · 专线骑手'
      : activeRole === 'merchant'
      ? '黑曜石餐车主厨'
      : activeRole === 'platform'
      ? '平台调度中枢'
      : '顾客本人';

    sendOrderChatMessage(currentOrderNo, {
      senderRole: activeRole,
      senderName,
      type: 'text',
      text
    });

    setInputText('');
    showToast('已发送至全员协同室', `以【${activeRole === 'user' ? '食客端' : activeRole === 'rider' ? '骑手端' : activeRole === 'merchant' ? '商家端' : '平台端'}】身份同步全链路`);
  };

  // 引用单品
  const handleQuoteDish = (dish: { name: string; price: number; quantity: number }) => {
    setInputText(`关于【${dish.name}】(x${dish.quantity})：`);
    inputRef.current?.focus();
    showToast('已引用单品', `关于 ${dish.name} 的咨询内容已填入输入框`);
  };

  // 发送定位 (按端口分工)
  const handleSendLocation = (customAddr?: string) => {
    const locText = customAddr || fullOrder.deliveryAddress || '科技园区 A 座北塔 1204 室';
    if (activeRole === 'user') {
      sendOrderChatMessage(currentOrderNo, {
        senderRole: 'user',
        senderName: '顾客本人',
        type: 'text',
        text: `📍【送达位置坐标存证】\n目标收餐地址：${locText}\n高精GPS：31.2431°N, 121.4682°E\n定位精度：±0.8m · 室内蓝牙信标辅助已就位\n状态：路线已直连骑手端导航中枢`
      });
      showToast('收餐高精定位已同步', '骑手端车载导航已自动导入坐标点');
    } else if (activeRole === 'rider') {
      sendOrderChatMessage(currentOrderNo, {
        senderRole: 'rider',
        senderName: '陈志远 · 专线骑手',
        type: 'text',
        text: `📍【车载实时GPS巡航坐标】\n当前坐标：31.2435°N, 121.4688°E (距目的地约 280m)\n行进时速：26 km/h\n状态：车载导航正引导前往写字楼南门外卖通道`
      });
      showToast('骑手GPS坐标已同步', '已向顾客与餐车通报骑行实时轨迹');
    } else if (activeRole === 'merchant') {
      sendOrderChatMessage(currentOrderNo, {
        senderRole: 'merchant',
        senderName: '黑曜石餐车档口',
        type: 'text',
        text: `📍【餐车停泊取餐口坐标】\n餐车位置：创智天地广场中央步道 01 泊位\n坐标：31.2425°N, 121.4675°E\n取餐窗口：后厨 2 号外摆专送交接窗`
      });
      showToast('餐车泊位已发送', '已告知各方当前档口取餐交接点');
    } else {
      sendOrderChatMessage(currentOrderNo, {
        senderRole: 'platform',
        senderName: '平台调度基站',
        type: 'text',
        text: `📍【平台基准地理信标】\n标定园区：创智天地核心商务区\n基准网格：UR-GRID-09821\n定位质量：差分厘米级`
      });
      showToast('平台信标已标定', '全网时空基准已广播');
    }
    setIsTacticalTrayOpen(false);
  };

  // 对讲短语 (权限拦截：食客端不允许跨角色使用车载无线电)
  const handleSendIntercomPhrase = (customPhrase?: string) => {
    if (activeRole === 'user') {
      showToast('跨角色操作拦截', '当前为【食客端】，无车载无线电对讲发射权限！该功能仅限骑手车载端或档口端使用。');
      return;
    }

    playWalkieTalkieBeep();
    if (activeRole === 'rider') {
      const phrase = customPhrase || '⚡ [车载对讲播报] 保温箱已密闭锁温，正全速通过西藏北路，预计 3 分钟内抵达！';
      sendOrderChatMessage(currentOrderNo, {
        senderRole: 'rider',
        senderName: '陈志远 · 专线金牌骑手',
        type: 'text',
        text: phrase
      });
      showToast('对讲短语已广播', '车载对讲音频已同步通报全员');
    } else if (activeRole === 'merchant') {
      const phrase = customPhrase || '⚡ [后厨对讲播报] 炭烤和牛汉堡已出炉装袋，骑手到达即可在2号窗提餐！';
      sendOrderChatMessage(currentOrderNo, {
        senderRole: 'merchant',
        senderName: '餐车后厨 · 王师傅',
        type: 'text',
        text: phrase
      });
      showToast('后厨对讲已广播', '已通报骑手取餐口就位');
    } else {
      const phrase = customPhrase || '⚡ [平台调度广播] 监测到园区电梯高峰，请各方注意配送安全！';
      sendOrderChatMessage(currentOrderNo, {
        senderRole: 'platform',
        senderName: '调度中枢 · 广播员',
        type: 'text',
        text: phrase
      });
      showToast('调度广播已发送', '全频段通报已下发');
    }
    setIsTacticalTrayOpen(false);
  };

  // 拍照存证 (按端口区分存证主体)
  const handleSendProofPhoto = (imgUrl?: string, title?: string) => {
    const finalUrl = imgUrl || 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=500&auto=format&fit=crop&q=60';
    
    if (activeRole === 'user') {
      const finalTitle = title || '顾客收餐开箱验真存证';
      sendOrderChatMessage(currentOrderNo, {
        senderRole: 'user',
        senderName: '顾客本人 · 验真存证',
        type: 'text',
        text: `📷【顾客收餐验真留样】\n存证类目：${finalTitle}\n核验时间：${new Date().toLocaleTimeString()}\n状态：顾客端收餐取证已存档\n[IMAGE]:${finalUrl}`
      });
      showToast('验真存证已上传', '顾客收餐验样记录已存入云端');
    } else if (activeRole === 'rider') {
      const finalTitle = title || '外卖架妥投拍照存证';
      sendOrderChatMessage(currentOrderNo, {
        senderRole: 'rider',
        senderName: '陈志远 · 专线骑手',
        type: 'text',
        text: `📷【外卖架妥投存证留样】\n存证类目：${finalTitle}\n妥投时间：${new Date().toLocaleTimeString()}\n状态：外卖架/大堂妥投影像已上链\n[IMAGE]:${finalUrl}`
      });
      showToast('妥投存证已上传', '骑手交付照片已留底');
    } else if (activeRole === 'merchant') {
      const finalTitle = title || '保温袋封签完整无拆封';
      sendOrderChatMessage(currentOrderNo, {
        senderRole: 'merchant',
        senderName: '餐车后厨 · 质检员',
        type: 'text',
        text: `📷【现场出餐存证留存】\n存证类目：${finalTitle}\n核验时间：${new Date().toLocaleTimeString()}\n云端状态：哈希已写入腾讯云COS安全存证库\n[IMAGE]:${finalUrl}`
      });
      showToast('后厨存证已上传', '双层保温封签留样已存入云存储审计库');
    } else {
      const finalTitle = title || '平台监管稽核留存';
      sendOrderChatMessage(currentOrderNo, {
        senderRole: 'platform',
        senderName: '平台稽核中枢',
        type: 'text',
        text: `📷【平台审计调阅留存】\n类目：${finalTitle}\n核验时间：${new Date().toLocaleTimeString()}\n状态：官方安全审计库记录完毕\n[IMAGE]:${finalUrl}`
      });
      showToast('审计存证已记录', '平台监管凭证已归档');
    }
    setIsTacticalTrayOpen(false);
  };

  // 处理本地照片上传存证
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        handleSendProofPhoto(dataUrl, activeRole === 'user' ? '顾客收餐拍摄' : activeRole === 'rider' ? '骑手妥投拍摄' : '餐车出餐拍摄');
      }
    };
    reader.readAsDataURL(file);
  };

  // 发送订单核销账单卡 (权限控制：仅商家/平台可签发账单；食客可申请对账开票；骑手拦截)
  const handleSendInvoiceCard = () => {
    const total = Number(fullOrder.totalAmount || 186).toFixed(2);
    const dishSummary = fullOrder.items?.map((i: any) => `${i.name} x${i.quantity}`).join('、') || '炭烤和牛汉堡双重奏等';

    if (activeRole === 'user') {
      sendOrderChatMessage(currentOrderNo, {
        senderRole: 'user',
        senderName: '顾客本人',
        type: 'text',
        text: `🧾【顾客申请对账与开票】\n订单编号：#${currentOrderNo}\n核对金额：¥${total}\n商品明细：${dishSummary}\n申请事项：请商家核销台核对并开具电子普通发票`
      });
      showToast('对账申请已提交', '已通知餐车档口核对并生成发票凭证');
      setIsMaterialToolsOpen(false);
      return;
    }

    if (activeRole === 'rider') {
      showToast('无核销开票权限', '骑手端无权签发商家核销账单，该功能仅限餐车档口或平台端操作！');
      return;
    }

    sendOrderChatMessage(currentOrderNo, {
      senderRole: 'merchant',
      senderName: '黑曜石餐车核销台',
      type: 'text',
      text: `🧾【协同账单核销卡】\n订单编号：#${currentOrderNo}\n实付总额：¥${total}\n商品明细：${dishSummary}\n分单核销码：#${currentOrderNo.slice(-4) || '8829'}\n送达地址：${fullOrder.deliveryAddress || '科技园区 A 座 1204 室'}\n开票状态：官方电子普通发票已开具`
    });
    setIsMaterialToolsOpen(false);
    showToast('核销账单卡已发送', '协同各方已同步接收订单结算与凭证数据');
  };

  // 发送菜品推荐/加点卡 (食客端咨询加点；商家端主厨推销；骑手端禁止)
  const handleSendDishCard = (dishName: string, price: number, desc?: string) => {
    if (activeRole === 'user') {
      sendOrderChatMessage(currentOrderNo, {
        senderRole: 'user',
        senderName: '顾客本人',
        type: 'text',
        text: `🍲【顾客加单咨询】\n咨询单品：${dishName}\n单品特惠：¥${price.toFixed(2)}\n顾客留言：请问后厨现在还来得及现做加单吗？如来得及请合并烘烤！`
      });
      showToast('加单咨询已发送', `已向餐车主厨咨询【${dishName}】加单可行性`);
      setIsMaterialToolsOpen(false);
      return;
    }

    if (activeRole === 'rider') {
      showToast('无推销菜品权限', '骑手端不支持发送菜品推销卡，该功能属于商家档口端。');
      return;
    }

    sendOrderChatMessage(currentOrderNo, {
      senderRole: 'merchant',
      senderName: '餐车现烤主厨推荐',
      type: 'text',
      text: `🍲【主厨推荐加单】\n单品品名：${dishName}\n加单特惠：¥${price.toFixed(2)}\n主厨寄语：${desc || '秘制香气浓郁，与当前订单合并烘烤，无须等待极速出单！'}\n如需添加可直接在协同室中回复确认。`
    });
    setIsMaterialToolsOpen(false);
    showToast('加购推荐卡已发送', `已向顾客推荐【${dishName}】`);
  };

  // 发起协同工单
  const handleSendWorkOrder = (type: string, desc: string) => {
    sendOrderChatMessage(currentOrderNo, {
      senderRole: activeRole,
      senderName: activeRole === 'rider' ? '骑手履约报备' : activeRole === 'merchant' ? '餐车后厨工单' : '食客服务中心',
      type: 'text',
      text: `📑【协同售后工单】\n发起端口：${activeRole === 'user' ? '食客端' : activeRole === 'rider' ? '骑手车载端' : '商家档口端'}\n工单类型：${type}\n问题描述：${desc}\n响应等级：P1 加急 · 督导热线与餐车车载端已强制联动介入`
    });
    setIsMaterialToolsOpen(false);
    showToast('工单已生成', '平台客诉协同专线已受理并加急处理');
  };

  // 加急催单 / 路况进度通报 (按角色职能分工)
  const triggerExpediteUrge = () => {
    if (activeRole === 'rider') {
      sendOrderChatMessage(currentOrderNo, {
        senderRole: 'rider',
        senderName: '专线骑手路况报备',
        type: 'text',
        text: '🚦【专线骑手路况报备】\n骑手当前正遇写字楼电梯高峰/进出登记，预计延迟 1-2 分钟送达，车载保温箱已持续锁温中！'
      });
      showToast('路况已报备', '已向食客与餐车通报实时骑行路况');
      return;
    }

    if (activeRole === 'merchant') {
      sendOrderChatMessage(currentOrderNo, {
        senderRole: 'merchant',
        senderName: '餐车后厨进度通报',
        type: 'text',
        text: '🔥【现烤出炉进度通报】\n汉堡正在扒炉高温现烤，肉汁锁温中，预计 90 秒后双封签装袋交付骑手！'
      });
      showToast('出餐进度已通报', '已通报出炉倒计时');
      return;
    }

    playChimeSound();
    setIsUrged(true);
    setUrgeToastVisible(true);
    sendOrderChatMessage(currentOrderNo, {
      senderRole: activeRole === 'platform' ? 'platform' : 'user',
      senderName: activeRole === 'platform' ? '平台督办指令' : '顾客加急指令',
      type: 'text',
      text: activeRole === 'platform'
        ? '📢【平台监管督促履约】\n监测到该订单临近SLA阈值，请骑手与餐车档口优先履约交付！'
        : '🚨【最高优先级加急催单】\n食客已发起最高优先级协同催单，餐车后厨与骑手车载专线已联动高频蜂鸣与加权震动！'
    });

    setTimeout(() => {
      setUrgeToastVisible(false);
    }, 3800);

    setTimeout(() => {
      setIsUrged(false);
    }, 30000);
  };

  // 常用表情与符号库
  const EMOJI_LIST = [
    '😊', '👍', '🤝', '🙏', '🛵', '🍔', '📦', '🚨',
    '📍', '💨', '⏳', '💯', '🔥', '🚪', '🏢', '📞',
    '⚠️', '🕒', '🍜', '🍱', '🥤', '🥩', '🍳', '🚲',
    '💬', '🥢', '🧊', '🧅', '🌶️', '✨', '🛎️', '🥪'
  ];

  // 常用态势短语库
  const STATUS_PHRASES = [
    '【已取餐】正在全速送往指定地址',
    '【请稍候】正在乘梯下楼，请稍等 1 分钟',
    '【已放门口】餐品已轻放于门边地垫上',
    '【已放外卖架】已置于前台指定外卖架第 2 层',
    '【辛苦师傅】大雨路滑，感谢骑手师傅！',
    '【包装完好】保温封签完好，已验真',
    '【请提前电话】到达大堂时请提前致电',
    '【收到立刻】收到通知，现在就去取餐'
  ];

  // 口味与加料素材库
  const CUSTOM_TASTE_PHRASES = [
    '🌶️ 麻烦多放辣椒香料',
    '🧅 不要葱花香菜蒜蓉',
    '🧊 冷萃饮品请尽量少冰',
    '🥢 请多配一份一次性餐具',
    '📦 炭烤汉堡请加防颠簸气垫',
    '⚡ 正在开紧急会议，请务必尽快送达'
  ];

  // 战术话术库 (分4大类)
  const TACTICAL_PHRASES = {
    dispatch: [
      '📦 麻烦直接放 12 楼前台外卖架即可',
      '📞 到达大楼下请提前电话联系',
      '🌧️ 大雨路滑，骑手师傅请注意骑行安全',
      '🏢 电梯需要刷卡，到达请在前台稍等片刻'
    ],
    food: [
      '🍔 炭烤汉堡请注意防颠簸锁温',
      '🥤 冷萃咖啡已加冰锁鲜，请尽快饮用',
      '🍳 刚出炉现烤，保温箱已密封锁温',
      '🥢 请帮忙多放两副一次性环保餐具'
    ],
    address: [
      '📍 科技园区A座北塔大堂西侧门进入',
      '🚪 房门号为 1204，门禁密码 #1204',
      '📦 请放置于门口置物架，无需敲门',
      '🛎️ 到达请按门铃，已在门口等待签收'
    ],
    rush: [
      '⚡ 紧急会议即将开始，麻烦优先派送',
      '🚨 超时严重，请立刻协调就近骑手转单',
      '🕒 还有 5 分钟午休结束，请尽快送达',
      '🤝 如有堵车请随时在协同室同步最新时间'
    ]
  };

  // 预设存证图片库
  const PRESET_EVIDENCE = [
    {
      title: '保温袋封签完整无拆封',
      desc: '原装双封条无破损',
      url: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=500&auto=format&fit=crop&q=60'
    },
    {
      title: '前台外卖架妥投拍照',
      desc: '12楼外卖指定取件点',
      url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=500&auto=format&fit=crop&q=60'
    },
    {
      title: '后厨炭烤出餐质检验真',
      desc: '出炉即刻装入恒温保温箱',
      url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&auto=format&fit=crop&q=60'
    },
    {
      title: '收银小票与餐品核对存证',
      desc: '条码已核验，单品齐全',
      url: 'https://images.unsplash.com/photo-1554415707-9e49fe832807?w=500&auto=format&fit=crop&q=60'
    }
  ];

  // 推荐加购菜品素材
  const RECOMMENDED_DISHES = [
    { name: '经典黑椒炭烤和牛小汉堡', price: 48.0, desc: '澳洲和牛炭火慢烤，肉汁充盈' },
    { name: '极夜西西里青柠微气泡', price: 16.0, desc: '鲜榨青柠爽口微气泡，冰镇锁鲜' },
    { name: '黑曜石松露金黄脆薯', price: 18.0, desc: '黑松露风味慢炸，酥脆扑鼻' },
    { name: '厚切极上炙烤牛舌', price: 58.0, desc: '深海盐调味，弹牙多汁香气浓' }
  ];

  // 筛选消息
  const filteredMessages = messages.filter((msg) => {
    if (activeChannel === 'all') return true;
    if (activeChannel === 'rider') return msg.senderRole === 'rider' || msg.senderRole === 'user';
    if (activeChannel === 'merchant') return msg.senderRole === 'merchant' || msg.senderRole === 'user';
    return true;
  });

  // 渲染消息气泡内容（调用高定制的 MaterialMessageBubble 组件）
  const renderMessageContent = (
    text: string,
    isSelf: boolean,
    msgItem?: ChatMessageItem
  ) => {
    return (
      <MaterialMessageBubble
        text={text}
        isSelf={isSelf}
        senderRole={msgItem?.senderRole || (isSelf ? viewerRole : 'user')}
        senderName={msgItem?.senderName}
        time={msgItem?.time}
        type={msgItem?.type}
        voiceDuration={msgItem?.voiceDuration}
        voiceTranscribed={msgItem?.voiceTranscribed}
        voiceWaveform={msgItem?.voiceWaveform}
        statusChangeInfo={msgItem?.statusChangeInfo}
        showToast={showToast}
        playWalkieTalkieBeep={playWalkieTalkieBeep}
        playChimeSound={playChimeSound}
        onQuickAction={(actionType, payload) => {
          if (actionType === 'confirm_dish' && payload) {
            handleSendMessage(`已确认加单：【${payload.name}】(¥${payload.price})，请后厨安排合并现烤！`);
          }
        }}
      />
    );
  };

  return (
    <div className={`w-full antialiased bg-radar-bg selection:bg-radar-dark selection:text-white flex flex-col ${embedded ? 'h-full flex-1 min-h-0 overflow-hidden' : 'min-h-screen h-screen'}`}>
      {/* 隐藏的文件上传 Input 供拍照存证调用 */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* 现代极简弹性视口容器，确保消息在内部平滑滚动，底栏永远贴底不遮挡 */}
      <div className={`w-full flex-1 bg-[#FBFBFA] flex flex-col min-h-0 ${embedded ? 'h-full' : 'h-full max-h-screen'} overflow-hidden relative font-sans`}>
        
        {/* BEGIN: TopHeader */}
        {!hideHeader && (
        <header className={embedded ? "shrink-0 z-20 bg-white text-neutral-800 px-3 sm:px-4 py-2 border-b border-neutral-200/80 shadow-2xs" : "shrink-0 z-20 bg-white/95 backdrop-blur-md text-neutral-800 pt-2.5 px-3.5 sm:px-6 shadow-xs border-b border-neutral-200/80"}>
          {!embedded && (
            /* Top Utility Nav Row (Standalone Mode Only) */
            <div className="flex items-center justify-between gap-2 mb-2.5">
              {/* Room ID & Live Status Indicator */}
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={onBack}
                  aria-label="返回上级"
                  className="w-8 h-8 rounded-lg bg-radar-bg border border-radar-border flex items-center justify-center hover:bg-gray-200/70 transition-colors shrink-0 shadow-xs cursor-pointer"
                  title="返回"
                >
                  <svg className="w-4 h-4 text-radar-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
                  </svg>
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[14px] font-bold tracking-tight text-radar-dark truncate">
                      #{currentOrderNo.startsWith('UR-') ? currentOrderNo : `UR-${currentOrderNo}`} 协同联络室
                    </span>
                    <span className="w-2 h-2 rounded-full bg-radar-emerald animate-radar-pulse shrink-0" />
                  </div>
                </div>
              </div>

              {/* Standalone Emergency Audio Calling, Store Jump & Dropdown Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsCallActive(!isCallActive);
                    showToast(isCallActive ? '通话已结束' : '正在呼叫专线金牌骑手 陈志远');
                  }}
                  className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-colors shadow-xs cursor-pointer ${
                    isCallActive
                      ? 'bg-red-100 border-red-300 text-red-700 animate-pulse'
                      : 'bg-emerald-50 border-emerald-200/80 hover:bg-emerald-100 text-emerald-700'
                  }`}
                  title={isCallActive ? '挂断电话' : '紧急拨号'}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.44-5.15-3.75-6.59-6.59l1.97-1.57c.28-.28.36-.67.25-1.02A11.36 11.36 0 018.59 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.59c0-.58-.45-1.03-1.03-1.03z" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onOpenStore) {
                      onOpenStore();
                    } else {
                      showToast('已跳转门店', '正在进入餐车档口实时菜单');
                    }
                  }}
                  className="h-8 w-8 rounded-lg bg-amber-50 border border-amber-300/80 hover:bg-amber-100 text-amber-800 flex items-center justify-center transition-colors shadow-xs group cursor-pointer"
                  title="进店查看"
                >
                  <svg className="w-4 h-4 text-amber-700 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 22V12h6v10" />
                  </svg>
                </button>

                <div className="relative">
                  <button
                    type="button"
                    id="header-more-menu-btn"
                    onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
                    className="h-8 px-2.5 rounded-[4px] bg-radar-bg hover:bg-gray-200/70 border border-radar-border flex items-center gap-1 text-[12px] font-medium text-radar-dark transition-colors shadow-xs cursor-pointer"
                  >
                    <span className="text-[11.5px]">操作</span>
                    <svg className="w-3 h-3 text-radar-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isHeaderMenuOpen && (
                    <div id="header-dropdown-menu" className="absolute right-0 mt-1.5 w-44 bg-radar-surface border border-radar-border rounded-lg shadow-xl py-1 z-50 text-[12px]">
                      <div className="px-3 py-1 text-[10px] text-radar-muted font-semibold bg-gray-50 border-b border-radar-border/60">
                        切换端口 (严格角色隔离)
                      </div>
                      <div className="p-1 space-y-0.5 border-b border-radar-border/60">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveRole('user');
                            showToast('已切换至【食客终端】', '仅开放食客权限，禁止伪造骑手对讲与商家账单');
                            setIsHeaderMenuOpen(false);
                          }}
                          className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center justify-between ${
                            activeRole === 'user' ? 'bg-sky-100 font-bold text-sky-900' : 'hover:bg-gray-100 text-radar-dark'
                          }`}
                        >
                          <span>👤 食客端</span>
                          {activeRole === 'user' && <span className="text-sky-600 font-mono text-[10px]">当前</span>}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveRole('rider');
                            showToast('已切换至【骑手车载端】', '已激活专线对讲与妥投存证权限');
                            setIsHeaderMenuOpen(false);
                          }}
                          className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center justify-between ${
                            activeRole === 'rider' ? 'bg-amber-100 font-bold text-amber-900' : 'hover:bg-gray-100 text-radar-dark'
                          }`}
                        >
                          <span>🛵 骑手车载端</span>
                          {activeRole === 'rider' && <span className="text-amber-600 font-mono text-[10px]">当前</span>}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveRole('merchant');
                            showToast('已切换至【商家档口端】', '已激活出餐质检与账单核销开具权限');
                            setIsHeaderMenuOpen(false);
                          }}
                          className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center justify-between ${
                            activeRole === 'merchant' ? 'bg-rose-100 font-bold text-rose-900' : 'hover:bg-gray-100 text-radar-dark'
                          }`}
                        >
                          <span>🍳 商家档口端</span>
                          {activeRole === 'merchant' && <span className="text-rose-600 font-mono text-[10px]">当前</span>}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveRole('platform');
                            showToast('已切换至【平台调度端】', '拥有全网基准时空广播与督办仲裁权限');
                            setIsHeaderMenuOpen(false);
                          }}
                          className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center justify-between ${
                            activeRole === 'platform' ? 'bg-purple-100 font-bold text-purple-900' : 'hover:bg-gray-100 text-radar-dark'
                          }`}
                        >
                          <span>🖥️ 平台调度端</span>
                          {activeRole === 'platform' && <span className="text-purple-600 font-mono text-[10px]">当前</span>}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          if (onOpenStore) onOpenStore();
                        }}
                        className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-radar-dark hover:bg-gray-100 transition-colors cursor-pointer mt-0.5"
                      >
                        <svg className="w-3.5 h-3.5 text-radar-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <span>进入档口餐车</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          showToast('已屏蔽该协同会话', '三端静默免打扰已生效');
                        }}
                        className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-radar-dark hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5 text-radar-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                        </svg>
                        <span className="font-medium">屏蔽会话</span>
                      </button>
                      <div className="border-t border-radar-border/60 my-1" />
                      <button
                        type="button"
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          if (onBack) onBack();
                        }}
                        className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-radar-muted hover:bg-gray-100 hover:text-radar-dark transition-colors cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span>返回动态</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Scope Filter Tabs & Embedded Quick Actions */}
          <div className={`flex items-center justify-between gap-1 w-full ${embedded ? 'py-0.5' : ''}`}>
            {embedded ? (
              /* 嵌入模式：简化文字（全员 / 骑手 / 后厨）配合微胶囊，彻底修复移动端截断与溢出 */
              <nav className="inline-flex p-0.5 rounded-lg bg-neutral-100/90 border border-neutral-200/70 text-[11px] font-medium shrink-0" data-purpose="synergy-scope-selector">
                <button
                  type="button"
                  onClick={() => setActiveChannel('all')}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap select-none ${
                    activeChannel === 'all'
                      ? 'bg-white text-neutral-900 font-bold shadow-2xs'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                  title="三方全员协同"
                >
                  <svg className={`w-3 h-3 ${activeChannel === 'all' ? 'text-emerald-700' : 'text-neutral-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                  <span>全员</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChannel('rider')}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap select-none ${
                    activeChannel === 'rider'
                      ? 'bg-white text-emerald-800 font-bold shadow-2xs'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                  title="专送骑手频道"
                >
                  <svg className="w-3 h-3 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.04 3H5.81l1.04-3zM19 17H5v-4.66l.12-.34h13.77l.11.34V17z" />
                  </svg>
                  <span>骑手</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChannel('merchant')}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap select-none ${
                    activeChannel === 'merchant'
                      ? 'bg-white text-rose-800 font-bold shadow-2xs'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                  title="餐车后厨频道"
                >
                  <svg className="w-3 h-3 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                  <span>后厨</span>
                </button>
              </nav>
            ) : (
              /* 独立全屏模式：经典下划线切换栏 */
              <nav className="flex items-center gap-4 sm:gap-6 border-radar-border text-[12px] font-medium pt-1 px-1" data-purpose="synergy-scope-selector">
                <button
                  type="button"
                  onClick={() => setActiveChannel('all')}
                  className={`flex items-center justify-center gap-1.5 pb-1.5 border-b-2 transition-all shrink-0 cursor-pointer ${
                    activeChannel === 'all'
                      ? 'border-radar-emerald text-emerald-800 font-bold'
                      : 'border-transparent text-radar-muted hover:text-radar-dark'
                  }`}
                >
                  <svg className={`w-3.5 h-3.5 ${activeChannel === 'all' ? 'text-emerald-700' : 'text-radar-muted'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                  <span>三方协同 (全员)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChannel('rider')}
                  className={`flex items-center justify-center gap-1.5 pb-1.5 border-b-2 transition-all shrink-0 cursor-pointer ${
                    activeChannel === 'rider'
                      ? 'border-radar-emerald text-emerald-800 font-bold'
                      : 'border-transparent text-radar-muted hover:text-radar-dark'
                  }`}
                >
                  <svg className="w-3.5 h-3.5 text-amber-600/70" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.04 3H5.81l1.04-3zM19 17H5v-4.66l.12-.34h13.77l.11.34V17z" />
                  </svg>
                  <span>专送骑手</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChannel('merchant')}
                  className={`flex items-center justify-center gap-1.5 pb-1.5 border-b-2 transition-all shrink-0 cursor-pointer ${
                    activeChannel === 'merchant'
                      ? 'border-radar-emerald text-emerald-800 font-bold'
                      : 'border-transparent text-radar-muted hover:text-radar-dark'
                  }`}
                >
                  <svg className="w-3.5 h-3.5 text-rose-600/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                  <span>餐车后厨</span>
                </button>
              </nav>
            )}

            {/* Embedded Action Row */}
            {embedded && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsCallActive(!isCallActive);
                    showToast(isCallActive ? '通话已结束' : '正在呼叫专线金牌骑手 陈志远');
                  }}
                  className={`h-7 px-2 rounded-lg border flex items-center gap-1 text-[11px] font-medium transition-colors shadow-2xs cursor-pointer ${
                    isCallActive
                      ? 'bg-red-100 border-red-300 text-red-700 animate-pulse'
                      : 'bg-emerald-50 border-emerald-200/80 hover:bg-emerald-100 text-emerald-700'
                  }`}
                  title={isCallActive ? '挂断电话' : '紧急拨号'}
                >
                  <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.44-5.15-3.75-6.59-6.59l1.97-1.57c.28-.28.36-.67.25-1.02A11.36 11.36 0 018.59 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.59c0-.58-.45-1.03-1.03-1.03z" />
                  </svg>
                  <span className="inline">呼叫</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onOpenStore) {
                      onOpenStore();
                    } else {
                      showToast('已跳转门店', '正在进入餐车档口实时菜单');
                    }
                  }}
                  className="h-7 px-2 rounded-lg bg-amber-50 border border-amber-300/80 hover:bg-amber-100 text-amber-800 flex items-center gap-1 text-[11px] font-medium transition-colors shadow-2xs group cursor-pointer"
                  title="进店查看"
                >
                  <svg className="w-3 h-3 text-amber-700 shrink-0 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 22V12h6v10" />
                  </svg>
                  <span className="inline">进店</span>
                </button>

                <div className="relative">
                  <button
                    type="button"
                    id="embedded-more-menu-btn"
                    onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
                    className="h-7 px-1.5 sm:px-2 rounded-lg bg-neutral-100 hover:bg-neutral-200/80 border border-neutral-200/80 flex items-center gap-0.5 sm:gap-1 text-[11px] font-medium text-neutral-700 transition-colors shadow-2xs cursor-pointer"
                  >
                    <span>操作</span>
                    <svg className="w-2.5 h-2.5 text-neutral-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isHeaderMenuOpen && (
                    <div id="embedded-dropdown-menu" className="absolute right-0 mt-1.5 w-44 bg-radar-surface border border-radar-border rounded-lg shadow-xl py-1 z-50 text-[12px]">
                      <div className="px-3 py-1 text-[10px] text-radar-muted font-semibold bg-gray-50 border-b border-radar-border/60">
                        切换端口 (严格角色隔离)
                      </div>
                      <div className="p-1 space-y-0.5 border-b border-radar-border/60">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveRole('user');
                            showToast('已切换至【食客终端】', '仅开放食客权限，禁止伪造骑手对讲与商家账单');
                            setIsHeaderMenuOpen(false);
                          }}
                          className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center justify-between ${
                            activeRole === 'user' ? 'bg-sky-100 font-bold text-sky-900' : 'hover:bg-gray-100 text-radar-dark'
                          }`}
                        >
                          <span>👤 食客端</span>
                          {activeRole === 'user' && <span className="text-sky-600 font-mono text-[10px]">当前</span>}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveRole('rider');
                            showToast('已切换至【骑手车载端】', '已激活专线对讲与妥投存证权限');
                            setIsHeaderMenuOpen(false);
                          }}
                          className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center justify-between ${
                            activeRole === 'rider' ? 'bg-amber-100 font-bold text-amber-900' : 'hover:bg-gray-100 text-radar-dark'
                          }`}
                        >
                          <span>🛵 骑手车载端</span>
                          {activeRole === 'rider' && <span className="text-amber-600 font-mono text-[10px]">当前</span>}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveRole('merchant');
                            showToast('已切换至【商家档口端】', '已激活出餐质检与账单核销开具权限');
                            setIsHeaderMenuOpen(false);
                          }}
                          className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center justify-between ${
                            activeRole === 'merchant' ? 'bg-rose-100 font-bold text-rose-900' : 'hover:bg-gray-100 text-radar-dark'
                          }`}
                        >
                          <span>🍳 商家档口端</span>
                          {activeRole === 'merchant' && <span className="text-rose-600 font-mono text-[10px]">当前</span>}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveRole('platform');
                            showToast('已切换至【平台调度端】', '拥有全网基准时空广播与督办仲裁权限');
                            setIsHeaderMenuOpen(false);
                          }}
                          className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center justify-between ${
                            activeRole === 'platform' ? 'bg-purple-100 font-bold text-purple-900' : 'hover:bg-gray-100 text-radar-dark'
                          }`}
                        >
                          <span>🖥️ 平台调度端</span>
                          {activeRole === 'platform' && <span className="text-purple-600 font-mono text-[10px]">当前</span>}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          if (onOpenStore) onOpenStore();
                        }}
                        className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-radar-dark hover:bg-gray-100 transition-colors cursor-pointer mt-0.5"
                      >
                        <svg className="w-3.5 h-3.5 text-radar-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <span>进入档口餐车</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          showToast('已屏蔽该协同会话', '三端静默免打扰已生效');
                        }}
                        className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-radar-dark hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5 text-radar-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                        </svg>
                        <span className="font-medium">屏蔽会话</span>
                      </button>
                      <div className="border-t border-radar-border/60 my-1" />
                      <button
                        type="button"
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          if (onBack) onBack();
                        }}
                        className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-radar-muted hover:bg-gray-100 hover:text-radar-dark transition-colors cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span>返回动态</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>
        )}
        {/* END: TopHeader */}

        {/* BEGIN: MainContent (Scrollable) */}
        <main className="flex-1 min-h-0 w-full p-3 sm:p-4 overflow-y-auto space-y-3.5" id="synergy-message-viewport">
          
          {/* Order Meta Card (Compact Micro-Bar) */}
          <section className="bg-neutral-100/70 hover:bg-neutral-100/90 rounded-lg border border-neutral-200/70 p-1.5 px-2.5 transition-all duration-150" data-purpose="order-meta-card">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-mono text-[11px] font-bold text-neutral-900">#{currentOrderNo}</span>
                <span className="px-1 py-0.2 rounded text-[9.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shrink-0">
                  {fullOrder.status === 'cooking' ? '制作中' : fullOrder.status === 'delivering' ? '专送中' : '履约中'}
                </span>
                <span className="font-mono text-[11px] font-bold text-neutral-900">¥{Number(fullOrder.totalAmount || 186).toFixed(0)}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsOrderBannerExpanded(!isOrderBannerExpanded)}
                className="text-neutral-500 hover:text-neutral-800 text-[10.5px] font-medium flex items-center gap-0.5 cursor-pointer shrink-0"
              >
                <span>{isOrderBannerExpanded ? '收起' : '详情'}</span>
                <svg className={`w-3 h-3 transition-transform duration-200 ${isOrderBannerExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Collapsible Details */}
            {isOrderBannerExpanded && (
              <div className="mt-2 pt-2 border-t border-neutral-200/60 text-[11px] text-neutral-600 space-y-1.5 animate-in fade-in duration-150">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">送达地址：</span>
                  <span className="font-medium text-neutral-800 text-right truncate max-w-[220px]">
                    {fullOrder.deliveryAddress || '科技园区 A 座北塔 1204 室'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">预计送达：</span>
                  <span className="font-mono font-semibold text-emerald-700">
                    约 {fullOrder.etaMinutes || 4} 分钟 (距 350m)
                  </span>
                </div>
                <div className="pt-0.5">
                  <span className="text-[10px] text-neutral-400 block mb-1">单品快速咨询：</span>
                  <div className="flex flex-wrap gap-1">
                    {fullOrder.items?.map((item: any, idx: number) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleQuoteDish(item)}
                        className="px-1.5 py-0.5 rounded bg-white hover:bg-neutral-50 text-neutral-800 text-[10px] font-mono border border-neutral-200 transition-colors cursor-pointer"
                      >
                        {item.name} x{item.quantity}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* SLA Warning Alert Micro-Bar */}
          {slaVisible && (
            <section className="rounded-md border border-rose-200/80 bg-rose-50/80 px-2 py-1 shadow-2xs flex items-center justify-between text-[11px] text-rose-900" data-purpose="sla-risk-card">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs">⚠️</span>
                <span className="font-bold shrink-0">SLA 督办：</span>
                <span className="text-rose-700 truncate">超时3分钟未应答，已加急调度</span>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-1">
                <span className="font-mono text-[9.5px] font-bold text-rose-800 bg-rose-100 px-1 py-0.2 rounded">加权中</span>
                <button
                  type="button"
                  onClick={() => setSlaVisible(false)}
                  className="text-rose-400 hover:text-rose-700 p-0.5 rounded cursor-pointer text-xs leading-none"
                  title="关闭提示"
                >
                  ✕
                </button>
              </div>
            </section>
          )}

          {/* Secure Encryption Banner */}
          <div className="flex items-center justify-center py-0.5" data-purpose="security-encryption-banner">
            <span className="inline-flex items-center gap-1 text-[10px] text-neutral-400 select-none">
              <ShieldCheck className="w-3 h-3 text-emerald-600/70 shrink-0" />
              <span>会话已受云端隐私加密保护</span>
            </span>
          </div>

            {/* Messages Feed */}
          <div className="space-y-3" data-purpose="synergy-message-thread">
            {filteredMessages.map((msg) => {
              const isSelf = msg.senderRole === viewerRole;
              const isSystem = msg.type === 'system_notice' || msg.senderRole === 'system';

              if (isSystem) {
                // 极简系统提示：移除冗长底层代码表名字样
                const cleanNotice = msg.text
                  .replace(/云函数\s*\(chatMessages\)\s*与云数据库\s*\(obsidian_order_chats\)\s*全程热备份。?/, '全程加密云端同步')
                  .replace(/已建立三端加密会话。?/, '已接入安全协同专线');

                return (
                  <div key={msg.id} className="flex justify-center my-1.5">
                    <div className="inline-flex items-center gap-1.5 bg-neutral-100/90 text-neutral-600 text-[11px] px-3 py-1 rounded-full text-center max-w-[90%] shadow-2xs font-medium">
                      <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>{cleanNotice}</span>
                    </div>
                  </div>
                );
              }

              // 判断是否为独立卡片/特殊素材 (拥有自包含的卡片样式，无需外层厚重底色包裹)
              const isCardBubble =
                msg.type === 'voice' ||
                msg.type === 'status_change' ||
                msg.text.startsWith('【餐车交互·') ||
                msg.text.includes('来自食客桌台协同消息') ||
                msg.text.includes('[IMAGE]:') ||
                msg.text.startsWith('🧾') ||
                msg.text.startsWith('🍲') ||
                msg.text.startsWith('📑') ||
                msg.text.startsWith('📍') ||
                msg.text.startsWith('⚡') ||
                msg.text.startsWith('🚨') ||
                msg.text.startsWith('📢') ||
                msg.text.startsWith('🚦') ||
                msg.text.startsWith('🔥') ||
                msg.text.startsWith('🌶️') ||
                msg.text.startsWith('🧅') ||
                msg.text.startsWith('🧊') ||
                msg.text.startsWith('🥢') ||
                msg.text.startsWith('📦');

              const isPureEmoji =
                !isCardBubble &&
                /^(\p{Extended_Pictographic}|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83E[\uDD00-\uDDFF]|\s)+$/u.test(msg.text.trim()) &&
                msg.text.trim().length <= 16;

              return (
                <div key={msg.id} className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} space-y-1`}>
                  {/* 发送者信息与时间戳 (极致精简，杜绝无意义重复标签) */}
                  <div className={`flex items-center gap-1.5 text-[11px] font-mono select-none ${isSelf ? 'pr-1 justify-end text-neutral-400' : 'pl-1 text-neutral-500'}`}>
                    {!isSelf && <span className="font-semibold text-neutral-700">{msg.senderName}</span>}
                    {!isSelf && <span className="text-neutral-300">·</span>}
                    <span>{msg.time}</span>
                  </div>

                  {/* 消息气泡主体：高级质感微圆角与高对比排版 */}
                  <div
                    className={`${
                      isPureEmoji
                        ? 'bg-transparent shadow-none p-0'
                        : isCardBubble
                        ? 'p-0 shadow-2xs rounded-2xl overflow-hidden'
                        : isSelf
                        ? 'bg-neutral-900 text-white rounded-2xl rounded-br-xs px-3.5 py-2 shadow-2xs text-[13px] leading-relaxed max-w-[85%] sm:max-w-[75%] break-words'
                        : 'bg-white text-neutral-800 rounded-2xl rounded-bl-xs px-3.5 py-2 shadow-2xs border border-neutral-200/80 text-[13px] leading-relaxed max-w-[85%] sm:max-w-[75%] break-words'
                    }`}
                  >
                    <MaterialMessageBubble
                      text={msg.text}
                      isSelf={isSelf}
                      senderRole={msg.senderRole}
                      senderName={msg.senderName}
                      time={msg.time}
                      type={msg.type}
                      voiceDuration={msg.voiceDuration}
                      voiceTranscribed={msg.voiceTranscribed}
                      voiceWaveform={msg.voiceWaveform}
                      statusChangeInfo={msg.statusChangeInfo}
                      showToast={showToast}
                      playWalkieTalkieBeep={playWalkieTalkieBeep}
                      playChimeSound={playChimeSound}
                      onQuickAction={(actionType, payload) => {
                        if (actionType === 'confirm_dish' && payload) {
                          handleSendMessage(`已确认加单：【${payload.name}】(¥${payload.price})，请后厨安排合并现烤！`);
                        }
                      }}
                    />
                  </div>
                </div>
              );
            })}

            <div ref={chatBottomRef} />
          </div>
        </main>
        {/* END: MainContent */}

        {/* BEGIN: BottomInteractiveDock */}
        <footer className="shrink-0 w-full bg-white/95 backdrop-blur-md border-t border-neutral-200/80 pt-1.5 pb-2 sm:pb-2.5 px-2 sm:px-3 z-20">
          
          {/* Quick Speech / Auto-Response Button Sliders (Role-Aware & Guarded) */}
          <div className="shrink-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1.5 relative touch-pan-x" data-purpose="quick-replies-tray">
            {activeRole === 'rider' ? (
              <>
                <button
                  type="button"
                  onClick={() => handleSendIntercomPhrase()}
                  className="shrink-0 h-7 px-2.5 rounded-[4px] bg-emerald-50 border border-emerald-300 text-emerald-800 text-[11.5px] font-semibold flex items-center gap-1.5 shadow-xs hover:bg-emerald-100 transition cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-radar-pulse" />
                  <span>📢 车载对讲话音库</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage('🛵 正在全速送往指定地址，请稍候')}
                  className="shrink-0 h-7 px-2.5 rounded-[4px] bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-[11.5px] transition flex items-center gap-1 cursor-pointer"
                >
                  <span>🛵</span>
                  <span>全速派送中</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage('🚪 已到达大厦前台外卖自提点')}
                  className="shrink-0 h-7 px-2.5 rounded-[4px] bg-radar-bg hover:bg-gray-200/70 border border-radar-border text-radar-dark text-[11.5px] transition flex items-center gap-1 cursor-pointer"
                >
                  <span>🚪</span>
                  <span>已放前台外卖架</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendLocation()}
                  className="shrink-0 h-7 px-2.5 rounded-[4px] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11.5px] transition flex items-center gap-1 cursor-pointer"
                >
                  <span>📍</span>
                  <span>广播车载GPS</span>
                </button>
              </>
            ) : activeRole === 'merchant' ? (
              <>
                <button
                  type="button"
                  onClick={() => handleSendMessage('🔥 炭烤汉堡已出炉装箱，恒温保温中')}
                  className="shrink-0 h-7 px-2.5 rounded-[4px] bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-900 text-[11.5px] transition flex items-center gap-1 cursor-pointer font-medium"
                >
                  <span>🔥</span>
                  <span>已出炉保温装箱</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendInvoiceCard()}
                  className="shrink-0 h-7 px-2.5 rounded-[4px] bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-[11.5px] transition flex items-center gap-1 cursor-pointer"
                >
                  <span>🧾</span>
                  <span>签发核销凭证</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage('🥢 餐具香料调味包已全量核验')}
                  className="shrink-0 h-7 px-2.5 rounded-[4px] bg-radar-bg hover:bg-gray-200/70 border border-radar-border text-radar-dark text-[11.5px] transition flex items-center gap-1 cursor-pointer"
                >
                  <span>🥢</span>
                  <span>配料齐全验真</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0 h-7 px-2.5 rounded-[4px] bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-900 text-[11.5px] transition flex items-center gap-1 cursor-pointer"
                >
                  <span>📸</span>
                  <span>后厨质检拍照</span>
                </button>
              </>
            ) : activeRole === 'platform' ? (
              <>
                <button
                  type="button"
                  onClick={() => triggerExpediteUrge()}
                  className="shrink-0 h-6 px-2 rounded-full bg-rose-600 text-white text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  <span>📢</span>
                  <span>监管督促</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendLocation()}
                  className="shrink-0 h-6 px-2 rounded-full bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 text-[10.5px] transition flex items-center gap-1 cursor-pointer"
                >
                  <span>📍</span>
                  <span>广播基准</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage('⚖️【平台调度室】监测三方状态正常，专线调度通道已联通')}
                  className="shrink-0 h-6 px-2 rounded-full bg-neutral-100 hover:bg-neutral-200/80 border border-neutral-200 text-neutral-800 text-[10.5px] transition flex items-center gap-1 cursor-pointer"
                >
                  <span>⚖️</span>
                  <span>状态校准</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleSendMessage('【餐车交互·催单加急】来自食客桌台协同消息：请问当前备餐还需要多久？当前绑定餐车：黑曜石 01 号流动餐车')}
                  className="shrink-0 h-6 px-2 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-[10.5px] transition flex items-center gap-1 cursor-pointer font-semibold shadow-2xs"
                >
                  <span>⚡</span>
                  <span>催单</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage('📦 麻烦直接放 12 楼前台外卖架即可')}
                  className="shrink-0 h-6 px-2 rounded-full bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-700 text-[10.5px] font-medium transition flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  <span>📦</span>
                  <span>放外卖架</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage('📞 到达大楼下请提前电话联系')}
                  className="shrink-0 h-6 px-2 rounded-full bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-700 text-[10.5px] font-medium transition flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  <span>📞</span>
                  <span>提前电联</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage('🍔 炭烤汉堡请注意防颠簸')}
                  className="shrink-0 h-6 px-2 rounded-full bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-700 text-[10.5px] font-medium transition flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  <span>🍔</span>
                  <span>注意防颠</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage('🥢 麻烦多配两副一次性餐具')}
                  className="shrink-0 h-6 px-2 rounded-full bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-700 text-[10.5px] font-medium transition flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  <span>🥢</span>
                  <span>多配餐具</span>
                </button>
              </>
            )}
          </div>

          <div className="flex flex-col gap-2">
            
            {/* 1. Emoji & Expressive Material Library Drawer (Button 1) */}
            {isEmojiLibraryOpen && (
              <div className="bg-white/95 backdrop-blur-md border border-radar-border rounded-xl p-3 shadow-craft animate-in fade-in slide-in-from-bottom-2 duration-150 space-y-3 max-h-[42vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-radar-border/70 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-radar-dark flex items-center gap-1">
                      <span>😊</span>
                      <span>表情与速发素材库</span>
                    </span>
                    <div className="flex items-center gap-1 bg-radar-bg p-0.5 rounded-lg text-[10.5px]">
                      <button
                        type="button"
                        onClick={() => setActiveEmojiCategory('emojis')}
                        className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                          activeEmojiCategory === 'emojis'
                            ? 'bg-white font-bold text-radar-dark shadow-2xs'
                            : 'text-radar-muted hover:text-radar-dark'
                        }`}
                      >
                        常用表情 ({EMOJI_LIST.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveEmojiCategory('status')}
                        className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                          activeEmojiCategory === 'status'
                            ? 'bg-white font-bold text-radar-dark shadow-2xs'
                            : 'text-radar-muted hover:text-radar-dark'
                        }`}
                      >
                        履约态势短语
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveEmojiCategory('custom')}
                        className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                          activeEmojiCategory === 'custom'
                            ? 'bg-white font-bold text-radar-dark shadow-2xs'
                            : 'text-radar-muted hover:text-radar-dark'
                        }`}
                      >
                        口味与加料
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEmojiLibraryOpen(false)}
                    className="text-radar-muted hover:text-radar-dark p-1 rounded-md hover:bg-black/5 cursor-pointer text-xs"
                    title="关闭素材库"
                  >
                    ✕
                  </button>
                </div>

                {/* Sub Tab: Emojis Grid */}
                {activeEmojiCategory === 'emojis' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-radar-muted px-1">
                      <span>点击直接填入输入框，双击可直接全员速发：</span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">
                        全平台原生适配
                      </span>
                    </div>
                    <div className="grid grid-cols-8 gap-2 max-h-44 overflow-y-auto p-1 bg-radar-bg/40 rounded-lg border border-radar-border/40">
                      {EMOJI_LIST.map((emo, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setInputText((prev) => prev + emo);
                            inputRef.current?.focus();
                          }}
                          onDoubleClick={() => {
                            handleSendMessage(emo);
                            setIsEmojiLibraryOpen(false);
                          }}
                          className="text-xl p-2 bg-white hover:bg-emerald-50 hover:border-emerald-300 border border-radar-border/60 rounded-xl transition active:scale-95 cursor-pointer flex items-center justify-center shadow-2xs hover:shadow-xs group"
                          title={`${emo} (单击填入，双击速发)`}
                        >
                          <span className="group-hover:scale-125 transition-transform">{emo}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sub Tab: Status Phrases */}
                {activeEmojiCategory === 'status' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                    {STATUS_PHRASES.map((phrase, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-radar-bg/60 hover:bg-emerald-50/70 border border-radar-border hover:border-emerald-300/80 transition flex items-center justify-between gap-2 group"
                      >
                        <span className="text-xs text-radar-dark truncate font-medium flex-1">
                          {phrase}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setInputText(phrase);
                              inputRef.current?.focus();
                            }}
                            className="px-1.5 py-0.5 text-[10.5px] text-radar-muted hover:text-radar-dark hover:bg-white rounded border border-transparent hover:border-radar-border cursor-pointer transition"
                            title="填入输入框"
                          >
                            填入
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleSendMessage(phrase);
                              setIsEmojiLibraryOpen(false);
                            }}
                            className="px-2 py-0.5 text-[10.5px] bg-[#1a1a17] hover:bg-black text-white rounded font-medium cursor-pointer transition active:scale-95 shadow-2xs"
                            title="立即发送到会话"
                          >
                            发送
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sub Tab: Taste / Packing Phrases */}
                {activeEmojiCategory === 'custom' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                    {CUSTOM_TASTE_PHRASES.map((phrase, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-radar-bg/60 hover:bg-rose-50/70 border border-radar-border hover:border-rose-300/80 transition flex items-center justify-between gap-2 group"
                      >
                        <span className="text-xs text-radar-dark truncate font-medium flex-1">
                          {phrase}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setInputText(phrase);
                              inputRef.current?.focus();
                            }}
                            className="px-1.5 py-0.5 text-[10.5px] text-radar-muted hover:text-radar-dark hover:bg-white rounded border border-transparent hover:border-radar-border cursor-pointer transition"
                            title="填入输入框"
                          >
                            填入
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleSendMessage(phrase);
                              setIsEmojiLibraryOpen(false);
                            }}
                            className="px-2 py-0.5 text-[10.5px] bg-rose-700 hover:bg-rose-800 text-white rounded font-medium cursor-pointer transition active:scale-95 shadow-2xs"
                            title="立即发送到会话"
                          >
                            发送
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 2. Tactical Actions & Operational Phrases Library Drawer (Button 2) */}
            {isTacticalTrayOpen && (
              <div id="tactical-actions-tray" className="p-3 bg-white/95 backdrop-blur-md border border-neutral-200 rounded-xl shadow-md animate-in fade-in slide-in-from-bottom-2 duration-150 space-y-2.5 max-h-[44vh] overflow-y-auto">
                {/* 抽屉顶部极简 Header：左侧标题 + 中间极简胶囊 (动作/话术/存证) + 右侧关闭 */}
                <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-neutral-900 flex items-center gap-1 shrink-0">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>快捷协同</span>
                    </span>
                    <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded-lg text-xs font-medium shrink-0">
                      <button
                        type="button"
                        onClick={() => setActiveTacticalTab('actions')}
                        className={`px-2.5 py-0.5 rounded-md transition cursor-pointer ${
                          activeTacticalTab === 'actions'
                            ? 'bg-white font-bold text-neutral-900 shadow-2xs'
                            : 'text-neutral-500 hover:text-neutral-800'
                        }`}
                      >
                        动作
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTacticalTab('phrases')}
                        className={`px-2.5 py-0.5 rounded-md transition cursor-pointer ${
                          activeTacticalTab === 'phrases'
                            ? 'bg-white font-bold text-neutral-900 shadow-2xs'
                            : 'text-neutral-500 hover:text-neutral-800'
                        }`}
                      >
                        话术
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTacticalTab('evidence')}
                        className={`px-2.5 py-0.5 rounded-md transition cursor-pointer ${
                          activeTacticalTab === 'evidence'
                            ? 'bg-white font-bold text-neutral-900 shadow-2xs'
                            : 'text-neutral-500 hover:text-neutral-800'
                        }`}
                      >
                        存证
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsTacticalTrayOpen(false)}
                    className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md hover:bg-neutral-100 cursor-pointer text-xs shrink-0"
                    title="关闭快捷协同"
                  >
                    ✕
                  </button>
                </div>

                {/* Sub Tab 1: 动作 (快捷动作) - 手机端2列，平板电脑4列，极致精简 */}
                {activeTacticalTab === 'actions' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSendLocation()}
                      className="p-2.5 rounded-xl bg-neutral-50/80 hover:bg-emerald-50/60 border border-neutral-200/80 hover:border-emerald-300 transition active:scale-[0.98] cursor-pointer group flex flex-col items-start gap-1"
                      title="发送实时位置坐标"
                    >
                      <div className="w-full flex items-center justify-between">
                        <span className="w-7 h-7 rounded-lg bg-emerald-100/80 text-emerald-800 flex items-center justify-center text-sm">📍</span>
                        <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          定位
                        </span>
                      </div>
                      <span className="text-xs font-bold text-neutral-900 mt-1">
                        {activeRole === 'rider' ? '车载GPS轨迹' : activeRole === 'merchant' ? '餐车泊位标定' : '发送当前位置'}
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        同步实时坐标
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendIntercomPhrase()}
                      className="p-2.5 rounded-xl bg-neutral-50/80 hover:bg-amber-50/60 border border-neutral-200/80 hover:border-amber-300 transition active:scale-[0.98] cursor-pointer group flex flex-col items-start gap-1"
                      title="发起车载专线对讲广播"
                    >
                      <div className="w-full flex items-center justify-between">
                        <span className="w-7 h-7 rounded-lg bg-amber-100/80 text-amber-900 flex items-center justify-center text-sm">⚡</span>
                        <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                          对讲
                        </span>
                      </div>
                      <span className="text-xs font-bold text-neutral-900 mt-1">
                        车载对讲广播
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        语音快速播报
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2.5 rounded-xl bg-neutral-50/80 hover:bg-sky-50/60 border border-neutral-200/80 hover:border-sky-300 transition active:scale-[0.98] cursor-pointer group flex flex-col items-start gap-1"
                      title="现场拍照存证留样"
                    >
                      <div className="w-full flex items-center justify-between">
                        <span className="w-7 h-7 rounded-lg bg-sky-100/80 text-sky-800 flex items-center justify-center text-sm">📷</span>
                        <span className="text-[10px] font-mono text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200">
                          拍照
                        </span>
                      </div>
                      <span className="text-xs font-bold text-neutral-900 mt-1">
                        现场拍照存证
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        拍摄现场凭证
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={triggerExpediteUrge}
                      className="p-2.5 rounded-xl bg-neutral-50/80 hover:bg-rose-50/60 border border-neutral-200/80 hover:border-rose-300 transition active:scale-[0.98] cursor-pointer group flex flex-col items-start gap-1"
                      title="发起加急催单提醒"
                    >
                      <div className="w-full flex items-center justify-between">
                        <span className="w-7 h-7 rounded-lg bg-rose-100/80 text-rose-800 flex items-center justify-center text-sm">🚨</span>
                        <span className="text-[10px] font-mono text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                          加急
                        </span>
                      </div>
                      <span className="text-xs font-bold text-neutral-900 mt-1">
                        加急催单提醒
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        三方联动督办
                      </span>
                    </button>
                  </div>
                )}

                {/* Sub Tab 2: 话术 (常用话术) - 手机单列、平板电脑双列 */}
                {activeTacticalTab === 'phrases' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 no-scrollbar">
                      {[
                        { id: 'dispatch', label: '配送沟通' },
                        { id: 'food', label: '餐品状态' },
                        { id: 'address', label: '地址指引' },
                        { id: 'rush', label: '加急说明' }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActivePhraseCategory(tab.id as any)}
                          className={`px-2.5 py-1 rounded-lg shrink-0 transition text-xs font-medium cursor-pointer ${
                            activePhraseCategory === tab.id
                              ? 'bg-neutral-900 text-white shadow-2xs font-bold'
                              : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-0.5">
                      {TACTICAL_PHRASES[activePhraseCategory].map((ph, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-lg bg-neutral-50/80 hover:bg-neutral-100 border border-neutral-200/80 transition flex items-center justify-between gap-2 group"
                        >
                          <span
                            onClick={() => {
                              setInputText(ph);
                              inputRef.current?.focus();
                            }}
                            className="text-xs text-neutral-800 truncate font-medium flex-1 cursor-pointer hover:text-neutral-950"
                            title="轻触填入输入框"
                          >
                            {ph}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              handleSendMessage(ph);
                              setIsTacticalTrayOpen(false);
                            }}
                            className="px-2 py-0.5 text-[11px] bg-neutral-900 hover:bg-black text-white rounded font-medium cursor-pointer transition active:scale-95 shadow-2xs shrink-0"
                            title="立即发送"
                          >
                            发送
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sub Tab 3: 存证 (拍照存证) - 顶部上传按键 + 4个预设存证卡 */}
                {activeTacticalTab === 'evidence' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-1.5 border-b border-neutral-100">
                      <span className="text-xs text-neutral-500 font-medium">常用现场存证留底</span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1 bg-neutral-900 hover:bg-black text-white text-xs rounded-lg font-medium cursor-pointer shadow-2xs active:scale-95 transition flex items-center gap-1"
                      >
                        <span>📷</span>
                        <span>拍照或上传</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {PRESET_EVIDENCE.map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleSendProofPhoto(item.url, item.title)}
                          className="group border border-neutral-200 hover:border-neutral-900 rounded-xl overflow-hidden bg-neutral-50/60 hover:bg-white p-2 cursor-pointer transition-all flex flex-col"
                        >
                          <div className="relative rounded-lg overflow-hidden mb-1.5 aspect-video sm:aspect-square bg-neutral-200">
                            <img
                              src={item.url}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1 py-0.2 rounded font-mono">
                              存证
                            </div>
                          </div>
                          <span className="text-xs font-bold text-neutral-900 truncate">{item.title}</span>
                          <span className="text-[10px] text-neutral-400 truncate mt-0.5">{item.desc}</span>
                          <button
                            type="button"
                            className="mt-1.5 w-full py-0.5 bg-white group-hover:bg-neutral-900 text-neutral-800 group-hover:text-white rounded text-[10.5px] font-medium border border-neutral-200 group-hover:border-neutral-900 transition"
                          >
                            发送
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {urgeToastVisible && (
                  <div id="urge-feedback-toast" className="mt-2 p-2 bg-rose-600 text-white rounded-lg shadow-sm flex items-center justify-between text-[11px] font-medium">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                      <span>加急催单提醒已发送！餐车与骑手端联动提示</span>
                    </div>
                    <span className="font-mono font-bold text-[10px] bg-black/30 px-1.5 py-0.5 rounded">已加急</span>
                  </div>
                )}
              </div>
            )}

            {/* 3. Extended Tools & Material Library Drawer (Button 3) */}
            {isMaterialToolsOpen && (
              <div className="bg-white/95 backdrop-blur-md border border-radar-border rounded-xl p-3 shadow-craft animate-in fade-in slide-in-from-bottom-2 duration-150 space-y-3 max-h-[42vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-radar-border/70 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-radar-dark flex items-center gap-1">
                      <span>📑</span>
                      <span>订单凭证与菜品素材库</span>
                    </span>
                    <div className="flex items-center gap-1 bg-radar-bg p-0.5 rounded-lg text-[10.5px]">
                      <button
                        type="button"
                        onClick={() => setActiveToolsTab('invoice')}
                        className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                          activeToolsTab === 'invoice'
                            ? 'bg-white font-bold text-radar-dark shadow-2xs'
                            : 'text-radar-muted hover:text-radar-dark'
                        }`}
                      >
                        订单账单
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveToolsTab('dishes')}
                        className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                          activeToolsTab === 'dishes'
                            ? 'bg-white font-bold text-radar-dark shadow-2xs'
                            : 'text-radar-muted hover:text-radar-dark'
                        }`}
                      >
                        推荐加单
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveToolsTab('workorder')}
                        className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                          activeToolsTab === 'workorder'
                            ? 'bg-white font-bold text-radar-dark shadow-2xs'
                            : 'text-radar-muted hover:text-radar-dark'
                        }`}
                      >
                        售后工单
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveToolsTab('audio')}
                        className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                          activeToolsTab === 'audio'
                            ? 'bg-white font-bold text-radar-dark shadow-2xs'
                            : 'text-radar-muted hover:text-radar-dark'
                        }`}
                      >
                        设备调试
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMaterialToolsOpen(false)}
                    className="text-radar-muted hover:text-radar-dark p-1 rounded-md hover:bg-black/5 cursor-pointer text-xs"
                    title="关闭素材库"
                  >
                    ✕
                  </button>
                </div>

                {/* Sub Tab: Invoice Card (Role-Gated) */}
                {activeToolsTab === 'invoice' && (
                  <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/90 space-y-2.5 shadow-2xs">
                    <div className="flex justify-between items-center text-xs text-amber-950 font-bold border-b border-amber-200/70 pb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="p-1 bg-amber-200/80 rounded text-amber-900">🧾</span>
                        <span>协同订单核销总账单</span>
                      </div>
                      <span className="font-mono text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-[3px] text-[10.5px] border border-amber-200">
                        #{currentOrderNo}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-amber-900/90 py-1 font-mono">
                      <div className="p-2 bg-white/70 rounded-lg border border-amber-200/50">
                        <div className="text-[10px] text-amber-800/70 font-sans">商品核销总额</div>
                        <div className="text-base font-bold text-amber-950 mt-0.5">
                          ¥{Number(fullOrder.totalAmount || 186).toFixed(2)}
                        </div>
                      </div>
                      <div className="p-2 bg-white/70 rounded-lg border border-amber-200/50">
                        <div className="text-[10px] text-amber-800/70 font-sans">自提/核销验证码</div>
                        <div className="text-base font-bold text-emerald-800 mt-0.5">
                          #{currentOrderNo.slice(-4) || '8829'}
                        </div>
                      </div>
                    </div>

                    <div className="text-[11.5px] text-amber-900/80 space-y-1 bg-white/50 p-2 rounded-lg border border-amber-200/40">
                      <div className="flex justify-between">
                        <span className="text-amber-800/70">配送交接：</span>
                        <span className="truncate max-w-[220px] font-medium text-amber-950">
                          {fullOrder.deliveryAddress || '科技园区 A 座 1204 室'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-amber-800/70">履约状态：</span>
                        <span className="text-emerald-700 font-medium">商家现烤已就绪 · 保温箱 65℃ 锁温</span>
                      </div>
                    </div>

                    {activeRole === 'rider' ? (
                      <div className="p-2 rounded-lg bg-amber-100/70 border border-amber-300/80 text-[11px] text-amber-950 flex items-center gap-1.5">
                        <span className="text-amber-800">⚠️</span>
                        <span>【骑手端口受限】专线骑手不可签发或篡改商家核销账单，请由餐车档口签发。</span>
                      </div>
                    ) : activeRole === 'user' ? (
                      <button
                        type="button"
                        onClick={handleSendInvoiceCard}
                        className="w-full py-2 bg-sky-800 hover:bg-sky-900 text-white rounded-lg text-xs font-bold transition active:scale-98 cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <span>🧾</span>
                        <span>向商家档口发起对账与开票申请</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendInvoiceCard}
                        className="w-full py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-bold transition active:scale-98 cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <span>🧾</span>
                        <span>{activeRole === 'platform' ? '平台出具官方协同核销凭单' : '发送订单核销账单卡到协同室'}</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Sub Tab: Dishes Recommendation (Role-Gated) */}
                {activeToolsTab === 'dishes' && (
                  <div className="space-y-2">
                    {activeRole === 'rider' ? (
                      <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-[11.5px] text-rose-900">
                        <span>⚠️【骑手端口受限】为保障配送安全与食品卫生责任追溯，骑手终端不可代客点单或改单。</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto p-1">
                        {RECOMMENDED_DISHES.map((dish, idx) => {
                          const dishImg = matchDishImageUrl(dish.name);
                          return (
                            <div
                              key={idx}
                              className="p-2 bg-radar-bg hover:bg-rose-50/60 border border-radar-border hover:border-rose-300 rounded-xl flex items-center gap-2.5 transition group"
                            >
                              <img
                                src={dishImg}
                                alt={dish.name}
                                className="w-14 h-14 rounded-lg object-cover border border-black/10 shrink-0 group-hover:scale-105 transition-transform"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs font-bold text-radar-dark truncate">{dish.name}</span>
                                </div>
                                <div className="text-[10px] text-radar-muted truncate mt-0.5">{dish.desc}</div>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-xs font-mono font-bold text-rose-700">
                                    ¥{dish.price.toFixed(2)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleSendDishCard(dish.name, dish.price, dish.desc)}
                                    className="px-2 py-0.5 bg-[#1a1a17] hover:bg-black text-white rounded text-[10.5px] font-semibold shrink-0 cursor-pointer shadow-2xs active:scale-95 transition"
                                  >
                                    {activeRole === 'user' ? '咨询加单' : '发推荐卡'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Sub Tab: Workorder */}
                {activeToolsTab === 'workorder' && (
                  <div className="space-y-2">
                    <div className="text-[11px] text-radar-muted px-1">
                      发起多端联动售后工单，由平台调度中枢介入全员广播：
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleSendWorkOrder('少餐漏餐补发', '核对发现在餐车分包环节少配极夜西西里气泡水1份，需快速补发')}
                        className="p-2.5 rounded-xl bg-radar-bg hover:bg-amber-50 border border-radar-border hover:border-amber-300 text-left cursor-pointer transition group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="p-1 bg-amber-100 rounded text-amber-900 text-xs">⚠️</span>
                          <span className="text-[9.5px] font-mono text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded font-bold">
                            P1 加急
                          </span>
                        </div>
                        <span className="text-xs font-bold text-radar-dark block">少餐漏送补发</span>
                        <span className="text-[10px] text-radar-muted block mt-0.5">即刻核查后厨出单台</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendWorkOrder('餐品翻洒拍照协调', '送达开袋发现炭烤汉堡有些许倾覆，已拍照留存并申请质保退赔')}
                        className="p-2.5 rounded-xl bg-radar-bg hover:bg-rose-50 border border-radar-border hover:border-rose-300 text-left cursor-pointer transition group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="p-1 bg-rose-100 rounded text-rose-900 text-xs">🛡️</span>
                          <span className="text-[9.5px] font-mono text-rose-800 bg-rose-100/70 px-1.5 py-0.5 rounded font-bold">
                            先行包赔
                          </span>
                        </div>
                        <span className="text-xs font-bold text-radar-dark block">餐品翻洒协调</span>
                        <span className="text-[10px] text-radar-muted block mt-0.5">拍照留存极速包赔</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendWorkOrder('发票与开票开具', '需开具企业数电增值税电子发票，抬头为科技园区先锋创新中心')}
                        className="p-2.5 rounded-xl bg-radar-bg hover:bg-sky-50 border border-radar-border hover:border-sky-300 text-left cursor-pointer transition group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="p-1 bg-sky-100 rounded text-sky-900 text-xs">📑</span>
                          <span className="text-[9.5px] font-mono text-sky-800 bg-sky-100/70 px-1.5 py-0.5 rounded font-bold">
                            数电发票
                          </span>
                        </div>
                        <span className="text-xs font-bold text-radar-dark block">企业电子开票</span>
                        <span className="text-[10px] text-radar-muted block mt-0.5">自动同步至财务中心</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Sub Tab: Audio Test */}
                {activeToolsTab === 'audio' && (
                  <div className="p-3 rounded-xl bg-radar-bg border border-radar-border flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-radar-dark block flex items-center gap-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>对讲与警报音效调试中心</span>
                      </span>
                      <span className="text-[10.5px] text-radar-muted block mt-0.5">测试车载对讲哔哔声与高频加急门铃音</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => playWalkieTalkieBeep()}
                        className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-radar-border text-xs font-medium rounded-lg cursor-pointer transition active:scale-95 shadow-2xs"
                      >
                        📻 对讲哔声
                      </button>
                      <button
                        type="button"
                        onClick={() => playChimeSound()}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg cursor-pointer transition active:scale-95 shadow-2xs"
                      >
                        🔔 加急三音琴
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}



            {/* Input Bar Row */}
            <div className="relative w-full rounded-lg shrink-0" data-purpose="chat-input-bar">
              <div className="flex items-center gap-1.5 transition-all duration-200">
                {/* 语音呼叫/预设语音按键 */}
                <button
                  type="button"
                  id="chat-mic-voice-btn"
                  onClick={() => {
                    handleSendMessage('【语音消息】：正准备下楼，请放在一楼前台外卖架');
                  }}
                  className="w-8 sm:w-9 h-8 sm:h-9 rounded-lg bg-neutral-100 hover:bg-neutral-200/80 border border-neutral-200/90 text-neutral-700 transition-all shrink-0 flex items-center justify-center shadow-2xs cursor-pointer active:scale-95"
                  title="快捷发送外卖架语音通知"
                >
                  <Mic className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-neutral-700" />
                </button>

                {/* 文本输入框与素材扩展按钮组 */}
                <div
                  className="flex-1 min-w-0 flex items-center bg-neutral-50/90 hover:bg-white focus-within:bg-white border border-neutral-300/90 focus-within:border-neutral-900 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg transition-all shadow-2xs focus-within:ring-1 focus-within:ring-neutral-900/10"
                >
                  <input
                    ref={inputRef}
                    id="chat-message-input"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="flex-1 min-w-0 bg-transparent border-0 p-0 text-xs sm:text-[13px] text-neutral-900 placeholder-neutral-400 font-medium focus:ring-0 focus:outline-none"
                    placeholder="输入协同消息..."
                    type="text"
                  />
                  <div className="flex items-center gap-0.5 text-neutral-400 shrink-0 ml-1 border-l border-neutral-200/90 pl-1">
                    {/* Button 1: Emoji & Reaction Library */}
                    <button
                      type="button"
                      id="toggle-emoji-library-trigger"
                      onClick={() => {
                        setIsEmojiLibraryOpen((prev) => !prev);
                        setIsTacticalTrayOpen(false);
                        setIsMaterialToolsOpen(false);
                      }}
                      className={`transition p-1 rounded-md cursor-pointer flex items-center justify-center shrink-0 ${
                        isEmojiLibraryOpen
                          ? 'text-emerald-700 bg-emerald-100/70 shadow-2xs'
                          : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/60'
                      }`}
                      title="表情与速发素材库"
                    >
                      <Smile className="w-3.5 h-3.5" />
                    </button>

                    {/* Button 2: Tactical Actions & Phrases Library (快捷协同) */}
                    <button
                      type="button"
                      id="toggle-actions-trigger"
                      onClick={() => {
                        setIsTacticalTrayOpen((prev) => !prev);
                        setIsEmojiLibraryOpen(false);
                        setIsMaterialToolsOpen(false);
                      }}
                      className={`transition p-1 rounded-md focus:outline-none cursor-pointer flex items-center justify-center shrink-0 ${
                        isTacticalTrayOpen
                          ? 'text-neutral-950 bg-neutral-200 shadow-2xs'
                          : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/60'
                      }`}
                      title="快捷协同与常用话术"
                    >
                      <Sliders className={`w-3.5 h-3.5 transition-transform duration-200 ${isTacticalTrayOpen ? 'rotate-90 text-neutral-900' : ''}`} />
                    </button>

                    {/* Button 3: Tools & Material Library */}
                    <button
                      type="button"
                      id="toggle-material-tools-trigger"
                      onClick={() => {
                        setIsMaterialToolsOpen((prev) => !prev);
                        setIsEmojiLibraryOpen(false);
                        setIsTacticalTrayOpen(false);
                      }}
                      aria-label="更多选项与扩展素材库"
                      className={`transition p-1 rounded-md flex items-center justify-center cursor-pointer shrink-0 ${
                        isMaterialToolsOpen
                          ? 'text-neutral-950 bg-neutral-200 shadow-2xs'
                          : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/60'
                      }`}
                      title="订单凭证与菜品素材库"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* 消息发送按钮 */}
                <button
                  type="button"
                  id="chat-send-message-btn"
                  onClick={() => handleSendMessage()}
                  aria-label="发送消息"
                  className="h-8 sm:h-9 px-3 sm:px-3.5 rounded-lg bg-neutral-900 hover:bg-black active:bg-neutral-800 text-white flex items-center justify-center gap-1 active:scale-95 transition-all shrink-0 shadow-2xs cursor-pointer font-medium text-xs tracking-tight"
                >
                  <Send className="w-3.5 h-3.5 -translate-y-px" />
                  <span className="hidden sm:inline">发送</span>
                </button>
              </div>
            </div>
          </div>
        </footer>
        {/* END: BottomInteractiveDock */}
      </div>
    </div>
  );
};

export default SynergyChatRoomView;
