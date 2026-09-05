import React, { useState, useMemo } from 'react';
import {
  QrCode,
  Printer,
  Download,
  X,
  CheckCircle2,
  Share2,
  Copy,
  Layers,
  Utensils,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { TableItem } from '../../types';
import { useToast } from '../ui/ToastContext';

interface TableBatchPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: TableItem[];
  truckName?: string;
  isEmbedded?: boolean;
}

export const TableBatchPrintModal: React.FC<TableBatchPrintModalProps> = ({
  isOpen,
  onClose,
  tables,
  truckName = '黑曜石 01 号流动餐车',
  isEmbedded = false
}) => {
  const toast = useToast();
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [singleInspectTable, setSingleInspectTable] = useState<TableItem | null>(null);

  // Filter tables by zone
  const filteredTables = useMemo(() => {
    if (selectedZone === 'all') return tables;
    return tables.filter((t) => t.zone === selectedZone);
  }, [tables, selectedZone]);

  if (!isOpen) return null;

  // Base URL for scanning
  const baseUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : 'https://tc100-d9gz0e2ko5929e360-1445454244.tcloudbaseapp.com/';

  const getTableScanUrl = (tableCode: string) => {
    return `${baseUrl}?table=${encodeURIComponent(tableCode)}&mode=dine_in`;
  };

  const getTableQrImageUrl = (tableCode: string) => {
    const scanUrl = getTableScanUrl(tableCode);
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(scanUrl)}`;
  };

  const handleCopyLink = (tableCode: string) => {
    const link = getTableScanUrl(tableCode);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link);
      toast.success('扫码点餐直达链接已复制', link);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Main inner content
  const content = (
    <div className={`relative w-full bg-white flex flex-col overflow-hidden ${
      isEmbedded
        ? 'rounded-[6px] border border-[#e6e6e4] shadow-xs print:border-none print:shadow-none'
        : 'h-full md:h-auto md:max-h-[92vh] md:max-w-4xl md:rounded-[6px] md:shadow-2xl md:border md:border-[#e6e6e4] print:max-h-none print:shadow-none print:border-none print:p-0'
    }`}>
      {/* Header (Hidden when printing) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-5 border-b border-[#f1f1ef] bg-[#fbfbfa] shrink-0 gap-3 print:hidden">
        <div className="flex items-start sm:items-center justify-between gap-2.5 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-[4px] bg-[#2b593f] text-white flex items-center justify-center font-bold shrink-0">
              <QrCode className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-[#201f1d] truncate">
                  桌台扫码点餐码 · 批量排版与打印中心
                </h3>
                <span className="px-2 py-0.5 rounded-[3px] bg-emerald-100 text-emerald-800 text-[10px] sm:text-[10.5px] font-bold shrink-0">
                  直通该桌菜单
                </span>
                {isEmbedded && (
                  <span className="px-2 py-0.5 rounded-[3px] bg-[#f0f0ee] text-[#5a5854] text-[10px] font-medium shrink-0">
                    内嵌式工作台
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-[#787774] mt-0.5">
                顾客微信/相机扫码即刻自动绑定指定桌台，就座点餐直通后厨 KDS，免人工问询录入。
              </p>
            </div>
          </div>

          {/* Close/Collapse icon on mobile */}
          <button
            type="button"
            onClick={onClose}
            className="sm:hidden p-1.5 text-[#787774] hover:text-[#201f1d] hover:bg-[#f1f1ef] rounded-[3px] cursor-pointer shrink-0"
            title={isEmbedded ? '收起内嵌排版' : '关闭'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action button row */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePrint}
            className="w-full sm:w-auto px-3.5 py-1.5 rounded-[3px] bg-[#37352f] hover:bg-[#201f1d] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
          >
            <Printer className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">调用系统打印立牌</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="hidden sm:flex p-1.5 text-[#787774] hover:text-[#201f1d] hover:bg-[#f1f1ef] rounded-[3px] cursor-pointer shrink-0"
            title={isEmbedded ? '收起内嵌工作台' : '关闭窗口'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter bar (Hidden when printing) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-5 py-2 sm:py-2.5 bg-[#f7f7f5] border-b border-[#e6e6e4] text-xs shrink-0 gap-2 print:hidden">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 w-full sm:w-auto shrink-0">
          <span className="text-[#787774] font-medium whitespace-nowrap shrink-0">区域筛选:</span>
          {[
            { id: 'all', label: `全部桌台 (${tables.length})` },
            { id: 'patio', label: '外摆休闲区' },
            { id: 'indoor', label: '散座区' },
            { id: 'bar', label: '吧台高脚凳' }
          ].map((z) => (
            <button
              key={z.id}
              type="button"
              onClick={() => setSelectedZone(z.id)}
              className={`px-2.5 py-1 rounded-[3px] text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                selectedZone === z.id
                  ? 'bg-white text-[#201f1d] shadow-2xs border border-[#d3d1cb]'
                  : 'text-[#787774] hover:text-[#201f1d]'
              }`}
            >
              {z.label}
            </button>
          ))}
        </div>

        <div className="text-[11px] text-[#787774] flex items-center gap-1 shrink-0 whitespace-nowrap overflow-x-auto no-scrollbar">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>支持 A4 一页4立牌打印，建议选用哑光加厚卡纸装入亚克力立台</span>
        </div>
      </div>

      {/* Table Cards Print Grid */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-[#fbfbfa] print:p-0 print:bg-white print:overflow-visible custom-scrollbar">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 print:grid-cols-2 print:gap-6">
          {filteredTables.map((table) => {
            const scanUrl = getTableScanUrl(table.code);
            const qrImg = getTableQrImageUrl(table.code);

            return (
              <div
                key={table.id}
                className="bg-white rounded-[6px] border border-[#d3d1cb] p-3.5 sm:p-4 flex flex-col items-center justify-between text-center relative shadow-xs print:shadow-none print:border-2 print:border-neutral-800 print:break-inside-avoid"
                style={{ minHeight: '320px' }}
              >
                {/* Stand Header Branding */}
                <div className="w-full border-b border-[#f1f1ef] pb-2.5 mb-2.5 flex items-center justify-between">
                  <div className="text-left min-w-0">
                    <div className="text-[11px] font-bold text-[#201f1d] flex items-center gap-1 truncate">
                      <Utensils className="w-3 h-3 text-[#2b593f] shrink-0" />
                      <span className="truncate">{truckName}</span>
                    </div>
                    <div className="text-[9.5px] text-[#787774] truncate">{table.zoneLabel || '外摆就餐区'}</div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-[2px] bg-[#37352f] text-white font-mono text-[10px] font-bold shrink-0 ml-1">
                    堂食专座
                  </span>
                </div>

                {/* Big Table Code Badge */}
                <div className="mb-2">
                  <div className="text-3xl font-black font-mono tracking-tight text-[#201f1d]">
                    {table.code}
                  </div>
                  <div className="text-[11px] text-[#787774] font-medium mt-0.5">
                    {table.name} · 建议 {table.capacity} 人入座
                  </div>
                </div>

                {/* QR Code Container */}
                <div className="p-2.5 bg-white border border-[#e6e6e4] rounded-[4px] shadow-2xs my-1 relative group">
                  <img
                    src={qrImg}
                    alt={`桌台 ${table.code} 扫码二维码`}
                    className="w-32 h-32 sm:w-36 sm:h-36 object-contain"
                    loading="lazy"
                  />
                </div>

                {/* Instructions */}
                <div className="mt-2 space-y-0.5">
                  <div className="text-xs font-bold text-[#201f1d] tracking-wide">微信 / 手机扫码直达点餐</div>
                  <div className="text-[10px] text-[#787774]">
                    无需排队 · 现烤现制 · 直送本桌
                  </div>
                </div>

                {/* Action links (Hidden on print) */}
                <div className="mt-3 pt-2.5 border-t border-[#f1f1ef] w-full flex items-center justify-between text-[11px] print:hidden gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyLink(table.code)}
                    className="text-[#787774] hover:text-[#201f1d] flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    title="复制扫码点餐链接"
                  >
                    <Copy className="w-3 h-3" />
                    <span>复制链接</span>
                  </button>
                  <a
                    href={scanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 hover:text-emerald-900 font-medium flex items-center gap-1 whitespace-nowrap"
                  >
                    <span>模拟扫码直达</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer info (Hidden when printing) */}
      <div className="p-3 sm:p-3.5 bg-[#f7f7f5] border-t border-[#e6e6e4] flex flex-col sm:flex-row items-center justify-between text-xs text-[#787774] gap-2.5 shrink-0 print:hidden">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-[11px] sm:text-xs">食客扫码后，系统将锁定该桌台，订单与加菜均自动打上对应桌号</span>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handlePrint}
            className="sm:hidden flex-1 px-3 py-2 rounded-[3px] bg-[#37352f] text-white text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>调用系统打印</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 sm:flex-none px-4 py-2 sm:py-1.5 rounded-[3px] border border-[#d3d1cb] hover:bg-white text-[#37352f] text-xs font-medium cursor-pointer text-center"
          >
            {isEmbedded ? '收起内嵌排版' : '关闭窗口'}
          </button>
        </div>
      </div>
    </div>
  );

  if (isEmbedded) {
    return (
      <div className="w-full my-3 print:my-0">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch md:items-center justify-center p-0 md:p-6 bg-[#fbfbfa] md:bg-black/60 md:backdrop-blur-xs overflow-y-auto">
      {content}
    </div>
  );
};
