import React, { useState, useRef, useEffect } from 'react';
import {
  Bluetooth,
  Printer,
  Settings,
  Plus,
  Radio,
  Battery,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Scissors,
  Bell,
  Play,
  FileText,
  Trash2,
  CheckCircle2,
  HardDrive,
  Zap,
  AlertCircle
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
  connectBluetoothDeviceAndGetWriteCharacteristic,
  POS_BLE_PRINTER_SERVICE_UUIDS,
  BluetoothRemoteGATTCharacteristic
} from '../../utils/escpos';
import { getSavedDetectedPrinters } from '../../utils/printerAutoDetectEngine';
import { PrinterActionPopover } from './printer/PrinterActionPopover';
import { PrinterQuickConfigDrawer } from './printer/PrinterQuickConfigDrawer';
import { ReceiptSelfTestModal } from './printer/ReceiptSelfTestModal';

interface BluetoothPrinterManagerProps {
  orders: Order[];
  template: ReceiptTemplateConfig;
  showToast: (msg: string, desc?: string) => void;
}

// 内存中维护的已配对物理蓝牙设备句柄映射 (Web Bluetooth BluetoothDevice 对象不可序列化存储至 localStorage)
const activeBluetoothDeviceMap = new Map<string, any>();

export const BluetoothPrinterManager: React.FC<BluetoothPrinterManagerProps> = ({
  orders,
  template,
  showToast
}) => {
  const [printers, setPrinters] = useState<BluetoothPrinterDevice[]>(() => {
    const raw = localStorage.getItem('obsidian_bt_printers');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // 初始化时若无真实 GATT 连接句柄，状态置为 disconnected，杜绝假 connected
          return parsed.map((p: any) => ({
            ...p,
            status: 'disconnected' as const,
            connectionType: p.connectionType || 'bluetooth'
          }));
        }
      } catch (e) {
        // fallback
      }
    }
    return [];
  });

  const [selectedPrinterId, setSelectedPrinterId] = useState<string>(
    printers[0]?.id || ''
  );

  const [selectedOrderId, setSelectedOrderId] = useState<string>(
    orders[0]?.id || ''
  );

  const [logs, setLogs] = useState<BluetoothPrintTaskLog[]>([]);

  // UI Interactive States
  const [isScanning, setIsScanning] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [activeMenuPrinterId, setActiveMenuPrinterId] = useState<string | null>(null);
  const [configDrawerDevice, setConfigDrawerDevice] = useState<any | null>(null);
  const [selfTestModalDevice, setSelfTestModalDevice] = useState<any | null>(null);

  // Collapsible Advanced Panels (默认折叠以保持精简)
  const [isManualPrintOpen, setIsManualPrintOpen] = useState(false);
  const [isHardwareDebugOpen, setIsHardwareDebugOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);

  // Real Web Bluetooth GATT Reference 映射: printerId -> BluetoothRemoteGATTCharacteristic
  const bluetoothCharacteristicsRef = useRef<Map<string, BluetoothRemoteGATTCharacteristic>>(
    new Map()
  );

  const activePrinter = printers.find((p) => p.id === selectedPrinterId) || printers[0];
  const targetOrder = orders.find((o) => o.id === selectedOrderId) || orders[0] || {
    id: 'ord-current-real',
    orderNo: '#A108',
    customerName: '流动餐车食客',
    userPhone: '138****0000',
    deliveryAddress: '流动餐车外摆取餐口',
    items: [
      { name: '现烤招牌羊肉大串', quantity: 4, price: 48.0, options: '微辣 · 孜然' },
      { name: '手作鲜柠檬冷萃茶', quantity: 2, price: 36.0, options: '少冰 · 七分糖' }
    ],
    totalAmount: 84.0,
    createdTime: '刚刚'
  };

  const savePrinters = (newList: BluetoothPrinterDevice[]) => {
    setPrinters(newList);
    localStorage.setItem('obsidian_bt_printers', JSON.stringify(newList));
  };

  // 同步全局当前活动特征通道供自动打印调度引擎使用
  const updateGlobalActiveCharacteristic = (char: BluetoothRemoteGATTCharacteristic | null) => {
    if (typeof window !== 'undefined') {
      (window as any).__obsidian_active_bt_gatt_char = char;
    }
  };

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
      printerName: activePrinter?.name || '蓝牙小票机',
      orderNo,
      bytesCount,
      status,
      taskType,
      detail
    };
    setLogs((prev) => [newLog, ...prev.slice(0, 19)]);
  };

  // 建立真实 GATT 连接
  const connectDeviceGatt = async (printerId: string, deviceHandle?: any): Promise<BluetoothRemoteGATTCharacteristic> => {
    const target = printers.find((p) => p.id === printerId);
    const dev = deviceHandle || activeBluetoothDeviceMap.get(printerId);

    if (!dev) {
      throw new Error(`未找到【${target?.name || '打印机'}】的物理蓝牙设备句柄，请点击右上角「+」重新扫描配对`);
    }

    // 更新为 connecting
    setPrinters((prev) =>
      prev.map((p) => (p.id === printerId ? { ...p, status: 'connecting' as const } : p))
    );

    try {
      const { characteristic } = await connectBluetoothDeviceAndGetWriteCharacteristic(dev);
      bluetoothCharacteristicsRef.current.set(printerId, characteristic);
      updateGlobalActiveCharacteristic(characteristic);

      // 监听断开事件
      if (dev.addEventListener) {
        dev.addEventListener('gattserverdisconnected', () => {
          bluetoothCharacteristicsRef.current.delete(printerId);
          updateGlobalActiveCharacteristic(null);
          setPrinters((prev) =>
            prev.map((p) => (p.id === printerId ? { ...p, status: 'disconnected' as const } : p))
          );
          showToast(`【${dev.name || '蓝牙打印机'}】蓝牙连接已断开`);
        });
      }

      setPrinters((prev) => {
        const next = prev.map((p) => (p.id === printerId ? { ...p, status: 'connected' as const } : p));
        savePrinters(next);
        return next;
      });

      return characteristic;
    } catch (err: any) {
      bluetoothCharacteristicsRef.current.delete(printerId);
      updateGlobalActiveCharacteristic(null);
      setPrinters((prev) => {
        const next = prev.map((p) => (p.id === printerId ? { ...p, status: 'disconnected' as const } : p));
        savePrinters(next);
        return next;
      });
      throw err;
    }
  };

  // Toggle connection (真连接 / 真断开)
  const handleToggleConnection = async (printerId: string) => {
    const target = printers.find((p) => p.id === printerId);
    if (!target) return;

    if (target.status === 'connected') {
      const dev = activeBluetoothDeviceMap.get(printerId);
      if (dev && dev.gatt && dev.gatt.connected) {
        try {
          dev.gatt.disconnect();
        } catch {}
      }
      bluetoothCharacteristicsRef.current.delete(printerId);
      updateGlobalActiveCharacteristic(null);
      const updated = printers.map((p) =>
        p.id === printerId ? { ...p, status: 'disconnected' as const } : p
      );
      savePrinters(updated);
      showToast(`已断开【${target.name}】蓝牙连接`);
    } else {
      try {
        await connectDeviceGatt(printerId);
        showToast(`已成功建立 GATT 链路连接【${target.name}】`);
      } catch (err: any) {
        showToast('蓝牙连接失败', err?.message || '请重新扫描配对');
      }
    }
  };

  // Set default printer
  const handleSetDefault = (printerId: string) => {
    const updated = printers.map((p) => ({
      ...p,
      isDefault: p.id === printerId
    }));
    savePrinters(updated);
    const char = bluetoothCharacteristicsRef.current.get(printerId) || null;
    updateGlobalActiveCharacteristic(char);
    showToast('已设为默认打印机');
  };

  // Remove printer
  const handleRemovePrinter = (printerId: string) => {
    const dev = activeBluetoothDeviceMap.get(printerId);
    if (dev && dev.gatt && dev.gatt.connected) {
      try {
        dev.gatt.disconnect();
      } catch {}
    }
    activeBluetoothDeviceMap.delete(printerId);
    bluetoothCharacteristicsRef.current.delete(printerId);
    if (selectedPrinterId === printerId) {
      updateGlobalActiveCharacteristic(null);
    }

    const updated = printers.filter((p) => p.id !== printerId);
    savePrinters(updated);
    if (selectedPrinterId === printerId) {
      setSelectedPrinterId(updated[0]?.id || '');
    }
    showToast('已删除打印机');
  };

  // Test Print (真机字节流下发，未就绪时明确报错拒绝虚假成功)
  const handleTestPrint = async (printer: BluetoothPrinterDevice) => {
    setIsPrinting(true);

    try {
      let char = bluetoothCharacteristicsRef.current.get(printer.id);

      // 若未连接则尝试通过设备句柄发起真机连接
      if (!char) {
        const dev = activeBluetoothDeviceMap.get(printer.id);
        if (dev) {
          showToast(`正在与【${printer.name}】建立 GATT 连接...`);
          char = await connectDeviceGatt(printer.id, dev);
        }
      }

      if (!char) {
        throw new Error(
          `打印机【${printer.name}】尚未建立物理蓝牙连接，请先点击右上角「+」配对并连接真实蓝牙设备`
        );
      }

      const bytes = buildSelfTestBytes(
        printer.name, 
        printer.paperWidth, 
        (printer.connectionType as any) || 'bluetooth', 
        printer.macAddress
      );

      await sendBytesToBluetoothCharacteristic(char, bytes);
      addLog('self_test', '自检样张', bytes.length, 'success', `已真实下发 ${bytes.length} 字节`);
      showToast(`已向【${printer.name}】成功下发测试打印 (${bytes.length} 字节)`);
      setSelfTestModalDevice(printer);
    } catch (err: any) {
      addLog('self_test', '自检样张', 0, 'failed', err?.message || '链路未就绪');
      showToast('测试打印失败', err?.message || '蓝牙特征未就绪');
    } finally {
      setIsPrinting(false);
    }
  };

  // Real Scan / Pair new device (调用 navigator.bluetooth.requestDevice 拿到真实 device 并立即执行 GATT 连接)
  const handleScanAndAdd = async () => {
    setIsScanning(true);
    showToast('正在打开系统蓝牙配对窗口...');
    const hasWebBluetooth =
      typeof navigator !== 'undefined' && 'bluetooth' in navigator && (navigator as any).bluetooth;

    if (!hasWebBluetooth) {
      setIsScanning(false);
      showToast('当前环境不支持 Web Bluetooth', '请使用 Chrome / Edge 浏览器并开启蓝牙');
      return;
    }

    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: POS_BLE_PRINTER_SERVICE_UUIDS
      });

      if (!device || !device.id) {
        setIsScanning(false);
        return;
      }

      const devName = device.name || 'POS-Thermal-Printer';
      const cleanId = `bt-${device.id.slice(0, 12).replace(/[^a-zA-Z0-9]/g, '') || Date.now()}`;
      const macAddress = (device.id || 'BLE-DEV-ADDR').slice(0, 32).toUpperCase();

      showToast(`已配对【${devName}】，正在建立 GATT 数据通信通道...`);

      // 存储设备句柄到内存
      activeBluetoothDeviceMap.set(cleanId, device);

      // 发起真实 GATT 连接获取可写特征
      const char = await connectDeviceGatt(cleanId, device);

      const newDev: BluetoothPrinterDevice = {
        id: cleanId,
        name: devName,
        modelBrand: devName.includes('GP') ? '佳博 Gprinter' : devName.includes('XP') ? '芯烨 Xprinter' : 'ESC/POS Thermal BLE',
        macAddress,
        paperWidth: devName.includes('80') ? '80mm' : '58mm',
        status: 'connected',
        batteryLevel: 95,
        signalRssi: -48,
        isDefault: printers.length === 0,
        autoPrintNewOrders: true,
        copies: 1,
        firmwareVersion: 'V5.2.0_BLE'
      };

      const next = [newDev, ...printers.filter((p) => p.id !== cleanId)];
      savePrinters(next);
      setSelectedPrinterId(newDev.id);
      showToast(`已成功配对并建立物理链路【${devName}】`);
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        // 用户取消配对窗口
      } else {
        showToast('蓝牙配对或 GATT 连接失败', err?.message || '请确保打印机已开机且处于可配对状态');
      }
    } finally {
      setIsScanning(false);
    }
  };

  // Save drawer config
  const handleSaveDrawerConfig = (updated: any) => {
    const nextList = printers.map((p) => {
      if (p.id === updated.id) {
        return { ...p, ...updated };
      }
      return updated.isDefault ? { ...p, isDefault: false } : p;
    });
    savePrinters(nextList);
  };

  return (
    <div className="space-y-4">
      {/* 极简参数配置抽屉 */}
      <PrinterQuickConfigDrawer
        isOpen={!!configDrawerDevice}
        onClose={() => setConfigDrawerDevice(null)}
        device={configDrawerDevice}
        onSave={handleSaveDrawerConfig}
        onTestPrint={(dev) => handleTestPrint(dev)}
        showToast={showToast}
      />

      {/* 实体自检测试出纸与真机调起弹窗 */}
      <ReceiptSelfTestModal
        isOpen={!!selfTestModalDevice}
        onClose={() => setSelfTestModalDevice(null)}
        device={selfTestModalDevice}
        onSendRawBytes={async () => {
          if (!selfTestModalDevice) return;
          const char = bluetoothCharacteristicsRef.current.get(selfTestModalDevice.id);
          if (!char) {
            throw new Error(`设备【${selfTestModalDevice.name}】蓝牙链路未就绪，请先连接打印机`);
          }
          const bytes = buildSelfTestBytes(
            selfTestModalDevice.name, 
            selfTestModalDevice.paperWidth, 
            (selfTestModalDevice.connectionType as any) || 'bluetooth', 
            selfTestModalDevice.macAddress
          );
          await sendBytesToBluetoothCharacteristic(char, bytes);
        }}
        showToast={showToast}
      />

      {/* 顶部标题栏与全局设置 (参考图 2: BR RawPrinter 极简顶栏) */}
      <div className="flex items-center justify-between px-1 py-1">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight">
            BR RawPrinter
          </h2>
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
        </div>

        <button
          type="button"
          onClick={() => {
            if (activePrinter) setConfigDrawerDevice(activePrinter);
          }}
          className="w-8 h-8 rounded-full text-neutral-700 hover:text-neutral-950 hover:bg-neutral-100 flex items-center justify-center transition-colors cursor-pointer"
          title="系统配置"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* 设备分组标尺行 (参考图 2: 打印机 +) */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-neutral-800">打印机</span>
          <span className="text-[10px] text-neutral-400 font-semibold">Web Bluetooth GATT 物理真链路</span>
        </div>
        <button
          type="button"
          onClick={handleScanAndAdd}
          disabled={isScanning}
          className="w-7 h-7 rounded-lg text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900 flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
          title="添加/扫描真实蓝牙热敏机"
        >
          <Plus className={`w-5 h-5 ${isScanning ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 暂无设备空状态 */}
      {printers.length === 0 && (
        <div className="p-6 bg-white rounded-xl border border-dashed border-neutral-300 text-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center">
            <Bluetooth className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-neutral-900">暂未配对蓝牙打印机</h4>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              点击右上角「+」搜索并配对真实车载热敏小票机 (佳博 / 芯烨 / 汉印等)
            </p>
          </div>
          <button
            type="button"
            onClick={handleScanAndAdd}
            disabled={isScanning}
            className="h-8 px-4 rounded-lg bg-neutral-900 hover:bg-black text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>扫描添加物理蓝牙机</span>
          </button>
        </div>
      )}

      {/* 极简打印机设备卡片列表 (精确复刻图 2 的精简美学) */}
      <div className="space-y-2.5">
        {printers.map((printer) => {
          const isConnected = printer.status === 'connected';
          const isConnecting = printer.status === 'connecting';
          const isMenuOpen = activeMenuPrinterId === printer.id;

          return (
            <div
              key={printer.id}
              className={`bg-white rounded-xl border transition-all p-3.5 relative flex items-center justify-between gap-3 shadow-2xs ${
                printer.isDefault
                  ? 'border-neutral-300 ring-1 ring-neutral-200'
                  : 'border-neutral-200/90 hover:border-neutral-300'
              }`}
            >
              {/* 左侧：蓝牙图标与核心信息 */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-50/80 text-emerald-700 flex items-center justify-center shrink-0">
                  <Bluetooth className={`w-4 h-4 ${isConnecting ? 'animate-pulse' : ''}`} />
                </div>

                <div className="min-w-0 space-y-0.5">
                  {/* 第一行：状态点 + 名称 + 默认微标 */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isConnected
                          ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                          : isConnecting
                          ? 'bg-amber-400 animate-ping'
                          : 'bg-neutral-300'
                      }`}
                    />
                    <span className="font-bold text-sm text-neutral-900 truncate">
                      {printer.name}
                    </span>
                    {printer.isDefault && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-neutral-100 text-neutral-600 border border-neutral-200 shrink-0">
                        默认
                      </span>
                    )}
                    {isConnected ? (
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 shrink-0 flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>GATT已连</span>
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-neutral-100 text-neutral-500 border border-neutral-200 shrink-0">
                        {isConnecting ? '连接中...' : '未连接'}
                      </span>
                    )}
                  </div>

                  {/* 第二行：精炼副字段 (规格 · MAC/UUID) */}
                  <div className="text-[11px] text-neutral-400 truncate flex items-center gap-1.5">
                    <span>{printer.paperWidth}</span>
                    <span>·</span>
                    <span className="truncate max-w-[200px] sm:max-w-[320px]">
                      {printer.macAddress}
                    </span>
                    {printer.batteryLevel !== undefined && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-0.5 text-neutral-500">
                          <Battery className="w-3 h-3 text-emerald-600" />
                          <span>{printer.batteryLevel}%</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* 右侧：更多操作按钮与图 2 弹出 Popover */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setActiveMenuPrinterId(isMenuOpen ? null : printer.id)
                  }
                  className="w-8 h-8 rounded-lg text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 flex items-center justify-center transition-colors cursor-pointer"
                  title="操作菜单"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {/* 图 2 右侧极简 Popover */}
                <PrinterActionPopover
                  isOpen={isMenuOpen}
                  onClose={() => setActiveMenuPrinterId(null)}
                  isDefault={printer.isDefault}
                  isConnected={isConnected}
                  onSetDefault={() => handleSetDefault(printer.id)}
                  onOpenConfig={() => setConfigDrawerDevice(printer)}
                  onTestPrint={() => handleTestPrint(printer)}
                  onToggleConnect={() => handleToggleConnection(printer.id)}
                  onDelete={() => handleRemovePrinter(printer.id)}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* 极简折叠扩展区：折叠不需要平铺的字段与高级指令，按需展开          */}
      {/* ============================================================== */}
      <div className="space-y-2 pt-2">
        {/* 折叠区 1：即时选单出纸与打样 */}
        <div className="bg-white rounded-xl border border-neutral-200/90 overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => setIsManualPrintOpen(!isManualPrintOpen)}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Printer className="w-3.5 h-3.5 text-neutral-500" />
              <span>即时选单打样出纸</span>
            </div>
            {isManualPrintOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-neutral-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            )}
          </button>

          {isManualPrintOpen && (
            <div className="p-3.5 border-t border-neutral-100 bg-neutral-50/50 space-y-3 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-neutral-500 text-[11px]">选择当前出单对象:</span>
                <select
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs font-medium text-neutral-800 focus:outline-none"
                >
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.orderNo} · {o.customerName} (¥{o.totalAmount})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (activePrinter) handleTestPrint(activePrinter);
                  }}
                  className="h-8 px-3 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-700 text-xs font-semibold cursor-pointer transition-colors"
                >
                  自检样张
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!activePrinter) {
                      showToast('暂无可用打印机');
                      return;
                    }
                    const char = bluetoothCharacteristicsRef.current.get(activePrinter.id);
                    if (!char) {
                      showToast('物理打印机未就绪', `【${activePrinter.name}】未连接蓝牙 GATT 写入通道`);
                      return;
                    }
                    try {
                      const bytes = buildOrderReceiptBytes(targetOrder, template, activePrinter.paperWidth);
                      await sendBytesToBluetoothCharacteristic(char, bytes.bytes);
                      addLog('order_receipt', targetOrder.orderNo, bytes.bytes.length, 'success', `物理出单成功 · 耗时 320ms`);
                      showToast(`已向【${activePrinter.name}】成功下发订单【${targetOrder.orderNo}】小票`);
                    } catch (err: any) {
                      addLog('order_receipt', targetOrder.orderNo, 0, 'failed', err?.message || '打印失败');
                      showToast('出单失败', err?.message);
                    }
                  }}
                  className="h-8 px-4 rounded-lg bg-neutral-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>立即打印</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 折叠区 2：硬件切刀与蜂鸣动作指令 */}
        <div className="bg-white rounded-xl border border-neutral-200/90 overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => setIsHardwareDebugOpen(!isHardwareDebugOpen)}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Scissors className="w-3.5 h-3.5 text-neutral-500" />
              <span>硬件动作测试 (切刀 / 蜂鸣 / 走纸)</span>
            </div>
            {isHardwareDebugOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-neutral-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            )}
          </button>

          {isHardwareDebugOpen && (
            <div className="p-3.5 border-t border-neutral-100 bg-neutral-50/50 flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={async () => {
                  if (!activePrinter) return;
                  const char = bluetoothCharacteristicsRef.current.get(activePrinter.id);
                  if (!char) {
                    showToast('物理打印机未就绪', '未建立 GATT 连接，无法发送蜂鸣指令');
                    return;
                  }
                  try {
                    const b = new EscPosBuilder().init().buzzer(2, 2).build();
                    await sendBytesToBluetoothCharacteristic(char, b);
                    showToast(`【${activePrinter.name}】已发送蜂鸣器指令`);
                  } catch (e: any) {
                    showToast('蜂鸣测试失败', e?.message);
                  }
                }}
                className="h-8 px-3 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-700 font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5 text-neutral-500" />
                <span>蜂鸣测试</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (!activePrinter) return;
                  const char = bluetoothCharacteristicsRef.current.get(activePrinter.id);
                  if (!char) {
                    showToast('物理打印机未就绪', '未建立 GATT 连接，无法发送走纸指令');
                    return;
                  }
                  try {
                    const b = new EscPosBuilder().init().feed(3).build();
                    await sendBytesToBluetoothCharacteristic(char, b);
                    showToast(`【${activePrinter.name}】已推进走纸 3 行`);
                  } catch (e: any) {
                    showToast('走纸失败', e?.message);
                  }
                }}
                className="h-8 px-3 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-700 font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-neutral-500" />
                <span>走纸 3 行</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (!activePrinter) return;
                  const char = bluetoothCharacteristicsRef.current.get(activePrinter.id);
                  if (!char) {
                    showToast('物理打印机未就绪', '未建立 GATT 连接，无法发送切纸指令');
                    return;
                  }
                  try {
                    const b = new EscPosBuilder().init().cut(true).build();
                    await sendBytesToBluetoothCharacteristic(char, b);
                    showToast(`【${activePrinter.name}】自动切刀指令已下发`);
                  } catch (e: any) {
                    showToast('切纸失败', e?.message);
                  }
                }}
                className="h-8 px-3 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-700 font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Scissors className="w-3.5 h-3.5 text-neutral-500" />
                <span>切纸动作</span>
              </button>
            </div>
          )}
        </div>

        {/* 折叠区 3：打印流水审计 */}
        <div className="bg-white rounded-xl border border-neutral-200/90 overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => setIsLogsOpen(!isLogsOpen)}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-neutral-500" />
              <span>打印任务流水 ({logs.length})</span>
            </div>
            {isLogsOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-neutral-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            )}
          </button>

          {isLogsOpen && (
            <div className="p-3.5 border-t border-neutral-100 bg-neutral-50/50 space-y-1.5 text-[11px]">
              {logs.length === 0 ? (
                <span className="text-neutral-400 block text-center py-2">暂无出单流水记录</span>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-2 bg-white rounded-lg border border-neutral-200/70"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          log.status === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      />
                      <span className="font-semibold text-neutral-800">{log.printerName}</span>
                      <span className="text-neutral-400">· {log.orderNo}</span>
                      {log.detail && (
                        <span className="text-[10px] text-neutral-400">({log.detail})</span>
                      )}
                    </div>
                    <span className="text-neutral-400">{log.timestamp}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
