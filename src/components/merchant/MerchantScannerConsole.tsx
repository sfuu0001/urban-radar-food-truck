import React, { useState, useEffect } from 'react';
import {
  Scan,
  Barcode,
  Volume2,
  VolumeX,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Copy,
  Trash2,
  ShoppingBag,
  UserCheck,
  Tag,
  Receipt,
  RotateCcw,
  Zap,
  Info,
  Radio,
  Search,
  Check,
  RefreshCw,
  Package,
  Layers,
  KeyRound
} from 'lucide-react';
import { DishItem, Order, TableItem } from '../../types';
import { getOrGeneratePickupCode } from '../../utils/pickupCodeEngine';
import {
  ScannerConfig,
  ScanResult,
  getScannerConfig,
  saveScannerConfig,
  getScanHistory,
  clearScanHistory,
  playScannerBeep,
  globalScannerEngine,
  generateEan13Barcode
} from '../../utils/barcodeScannerEngine';
import { copyTextToClipboard } from '../../utils/clipboard';
import { useDevSimulation } from '../../context/DevSimulationContext';
import { SimulationProbe } from '../dev/SimulationProbe';

interface MerchantScannerConsoleProps {
  dishes: DishItem[];
  orders?: Order[];
  tables?: TableItem[];
  onDishScanned?: (dish: DishItem) => void;
  showToast?: (msg: string) => void;
}

export const MerchantScannerConsole: React.FC<MerchantScannerConsoleProps> = ({
  dishes,
  orders = [],
  tables = [],
  onDishScanned,
  showToast
}) => {
  const [config, setConfig] = useState<ScannerConfig>(getScannerConfig());
  const [activeTab, setActiveTab] = useState<'live' | 'sku_list' | 'settings' | 'history'>('live');
  const [testInput, setTestInput] = useState('');
  const [lastScannedResult, setLastScannedResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [searchSkuQuery, setSearchSkuQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Load history on mount
  useEffect(() => {
    setHistory(getScanHistory());
    setConfig(getScannerConfig());
  }, []);

  // Subscribe to real scanner events
  useEffect(() => {
    const unsubscribe = globalScannerEngine.subscribe((result) => {
      setLastScannedResult(result);
      setHistory(getScanHistory());
      if (result.type === 'dish' && result.matchedData && onDishScanned) {
        onDishScanned(result.matchedData);
      }
    });
    return () => unsubscribe();
  }, [onDishScanned]);

  const handleUpdateConfig = (partial: Partial<ScannerConfig>) => {
    const updated = { ...config, ...partial };
    setConfig(updated);
    saveScannerConfig(updated);
    if (showToast) {
      showToast('扫码枪参数配置已保存');
    }
  };

  const handleSimulate = (code: string) => {
    const res = globalScannerEngine.simulateScan(code);
    setLastScannedResult(res);
    setHistory(getScanHistory());
    if (res.type === 'dish' && res.matchedData && onDishScanned) {
      onDishScanned(res.matchedData);
    }
    if (showToast) {
      showToast(`[扫码枪] 已识别: ${res.title}`);
    }
  };

  const handleManualTestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testInput.trim()) return;
    handleSimulate(testInput.trim());
    setTestInput('');
  };

  const handleCopy = async (code: string) => {
    const ok = await copyTextToClipboard(code);
    if (ok) {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 1500);
      if (showToast) showToast(`已复制条码: ${code}`);
    }
  };

  const filteredDishes = dishes.filter(
    (d) =>
      d.name.toLowerCase().includes(searchSkuQuery.toLowerCase()) ||
      d.barcode?.toLowerCase().includes(searchSkuQuery.toLowerCase()) ||
      d.category.toLowerCase().includes(searchSkuQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      {/* Top Header Card */}
      <div className="bg-white p-4 sm:p-5 rounded-[4px] border border-[#e6e6e4] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-[3px] bg-[#2b593f]/10 border border-[#2b593f]/20 flex items-center justify-center shrink-0">
            <Barcode className="w-5 h-5 text-[#2b593f]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-base text-[#37352f]">智能扫码枪硬件控制台</h2>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                HID 键盘协议全局静默监听中
              </span>
            </div>
            <p className="text-xs text-[#787774] mt-0.5">
              支持市面上任意标准 USB / 2.4G无线 / 蓝牙 / 扫码盒等免驱扫码设备，即插即扫，毫秒级智能分流
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={() => {
              setHistory(getScanHistory());
              if (showToast) showToast('已刷新扫码流水');
            }}
            className="px-3 py-1.5 bg-[#f7f7f5] hover:bg-[#e6e6e4] text-[#37352f] border border-[#d3d1cb] rounded-[3px] text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-neutral-600" />
            <span>刷新流水</span>
          </button>
          <button
            type="button"
            onClick={() => handleUpdateConfig({ soundEnabled: !config.soundEnabled })}
            className={`px-3 py-1.5 rounded-[3px] text-xs font-semibold transition-colors cursor-pointer border flex items-center gap-1.5 ${
              config.soundEnabled
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-neutral-100 border-neutral-300 text-neutral-600'
            }`}
          >
            {config.soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>硬件蜂鸣器已开启</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-neutral-500" />
                <span>硬件蜂鸣器已静音</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Container with Sub Tabs */}
      <div className="bg-white rounded-[4px] border border-[#e6e6e4] shadow-xs overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-4 pt-3 bg-[#fafaf8] border-b border-[#e6e6e4] text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('live')}
            className={`px-4 py-2 border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'live'
                ? 'border-[#2b593f] text-[#2b593f] bg-white font-bold rounded-t-[3px]'
                : 'border-transparent text-[#787774] hover:text-[#37352f]'
            }`}
          >
            <Scan className="w-4 h-4" />
            <span>实时测试与业务联动</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sku_list')}
            className={`px-4 py-2 border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'sku_list'
                ? 'border-[#2b593f] text-[#2b593f] bg-white font-bold rounded-t-[3px]'
                : 'border-transparent text-[#787774] hover:text-[#37352f]'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>商品 69 码与条码目录 ({dishes.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-[#2b593f] text-[#2b593f] bg-white font-bold rounded-t-[3px]'
                : 'border-transparent text-[#787774] hover:text-[#37352f]'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>扫描实时流水 ({history.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'settings'
                ? 'border-[#2b593f] text-[#2b593f] bg-white font-bold rounded-t-[3px]'
                : 'border-transparent text-[#787774] hover:text-[#37352f]'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>硬件参数与音效配置</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 text-xs font-sans">
          {/* TAB 1: LIVE TEST & SCENARIOS */}
          {activeTab === 'live' && (
            <div className="space-y-5">
              {/* Scan Trigger / Receiver Area */}
              <div className="p-6 bg-emerald-950/5 border-2 border-dashed border-emerald-600/30 rounded-[4px] text-center space-y-3 relative overflow-hidden">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-600/10 text-emerald-700 flex items-center justify-center shadow-xs">
                  <Scan className="w-6 h-6 animate-pulse" />
                </div>
                <div className="font-bold text-sm text-[#37352f]">
                  请使用实体扫码枪扫描任意条形码 / 二维码
                </div>
                <p className="text-xs text-[#787774] max-w-lg mx-auto leading-relaxed">
                  无需点选输入框，系统全局运行 HID 极速按键捕获协议（&lt;50ms），拿起扫码枪即可在前台点餐、后厨配餐、会员核销等任意场景秒级生效。
                </p>

                {/* Manual input simulation box */}
                <form onSubmit={handleManualTestSubmit} className="max-w-md mx-auto flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="或在此手动输入测试条形码 (按回车模拟扫码)"
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border border-[#d3d1cb] rounded-[3px] text-xs focus:outline-none focus:border-[#2b593f] font-mono text-[#37352f]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#2b593f] hover:bg-[#204430] text-white rounded-[3px] font-semibold text-xs transition-colors cursor-pointer shrink-0 shadow-xs"
                  >
                    模拟扫码
                  </button>
                </form>
              </div>

              {/* Latest Scanned Feedback Card */}
              {lastScannedResult && (
                <div className="p-4 bg-white rounded-[4px] border border-emerald-300 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>最新硬件扫码识别结果</span>
                    </span>
                    <span className="font-mono text-xs text-[#787774]">{lastScannedResult.timestamp}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3 p-3 bg-[#f7f7f5] rounded-[3px]">
                    <div>
                      <div className="font-bold text-sm text-[#37352f]">{lastScannedResult.title}</div>
                      <div className="text-xs text-[#787774] mt-0.5">{lastScannedResult.subtitle}</div>
                      <div className="text-xs text-emerald-700 font-semibold pt-1 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span>触发动作: {lastScannedResult.actionTaken}</span>
                      </div>
                    </div>
                    <span className="font-mono text-xs px-2.5 py-1 bg-neutral-200 text-neutral-800 rounded font-bold">
                      {lastScannedResult.code}
                    </span>
                  </div>
                </div>
              )}

              {/* Quick Scenario Simulators */}
              <SimulationProbe pointId="SIM_BARCODE_HARDWARE_GUN" className="block space-y-3">
                <div className="font-bold text-xs text-[#37352f] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>快捷场景仿真测试矩阵 (点击即刻触发全业务联动)：</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Scenario 1: Dish Barcode */}
                  <div
                    onClick={() => handleSimulate(dishes[0]?.barcode || '6979988000018')}
                    className="p-3.5 bg-[#fbfbfa] hover:bg-[#f1f1ef] border border-[#e6e6e4] rounded-[3px] cursor-pointer transition-colors space-y-1.5 group hover:border-emerald-300 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#37352f] flex items-center gap-1.5">
                        <ShoppingBag className="w-4 h-4 text-emerald-700" />
                        <span>商品 69 码</span>
                      </span>
                      <span className="font-mono text-[10.5px] bg-neutral-200 px-1.5 py-0.5 rounded text-neutral-700 font-semibold">
                        {dishes[0]?.barcode || '6979988000018'}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-[#787774] leading-relaxed">
                      扫描【{dishes[0]?.name || '招牌菜品'}】，模拟前台快速加购并鸣响双重蜂鸣音
                    </p>
                  </div>

                  {/* Scenario 2: Member VIP QR */}
                  <div
                    onClick={() => handleSimulate('VIP-8888-001')}
                    className="p-3.5 bg-[#fbfbfa] hover:bg-[#f1f1ef] border border-[#e6e6e4] rounded-[3px] cursor-pointer transition-colors space-y-1.5 group hover:border-purple-300 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#37352f] flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-purple-700" />
                        <span>会员 VIP 码</span>
                      </span>
                      <span className="font-mono text-[10.5px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-semibold">
                        VIP-8888-001
                      </span>
                    </div>
                    <p className="text-[11.5px] text-[#787774] leading-relaxed">
                      扫描顾客微信会员二维码，播放三段迎宾音并自动激活专属 9 折/8.8折特权
                    </p>
                  </div>

                  {/* Scenario 3: Coupon Voucher */}
                  <div
                    onClick={() => handleSimulate('COUPON-2026-MINUS10')}
                    className="p-3.5 bg-[#fbfbfa] hover:bg-[#f1f1ef] border border-[#e6e6e4] rounded-[3px] cursor-pointer transition-colors space-y-1.5 group hover:border-amber-300 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#37352f] flex items-center gap-1.5">
                        <Tag className="w-4 h-4 text-amber-700" />
                        <span>电子优惠券</span>
                      </span>
                      <span className="font-mono text-[10.5px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold">
                        CPN-MINUS10
                      </span>
                    </div>
                    <p className="text-[11.5px] text-[#787774] leading-relaxed">
                      扫描立减券/代金券二维码，完成核销并在账单中自动减免金额
                    </p>
                  </div>

                  {/* Scenario 4: Table Matrix */}
                  <div
                    onClick={() => handleSimulate('TBL-A01')}
                    className="p-3.5 bg-[#fbfbfa] hover:bg-[#f1f1ef] border border-[#e6e6e4] rounded-[3px] cursor-pointer transition-colors space-y-1.5 group hover:border-blue-300 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#37352f] flex items-center gap-1.5">
                        <Receipt className="w-4 h-4 text-blue-700" />
                        <span>桌台定位码</span>
                      </span>
                      <span className="font-mono text-[10.5px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-semibold">
                        TBL-A01
                      </span>
                    </div>
                    <p className="text-[11.5px] text-[#787774] leading-relaxed">
                      服务员扫桌贴二维码，即刻唤起开台点餐或拉取堂食结账单
                    </p>
                  </div>

                  {/* Scenario 5: Rider Pickup Code Verification */}
                  <div
                    onClick={() => {
                      const firstOrder = orders[0];
                      const pickupCode = firstOrder
                        ? getOrGeneratePickupCode(firstOrder.orderNo, firstOrder.pickupCode)
                        : '8821';
                      handleSimulate(`PICKUP:${pickupCode}`);
                    }}
                    className="p-3.5 bg-amber-50/70 hover:bg-amber-100/70 border border-amber-300 rounded-[3px] cursor-pointer transition-colors space-y-1.5 group hover:border-amber-500 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-950 flex items-center gap-1.5">
                        <KeyRound className="w-4 h-4 text-amber-600" />
                        <span>骑手取件码</span>
                      </span>
                      <span className="font-mono text-[10.5px] bg-amber-200 text-amber-950 px-1.5 py-0.5 rounded font-black">
                        {orders[0] ? getOrGeneratePickupCode(orders[0].orderNo, orders[0].pickupCode) : '8821'}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-amber-900/90 leading-relaxed">
                      扫描骑手手机端出示的 4 位取件口令/条码，餐车自动放行并通知专送
                    </p>
                  </div>
                </div>
              </SimulationProbe>
            </div>
          )}

          {/* TAB 2: SKU BARCODE DIRECTORY */}
          {activeTab === 'sku_list' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9b9a97]" />
                  <input
                    type="text"
                    placeholder="搜索菜品名称 / 69条形码 / 分类..."
                    value={searchSkuQuery}
                    onChange={(e) => setSearchSkuQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#f7f7f5] border border-[#d3d1cb] rounded-[3px] text-xs focus:outline-none focus:border-[#37352f]"
                  />
                </div>
                <div className="text-xs text-[#787774] self-end sm:self-auto font-medium">
                  共找到 <span className="font-bold text-[#37352f]">{filteredDishes.length}</span> 款菜品条码
                </div>
              </div>

              <div className="border border-[#e6e6e4] rounded-[3px] overflow-hidden overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead className="bg-[#f7f7f5] text-[#787774] text-xs border-b border-[#e6e6e4]">
                    <tr>
                      <th className="p-3 font-bold">菜品信息</th>
                      <th className="p-3 font-bold">分类</th>
                      <th className="p-3 font-bold">单价</th>
                      <th className="p-3 font-bold">商品 13 位标准条码 (69码)</th>
                      <th className="p-3 font-bold text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f1ef]">
                    {filteredDishes.map((dish, idx) => {
                      const code = dish.barcode || generateEan13Barcode(idx + 1);
                      return (
                        <tr key={dish.id} className="hover:bg-[#fbfbfa] transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={dish.imageUrl}
                                alt={dish.name}
                                className="w-10 h-10 rounded-[3px] object-cover border border-[#e6e6e4] shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="font-bold text-xs text-[#37352f] truncate max-w-[200px]">{dish.name}</div>
                                <div className="text-[11px] text-[#787774] truncate">{dish.enName}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-xs text-[#787774]">
                            <span className="bg-neutral-100 px-2 py-0.5 rounded text-neutral-700">
                              {dish.category}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold text-emerald-700 text-sm">
                            ¥{dish.price.toFixed(2)}
                          </td>
                          <td className="p-3 font-mono text-xs text-[#37352f]">
                            <div className="flex items-center gap-2">
                              <span className="bg-neutral-100 px-2 py-1 rounded border border-neutral-200 font-bold tracking-wider">
                                {code}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(code)}
                                className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer rounded hover:bg-neutral-100"
                                title="复制条码"
                              >
                                {copiedCode === code ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleSimulate(code)}
                              className="px-3 py-1.5 bg-[#2b593f]/10 hover:bg-[#2b593f] text-[#2b593f] hover:text-white rounded-[3px] text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                            >
                              测试扫码
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: SCAN HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#787774]">展示最近 50 条扫码枪识别记录及触发事件流水</span>
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      clearScanHistory();
                      setHistory([]);
                      if (showToast) showToast('已清空扫描记录');
                    }}
                    className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1.5 cursor-pointer font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>清空流水</span>
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="p-12 text-center text-[#9b9a97] space-y-2 border border-dashed border-neutral-200 rounded-[3px]">
                  <RotateCcw className="w-8 h-8 mx-auto text-neutral-300" />
                  <p className="text-xs">暂无扫码记录，拿起扫码枪扫描即可在此查看实时流水</p>
                </div>
              ) : (
                <div className="border border-[#e6e6e4] rounded-[3px] divide-y divide-[#f1f1ef] max-h-[480px] overflow-y-auto">
                  {history.map((item, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between gap-3 hover:bg-[#fbfbfa] transition-colors">
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="font-mono text-xs text-[#9b9a97] mt-0.5 shrink-0">{item.timestamp}</span>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-[#37352f] truncate">{item.title}</div>
                          <div className="text-xs text-[#787774] truncate">{item.subtitle}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-xs bg-neutral-100 px-2 py-0.5 rounded text-neutral-700 font-semibold border border-neutral-200">
                          {item.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSimulate(item.code)}
                          className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-[3px] text-xs font-semibold cursor-pointer transition-colors"
                        >
                          重放
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: HARDWARE SETTINGS & AUDIO */}
          {activeTab === 'settings' && (
            <div className="space-y-5 max-w-2xl">
              <div className="p-4 bg-[#fafaf8] rounded-[3px] border border-[#e6e6e4] space-y-4">
                <div className="font-bold text-sm text-[#37352f] pb-2 border-b border-[#e6e6e4]">
                  硬件监听与输入容差设置
                </div>

                {/* Switch: Enable Global Scanner */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-xs text-[#37352f]">启用全局扫码枪自动识别</div>
                    <div className="text-xs text-[#787774] mt-0.5">
                      开启后在收银台、菜单、订单页无需点选输入框即可即扫即响应
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) => handleUpdateConfig({ enabled: e.target.checked })}
                    className="w-4 h-4 accent-[#2b593f] cursor-pointer"
                  />
                </div>

                {/* Switch: Sound */}
                <div className="flex items-center justify-between pt-3 border-t border-[#f1f1ef]">
                  <div>
                    <div className="font-semibold text-xs text-[#37352f]">扫码提示音 (Web Audio 硬件蜂鸣器)</div>
                    <div className="text-xs text-[#787774] mt-0.5">扫码成功/加购时播放清脆的“哔~”确认音</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.soundEnabled}
                    onChange={(e) => handleUpdateConfig({ soundEnabled: e.target.checked })}
                    className="w-4 h-4 accent-[#2b593f] cursor-pointer"
                  />
                </div>

                {/* Sound Test Buttons */}
                <div className="pt-3 border-t border-[#f1f1ef] space-y-2">
                  <div className="text-xs font-semibold text-[#787774]">音效试听:</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => playScannerBeep('beep_success')}
                      className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-[3px] text-xs font-semibold cursor-pointer transition-colors"
                    >
                      🔊 标准扫码音 (1800Hz)
                    </button>
                    <button
                      type="button"
                      onClick={() => playScannerBeep('beep_cart')}
                      className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-[3px] text-xs font-semibold cursor-pointer transition-colors"
                    >
                      🛒 加购双重音
                    </button>
                    <button
                      type="button"
                      onClick={() => playScannerBeep('beep_member')}
                      className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-[3px] text-xs font-semibold cursor-pointer transition-colors"
                    >
                      👑 VIP迎宾曲 (三和弦)
                    </button>
                    <button
                      type="button"
                      onClick={() => playScannerBeep('beep_error')}
                      className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-[3px] text-xs font-semibold cursor-pointer transition-colors"
                    >
                      ⚠️ 异常提示音
                    </button>
                  </div>
                </div>

                {/* Keystroke speed threshold */}
                <div className="pt-3 border-t border-[#f1f1ef] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-[#37352f]">按键间隔阈值 (毫秒)</span>
                    <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {config.maxKeyIntervalMs} ms
                    </span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={120}
                    step={5}
                    value={config.maxKeyIntervalMs}
                    onChange={(e) => handleUpdateConfig({ maxKeyIntervalMs: Number(e.target.value) })}
                    className="w-full accent-[#2b593f] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10.5px] text-[#9b9a97]">
                    <span>极速 (高速激光枪 30ms)</span>
                    <span>标准推荐 (50ms)</span>
                    <span>宽松 (慢速蓝牙枪 90ms)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
