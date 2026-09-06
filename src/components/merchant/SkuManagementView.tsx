import React, { useState, useEffect, useRef } from 'react';
import {
  Tag,
  Plus,
  Search,
  LayoutGrid,
  List,
  QrCode,
  Grid2X2,
  Edit3,
  Trash2,
  Printer,
  Download,
  Upload,
  Barcode,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertTriangle,
  RefreshCw,
  Truck,
  CheckSquare,
  Square,
  Calculator,
  Percent,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles
} from 'lucide-react';
import { SkuParamItem, SkuHistoryLog } from '../../types';
import { INITIAL_SKU_PARAMS } from '../../data/mockEnhancedData';
import { SkuMetricsStrip } from './sku/SkuMetricsStrip';
import { SkuYieldCalculatorModal } from './sku/SkuYieldCalculatorModal';
import { SkuStockInModal } from './sku/SkuStockInModal';
import { SkuStockOutModal } from './sku/SkuStockOutModal';
import { SkuEditDetailModal } from './sku/SkuEditDetailModal';
import { SkuCreateModal } from './sku/SkuCreateModal';

const LOCAL_STORAGE_KEY = 'obsidian_sku_params';

interface SkuManagementViewProps {
  showToast: (msg: string) => void;
}

export const SkuManagementView: React.FC<SkuManagementViewProps> = ({ showToast }) => {
  // Load from LocalStorage or Fallback
  const [skuList, setSkuList] = useState<SkuParamItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return INITIAL_SKU_PARAMS;
  });

  // Save to LocalStorage whenever skuList changes
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(skuList));
    } catch (e) {
      console.error('Failed to save sku params to localStorage', e);
    }
  }, [skuList]);

  const [activeView, setActiveView] = useState<'label' | 'card' | 'sparkline' | 'quadrant'>('card');
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'in_stock' | 'pending_in' | 'out_of_stock'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Multi-select & Batch
  const [isMultiSelectMode, setIsMultiSelectMode] = useState<boolean>(false);
  const [selectedSkuIds, setSelectedSkuIds] = useState<Set<string>>(new Set());

  // Modals state
  const [isNewSkuModalOpen, setIsNewSkuModalOpen] = useState<boolean>(false);
  const [isYieldCalcOpen, setIsYieldCalcOpen] = useState<boolean>(false);
  const [selectedSkuForEdit, setSelectedSkuForEdit] = useState<SkuParamItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [selectedSkuForStockIn, setSelectedSkuForStockIn] = useState<SkuParamItem | null>(null);
  const [isStockInModalOpen, setIsStockInModalOpen] = useState<boolean>(false);
  const [selectedSkuForStockOut, setSelectedSkuForStockOut] = useState<SkuParamItem | null>(null);
  const [isStockOutModalOpen, setIsStockOutModalOpen] = useState<boolean>(false);

  // Hidden File input for JSON Import
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = ['全部', '肉类原料', '海鲜水产', '蔬菜品类', '豆制品类', '饮品辅料', '消耗包材', '主食面点'];

  // Filtered SKUs
  const filteredSkus = skuList.filter((s) => {
    const matchCat = selectedCategory === '全部' || s.category === selectedCategory;

    let matchStatus = true;
    if (stockStatusFilter === 'in_stock') {
      matchStatus =
        s.stockStatus === 'in_stock' ||
        (s.currentStock > 0 && s.stockStatus !== 'out_of_stock' && s.stockStatus !== 'pending_in');
    } else if (stockStatusFilter === 'pending_in') {
      matchStatus = s.stockStatus === 'pending_in';
    } else if (stockStatusFilter === 'out_of_stock') {
      matchStatus =
        s.stockStatus === 'out_of_stock' ||
        (s.currentStock <= 0 && s.stockStatus !== 'pending_in');
    }

    const matchSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.storageLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.batchNo && s.batchNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.supplier && s.supplier.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchCat && matchStatus && matchSearch;
  });

  // Sparkline generator
  const renderSparkline = (data?: number[]) => {
    if (!data || data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const w = 70;
    const h = 20;

    const points = data
      .map((val, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((val - min) / range) * (h - 4) - 2;
        return `${x},${y}`;
      })
      .join(' ');

    return (
      <svg width={w} height={h} className="inline-block overflow-visible">
        <polyline fill="none" stroke="#16a34a" strokeWidth="1.5" points={points} />
      </svg>
    );
  };

  // Barcode SVG Generator
  const renderBarcodeSvg = (skuCode: string) => {
    const bars = [2, 1, 3, 1, 2, 3, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2];
    return (
      <div className="flex flex-col items-center p-2 bg-white rounded border border-[#e2e8f0]">
        <svg width="130" height="34" viewBox="0 0 130 34">
          {bars.map((w, idx) => {
            const x = idx * 7 + 4;
            return <rect key={idx} x={x} y="2" width={w} height="30" fill="#0f172a" />;
          })}
        </svg>
        <span className="font-mono text-[9px] font-bold text-[#0f172a] tracking-widest mt-0.5">
          {skuCode}
        </span>
      </div>
    );
  };

  // Render Status Badge
  const renderStatusBadge = (sku: SkuParamItem) => {
    const isPending = sku.stockStatus === 'pending_in';
    const isOut = sku.stockStatus === 'out_of_stock' || (sku.currentStock <= 0 && !isPending);
    const isIn = !isPending && !isOut;

    if (isIn) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          在库现货 ({sku.currentStock}{sku.unit})
        </span>
      );
    }
    if (isPending) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
          <Truck className="w-3 h-3 text-amber-600" />
          待入库 / 冷链在途
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold">
        <AlertTriangle className="w-3 h-3 text-red-600" />
        未在库 / 售尽缺货
      </span>
    );
  };

  // Selection toggle
  const toggleSelectSku = (id: string) => {
    setSelectedSkuIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedSkuIds.size === filteredSkus.length) {
      setSelectedSkuIds(new Set());
    } else {
      setSelectedSkuIds(new Set(filteredSkus.map((s) => s.id)));
    }
  };

  // Multi-item Batch Actions
  const handleBatchStatus = (status: 'in_stock' | 'pending_in' | 'out_of_stock') => {
    if (selectedSkuIds.size === 0) return;
    const nowStr = new Date().toLocaleString('zh-CN', { hour12: false }).slice(0, 16);
    const statusMap = { in_stock: '在库现货', pending_in: '待入库/在途', out_of_stock: '未在库/缺货' };

    setSkuList((prev) =>
      prev.map((s) => {
        if (!selectedSkuIds.has(s.id)) return s;
        const isNowIn = status === 'in_stock';
        const newStock = status === 'out_of_stock' ? 0 : s.currentStock;
        const log: SkuHistoryLog = {
          timestamp: nowStr,
          field: '批量在库状态变更',
          before: `原状态: ${statusMap[s.stockStatus || 'in_stock']}`,
          after: `新状态: ${statusMap[status]} (批量操作)`,
          operator: '李店长 (EMP-8001)'
        };
        return {
          ...s,
          stockStatus: status,
          isInStock: isNowIn,
          currentStock: newStock,
          stockValue: newStock * s.purchasePrice,
          historyLogs: [log, ...(s.historyLogs || [])]
        };
      })
    );
    showToast(`已批量更新 ${selectedSkuIds.size} 个 SKU 的在库状态为 [${statusMap[status]}]`);
    setSelectedSkuIds(new Set());
  };

  const handleBatchPriceAdjust = (deltaPercent: number) => {
    if (selectedSkuIds.size === 0) return;
    const nowStr = new Date().toLocaleString('zh-CN', { hour12: false }).slice(0, 16);

    setSkuList((prev) =>
      prev.map((s) => {
        if (!selectedSkuIds.has(s.id)) return s;
        const oldPrice = s.purchasePrice;
        const newPrice = Number((oldPrice * (1 + deltaPercent / 100)).toFixed(1));
        const log: SkuHistoryLog = {
          timestamp: nowStr,
          field: '批量采购单价调整',
          before: `¥${oldPrice}/${s.unit}`,
          after: `¥${newPrice}/${s.unit} (${deltaPercent > 0 ? '+' : ''}${deltaPercent}%)`,
          operator: '李店长 (EMP-8001)'
        };
        return {
          ...s,
          purchasePrice: newPrice,
          stockValue: s.currentStock * newPrice,
          historyLogs: [log, ...(s.historyLogs || [])]
        };
      })
    );
    showToast(`已将选中的 ${selectedSkuIds.size} 个 SKU 采购单价调整 ${deltaPercent > 0 ? '+' : ''}${deltaPercent}%`);
    setSelectedSkuIds(new Set());
  };

  // Handlers for Stock In, Stock Out, Save, Create
  const handleConfirmStockIn = (data: {
    quantity: number;
    purchasePrice: number;
    standardYieldRate: number;
    batchNo: string;
    shelfLifeDays: number;
    productionDate: string;
    storageLocation: string;
    operator: string;
    notes: string;
  }) => {
    if (!selectedSkuForStockIn) return;
    const nowStr = new Date().toLocaleString('zh-CN', { hour12: false }).slice(0, 16);

    const d = new Date(data.productionDate);
    d.setDate(d.getDate() + Number(data.shelfLifeDays));
    const expDate = d.toISOString().slice(0, 10);

    const log: SkuHistoryLog = {
      timestamp: nowStr,
      field: '到货验收入库',
      before:
        selectedSkuForStockIn.stockStatus === 'pending_in'
          ? '待入库在途'
          : `未在库 (原存量 ${selectedSkuForStockIn.currentStock}${selectedSkuForStockIn.unit})`,
      after: `在库现货 +${data.quantity}${selectedSkuForStockIn.unit} | 采购单价 ¥${data.purchasePrice}/${selectedSkuForStockIn.unit} | 实测出肉率 ${(data.standardYieldRate * 100).toFixed(0)}% | 批次 ${data.batchNo} | 保质期 ${data.shelfLifeDays}天`,
      operator: data.operator
    };

    const newStock = (selectedSkuForStockIn.currentStock || 0) + Number(data.quantity);
    const updated: SkuParamItem = {
      ...selectedSkuForStockIn,
      currentStock: newStock,
      stockStatus: 'in_stock',
      isInStock: true,
      purchasePrice: Number(data.purchasePrice),
      standardYieldRate: Number(data.standardYieldRate),
      batchNo: data.batchNo,
      shelfLifeDays: Number(data.shelfLifeDays),
      productionDate: data.productionDate,
      expiryDate: expDate,
      storageLocation: data.storageLocation,
      stockValue: newStock * Number(data.purchasePrice),
      sparklineHistory: [
        ...(selectedSkuForStockIn.sparklineHistory || [70, 72, 73]),
        Number(data.standardYieldRate) * 100
      ].slice(-7),
      historyLogs: [log, ...(selectedSkuForStockIn.historyLogs || [])]
    };

    setSkuList((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setIsStockInModalOpen(false);
    setSelectedSkuForStockIn(null);
    showToast(`[${updated.name}] 成功验收入库 ${data.quantity}${updated.unit}，已转为「在库现货」`);
  };

  const handleConfirmStockOut = (data: {
    actionType: 'permanent_delete' | 'mark_out_of_stock' | 'kitchen_loss_stock_out';
    quantity: number;
    operator: string;
    reason: string;
  }) => {
    if (!selectedSkuForStockOut) return;
    const nowStr = new Date().toLocaleString('zh-CN', { hour12: false }).slice(0, 16);

    if (data.actionType === 'permanent_delete') {
      setSkuList((prev) => prev.filter((s) => s.id !== selectedSkuForStockOut.id));
      setIsStockOutModalOpen(false);
      setSelectedSkuForStockOut(null);
      showToast(`SKU 档案 [${selectedSkuForStockOut.name} (${selectedSkuForStockOut.sku})] 已彻底注销`);
    } else if (data.actionType === 'mark_out_of_stock') {
      const log: SkuHistoryLog = {
        timestamp: nowStr,
        field: '全量清库/设为未在库',
        before: `在库存量 ${selectedSkuForStockOut.currentStock}${selectedSkuForStockOut.unit}`,
        after: `未在库/已售尽 (原因: ${data.reason}) | 采购单价记录: ¥${selectedSkuForStockOut.purchasePrice} | 出肉标准: ${(selectedSkuForStockOut.standardYieldRate * 100).toFixed(0)}%`,
        operator: data.operator
      };

      const updated: SkuParamItem = {
        ...selectedSkuForStockOut,
        currentStock: 0,
        stockStatus: 'out_of_stock',
        isInStock: false,
        stockValue: 0,
        historyLogs: [log, ...(selectedSkuForStockOut.historyLogs || [])]
      };

      setSkuList((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setIsStockOutModalOpen(false);
      setSelectedSkuForStockOut(null);
      showToast(`[${selectedSkuForStockOut.name}] 已清空库存并变更为「未在库/已售尽」状态`);
    } else if (data.actionType === 'kitchen_loss_stock_out') {
      const outQty = Math.min(Number(data.quantity) || 0, selectedSkuForStockOut.currentStock);
      const remainingStock = Math.max(0, selectedSkuForStockOut.currentStock - outQty);
      const isStillInStock = remainingStock > 0;

      const log: SkuHistoryLog = {
        timestamp: nowStr,
        field: '领料/损耗出库核销',
        before: `在库存量 ${selectedSkuForStockOut.currentStock}${selectedSkuForStockOut.unit}`,
        after: `核销出库 -${outQty}${selectedSkuForStockOut.unit} | 结存 ${remainingStock}${selectedSkuForStockOut.unit} | 单价 ¥${selectedSkuForStockOut.purchasePrice} | 原因: ${data.reason}`,
        operator: data.operator
      };

      const updated: SkuParamItem = {
        ...selectedSkuForStockOut,
        currentStock: remainingStock,
        stockStatus: isStillInStock ? 'in_stock' : 'out_of_stock',
        isInStock: isStillInStock,
        stockValue: remainingStock * selectedSkuForStockOut.purchasePrice,
        historyLogs: [log, ...(selectedSkuForStockOut.historyLogs || [])]
      };

      setSkuList((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setIsStockOutModalOpen(false);
      setSelectedSkuForStockOut(null);
      showToast(`[${selectedSkuForStockOut.name}] 成功出库 ${outQty}${selectedSkuForStockOut.unit}，剩余 ${remainingStock}${selectedSkuForStockOut.unit}`);
    }
  };

  const handleSaveEditSku = (updated: SkuParamItem) => {
    setSkuList((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setIsEditModalOpen(false);
    setSelectedSkuForEdit(null);
    showToast(`SKU [${updated.name}] 参数与在库属性更新成功`);
  };

  const handleCreateNewSku = (item: SkuParamItem) => {
    setSkuList((prev) => [item, ...prev]);
    showToast(`新 SKU [${item.name}] 创建成功，已录入数字参数档案！`);
  };

  // Import JSON File
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].sku && parsed[0].name) {
          setSkuList(parsed);
          showToast(`已成功导入 ${parsed.length} 条 SKU 标准与在库配置档案`);
        } else {
          showToast('导入文件格式不合法，请上传标准的 SKU JSON 档案');
        }
      } catch (err) {
        showToast('解析 JSON 文件失败，请检查文件格式');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div id="sku-management-view" className="space-y-4 text-xs text-[#0f172a]">
      {/* 1. Header with Actions */}
      <div className="bg-white p-4 rounded-[3px] border border-[#e2e8f0] flex items-center justify-between gap-3 flex-wrap shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-[#0f172a]">数字参数与标准管理</h1>
            <span className="px-2 py-0.5 rounded-[2px] bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe] text-[11px] font-semibold">
              参数中台 · 在库/未在库追踪
            </span>
          </div>
          <p className="text-[12px] text-[#64748b] mt-0.5">
            精细化溯源: 区分在库与未在库状态 · 每次增删新库存独立追踪采购单价、标杆出肉率、保质期及批次属性
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportJson}
            accept=".json"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => setIsYieldCalcOpen(true)}
            className="px-2.5 sm:px-3 py-1.5 rounded-[3px] bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs text-xs"
          >
            <Calculator className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">出肉与成本测算器</span>
            <span className="sm:hidden">测算器</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 sm:px-3 py-1.5 rounded-[3px] bg-white text-[#475569] border border-[#cbd5e1] hover:bg-[#f8fafc] font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs text-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">导入标准</span>
            <span className="sm:hidden">导入</span>
          </button>

          <button
            type="button"
            onClick={() => {
              try {
                const dataStr =
                  'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(skuList, null, 2));
                const dlAnchor = document.createElement('a');
                dlAnchor.setAttribute('href', dataStr);
                dlAnchor.setAttribute(
                  'download',
                  `SKU_Standard_Params_${new Date().toISOString().slice(0, 10)}.json`
                );
                dlAnchor.click();
                showToast('已导出 SKU 数字参数与在库标准配置 JSON');
              } catch {
                showToast('导出配置失败');
              }
            }}
            className="px-2.5 sm:px-3 py-1.5 rounded-[3px] bg-white text-[#475569] border border-[#cbd5e1] hover:bg-[#f8fafc] font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">导出标准</span>
            <span className="sm:hidden">导出</span>
          </button>

          <button
            id="btn-add-new-sku-material"
            type="button"
            onClick={() => setIsNewSkuModalOpen(true)}
            className="px-3 sm:px-3.5 py-1.5 rounded-[3px] bg-[#0f172a] text-white hover:bg-black font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs text-xs"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">新增原材料 SKU / 库存录入</span>
            <span className="sm:hidden">新增 SKU</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Strip */}
      <SkuMetricsStrip skuList={skuList} />

      {/* 3. Toolbar: In-Stock Tabs + Category Tabs + Views */}
      <div className="bg-white p-3 rounded-[3px] border border-[#e2e8f0] space-y-2.5">
        {/* Top: Status Tabs & Multi-select & 4 Views */}
        <div className="flex items-center justify-between gap-3 flex-wrap border-b border-[#f1f5f9] pb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-[#64748b] font-medium mr-1">在库状态:</span>
            <button
              type="button"
              onClick={() => setStockStatusFilter('all')}
              className={`px-3 py-1 rounded-[2px] text-xs font-semibold cursor-pointer transition-all ${
                stockStatusFilter === 'all'
                  ? 'bg-[#0f172a] text-white shadow-xs'
                  : 'bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0]'
              }`}
            >
              全部物资 ({skuList.length})
            </button>
            <button
              type="button"
              onClick={() => setStockStatusFilter('in_stock')}
              className={`px-3 py-1 rounded-[2px] text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                stockStatusFilter === 'in_stock'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>在库现货</span>
            </button>
            <button
              type="button"
              onClick={() => setStockStatusFilter('pending_in')}
              className={`px-3 py-1 rounded-[2px] text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                stockStatusFilter === 'pending_in'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>待入库/在途</span>
            </button>
            <button
              type="button"
              onClick={() => setStockStatusFilter('out_of_stock')}
              className={`px-3 py-1 rounded-[2px] text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                stockStatusFilter === 'out_of_stock'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span>未在库/缺货</span>
            </button>

            <div className="h-4 w-[1px] bg-[#cbd5e1] mx-1" />

            <button
              type="button"
              onClick={() => {
                setIsMultiSelectMode(!isMultiSelectMode);
                if (isMultiSelectMode) setSelectedSkuIds(new Set());
              }}
              className={`px-2.5 py-1 rounded-[2px] text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                isMultiSelectMode
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0] border border-[#cbd5e1]'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{isMultiSelectMode ? '退出批量' : '批量维护'}</span>
            </button>
          </div>

          {/* 4 Views Toggle */}
          <div className="flex items-center border border-[#cbd5e1] rounded-[2px] overflow-hidden bg-white shrink-0">
            <button
              type="button"
              onClick={() => setActiveView('label')}
              className={`px-2 py-1 text-xs font-semibold cursor-pointer flex items-center gap-1 transition-colors ${
                activeView === 'label' ? 'bg-[#0f172a] text-white' : 'text-[#64748b] hover:bg-[#f1f5f9]'
              }`}
              title="码表标签视图"
            >
              <Barcode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">码表标签</span>
              <span className="sm:hidden">标签</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('card')}
              className={`px-2 py-1 text-xs font-semibold cursor-pointer flex items-center gap-1 transition-colors ${
                activeView === 'card' ? 'bg-[#0f172a] text-white' : 'text-[#64748b] hover:bg-[#f1f5f9]'
              }`}
              title="卡片平铺视图"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>卡片</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('sparkline')}
              className={`px-2 py-1 text-xs font-semibold cursor-pointer flex items-center gap-1 transition-colors ${
                activeView === 'sparkline' ? 'bg-[#0f172a] text-white' : 'text-[#64748b] hover:bg-[#f1f5f9]'
              }`}
              title="表格迷你图视图"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">表格走势</span>
              <span className="sm:hidden">走势</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('quadrant')}
              className={`px-2 py-1 text-xs font-semibold cursor-pointer flex items-center gap-1 transition-colors ${
                activeView === 'quadrant' ? 'bg-[#0f172a] text-white' : 'text-[#64748b] hover:bg-[#f1f5f9]'
              }`}
              title="四象限分析视图"
            >
              <Grid2X2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">四象限</span>
              <span className="sm:hidden">象限</span>
            </button>
          </div>
        </div>

        {/* Batch Operations Bar if active */}
        {isMultiSelectMode && (
          <div className="bg-blue-50/80 p-2.5 rounded-[2px] border border-blue-200 flex items-center justify-between gap-2 flex-wrap animate-in fade-in duration-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs font-semibold text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                {selectedSkuIds.size === filteredSkus.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                <span>全选当前 ({selectedSkuIds.size}/{filteredSkus.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-[#64748b]">批量标记:</span>
              <button
                type="button"
                disabled={selectedSkuIds.size === 0}
                onClick={() => handleBatchStatus('in_stock')}
                className="px-2 py-1 bg-emerald-600 disabled:opacity-50 text-white rounded-[2px] font-semibold hover:bg-emerald-700 cursor-pointer"
              >
                设为在库
              </button>
              <button
                type="button"
                disabled={selectedSkuIds.size === 0}
                onClick={() => handleBatchStatus('pending_in')}
                className="px-2 py-1 bg-amber-600 disabled:opacity-50 text-white rounded-[2px] font-semibold hover:bg-amber-700 cursor-pointer"
              >
                设为在途
              </button>
              <button
                type="button"
                disabled={selectedSkuIds.size === 0}
                onClick={() => handleBatchStatus('out_of_stock')}
                className="px-2 py-1 bg-red-600 disabled:opacity-50 text-white rounded-[2px] font-semibold hover:bg-red-700 cursor-pointer"
              >
                设为未在库
              </button>

              <div className="h-3 w-[1px] bg-blue-200 mx-1" />

              <span className="text-[11px] text-[#64748b]">批量调价:</span>
              <button
                type="button"
                disabled={selectedSkuIds.size === 0}
                onClick={() => handleBatchPriceAdjust(5)}
                className="px-2 py-1 bg-white border border-[#cbd5e1] disabled:opacity-50 text-[#0f172a] rounded-[2px] font-semibold hover:bg-[#f8fafc] cursor-pointer flex items-center gap-0.5"
              >
                <TrendingUp className="w-3 h-3 text-red-500" />
                <span>+5%</span>
              </button>
              <button
                type="button"
                disabled={selectedSkuIds.size === 0}
                onClick={() => handleBatchPriceAdjust(-5)}
                className="px-2 py-1 bg-white border border-[#cbd5e1] disabled:opacity-50 text-[#0f172a] rounded-[2px] font-semibold hover:bg-[#f8fafc] cursor-pointer flex items-center gap-0.5"
              >
                <TrendingDown className="w-3 h-3 text-emerald-500" />
                <span>-5%</span>
              </button>

              <button
                type="button"
                disabled={selectedSkuIds.size === 0}
                onClick={() => window.print()}
                className="px-2.5 py-1 bg-[#0f172a] disabled:opacity-50 text-white rounded-[2px] font-semibold hover:bg-black cursor-pointer flex items-center gap-1 ml-1"
              >
                <Printer className="w-3 h-3 text-emerald-400" />
                <span>批量打标</span>
              </button>
            </div>
          </div>
        )}

        {/* Bottom: Categories & Search */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-[2px] text-[11px] font-semibold transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#0f172a] text-white shadow-xs'
                    : 'bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-[#94a3b8] absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜索品名/SKU/批次/供方..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] pl-7 pr-2 py-1 text-xs text-[#0f172a] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 4. Multi-View Rendering */}

      {/* VIEW 1: 码表标签视图 (Label / Barcode Layout) */}
      {activeView === 'label' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredSkus.map((sku) => (
            <div
              key={sku.id}
              className={`bg-white rounded-[3px] border shadow-2xs p-3.5 flex flex-col justify-between space-y-3 relative overflow-hidden transition-all ${
                selectedSkuIds.has(sku.id) ? 'border-blue-500 ring-1 ring-blue-500' : 'border-[#e2e8f0]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  {isMultiSelectMode && (
                    <input
                      type="checkbox"
                      checked={selectedSkuIds.has(sku.id)}
                      onChange={() => toggleSelectSku(sku.id)}
                      className="mt-0.5 rounded text-blue-600 focus:ring-0 cursor-pointer"
                    />
                  )}
                  <div>
                    <div className="font-bold text-sm text-[#0f172a]">{sku.name}</div>
                    <div className="text-[11px] text-[#64748b] mt-0.5">
                      {sku.category} · 库位 {sku.storageLocation}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-mono text-xs text-[#2563eb] font-bold">{sku.sku}</span>
                  <div className="mt-1">{renderStatusBadge(sku)}</div>
                </div>
              </div>

              {/* Barcode & QR Box */}
              <div className="flex items-center justify-around bg-[#f8fafc] p-2.5 rounded-[2px] border border-[#e2e8f0]">
                {renderBarcodeSvg(sku.sku)}
                <div className="flex flex-col items-center bg-white p-1.5 rounded border border-[#e2e8f0]">
                  <QrCode className="w-9 h-9 text-[#0f172a]" />
                  <span className="text-[8px] text-[#64748b] mt-0.5 font-mono">
                    {sku.batchNo || 'LOT-2026'}
                  </span>
                </div>
              </div>

              {/* Core Attributes */}
              <div className="grid grid-cols-3 gap-1.5 text-center bg-[#f8fafc] p-2 rounded border border-[#f1f5f9]">
                <div>
                  <span className="text-[10px] text-[#64748b]">采购单价</span>
                  <div className="font-mono font-bold text-[#0f172a]">
                    ¥{sku.purchasePrice}/{sku.unit}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-700">标准出肉率</span>
                  <div className="font-mono font-bold text-[#16a34a]">
                    {(sku.standardYieldRate * 100).toFixed(0)}%
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-[#64748b]">保质期</span>
                  <div className="font-mono font-bold text-[#0f172a]">{sku.shelfLifeDays}天</div>
                </div>
              </div>

              <div className="text-[10px] text-[#64748b] flex items-center justify-between">
                <span>批次: {sku.batchNo || '标准批次'}</span>
                <span>到期: {sku.expiryDate || '7天内'}</span>
              </div>

              <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-[#e2e8f0]">
                <div className="flex items-center gap-1">
                  {sku.stockStatus !== 'in_stock' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSkuForStockIn(sku);
                        setIsStockInModalOpen(true);
                      }}
                      className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-[2px] font-semibold flex items-center gap-1 cursor-pointer hover:bg-emerald-100 text-[11px]"
                    >
                      <ArrowDownToLine className="w-3 h-3 text-emerald-600" />
                      <span>验收入库</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSkuForStockOut(sku);
                        setIsStockOutModalOpen(true);
                      }}
                      className="px-2 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-[2px] font-semibold flex items-center gap-1 cursor-pointer hover:bg-amber-100 text-[11px]"
                    >
                      <ArrowUpFromLine className="w-3 h-3 text-amber-600" />
                      <span>领料出库</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-2 py-1 bg-white text-[#0f172a] border border-[#cbd5e1] rounded-[2px] font-semibold flex items-center gap-1 cursor-pointer hover:bg-[#f1f5f9] text-[11px]"
                  >
                    <Printer className="w-3 h-3" />
                    <span>打印</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSkuForEdit(sku);
                      setIsEditModalOpen(true);
                    }}
                    className="px-2.5 py-1 bg-[#0f172a] text-white rounded-[2px] font-semibold flex items-center gap-1 cursor-pointer hover:bg-black text-[11px]"
                  >
                    <Edit3 className="w-3 h-3 text-emerald-400" />
                    <span>调参</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW 2: 卡片视图 (Card Grid) */}
      {activeView === 'card' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredSkus.map((sku) => (
            <div
              key={sku.id}
              className={`bg-white rounded-[3px] border shadow-2xs p-3.5 flex flex-col justify-between space-y-3 transition-all ${
                selectedSkuIds.has(sku.id) ? 'border-blue-500 ring-1 ring-blue-500' : 'border-[#e2e8f0] hover:border-[#0f172a]/40'
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    {isMultiSelectMode && (
                      <input
                        type="checkbox"
                        checked={selectedSkuIds.has(sku.id)}
                        onChange={() => toggleSelectSku(sku.id)}
                        className="mt-1 rounded text-blue-600 focus:ring-0 cursor-pointer"
                      />
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-[#64748b] font-semibold">{sku.sku}</span>
                        <span className="px-1.5 py-0.2 bg-[#eff6ff] text-[#2563eb] rounded-[2px] text-[10px] font-semibold">
                          {sku.category}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-[#0f172a] mt-0.5">{sku.name}</h3>
                    </div>
                  </div>
                  <div>{renderStatusBadge(sku)}</div>
                </div>

                {/* 3 Core Numeric Metric Boxes */}
                <div className="grid grid-cols-3 gap-2 bg-[#f8fafc] p-2.5 rounded-[2px] border border-[#e2e8f0] text-center">
                  <div>
                    <span className="text-[10px] text-[#64748b] block">💰 采购单价</span>
                    <div className="font-mono font-bold text-[#0f172a] text-xs mt-0.5">
                      ¥{sku.purchasePrice.toFixed(1)}{' '}
                      <span className="text-[10px] font-normal text-[#64748b]">/{sku.unit}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#166534] block">🥩 标杆出肉率</span>
                    <div className="font-mono font-bold text-[#16a34a] text-xs mt-0.5">
                      {(sku.standardYieldRate * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#64748b] block">⏳ 保质期天数</span>
                    <div className="font-mono font-bold text-[#0f172a] text-xs mt-0.5">
                      {sku.shelfLifeDays}天
                    </div>
                  </div>
                </div>

                {/* Traceability Details */}
                <div className="space-y-1 text-[11px] text-[#475569] bg-[#fdfefe] p-2 rounded border border-[#f1f5f9]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748b]">生产批次号:</span>
                    <span className="font-mono font-semibold text-[#0f172a]">
                      {sku.batchNo || 'LOT-20260829-01'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748b]">规格包装:</span>
                    <span className="text-[#0f172a]">{sku.spec || '标准包装'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748b]">每kg出串数:</span>
                    <span className="font-mono text-[#0f172a] font-semibold">
                      {sku.skewersPerKg ? `${sku.skewersPerKg} 串/kg` : '根据出肉率换算'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748b]">安全警戒线:</span>
                    <span className="font-mono text-red-600 font-bold">
                      {sku.safetyStock} {sku.unit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748b]">存放温区库位:</span>
                    <span className="text-[#0f172a]">{sku.storageLocation}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-[#e2e8f0]">
                <div className="text-[10px] text-[#64748b]">
                  {sku.stockStatus === 'in_stock' ? (
                    <span>
                      在库资产:{' '}
                      <strong className="font-mono text-[#0f172a]">
                        ¥{sku.stockValue.toFixed(1)}
                      </strong>
                    </span>
                  ) : sku.stockStatus === 'pending_in' ? (
                    <span className="text-amber-700 font-medium">
                      在途预估: ¥{(sku.reorderSuggestion * sku.purchasePrice).toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-red-600 font-medium">
                      建议补货: +{sku.reorderSuggestion}
                      {sku.unit}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {sku.stockStatus !== 'in_stock' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSkuForStockIn(sku);
                        setIsStockInModalOpen(true);
                      }}
                      className="px-2 py-1 bg-emerald-600 text-white rounded-[2px] font-semibold flex items-center gap-1 cursor-pointer hover:bg-emerald-700 text-[11px]"
                    >
                      <ArrowDownToLine className="w-3 h-3" />
                      <span>验收入库</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSkuForStockOut(sku);
                        setIsStockOutModalOpen(true);
                      }}
                      className="px-2 py-1 bg-white text-[#475569] border border-[#cbd5e1] rounded-[2px] font-semibold flex items-center gap-1 cursor-pointer hover:bg-[#f1f5f9] text-[11px]"
                    >
                      <ArrowUpFromLine className="w-3 h-3 text-amber-600" />
                      <span>出库/清库</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSkuForEdit(sku);
                      setIsEditModalOpen(true);
                    }}
                    className="px-2.5 py-1 bg-[#0f172a] text-white rounded-[2px] font-semibold flex items-center gap-1 cursor-pointer hover:bg-black text-[11px]"
                  >
                    <Edit3 className="w-3 h-3 text-emerald-400" />
                    <span>编辑</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW 3: 表格迷你图 (Table with Sparkline) */}
      {activeView === 'sparkline' && (
        <div className="bg-white rounded-[3px] border border-[#e2e8f0] shadow-2xs overflow-hidden">
          {/* Mobile Card View (< md) */}
          <div className="md:hidden divide-y divide-[#e2e8f0]">
            {filteredSkus.map((sku) => (
              <div key={sku.id} className="p-3 space-y-2.5 hover:bg-[#f8fafc]/60 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    {isMultiSelectMode && (
                      <input
                        type="checkbox"
                        checked={selectedSkuIds.has(sku.id)}
                        onChange={() => toggleSelectSku(sku.id)}
                        className="mt-1 rounded text-blue-600 focus:ring-0 cursor-pointer"
                      />
                    )}
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-[#0f172a]">{sku.name}</span>
                        <span className="px-1.5 py-0.2 bg-[#eff6ff] text-[#2563eb] rounded-[2px] text-[10px] font-semibold">
                          {sku.category}
                        </span>
                      </div>
                      <div className="font-mono text-[10px] text-[#64748b] mt-0.5">{sku.sku}</div>
                    </div>
                  </div>
                  <div>{renderStatusBadge(sku)}</div>
                </div>

                {/* 3 Metric Mini Boxes */}
                <div className="grid grid-cols-3 gap-1.5 bg-[#f8fafc] p-2 rounded-[2px] border border-[#e2e8f0] text-center">
                  <div>
                    <span className="text-[10px] text-[#64748b] block">采购单价</span>
                    <div className="font-mono font-bold text-xs text-[#0f172a] mt-0.5">
                      ¥{sku.purchasePrice.toFixed(1)}
                    </div>
                    <div className="text-[9px] text-[#64748b]">/{sku.unit}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#166534] block">标杆出肉率</span>
                    <div className="font-mono font-bold text-xs text-[#16a34a] mt-0.5">
                      {(sku.standardYieldRate * 100).toFixed(0)}%
                    </div>
                    <div className="flex justify-center mt-0.5">{renderSparkline(sku.sparklineHistory)}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#64748b] block">在库现量</span>
                    <div className="font-mono font-bold text-xs text-[#0f172a] mt-0.5">
                      {sku.currentStock} {sku.unit}
                    </div>
                    <div className="text-[9px] text-[#64748b]">¥{sku.stockValue.toFixed(0)}</div>
                  </div>
                </div>

                {/* Traceability & Actions */}
                <div className="flex items-center justify-between text-[11px] text-[#64748b] pt-1">
                  <div className="flex items-center gap-2">
                    <span>保质: {sku.shelfLifeDays}天</span>
                    <span>·</span>
                    <span className="truncate max-w-[110px]">{sku.storageLocation}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {sku.stockStatus !== 'in_stock' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSkuForStockIn(sku);
                          setIsStockInModalOpen(true);
                        }}
                        className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-[2px] font-semibold text-xs cursor-pointer hover:bg-emerald-100"
                      >
                        入库
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSkuForStockOut(sku);
                          setIsStockOutModalOpen(true);
                        }}
                        className="px-2 py-0.5 bg-white text-[#475569] border border-[#cbd5e1] rounded-[2px] font-semibold text-xs cursor-pointer hover:bg-[#f1f5f9]"
                      >
                        出库
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSkuForEdit(sku);
                        setIsEditModalOpen(true);
                      }}
                      className="px-2.5 py-0.5 bg-[#0f172a] text-white rounded-[2px] font-semibold text-xs cursor-pointer hover:bg-black"
                    >
                      编辑
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fafc] text-[#64748b] border-b border-[#e2e8f0] font-semibold">
                <tr>
                  {isMultiSelectMode && <th className="p-2.5 w-8">#</th>}
                  <th className="p-2.5">SKU 编码 / 物品名称</th>
                  <th className="p-2.5">分类</th>
                  <th className="p-2.5">在库状态</th>
                  <th className="p-2.5 text-right">参考采购单价</th>
                  <th className="p-2.5 text-right">标杆出肉率</th>
                  <th className="p-2.5 text-center">出肉率走势</th>
                  <th className="p-2.5 text-right">保质期</th>
                  <th className="p-2.5 text-right">在库数量 / 理论价值</th>
                  <th className="p-2.5">批次与库位</th>
                  <th className="p-2.5 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {filteredSkus.map((sku) => (
                  <tr key={sku.id} className="hover:bg-[#f8fafc]/80 transition-colors">
                    {isMultiSelectMode && (
                      <td className="p-2.5">
                        <input
                          type="checkbox"
                          checked={selectedSkuIds.has(sku.id)}
                          onChange={() => toggleSelectSku(sku.id)}
                          className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="p-2.5 font-bold text-[#0f172a]">
                      <div>{sku.name}</div>
                      <div className="font-mono text-[10px] text-[#64748b] font-normal">{sku.sku}</div>
                    </td>
                    <td className="p-2.5 text-[#475569]">{sku.category}</td>
                    <td className="p-2.5">{renderStatusBadge(sku)}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-[#0f172a]">
                      ¥{sku.purchasePrice.toFixed(2)}{' '}
                      <span className="text-[10px] font-normal text-[#64748b]">/{sku.unit}</span>
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-[#16a34a]">
                      {(sku.standardYieldRate * 100).toFixed(0)}%
                    </td>
                    <td className="p-2.5 text-center">{renderSparkline(sku.sparklineHistory)}</td>
                    <td className="p-2.5 text-right font-mono text-[#0f172a]">{sku.shelfLifeDays} 天</td>
                    <td className="p-2.5 text-right font-mono">
                      <div className="font-bold text-[#0f172a]">
                        {sku.currentStock} {sku.unit}
                      </div>
                      <div className="text-[10px] text-[#64748b]">¥{sku.stockValue.toFixed(1)}</div>
                    </td>
                    <td className="p-2.5 text-[#475569] text-[11px]">
                      <div>{sku.storageLocation}</div>
                      <div className="font-mono text-[10px] text-[#64748b]">{sku.batchNo || 'LOT-2026'}</div>
                    </td>
                    <td className="p-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {sku.stockStatus !== 'in_stock' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSkuForStockIn(sku);
                              setIsStockInModalOpen(true);
                            }}
                            className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-[2px] font-semibold hover:bg-emerald-100 cursor-pointer"
                          >
                            入库
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSkuForStockOut(sku);
                              setIsStockOutModalOpen(true);
                            }}
                            className="px-2 py-0.5 bg-white text-[#475569] border border-[#cbd5e1] rounded-[2px] font-semibold hover:bg-[#f1f5f9] cursor-pointer"
                          >
                            出库
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSkuForEdit(sku);
                            setIsEditModalOpen(true);
                          }}
                          className="px-2 py-0.5 bg-[#0f172a] text-white rounded-[2px] font-semibold hover:bg-black cursor-pointer"
                        >
                          编辑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 4: 四象限分析视图 (Four Quadrants) */}
      {activeView === 'quadrant' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Quadrant 1: 高周转 · 高货值 */}
          <div className="bg-white p-3.5 rounded-[3px] border border-amber-300 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-800 text-xs">
                Quadrant I: 高单价 · 高货值 (重点控损严管品)
              </span>
              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded text-[10px] font-bold">
                批次溯源
              </span>
            </div>
            <p className="text-[11px] text-[#64748b]">单价 ≥ ¥60/kg，重点核验出肉率标准与冷链温控</p>
            <div className="divide-y divide-[#e2e8f0] pt-1">
              {skuList
                .filter((s) => s.purchasePrice >= 60)
                .map((s) => (
                  <div key={s.id} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#0f172a]">{s.name}</span>
                        {renderStatusBadge(s)}
                      </div>
                      <div className="text-[10px] text-[#64748b] mt-0.5">
                        出肉标杆:{' '}
                        <strong className="text-emerald-700">
                          {(s.standardYieldRate * 100).toFixed(0)}%
                        </strong>{' '}
                        · 保质: {s.shelfLifeDays}天 · 批次: {s.batchNo || '标准'}
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="font-bold text-[#0f172a]">
                        ¥{s.purchasePrice}/{s.unit}
                      </div>
                      <div className="text-[10px] text-[#64748b]">
                        在库: {s.currentStock}
                        {s.unit}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Quadrant 2: 短保质 · 临期预警区 */}
          <div className="bg-white p-3.5 rounded-[3px] border border-red-300 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-red-800 text-xs">
                Quadrant II: 短保质期 (≤4天) 极速周转区
              </span>
              <span className="px-1.5 py-0.5 bg-red-100 text-red-900 rounded text-[10px] font-bold">
                控量快销
              </span>
            </div>
            <p className="text-[11px] text-[#64748b]">鲜活海产与冷鲜内脏，严禁超量囤货以防变质损耗</p>
            <div className="divide-y divide-[#e2e8f0] pt-1">
              {skuList
                .filter((s) => s.shelfLifeDays <= 4)
                .map((s) => (
                  <div key={s.id} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#0f172a]">{s.name}</span>
                        {renderStatusBadge(s)}
                      </div>
                      <div className="text-[10px] text-red-600 mt-0.5 font-medium">
                        保质期仅 {s.shelfLifeDays} 天 · 出肉率{' '}
                        {(s.standardYieldRate * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="font-bold text-[#0f172a]">
                        ¥{s.purchasePrice}/{s.unit}
                      </div>
                      <div className="text-[10px] text-[#64748b]">
                        存量: {s.currentStock}
                        {s.unit}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Quadrant 3: 高频常规品 */}
          <div className="bg-white p-3.5 rounded-[3px] border border-emerald-300 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-800 text-xs">
                Quadrant III: 高频走量品 (批量采购折扣)
              </span>
              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-900 rounded text-[10px] font-bold">
                批量协议
              </span>
            </div>
            <p className="text-[11px] text-[#64748b]">日常高频消耗蔬菜与常规肉类，保持安全线以上储备</p>
            <div className="divide-y divide-[#e2e8f0] pt-1">
              {skuList
                .filter((s) => s.purchasePrice < 50 && s.shelfLifeDays > 4)
                .map((s) => (
                  <div key={s.id} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#0f172a]">{s.name}</span>
                        {renderStatusBadge(s)}
                      </div>
                      <div className="text-[10px] text-[#64748b] mt-0.5">
                        安全线: {s.safetyStock}
                        {s.unit} · 建议补货: +{s.reorderSuggestion}
                        {s.unit}
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="font-bold text-[#16a34a]">
                        ¥{s.purchasePrice}/{s.unit}
                      </div>
                      <div className="text-[10px] text-[#64748b]">
                        存量: {s.currentStock}
                        {s.unit}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Quadrant 4: 长效储备区 */}
          <div className="bg-white p-3.5 rounded-[3px] border border-slate-300 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs">
                Quadrant IV: 长效储备品 (包材与调料浓缩)
              </span>
              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-900 rounded text-[10px]">
                定期盘存
              </span>
            </div>
            <p className="text-[11px] text-[#64748b]">保质期长 (≥30天) 且出成率 100%，定期月盘即可</p>
            <div className="divide-y divide-[#e2e8f0] pt-1">
              {skuList
                .filter((s) => s.shelfLifeDays >= 30)
                .map((s) => (
                  <div key={s.id} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#0f172a]">{s.name}</span>
                        {renderStatusBadge(s)}
                      </div>
                      <div className="text-[10px] text-[#64748b] mt-0.5">
                        保质期 {s.shelfLifeDays} 天 · 出肉/利用率 100%
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="font-bold text-[#0f172a]">
                        ¥{s.purchasePrice}/{s.unit}
                      </div>
                      <div className="text-[10px] text-[#64748b]">
                        存量: {s.currentStock}
                        {s.unit}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}

      {/* 1. SkuYieldCalculatorModal */}
      <SkuYieldCalculatorModal
        skuList={skuList}
        isOpen={isYieldCalcOpen}
        onClose={() => setIsYieldCalcOpen(false)}
        onApplyToSku={(skuId, updatedParams) => {
          setSkuList((prev) =>
            prev.map((s) => (s.id === skuId ? { ...s, ...updatedParams } : s))
          );
        }}
        showToast={showToast}
      />

      {/* 2. SkuStockInModal */}
      <SkuStockInModal
        sku={selectedSkuForStockIn}
        isOpen={isStockInModalOpen}
        onClose={() => {
          setIsStockInModalOpen(false);
          setSelectedSkuForStockIn(null);
        }}
        onConfirm={handleConfirmStockIn}
      />

      {/* 3. SkuStockOutModal */}
      <SkuStockOutModal
        sku={selectedSkuForStockOut}
        isOpen={isStockOutModalOpen}
        onClose={() => {
          setIsStockOutModalOpen(false);
          setSelectedSkuForStockOut(null);
        }}
        onConfirm={handleConfirmStockOut}
      />

      {/* 4. SkuEditDetailModal */}
      <SkuEditDetailModal
        sku={selectedSkuForEdit}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedSkuForEdit(null);
        }}
        onSave={handleSaveEditSku}
        showToast={showToast}
      />

      {/* 5. SkuCreateModal */}
      <SkuCreateModal
        isOpen={isNewSkuModalOpen}
        onClose={() => setIsNewSkuModalOpen(false)}
        onCreate={handleCreateNewSku}
        categories={categories}
        totalExistingCount={skuList.length}
      />
    </div>
  );
};
