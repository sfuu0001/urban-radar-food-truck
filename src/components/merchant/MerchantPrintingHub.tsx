import React, { useState } from 'react';
import { 
  Printer, 
  Settings, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Wifi, 
  QrCode, 
  Copy, 
  Play, 
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  Sliders,
  Scissors,
  FileText,
  Bluetooth
} from 'lucide-react';
import { 
  PrinterStation, 
  ReceiptTemplateConfig, 
  Order, 
  DishItem 
} from '../../types';
import { 
  INITIAL_PRINTER_STATIONS, 
  INITIAL_RECEIPT_TEMPLATE 
} from '../../data/merchantExtendedMockData';
import { useDevSimulation } from '../../context/DevSimulationContext';
import { SimulationProbe } from '../dev/SimulationProbe';
import { BluetoothPrinterManager } from './BluetoothPrinterManager';

interface MerchantPrintingHubProps {
  orders: Order[];
  dishes: DishItem[];
  showToast: (msg: string) => void;
}

export const MerchantPrintingHub: React.FC<MerchantPrintingHubProps> = ({
  orders,
  dishes,
  showToast
}) => {
  const [stations, setStations] = useState<PrinterStation[]>(() => {
    const raw = localStorage.getItem('obsidian_printer_stations');
    return raw ? JSON.parse(raw) : INITIAL_PRINTER_STATIONS;
  });

  const [template, setTemplate] = useState<ReceiptTemplateConfig>(() => {
    const raw = localStorage.getItem('obsidian_receipt_template');
    return raw ? JSON.parse(raw) : INITIAL_RECEIPT_TEMPLATE;
  });

  const [activeSubTab, setActiveSubTab] = useState<'stations' | 'bluetooth' | 'template' | 'split_preview'>('bluetooth');
  const [selectedStation, setSelectedStation] = useState<PrinterStation | null>(stations[0] || null);
  const [previewPaperWidth, setPreviewPaperWidth] = useState<'58mm' | '80mm'>('80mm');
  const [testOrder, setTestOrder] = useState<Order>(() => orders[0] || {
    id: 'ord-test-01',
    orderNo: '#9821',
    customerName: '林逸凡',
    userPhone: '138****8821',
    items: [
      { name: '碳烤和牛小汉堡双重奏', quantity: 2, price: 128.0, options: '五分熟 · 秘制黑椒酱' },
      { name: '招牌红柳大汗羊肉大串', quantity: 5, price: 60.0, options: '微辣 · 经典孜然' },
      { name: '手作鲜柠檬冷萃乌龙茶', quantity: 2, price: 36.0, options: '少冰 · 七分糖' },
      { name: '黑松露芝士焗金薯条', quantity: 1, price: 32.0, options: '原味' }
    ],
    totalAmount: 256.0,
    status: 'cooking',
    statusText: '制作中',
    createdTime: '12:15',
    estimatedDeliveryTime: '12:45',
    etaMinutes: 30,
    deliveryAddress: '黑石科技园区 1 号楼 B 座 1204 室',
    truckName: '黑石移动餐车 (总店)',
    progressPercent: 40,
    channelType: 'delivery'
  });

  const saveStations = (newStations: PrinterStation[]) => {
    setStations(newStations);
    localStorage.setItem('obsidian_printer_stations', JSON.stringify(newStations));
  };

  const saveTemplate = (newTemplate: ReceiptTemplateConfig) => {
    setTemplate(newTemplate);
    localStorage.setItem('obsidian_receipt_template', JSON.stringify(newTemplate));
    showToast('小票模板配置已实时保存！');
  };

  const handleTestPrint = (stationName: string) => {
    showToast(`已向【${stationName}】发送测试小票数据指令！`);
  };

  const handleBrowserPrint = () => {
    window.print();
  };

  // Split order items according to stations
  const getSplitItemsForStation = (station: PrinterStation) => {
    if (station.categoriesHandled.includes('all')) {
      return testOrder.items;
    }
    return testOrder.items.filter(item => {
      const matchedDish = dishes.find(d => d.name === item.name);
      if (!matchedDish) return true;
      return station.categoriesHandled.includes(matchedDish.category);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-lg border border-[#e3e2e0] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-bold text-[#37352f]">多档口拆单打印与小票模板中心</h2>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded">
              {stations.filter(s => s.status === 'online').length}/{stations.length} 台在线
            </span>
          </div>
          <p className="text-xs text-[#787774] mt-1">
            支持外卖/堂食多档口（炭烤档、水吧、油炸档、前台总单）自动分流飞单，自定义热敏纸模板与小票联数。
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-[#f7f7f5] p-1 rounded-md border border-[#e3e2e0] overflow-x-auto no-scrollbar flex-nowrap max-w-full">
          <button
            type="button"
            onClick={() => setActiveSubTab('bluetooth')}
            className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeSubTab === 'bluetooth'
                ? 'bg-[#37352f] text-white shadow-xs'
                : 'text-[#787774] hover:text-[#37352f]'
            }`}
          >
            <Bluetooth className="w-3.5 h-3.5 text-blue-400" />
            <span>蓝牙便携打印机 (随车直连)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('stations')}
            className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
              activeSubTab === 'stations'
                ? 'bg-white text-[#37352f] shadow-xs'
                : 'text-[#787774] hover:text-[#37352f]'
            }`}
          >
            档口打印机设备 ({stations.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('template')}
            className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
              activeSubTab === 'template'
                ? 'bg-white text-[#37352f] shadow-xs'
                : 'text-[#787774] hover:text-[#37352f]'
            }`}
          >
            小票模板定制
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('split_preview')}
            className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
              activeSubTab === 'split_preview'
                ? 'bg-white text-[#37352f] shadow-xs'
                : 'text-[#787774] hover:text-[#37352f]'
            }`}
          >
            自动拆单飞单模拟
          </button>
        </div>
      </div>

      {/* 1. Sub-Tab: Bluetooth Mobile Printers */}
      {activeSubTab === 'bluetooth' && (
        <BluetoothPrinterManager
          orders={orders}
          template={template}
          showToast={showToast}
        />
      )}

      {/* 2. Sub-Tab: Stations Management */}
      {activeSubTab === 'stations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {stations.map(station => {
            const isSelected = selectedStation?.id === station.id;
            return (
              <div 
                key={station.id}
                className={`bg-white rounded-lg border transition-all p-4 relative flex flex-col justify-between ${
                  isSelected ? 'border-neutral-900 ring-1 ring-neutral-900' : 'border-[#e3e2e0] hover:border-[#c5c3bc]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-neutral-100 rounded text-neutral-800">
                        <Printer className="w-4 h-4" />
                      </span>
                      <span className="font-bold text-sm text-[#37352f]">{station.name}</span>
                    </div>
                    <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      在线
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-[#787774] my-3">
                    <div className="flex justify-between">
                      <span>设备 IP：</span>
                      <span className="font-mono text-[#37352f]">{station.deviceIp}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>纸张规格：</span>
                      <span className="font-semibold text-[#37352f]">{station.paperWidth} 热敏纸</span>
                    </div>
                    <div className="flex justify-between">
                      <span>打印联数：</span>
                      <span className="text-[#37352f]">{station.copies} 联/单</span>
                    </div>
                    <div className="flex justify-between">
                      <span>上次出纸：</span>
                      <span className="text-[#37352f]">{station.lastPrintedAt || '无记录'}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#f1f1ef]">
                    <span className="text-[11px] text-[#787774] block mb-1">负责品类分流：</span>
                    <div className="flex flex-wrap gap-1">
                      {station.categoriesHandled.map(cat => (
                        <span key={cat} className="px-1.5 py-0.5 bg-[#f7f7f5] text-[#37352f] rounded text-[11px] border border-[#e3e2e0]">
                          {cat === 'all' ? '全部菜品' : cat === 'skewers' ? '炭烤串品' : cat === 'western' ? '西式主餐' : cat === 'drinks' ? '水吧冷饮' : cat === 'desserts' ? '烘焙甜点' : '风味小吃'}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#f1f1ef] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleTestPrint(station.name)}
                    className="flex-1 py-1.5 bg-[#f7f7f5] hover:bg-[#e3e2e0] text-[#37352f] rounded text-xs font-semibold border border-[#d3d1cb] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <Play className="w-3 h-3 text-neutral-700" />
                    <span>测试打印</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStation(station);
                      setActiveSubTab('split_preview');
                    }}
                    className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 rounded text-xs font-semibold border border-neutral-300 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <Eye className="w-3 h-3 text-neutral-700" />
                    <span>预览小票</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. Sub-Tab: Template Customizer */}
      {activeSubTab === 'template' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls on Left */}
          <div className="lg:col-span-7 bg-white rounded-lg border border-[#e3e2e0] p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#e3e2e0]">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-sm text-[#37352f]">热敏小票内容与排版配置</h3>
              </div>
              <button
                type="button"
                onClick={() => saveTemplate(INITIAL_RECEIPT_TEMPLATE)}
                className="text-xs text-[#787774] hover:text-[#37352f] cursor-pointer"
              >
                恢复默认模板
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[#787774] mb-1 font-medium">小票主抬头 (店名)</label>
                <input
                  type="text"
                  value={template.headerTitle}
                  onChange={(e) => setTemplate({ ...template, headerTitle: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#d3d1cb] rounded focus:outline-none focus:border-amber-500 text-[#37352f]"
                />
              </div>

              <div>
                <label className="block text-[#787774] mb-1 font-medium">小票副标题 (标语)</label>
                <input
                  type="text"
                  value={template.subHeader}
                  onChange={(e) => setTemplate({ ...template, subHeader: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#d3d1cb] rounded focus:outline-none focus:border-amber-500 text-[#37352f]"
                />
              </div>

              <div>
                <label className="block text-[#787774] mb-1 font-medium">顾客 WiFi 名称</label>
                <input
                  type="text"
                  value={template.wifiName}
                  onChange={(e) => setTemplate({ ...template, wifiName: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#d3d1cb] rounded focus:outline-none focus:border-amber-500 text-[#37352f]"
                />
              </div>

              <div>
                <label className="block text-[#787774] mb-1 font-medium">WiFi 连接密码</label>
                <input
                  type="text"
                  value={template.wifiPassword || ''}
                  onChange={(e) => setTemplate({ ...template, wifiPassword: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#d3d1cb] rounded focus:outline-none focus:border-amber-500 text-[#37352f]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#f1f1ef]">
              <span className="text-xs font-bold text-[#37352f] block mb-2">小票元素展示开关</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 p-2 bg-[#f7f7f5] rounded cursor-pointer border border-[#e3e2e0]">
                  <input
                    type="checkbox"
                    checked={template.showOrderNo}
                    onChange={(e) => setTemplate({ ...template, showOrderNo: e.target.checked })}
                    className="rounded text-amber-600 focus:ring-0"
                  />
                  <span>醒目打印大号单号/取餐号</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-[#f7f7f5] rounded cursor-pointer border border-[#e3e2e0]">
                  <input
                    type="checkbox"
                    checked={template.showOptionNotes}
                    onChange={(e) => setTemplate({ ...template, showOptionNotes: e.target.checked })}
                    className="rounded text-amber-600 focus:ring-0"
                  />
                  <span>打印口味/辣度/做法详细备注</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-[#f7f7f5] rounded cursor-pointer border border-[#e3e2e0]">
                  <input
                    type="checkbox"
                    checked={template.showPrice}
                    onChange={(e) => setTemplate({ ...template, showPrice: e.target.checked })}
                    className="rounded text-amber-600 focus:ring-0"
                  />
                  <span>打印单价与实付金额明细</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-[#f7f7f5] rounded cursor-pointer border border-[#e3e2e0]">
                  <input
                    type="checkbox"
                    checked={template.showQrCode}
                    onChange={(e) => setTemplate({ ...template, showQrCode: e.target.checked })}
                    className="rounded text-amber-600 focus:ring-0"
                  />
                  <span>底部打印电子发票/评价二维码</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-[#787774] mb-1 font-medium text-xs">页脚温馨提示语</label>
              <textarea
                rows={2}
                value={template.footerNotes}
                onChange={(e) => setTemplate({ ...template, footerNotes: e.target.value })}
                className="w-full px-3 py-1.5 border border-[#d3d1cb] rounded focus:outline-none focus:border-amber-500 text-xs text-[#37352f]"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => saveTemplate(template)}
                className="px-4 py-2 bg-[#37352f] hover:bg-black text-white rounded text-xs font-semibold cursor-pointer transition-colors shadow-xs"
              >
                保存模板配置
              </button>
            </div>
          </div>

          {/* Receipt Live Visualizer on Right */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full max-w-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#787774]">热敏纸打印效果实时模拟</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPreviewPaperWidth('58mm')}
                    className={`px-2 py-0.5 text-[11px] font-semibold rounded cursor-pointer ${
                      previewPaperWidth === '58mm' ? 'bg-[#37352f] text-white' : 'bg-white text-[#787774] border'
                    }`}
                  >
                    58mm 窄票
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewPaperWidth('80mm')}
                    className={`px-2 py-0.5 text-[11px] font-semibold rounded cursor-pointer ${
                      previewPaperWidth === '80mm' ? 'bg-[#37352f] text-white' : 'bg-white text-[#787774] border'
                    }`}
                  >
                    80mm 宽票
                  </button>
                </div>
              </div>

              {/* Thermal Paper Simulation Card */}
              <div 
                className={`bg-[#fafaf8] border border-[#d3d1cb] shadow-md p-4 sm:p-5 text-[#222] font-mono mx-auto transition-all max-w-full ${
                  previewPaperWidth === '58mm' ? 'w-full max-w-[260px] text-[11px]' : 'w-full max-w-[310px] text-xs'
                }`}
                style={{
                  backgroundImage: 'radial-gradient(#e3e2e0 0.75px, transparent 0.75px)',
                  backgroundSize: '12px 12px'
                }}
              >
                {/* Header */}
                <div className="text-center pb-3 border-b border-dashed border-neutral-400">
                  <h4 className="font-bold text-sm tracking-wide">{template.headerTitle}</h4>
                  <p className="text-[11px] text-neutral-600 mt-0.5">{template.subHeader}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-neutral-200 text-neutral-800 text-[10px] font-bold">
                    {template.customerCopyText}
                  </span>
                </div>

                {/* Meta */}
                <div className="py-2.5 border-b border-dashed border-neutral-400 space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-lg">{testOrder.orderNo}</span>
                    <span className="text-[11px]">{testOrder.createdTime} 下单</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-neutral-600">
                    <span>渠道：外卖专送</span>
                    <span>顾客：{testOrder.customerName}</span>
                  </div>
                </div>

                {/* Items Table */}
                <div className="py-3 border-b border-dashed border-neutral-400">
                  <div className="flex justify-between font-bold pb-1 text-[11px] border-b border-neutral-300 mb-2">
                    <span>品名 / 规格</span>
                    <span>数量 / 金额</span>
                  </div>

                  <div className="space-y-2">
                    {testOrder.items.map((it, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between font-medium">
                          <span className="break-words max-w-[170px]">{it.name}</span>
                          <span>x{it.quantity}  ¥{(it.price * it.quantity).toFixed(1)}</span>
                        </div>
                        {template.showOptionNotes && it.options && (
                          <span className="text-[10px] text-neutral-500 block pl-2">↳ {it.options}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="py-2.5 border-b border-dashed border-neutral-400 space-y-1 text-right">
                  <div className="flex justify-between text-neutral-600 text-[11px]">
                    <span>商品小计：</span>
                    <span>¥{testOrder.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm pt-1">
                    <span>实收总额：</span>
                    <span>¥{testOrder.totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Footer & QR */}
                <div className="pt-3 text-center space-y-2 text-[10px] text-neutral-600">
                  {template.wifiName && (
                    <div className="bg-neutral-100 p-1.5 rounded border border-neutral-200">
                      <span>WiFi: <b>{template.wifiName}</b> | 密码: <b>{template.wifiPassword}</b></span>
                    </div>
                  )}

                  {template.showQrCode && (
                    <div className="flex flex-col items-center justify-center pt-1">
                      <div className="w-16 h-16 bg-neutral-900 text-white flex items-center justify-center rounded">
                        <QrCode className="w-12 h-12 text-white" />
                      </div>
                      <span className="text-[9px] text-neutral-500 mt-1">扫码开具电子发票与会员积分</span>
                    </div>
                  )}

                  <p className="italic text-neutral-500 pt-1">{template.footerNotes}</p>
                </div>
              </div>

              {/* Print Test Action */}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleBrowserPrint}
                  className="w-full py-2 bg-[#37352f] hover:bg-black text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>唤起浏览器真实打印</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Sub-Tab: Split Printing Simulation */}
      {activeSubTab === 'split_preview' && (
        <SimulationProbe pointId="SIM_PRINTER_STATION_SPLIT" className="block">
          <div className="bg-white rounded-lg border border-[#e3e2e0] p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e3e2e0]">
            <div>
              <h3 className="font-bold text-sm text-[#37352f]">全渠道订单智能多档口拆分飞单</h3>
              <p className="text-xs text-[#787774] mt-0.5">
                系统根据每道菜品的品类属性，自动分发飞单至对应档口（无需人工干预），保障前后厨极速协同。
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>一键触发全档口拆单打印</span>
            </button>
          </div>

          {/* 4 Stations Split Visual Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {stations.map(station => {
              const splitItems = getSplitItemsForStation(station);
              return (
                <div key={station.id} className="border border-[#d3d1cb] rounded-lg p-3.5 bg-[#fbfbfa] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-[#e3e2e0] mb-2">
                      <span className="font-bold text-xs text-[#37352f]">{station.name}</span>
                      <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] rounded font-semibold">
                        {station.paperWidth}
                      </span>
                    </div>

                    <div className="text-[11px] text-[#787774] space-y-1 mb-2">
                      <div>单号：<b className="text-[#37352f]">{testOrder.orderNo}</b></div>
                      <div>类别：{station.categoriesHandled.join(', ')}</div>
                    </div>

                    <div className="bg-white rounded border border-[#e3e2e0] p-2 space-y-2 min-h-[140px]">
                      {splitItems.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-xs text-[#787774] py-8">
                          本单无该档口菜品
                        </div>
                      ) : (
                        splitItems.map((item, i) => (
                          <div key={i} className="text-xs border-b border-dashed border-[#f1f1ef] pb-1 last:border-0">
                            <div className="flex justify-between font-semibold text-[#37352f]">
                              <span>{item.name}</span>
                              <span className="text-amber-700">x{item.quantity}</span>
                            </div>
                            {item.options && (
                              <span className="text-[10px] text-[#787774] block pl-1">↳ {item.options}</span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-[#e3e2e0] flex items-center justify-between text-[11px]">
                    <span className="text-[#787774]">包含菜品：<b>{splitItems.length}</b> 种</span>
                    <button
                      type="button"
                      onClick={() => handleTestPrint(station.name)}
                      className="text-amber-700 hover:text-amber-900 font-semibold cursor-pointer"
                    >
                      单机补打 🖨️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </SimulationProbe>
    )}
  </div>
);
};
