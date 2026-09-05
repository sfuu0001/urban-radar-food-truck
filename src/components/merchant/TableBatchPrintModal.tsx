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
}

export const TableBatchPrintModal: React.FC<TableBatchPrintModalProps> = ({
  isOpen,
  onClose,
  tables,
  truckName = '黑曜石 01 号流动餐车'
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-[6px] shadow-2xl border border-[#e6e6e4] overflow-hidden my-auto max-h-[92vh] flex flex-col print:max-h-none print:shadow-none print:border-none print:p-0">
        {/* Header (Hidden when printing) */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#f1f1ef] bg-[#fbfbfa] shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[4px] bg-[#2b593f] text-white flex items-center justify-center font-bold">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#201f1d]">桌台扫码点餐码 · 批量排版与打印中心</h3>
                <span className="px-2 py-0.5 rounded-[3px] bg-emerald-100 text-emerald-800 text-[10.5px] font-bold">
                  直通该桌菜单
                </span>
              </div>
              <p className="text-xs text-[#787774] mt-0.5">
                顾客微信/相机扫码即刻自动绑定指定桌台，就座点餐、加菜直通后厨 KDS，免人工问询录入。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-[3px] bg-[#37352f] hover:bg-[#201f1d] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>调用系统打印立牌</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#787774] hover:text-[#201f1d] hover:bg-[#f1f1ef] rounded-[3px] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter bar (Hidden when printing) */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-2.5 bg-[#f7f7f5] border-b border-[#e6e6e4] text-xs shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-[#787774] font-medium">区域筛选:</span>
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
                className={`px-2.5 py-1 rounded-[3px] text-xs font-semibold cursor-pointer transition-colors ${
                  selectedZone === z.id
                    ? 'bg-white text-[#201f1d] shadow-2xs border border-[#d3d1cb]'
                    : 'text-[#787774] hover:text-[#201f1d]'
                }`}
              >
                {z.label}
              </button>
            ))}
          </div>

          <div className="text-[11px] text-[#787774] flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>支持 A4 一页4立牌打印，建议选用哑光加厚卡纸装入亚克力立台</span>
          </div>
        </div>

        {/* Table Cards Print Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#fbfbfa] print:p-0 print:bg-white print:overflow-visible">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 print:grid-cols-2 print:gap-6">
            {filteredTables.map((table) => {
              const scanUrl = getTableScanUrl(table.code);
              const qrImg = getTableQrImageUrl(table.code);

              return (
                <div
                  key={table.id}
                  className="bg-white rounded-[6px] border border-[#d3d1cb] p-4 flex flex-col items-center justify-between text-center relative shadow-xs print:shadow-none print:border-2 print:border-neutral-800 print:break-inside-avoid"
                  style={{ minHeight: '340px' }}
                >
                  {/* Stand Header Branding */}
                  <div className="w-full border-b border-[#f1f1ef] pb-2.5 mb-3 flex items-center justify-between">
                    <div className="text-left">
                      <div className="text-[11px] font-bold text-[#201f1d] flex items-center gap-1">
                        <Utensils className="w-3 h-3 text-[#2b593f]" />
                        <span>{truckName}</span>
                      </div>
                      <div className="text-[9.5px] text-[#787774]">{table.zoneLabel || '外摆就餐区'}</div>
                    </div>
                    <span className="px-1.5 py-0.5 rounded-[2px] bg-[#37352f] text-white font-mono text-[10px] font-bold">
                      堂食专座
                    </span>
                  </div>

                  {/* Big Table Code Badge */}
                  <div className="mb-2">
                    <div className="text-3xl font-black font-mono tracking-tight text-[#201f1d]">
                      {table.code}
                    </div>
                    <div className="text-[11px] text-[#787774] font-medium">
                      {table.name} · 建议 {table.capacity} 人入座
                    </div>
                  </div>

                  {/* QR Code Container */}
                  <div className="p-2.5 bg-white border border-[#e6e6e4] rounded-[4px] shadow-2xs my-1 relative group">
                    <img
                      src={qrImg}
                      alt={`桌台 ${table.code} 扫码二维码`}
                      className="w-36 h-36 object-contain"
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
                  <div className="mt-3 pt-2.5 border-t border-[#f1f1ef] w-full flex items-center justify-between text-[11px] print:hidden">
                    <button
                      type="button"
                      onClick={() => handleCopyLink(table.code)}
                      className="text-[#787774] hover:text-[#201f1d] flex items-center gap-1 cursor-pointer"
                      title="复制扫码点餐链接"
                    >
                      <Copy className="w-3 h-3" />
                      <span>复制链接</span>
                    </button>
                    <a
                      href={scanUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 hover:text-emerald-900 font-medium flex items-center gap-1"
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
        <div className="p-3.5 bg-[#f7f7f5] border-t border-[#e6e6e4] flex flex-col sm:flex-row items-center justify-between text-xs text-[#787774] gap-2 shrink-0 print:hidden">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>食客扫码后，系统将锁定该桌台，订单与加菜均自动打上对应桌号</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-[3px] border border-[#d3d1cb] hover:bg-white text-[#37352f] text-xs font-medium cursor-pointer"
          >
            关闭窗口
          </button>
        </div>
      </div>
    </div>
  );
};
