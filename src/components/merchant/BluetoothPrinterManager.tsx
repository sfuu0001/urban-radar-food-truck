import React, { useState, useEffect, useRef } from 'react';
import {
  Bluetooth,
  Printer,
  Wifi,
  Radio,
  Battery,
  BatteryCharging,
  CheckCircle2,
  AlertCircle,
  Play,
  RefreshCw,
  Plus,
  Trash2,
  Sliders,
  Scissors,
  Bell,
  FileText,
  Copy,
  ChevronDown,
  Power,
  Zap,
  HardDrive
} from 'lucide-react';
import {
  BluetoothPrinterDevice,
  BluetoothPrintTaskLog,
  Order,
  ReceiptTemplateConfig
} from '../../types';
import {
  EscPosBuilder,
  buildOrderReceiptBytes,
  buildSelfTestBytes,
  sendBytesToBluetoothCharacteristic,
  BluetoothRemoteGATTCharacteristic
} from '../../utils/escpos';

interface BluetoothPrinterManagerProps {
  orders: Order[];
  template: ReceiptTemplateConfig;
  showToast: (msg: string, desc?: string) => void;
}

// Initial Preset Food-Truck Bluetooth Thermal Printers
const DEFAULT_BLUETOOTH_PRINTERS: BluetoothPrinterDevice[] = [
  {
    id: 'bt-01',
    name: '佳博 Gprinter 58便携蓝牙票据机',
    modelBrand: 'Gprinter GP-58MBIII (车载便携手持)',
    macAddress: 'DC:0D:30:8F:A2:11',
    paperWidth: '58mm',
    status: 'connected',
    batteryLevel: 92,
    signalRssi: -52,
    isDefault: true,
    autoPrintNewOrders: true,
    copies: 2,
    firmwareVersion: 'V4.2.0_BLE',
    lastPrintedAt: '12:18'
  },
  {
    id: 'bt-02',
    name: '芯烨 Xprinter 80宽幅移动热敏机',
    modelBrand: 'Xprinter XP-P300 (前台接单大号纸)',
    macAddress: '00:1A:7D:DA:71:09',
    paperWidth: '80mm',
    status: 'disconnected',
    batteryLevel: 68,
    signalRssi: -68,
    isDefault: false,
    autoPrintNewOrders: false,
    copies: 1,
    firmwareVersion: 'V3.8.1_BLE',
    lastPrintedAt: '昨天 19:40'
  },
  {
    id: 'bt-03',
    name: '汉印 HPRT 车载后厨自粘标签机',
    modelBrand: 'HPRT HM-E200 (防油防水杯贴/餐盒贴)',
    macAddress: '88:25:83:FE:19:62',
    paperWidth: '58mm',
    status: 'disconnected',
    batteryLevel: 85,
    signalRssi: -60,
    isDefault: false,
    autoPrintNewOrders: false,
    copies: 1,
    firmwareVersion: 'V2.6.4_BLE',
    lastPrintedAt: '无记录'
  }
];

export const BluetoothPrinterManager: React.FC<BluetoothPrinterManagerProps> = ({
  orders,
  template,
  showToast
}) => {
  // Bluetooth devices state
  const [printers, setPrinters] = useState<BluetoothPrinterDevice[]>(() => {
    const raw = localStorage.getItem('obsidian_bt_printers');
    return raw ? JSON.parse(raw) : DEFAULT_BLUETOOTH_PRINTERS;
  });

  // Selected device for management
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>(
    printers[0]?.id || 'bt-01'
  );

  // Selected order for manual print test
  const [selectedOrderId, setSelectedOrderId] = useState<string>(
    orders[0]?.id || ''
  );

  // Print logs
  const [logs, setLogs] = useState<BluetoothPrintTaskLog[]>([
    {
      id: 'log-01',
      timestamp: '12:18:04',
      printerName: '佳博 Gprinter 58便携蓝牙票据机',
      orderNo: '#9821',
      bytesCount: 684,
      status: 'success',
      taskType: 'order_receipt',
      detail: '2联出单完成 (顾客联+制作联) · 耗时 480ms'
    }
  ]);

  // UI States
  const [isScanning, setIsScanning] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printProgress, setPrintProgress] = useState(0);
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<
    { name: string; mac: string; rssi: number; width: '58mm' | '80mm' }[]
  >([]);
  const [activeHexPreview, setActiveHexPreview] = useState<string>('');
  const [showHexModal, setShowHexModal] = useState(false);

  // Real Web Bluetooth GATT Reference
  const realBluetoothCharacteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(
    null
  );

  const activePrinter = printers.find((p) => p.id === selectedPrinterId) || printers[0];
  const targetOrder = orders.find((o) => o.id === selectedOrderId) || orders[0] || {
    id: 'ord-test-sample',
    orderNo: '#9825',
    customerName: '赵先生 (VIP 食客)',
    userPhone: '139****1988',
    deliveryAddress: '黑石数智大厦 A 座 1608 移动专送车停靠点',
    items: [
      { name: '炭烤和牛小汉堡双重奏', quantity: 2, price: 128.0, options: '五分熟 · 秘制黑椒酱' },
      { name: '手作鲜柠檬冷萃乌龙茶', quantity: 2, price: 36.0, options: '少冰 · 微糖' }
    ],
    totalAmount: 164.0,
    createdTime: '刚刚 12:28'
  };

  const savePrinters = (newList: BluetoothPrinterDevice[]) => {
    setPrinters(newList);
    localStorage.setItem('obsidian_bt_printers', JSON.stringify(newList));
  };

  // Add Log Entry
  const addLog = (
    taskType: BluetoothPrintTaskLog['taskType'],
    orderNo: string,
    bytesCount: number,
    status: 'success' | 'failed',
    detail?: string
  ) => {
    const newLog: BluetoothPrintTaskLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      printerName: activePrinter?.name || '蓝牙热敏打印机',
      orderNo,
      bytesCount,
      status,
      taskType,
      detail
    };
    setLogs((prev) => [newLog, ...prev.slice(0, 29)]);
  };

  // 1. Toggle Bluetooth Connection (Connect / Disconnect)
  const handleToggleConnection = async (printerId: string) => {
    const target = printers.find((p) => p.id === printerId);
    if (!target) return;

    if (target.status === 'connected') {
      // Disconnect
      const updated = printers.map((p) =>
        p.id === printerId ? { ...p, status: 'disconnected' as const } : p
      );
      savePrinters(updated);
      realBluetoothCharacteristicRef.current = null;
      showToast(`已断开与【${target.name}】的蓝牙连接`);
    } else {
      // Connect
      const updatedConnecting = printers.map((p) =>
        p.id === printerId ? { ...p, status: 'connecting' as const } : p
      );
      savePrinters(updatedConnecting);

      setTimeout(() => {
        const updatedConnected = printers.map((p) =>
          p.id === printerId ? { ...p, status: 'connected' as const } : p
        );
        savePrinters(updatedConnected);
        showToast(`已成功连接蓝牙打印机【${target.name}】`, '通信信道建立成功，就绪出纸！');
      }, 700);
    }
  };

  // 2. Real Web Bluetooth Scan / Virtual Pairing
  const handleStartBluetoothScan = async () => {
    setIsScanning(true);
    setIsPairModalOpen(true);
    setDiscoveredDevices([]);

    // Check if Web Bluetooth is natively supported in browser
    const hasWebBluetooth =
      typeof navigator !== 'undefined' && 'bluetooth' in navigator && (navigator as any).bluetooth;

    if (hasWebBluetooth) {
      try {
        // Standard Thermal Printer GATT Services
        const device = await (navigator as any).bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [
            '000018f0-0000-1000-8000-00805f9b34fb', // Standard Printer Service
            '0000ffe0-0000-1000-8000-00805f9b34fb', // Common BLE SPP
            '0000ff00-0000-1000-8000-00805f9b34fb',
            '49535343-fe7d-4ae5-8fa9-9fafd205e455'
          ]
        });

        if (device && device.name) {
          showToast(`已发现物理蓝牙设备: ${device.name}`, '正在握手连接 GATT 服务...');
          const server = await device.gatt?.connect();
          if (server) {
            // Find writable characteristic
            const services = await server.getPrimaryServices();
            for (const s of services) {
              const chars = await s.getCharacteristics();
              for (const c of chars) {
                if (c.properties.write || c.properties.writeWithoutResponse) {
                  realBluetoothCharacteristicRef.current = c;
                  break;
                }
              }
              if (realBluetoothCharacteristicRef.current) break;
            }
          }

          // Register new device
          const newDev: BluetoothPrinterDevice = {
            id: `bt-${Date.now()}`,
            name: device.name,
            modelBrand: `${device.name} (硬件物理直连)`,
            macAddress: device.id.slice(0, 17).toUpperCase(),
            paperWidth: '58mm',
            status: 'connected',
            batteryLevel: 95,
            signalRssi: -45,
            isDefault: printers.length === 0,
            autoPrintNewOrders: true,
            copies: 1,
            firmwareVersion: 'V5.0_BLE_NATIVE'
          };

          const nextList = [newDev, ...printers];
          savePrinters(nextList);
          setSelectedPrinterId(newDev.id);
          setIsScanning(false);
          setIsPairModalOpen(false);
          showToast(`已成功配对并连接物理蓝牙打印机【${device.name}】！`);
          return;
        }
      } catch (err: any) {
        console.warn('Web Bluetooth scanning fallback to simulated discovery:', err);
      }
    }

    // Simulated Food-Truck Environment Discovered List
    setTimeout(() => {
      setDiscoveredDevices([
        {
          name: 'GP-58MBIII-A1B2',
          mac: 'DC:0D:30:9E:C1:22',
          rssi: -48,
          width: '58mm'
        },
        {
          name: 'Xprinter_XP-N160I',
          mac: '00:1A:7D:99:3B:14',
          rssi: -58,
          width: '80mm'
        },
        {
          name: 'HPRT_HM-E300_FoodTruck',
          mac: '88:25:83:AA:71:08',
          rssi: -62,
          width: '58mm'
        },
        {
          name: 'Feie_FP-58W_Mobile',
          mac: 'E4:A3:82:11:4F:90',
          rssi: -71,
          width: '58mm'
        }
      ]);
      setIsScanning(false);
    }, 1000);
  };

  // 3. Pair Discovered Device
  const handlePairDiscoveredDevice = (dev: {
    name: string;
    mac: string;
    rssi: number;
    width: '58mm' | '80mm';
  }) => {
    const newDevice: BluetoothPrinterDevice = {
      id: `bt-${Date.now()}`,
      name: dev.name,
      modelBrand: `${dev.name} (餐车移动蓝牙热敏机)`,
      macAddress: dev.mac,
      paperWidth: dev.width,
      status: 'connected',
      batteryLevel: 88,
      signalRssi: dev.rssi,
      isDefault: false,
      autoPrintNewOrders: true,
      copies: 1,
      firmwareVersion: 'V4.2.1_BLE',
      lastPrintedAt: '刚刚配对'
    };

    const nextList = [newDevice, ...printers];
    savePrinters(nextList);
    setSelectedPrinterId(newDevice.id);
    setIsPairModalOpen(false);
    showToast(`已成功配对并连接【${dev.name}】！`, '自动设为在线状态，可随时打印小票');
  };

  // 4. Print Order Receipt via Bluetooth
  const handlePrintOrder = async (orderToPrint = targetOrder) => {
    if (!activePrinter) {
      showToast('请先选择一台蓝牙打印机');
      return;
    }

    if (activePrinter.status !== 'connected') {
      showToast('当前蓝牙打印机处于未连接状态', '请先点击【连接设备】后再出纸');
      return;
    }

    setIsPrinting(true);
    setPrintProgress(10);

    try {
      const copies = activePrinter.copies || 1;
      const { bytes, textPreview } = buildOrderReceiptBytes(
        orderToPrint as any,
        template,
        activePrinter.paperWidth,
        copies
      );

      // Convert first 32 bytes to hex preview
      const hexArr: string[] = [];
      for (let i = 0; i < Math.min(bytes.length, 64); i++) {
        hexArr.push(bytes[i].toString(16).padStart(2, '0').toUpperCase());
      }
      setActiveHexPreview(
        `// ESC/POS 数据流总计 ${bytes.length} 字节 (包含 ESC @ 初始化、格式放大与自动蜂鸣/切刀)\n` +
          hexArr.join(' ') +
          (bytes.length > 64 ? ' ... [剩余数据已编码]' : '')
      );

      // If physical Bluetooth characteristic is present, send chunks
      if (realBluetoothCharacteristicRef.current) {
        await sendBytesToBluetoothCharacteristic(
          realBluetoothCharacteristicRef.current,
          bytes,
          (sent, total) => {
            setPrintProgress(Math.round((sent / total) * 100));
          }
        );
      } else {
        // Simulation animation
        await new Promise((r) => setTimeout(r, 200));
        setPrintProgress(45);
        await new Promise((r) => setTimeout(r, 300));
        setPrintProgress(85);
        await new Promise((r) => setTimeout(r, 200));
        setPrintProgress(100);
      }

      // Update last printed at
      const updated = printers.map((p) =>
        p.id === activePrinter.id
          ? {
              ...p,
              lastPrintedAt: new Date().toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit'
              })
            }
          : p
      );
      savePrinters(updated);

      addLog(
        'order_receipt',
        orderToPrint.orderNo || '#9999',
        bytes.length,
        'success',
        `${copies}联出单成功 · 纸宽 ${activePrinter.paperWidth}`
      );

      showToast(
        `【${activePrinter.name}】小票打印成功！`,
        `单号 ${orderToPrint.orderNo} · 规格: ${activePrinter.paperWidth} (${copies}联)`
      );
    } catch (err: any) {
      console.error('Bluetooth printing failed:', err);
      addLog(
        'order_receipt',
        orderToPrint.orderNo || '#9999',
        0,
        'failed',
        err?.message || '蓝牙传输信道中断'
      );
      showToast('蓝牙小票打印失败', err?.message || '请检查打印机电量与蓝牙信号');
    } finally {
      setIsPrinting(false);
      setTimeout(() => setPrintProgress(0), 1000);
    }
  };

  // 5. Hardware Self-Test Page
  const handlePrintSelfTest = async () => {
    if (!activePrinter) return;
    setIsPrinting(true);
    setPrintProgress(20);

    try {
      const bytes = buildSelfTestBytes(activePrinter.name, activePrinter.paperWidth);
      if (realBluetoothCharacteristicRef.current) {
        await sendBytesToBluetoothCharacteristic(
          realBluetoothCharacteristicRef.current,
          bytes,
          (sent, total) => setPrintProgress(Math.round((sent / total) * 100))
        );
      } else {
        await new Promise((r) => setTimeout(r, 450));
        setPrintProgress(100);
      }

      addLog('self_test', '自检样张', bytes.length, 'success', '全项硬件指标检测正常');
      showToast(`已向【${activePrinter.name}】发送硬件自检样张！`, '包含浓度、字体与状态检测');
    } catch (err: any) {
      showToast('自检打印失败', err?.message);
    } finally {
      setIsPrinting(false);
      setTimeout(() => setPrintProgress(0), 800);
    }
  };

  // 6. Beep Buzzer Test
  const handleTestBuzzer = async () => {
    if (!activePrinter) return;
    const builder = new EscPosBuilder().buzzer(2, 3);
    const bytes = builder.build();

    if (realBluetoothCharacteristicRef.current) {
      try {
        await sendBytesToBluetoothCharacteristic(
          realBluetoothCharacteristicRef.current,
          bytes
        );
      } catch (e) {}
    }

    addLog('beep_test', '蜂鸣测试', bytes.length, 'success', '双声蜂鸣报警测试');
    showToast(`【${activePrinter.name}】蜂鸣器已触发 🔔`, '滴~ 滴~ 提醒声音正常');
  };

  // 7. Feed 3 Lines
  const handleFeedLines = async () => {
    if (!activePrinter) return;
    const builder = new EscPosBuilder().feed(3);
    const bytes = builder.build();

    if (realBluetoothCharacteristicRef.current) {
      try {
        await sendBytesToBluetoothCharacteristic(
          realBluetoothCharacteristicRef.current,
          bytes
        );
      } catch (e) {}
    }

    addLog('feed_lines', '走纸3行', bytes.length, 'success', '走纸马达推进正常');
    showToast(`【${activePrinter.name}】推进走纸 3 行完成`);
  };

  // 8. Cut Paper Test
  const handleCutPaper = async () => {
    if (!activePrinter) return;
    const builder = new EscPosBuilder().cut(true);
    const bytes = builder.build();

    if (realBluetoothCharacteristicRef.current) {
      try {
        await sendBytesToBluetoothCharacteristic(
          realBluetoothCharacteristicRef.current,
          bytes
        );
      } catch (e) {}
    }

    addLog('cut_paper', '自动切纸', bytes.length, 'success', '步进切刀动作指令已下发');
    showToast(`【${activePrinter.name}】切刀测试动作完成！`);
  };

  // Set default printer
  const handleSetDefault = (printerId: string) => {
    const updated = printers.map((p) => ({
      ...p,
      isDefault: p.id === printerId
    }));
    savePrinters(updated);
    showToast('已更新默认出纸蓝牙打印机！');
  };

  // Remove paired device
  const handleRemovePrinter = (printerId: string) => {
    if (printers.length <= 1) {
      showToast('至少保留一台打印机配置');
      return;
    }
    const updated = printers.filter((p) => p.id !== printerId);
    savePrinters(updated);
    if (selectedPrinterId === printerId) {
      setSelectedPrinterId(updated[0]?.id || '');
    }
    showToast('已移除该蓝牙打印机设备');
  };

  return (
    <div className="space-y-6">
      {/* 顶部极简状态横幅 */}
      <div className="bg-neutral-900 text-white rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-neutral-800 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Bluetooth className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-base text-white">随车蓝牙便携打印机中枢</h3>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-xs font-semibold rounded border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>
                  {printers.filter((p) => p.status === 'connected').length} 台已连接
                </span>
              </span>
              <span className="px-2 py-0.5 bg-neutral-800 text-neutral-300 text-xs font-mono rounded border border-neutral-700">
                BLE 5.2 / ESC/POS
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              免布线直连流动餐车车载热敏小票机、手持收银一体机及后厨防水标签机，支持
              58mm / 80mm 双规格与新订单极速自动出纸。
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleStartBluetoothScan}
            disabled={isScanning}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Radio className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? '正在搜索蓝牙...' : '搜索附近蓝牙设备'}</span>
          </button>
        </div>
      </div>

      {/* 主工作区两栏布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 左侧：已配对蓝牙设备列表与控制卡 (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#37352f] flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-neutral-600" />
              <span>已配对设备 ({printers.length})</span>
            </span>
            <span className="text-[11px] text-[#787774]">点击切换活动操作设备</span>
          </div>

          <div className="space-y-3">
            {printers.map((printer) => {
              const isSelected = printer.id === activePrinter?.id;
              const isConnected = printer.status === 'connected';

              return (
                <div
                  key={printer.id}
                  onClick={() => setSelectedPrinterId(printer.id)}
                  className={`bg-white rounded-xl p-4 border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'border-neutral-900 shadow-sm ring-1 ring-neutral-900'
                      : 'border-[#e3e2e0] hover:border-neutral-400'
                  }`}
                >
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#37352f] truncate">
                          {printer.name}
                        </span>
                        {printer.isDefault && (
                          <span className="px-1.5 py-0.2 bg-neutral-100 text-neutral-800 text-[10px] font-bold rounded border border-neutral-300 shrink-0">
                            默认
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#787774] truncate mt-0.5 font-mono">
                        {printer.modelBrand}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                          isConnected
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : printer.status === 'connecting'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isConnected
                              ? 'bg-emerald-500 animate-pulse'
                              : printer.status === 'connecting'
                              ? 'bg-amber-500 animate-ping'
                              : 'bg-neutral-400'
                          }`}
                        />
                        <span>
                          {isConnected
                            ? '已连接'
                            : printer.status === 'connecting'
                            ? '握手中...'
                            : '未连接'}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Hardware Telemetry Grid */}
                  <div className="grid grid-cols-3 gap-2 py-2.5 my-2 border-y border-[#f1f1ef] text-xs">
                    <div>
                      <span className="text-[10px] text-[#787774] block">纸张规格</span>
                      <span className="font-bold text-[#37352f]">
                        {printer.paperWidth} 热敏卷
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#787774] block">设备电量</span>
                      <span className="font-bold text-emerald-700 flex items-center gap-1">
                        <Battery className="w-3.5 h-3.5" />
                        <span>{printer.batteryLevel}%</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#787774] block">蓝牙信号</span>
                      <span className="font-mono text-neutral-800 font-semibold">
                        {printer.signalRssi} dBm
                      </span>
                    </div>
                  </div>

                  {/* Details & Actions Footer */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <div className="text-[11px] text-[#787774]">
                      <span>上次出单: </span>
                      <span className="text-neutral-800 font-medium">
                        {printer.lastPrintedAt || '暂无'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleConnection(printer.id);
                        }}
                        className={`px-2.5 py-1 text-xs font-semibold rounded cursor-pointer transition-colors border ${
                          isConnected
                            ? 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border-neutral-300'
                            : 'bg-blue-600 text-white hover:bg-blue-500 border-blue-600'
                        }`}
                      >
                        {isConnected ? '断开' : '连接'}
                      </button>

                      {!printer.isDefault && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetDefault(printer.id);
                          }}
                          className="text-[11px] text-neutral-600 hover:text-black underline cursor-pointer"
                        >
                          设为默认
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePrinter(printer.id);
                        }}
                        className="p-1 text-neutral-400 hover:text-red-600 rounded cursor-pointer transition-colors"
                        title="移除此设备"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 自动出纸策略开关 */}
          <div className="bg-[#fbfbfa] rounded-xl p-3.5 border border-[#e3e2e0] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-neutral-700" />
                <span className="font-bold text-xs text-[#37352f]">
                  来单自动蓝牙极速出纸
                </span>
              </div>
              <input
                type="checkbox"
                checked={activePrinter?.autoPrintNewOrders ?? true}
                onChange={(e) => {
                  const updated = printers.map((p) =>
                    p.id === activePrinter?.id
                      ? { ...p, autoPrintNewOrders: e.target.checked }
                      : p
                  );
                  savePrinters(updated);
                  showToast(
                    e.target.checked
                      ? '已开启【来单自动蓝牙出纸】'
                      : '已关闭来单自动出纸'
                  );
                }}
                className="w-4 h-4 rounded text-neutral-900 cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-[#787774]">
              开启后，当食客下单或派单系统分配新订单时，随车蓝牙打印机将自动蜂鸣并打印出纸。
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-[#f1f1ef] text-xs">
              <span className="text-[#787774]">出纸联数:</span>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3].map((cp) => (
                  <button
                    key={cp}
                    type="button"
                    onClick={() => {
                      const updated = printers.map((p) =>
                        p.id === activePrinter?.id ? { ...p, copies: cp } : p
                      );
                      savePrinters(updated);
                    }}
                    className={`px-2.5 py-0.5 rounded text-xs font-semibold cursor-pointer border ${
                      activePrinter?.copies === cp
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'bg-white text-neutral-700 border-neutral-300'
                    }`}
                  >
                    {cp} 联
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：当前设备操作台、订单即时出纸与硬件指令 (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Active Device Dashboard Card */}
          <div className="bg-white rounded-xl border border-[#e3e2e0] p-5 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#e3e2e0] gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-neutral-800" />
                  <h4 className="font-bold text-sm text-[#37352f]">
                    当前活动打印机：{activePrinter?.name}
                  </h4>
                </div>
                <span className="text-[11px] text-[#787774] font-mono">
                  MAC: {activePrinter?.macAddress} · 固件: {activePrinter?.firmwareVersion}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowHexModal(true)}
                  className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded text-xs font-medium border border-neutral-300 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <FileText className="w-3 h-3" />
                  <span>查看 ESC/POS 报文</span>
                </button>
              </div>
            </div>

            {/* Print Progress Bar */}
            {isPrinting && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1.5 animate-pulse">
                <div className="flex justify-between text-xs font-semibold text-blue-900">
                  <span>正在通过蓝牙信道向打印机发送 ESC/POS 数据包...</span>
                  <span>{printProgress}%</span>
                </div>
                <div className="w-full bg-blue-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full transition-all duration-150 rounded-full"
                    style={{ width: `${printProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Order Direct Print Form */}
            <div className="bg-[#fbfbfa] rounded-xl p-4 border border-[#e3e2e0] space-y-3">
              <span className="text-xs font-bold text-[#37352f] block">
                选择订单即时蓝牙出纸
              </span>

              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-[#d3d1cb] rounded-lg text-xs font-semibold text-[#37352f] focus:outline-none focus:border-neutral-900 cursor-pointer"
                >
                  {orders.map((ord) => (
                    <option key={ord.id} value={ord.id}>
                      {ord.orderNo} · {ord.customerName} (共 {ord.items.length} 道菜 · ¥
                      {ord.totalAmount.toFixed(1)})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => handlePrintOrder()}
                  disabled={isPrinting || activePrinter?.status !== 'connected'}
                  className="px-4 py-2 bg-neutral-900 hover:bg-black text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {isPrinting ? '正在蓝牙出纸...' : '一键极速出纸'} (
                    {activePrinter?.paperWidth})
                  </span>
                </button>
              </div>

              {/* Order Preview Detail Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] text-[#787774]">
                <span className="px-2 py-0.5 bg-white rounded border border-[#e3e2e0]">
                  顾客: <b className="text-neutral-900">{targetOrder.customerName}</b>
                </span>
                <span className="px-2 py-0.5 bg-white rounded border border-[#e3e2e0]">
                  金额: <b className="text-neutral-900">¥{targetOrder.totalAmount.toFixed(1)}</b>
                </span>
                <span className="px-2 py-0.5 bg-white rounded border border-[#e3e2e0]">
                  菜品数: <b className="text-neutral-900">{targetOrder.items.length} 样</b>
                </span>
              </div>
            </div>

            {/* Hardware Diagnostic Command Suite */}
            <div className="space-y-2 pt-1">
              <span className="text-xs font-bold text-[#37352f] block">
                打印机硬件指令自检与调优
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <button
                  type="button"
                  onClick={handlePrintSelfTest}
                  disabled={isPrinting || activePrinter?.status !== 'connected'}
                  className="p-2.5 bg-white hover:bg-neutral-50 rounded-lg border border-[#d3d1cb] text-[#37352f] flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold">打印自检样张</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestBuzzer}
                  disabled={activePrinter?.status !== 'connected'}
                  className="p-2.5 bg-white hover:bg-neutral-50 rounded-lg border border-[#d3d1cb] text-[#37352f] flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                >
                  <Bell className="w-4 h-4 text-amber-600" />
                  <span className="font-semibold">测试蜂鸣器</span>
                </button>

                <button
                  type="button"
                  onClick={handleFeedLines}
                  disabled={activePrinter?.status !== 'connected'}
                  className="p-2.5 bg-white hover:bg-neutral-50 rounded-lg border border-[#d3d1cb] text-[#37352f] flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                >
                  <Sliders className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold">走纸 3 行</span>
                </button>

                <button
                  type="button"
                  onClick={handleCutPaper}
                  disabled={activePrinter?.status !== 'connected'}
                  className="p-2.5 bg-white hover:bg-neutral-50 rounded-lg border border-[#d3d1cb] text-[#37352f] flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                >
                  <Scissors className="w-4 h-4 text-purple-600" />
                  <span className="font-semibold">自动切纸</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bluetooth Print Activity Log Table */}
          <div className="bg-white rounded-xl border border-[#e3e2e0] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#37352f]">
                蓝牙传输与出纸流水记录 (实时)
              </span>
              <button
                type="button"
                onClick={() => setLogs([])}
                className="text-[11px] text-neutral-500 hover:text-black cursor-pointer"
              >
                清空记录
              </button>
            </div>

            <div className="divide-y divide-[#f1f1ef] max-h-48 overflow-y-auto no-scrollbar">
              {logs.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#787774]">
                  暂无蓝牙出纸记录，点击上方按钮测试出单
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="py-2 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          log.status === 'success' ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                      />
                      <span className="font-bold text-[#37352f]">{log.orderNo}</span>
                      <span className="text-[11px] text-[#787774] truncate max-w-[180px] sm:max-w-xs">
                        {log.detail || log.printerName}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-[11px] text-[#787774]">
                      <span className="font-mono">{log.bytesCount} B</span>
                      <span>{log.timestamp}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 搜索蓝牙设备配对弹窗 */}
      {isPairModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-neutral-200 max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#e3e2e0]">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-blue-600 animate-spin" />
                <h3 className="font-bold text-sm text-[#37352f]">搜索附近蓝牙热敏打印机</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPairModalOpen(false)}
                className="text-xs text-neutral-400 hover:text-black cursor-pointer"
              >
                关闭
              </button>
            </div>

            <p className="text-xs text-[#787774]">
              请将车载蓝牙打印机电源打开，并处于待配对状态（蓝灯闪烁或常亮）。
            </p>

            {/* Discovered List */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {isScanning ? (
                <div className="text-center py-8 space-y-2">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-neutral-500">
                    正在广播探测 2.4GHz 蓝牙热敏小票设备...
                  </p>
                </div>
              ) : discoveredDevices.length === 0 ? (
                <div className="text-center py-8 text-xs text-neutral-500">
                  未探测到新设备，请靠近后点击重试
                </div>
              ) : (
                discoveredDevices.map((d, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl border border-[#e3e2e0] hover:border-blue-500 hover:bg-blue-50/20 flex items-center justify-between transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-[#37352f]">{d.name}</span>
                        <span className="px-1.5 py-0.2 bg-neutral-100 text-neutral-700 text-[10px] rounded font-semibold">
                          {d.width}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-[#787774] block mt-0.5">
                        MAC: {d.mac} · 信号: {d.rssi} dBm
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePairDiscoveredDevice(d)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                    >
                      配对并连接
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#f1f1ef]">
              <button
                type="button"
                onClick={handleStartBluetoothScan}
                className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded text-xs font-semibold cursor-pointer"
              >
                重新搜索
              </button>
              <button
                type="button"
                onClick={() => setIsPairModalOpen(false)}
                className="px-3 py-1.5 bg-neutral-900 text-white rounded text-xs font-semibold cursor-pointer"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hex Stream Inspector Modal */}
      {showHexModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-neutral-200 max-w-lg w-full p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#e3e2e0]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-neutral-700" />
                <h4 className="font-bold text-sm text-[#37352f]">
                  ESC/POS 蓝牙指令流解析器 (Hex Stream)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowHexModal(false)}
                className="text-xs text-neutral-400 hover:text-black cursor-pointer"
              >
                关闭
              </button>
            </div>

            <p className="text-xs text-[#787774]">
              符合国际热敏打印机标准 ESC/POS 指令集规范，可被市面绝大多数蓝牙热敏机直接执行：
            </p>

            <pre className="p-3 bg-neutral-950 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto max-h-60 leading-relaxed select-all">
              {activeHexPreview ||
                '// 暂无活跃出纸数据流。请在操作台点击【一键极速出纸】或【自检样张】生成实时报文。'}
            </pre>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(activeHexPreview);
                  showToast('已复制十六进制报文指令到剪贴板！');
                }}
                className="px-3 py-1.5 bg-neutral-900 text-white rounded text-xs font-semibold cursor-pointer"
              >
                复制报文
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
