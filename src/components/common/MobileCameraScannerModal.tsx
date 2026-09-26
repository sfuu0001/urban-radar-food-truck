import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Scan,
  X,
  Flashlight,
  FlashlightOff,
  SwitchCamera,
  AlertCircle,
  CheckCircle2,
  Barcode,
  QrCode,
  Sparkles,
  HelpCircle,
  Copy,
  ChevronRight,
  Zap,
  Volume2
} from 'lucide-react';
import {
  globalScannerEngine,
  playScannerBeep,
  ScanResult
} from '../../utils/barcodeScannerEngine';

export interface MobileCameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess?: (code: string, result?: ScanResult) => void;
  title?: string;
  hint?: string;
  autoRouteGlobalEngine?: boolean;
  showToast?: (msg: string) => void;
}

export const MobileCameraScannerModal: React.FC<MobileCameraScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  title = '手机端相机快捷扫码',
  hint = '将二维码 / 条形码对准取景框，即可自动识别',
  autoRouteGlobalEngine = true,
  showToast
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isTorchSupported, setIsTorchSupported] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const [manualCode, setManualCode] = useState<string>('');
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [isRecognized, setIsRecognized] = useState<boolean>(false);
  const [barcodeDetectorSupported, setBarcodeDetectorSupported] = useState<boolean>(false);

  // 预设快速测试常用码（供无实体码环境极速打样验真）
  const PRESET_TEST_CODES = [
    { label: '提货码 #082', code: 'PICKUP:ORDER-082', desc: '外摆A1桌取件验真' },
    { label: '外卖专送 #9821', code: 'UR-9821', desc: '美团专送骑手交接码' },
    { label: '老饕减10券', code: 'COUPON:CPN-8821', desc: '全车通用优惠券核销' },
    { label: '桌贴码 A01', code: 'TABLE:01:A01', desc: '01号餐车大厅A01' },
    { label: '安格斯牛排条码', code: '6901234567890', desc: 'EAN-13 商用商品码' },
    { label: '食材批次包', code: 'BATCH:20260925-BEEF-01', desc: '黑豚肉料检疫溯源' }
  ];

  // 触感反馈
  const triggerHaptic = useCallback(() => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      try {
        window.navigator.vibrate(18);
      } catch {
        /* ignore */
      }
    }
  }, []);

  // 处理识别成功事件
  const handleBarcodeDetected = useCallback(
    (code: string) => {
      const trimmed = code.trim();
      if (!trimmed || isRecognized) return;

      setIsRecognized(true);
      setLastScannedCode(trimmed);
      triggerHaptic();
      playScannerBeep('beep_success');

      let routedResult: ScanResult | undefined;
      if (autoRouteGlobalEngine) {
        routedResult = globalScannerEngine.simulateScan(trimmed);
      }

      if (onScanSuccess) {
        onScanSuccess(trimmed, routedResult);
      }

      if (showToast) {
        showToast(`已识别条码: ${trimmed}`);
      }

      // 500ms 后关闭或重置
      setTimeout(() => {
        setIsRecognized(false);
        onClose();
      }, 550);
    },
    [isRecognized, autoRouteGlobalEngine, onScanSuccess, showToast, onClose, triggerHaptic]
  );

  // 开启摄像头流
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setIsTorchOn(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasCamera(false);
      setCameraError('当前浏览器环境未开放摄像头权限或不支持媒体采集设备');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      // 检测手电筒/补光灯能力
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = (videoTrack as any).getCapabilities?.();
        setIsTorchSupported(!!capabilities?.torch);
      }

      setHasCamera(true);
    } catch (err: any) {
      console.warn('[CameraScanner] getUserMedia failed:', err);
      setHasCamera(false);
      setCameraError(err.name === 'NotAllowedError' ? '用户拒绝了摄像头访问权限，请在浏览器中允许' : '无法启动摄像头，请使用下方手动输入或预设测试码');
    }
  }, [facingMode]);

  // 停止摄像头
  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // 切换手电筒补光灯
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const nextTorch = !isTorchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }]
      });
      setIsTorchOn(nextTorch);
      triggerHaptic();
    } catch (e) {
      console.warn('Torch applyConstraints failed', e);
    }
  };

  // 翻转前后摄像头
  const toggleFacingMode = () => {
    triggerHaptic();
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // 挂载与卸载监听
  useEffect(() => {
    if (isOpen) {
      // 检查原生 BarcodeDetector
      const hasDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;
      setBarcodeDetectorSupported(hasDetector);
      startCamera();
    } else {
      stopCamera();
      setIsRecognized(false);
      setLastScannedCode(null);
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // 原生 BarcodeDetector 定时帧扫描循环
  useEffect(() => {
    if (!isOpen || !hasCamera || isRecognized) return;

    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const detector = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'data_matrix']
        });

        scanIntervalRef.current = window.setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              handleBarcodeDetected(barcodes[0].rawValue);
            }
          } catch {
            // 忽略单帧检测异常
          }
        }, 160);
      } catch (e) {
        console.warn('BarcodeDetector initialization failed', e);
      }
    }

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    };
  }, [isOpen, hasCamera, isRecognized, handleBarcodeDetected]);

  if (!isOpen) return null;

  return (
    <div
      style={{ fontFamily: '"Space Grotesk", "Hanken Grotesk", sans-serif' }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/85 backdrop-blur-md p-3 sm:p-4 select-none animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md bg-[#111315] text-white rounded-xl border border-neutral-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* 顶部标题栏 */}
        <div className="px-4 py-3 bg-[#1A1D20] border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Scan className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold tracking-tight text-white">{title}</h3>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 font-semibold">
                  AI CAM
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-tight truncate">{hint}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="关闭扫码"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 模式切换 Tabs */}
        <div className="flex border-b border-neutral-800 bg-[#141618] text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-2 font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'camera'
                ? 'text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/5'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Scan className="w-3.5 h-3.5" />
            <span>智能相机取景</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2 font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'manual'
                ? 'text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/5'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Barcode className="w-3.5 h-3.5" />
            <span>极速测试 / 手动键入</span>
          </button>
        </div>

        {/* 主视口区域 */}
        <div className="relative flex-1 flex flex-col p-3 overflow-y-auto">
          {activeTab === 'camera' ? (
            <div className="flex flex-col gap-3">
              {/* 摄像头画面与准星容器 */}
              <div className="relative w-full aspect-[4/3] sm:aspect-square bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800 flex items-center justify-center shadow-inner">
                {hasCamera ? (
                  <>
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      className="w-full h-full object-cover"
                    />

                    {/* 取景遮罩与工业直角准星 */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                      <div
                        className={`relative w-48 h-48 sm:w-56 sm:h-56 transition-all duration-200 ${
                          isRecognized
                            ? 'scale-95 border-2 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.5)]'
                            : ''
                        }`}
                      >
                        {/* 4 个工业直角标记 */}
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-emerald-400" />
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-emerald-400" />
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-emerald-400" />
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-emerald-400" />

                        {/* 移动式绿色激光扫描线 */}
                        {!isRecognized && (
                          <div className="absolute inset-x-2 h-0.5 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)] animate-bounce duration-1000 top-1/2 -translate-y-1/2" />
                        )}

                        {/* 成功状态打勾提示 */}
                        {isRecognized && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-500/20 backdrop-blur-xs rounded">
                            <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-in zoom-in-75 duration-200" />
                            <span className="text-xs font-bold text-white mt-1">识别成功</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 画面右上角相机微控按键 */}
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                      {isTorchSupported && (
                        <button
                          type="button"
                          onClick={toggleTorch}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                            isTorchOn
                              ? 'bg-amber-400 text-neutral-950 shadow-md'
                              : 'bg-neutral-900/80 text-white hover:bg-neutral-800'
                          }`}
                          title="补光灯"
                        >
                          {isTorchOn ? <Flashlight className="w-4 h-4" /> : <FlashlightOff className="w-4 h-4" />}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={toggleFacingMode}
                        className="w-8 h-8 rounded-full bg-neutral-900/80 text-white hover:bg-neutral-800 flex items-center justify-center transition-colors cursor-pointer"
                        title="切换前后摄像头"
                      >
                        <SwitchCamera className="w-4 h-4" />
                      </button>
                    </div>

                    {/* 画面底部状态提示 */}
                    <div className="absolute bottom-2 inset-x-2 flex items-center justify-between px-2 py-1 bg-neutral-950/70 backdrop-blur-xs rounded text-[10.5px] text-neutral-300">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>自动对焦捕获中</span>
                      </div>
                      <span className="text-[10px] text-neutral-400">
                        {barcodeDetectorSupported ? '硬件GPU加速' : '高帧率视觉分析'}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="p-4 text-center flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="w-8 h-8 text-amber-400" />
                    <p className="text-xs text-neutral-300 font-semibold">{cameraError || '无法调起摄像头'}</p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('manual')}
                      className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm mt-1"
                    >
                      切换至极速测试/手动输入
                    </button>
                  </div>
                )}
              </div>

              {/* 识别成功回显 */}
              {lastScannedCode && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-[10px] text-emerald-300 font-semibold">最新识读条码</span>
                      <span className="font-bold text-white">{lastScannedCode}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* 手动输入与预设测试码 */
            <div className="flex flex-col gap-3 py-1">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (manualCode.trim()) {
                    handleBarcodeDetected(manualCode.trim());
                  }
                }}
                className="flex flex-col gap-2"
              >
                <label className="text-xs font-bold text-neutral-300">手动键入或粘贴条码 / 提货码</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="输入条码/单号如 #082 或 EAN13..."
                    style={{ fontSize: '16px' }}
                    className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0 shadow-sm"
                  >
                    提交识别
                  </button>
                </div>
              </form>

              {/* 极速打样预设码 */}
              <div className="flex flex-col gap-1.5 mt-2">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" /> 预设业务场景极速打样码:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {PRESET_TEST_CODES.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleBarcodeDetected(item.code)}
                      className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-emerald-500/50 text-left transition-all cursor-pointer flex flex-col group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white group-hover:text-emerald-400 truncate">
                          {item.label}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-neutral-500 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      <span className="text-[10px] text-neutral-400 truncate mt-0.5">{item.desc}</span>
                      <span className="text-[9.5px] text-neutral-500 font-semibold truncate">{item.code}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部工控说明带 */}
        <div className="px-4 py-2.5 bg-[#141618] border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400">
          <div className="flex items-center gap-1">
            <QrCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>支持二维码 · EAN-13 · Code-128</span>
          </div>
          <div className="flex items-center gap-1 text-emerald-400 font-semibold">
            <Volume2 className="w-3.5 h-3.5" />
            <span>蜂鸣确认声已就绪</span>
          </div>
        </div>
      </div>
    </div>
  );
};
