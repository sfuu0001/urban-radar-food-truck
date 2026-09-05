import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  LayoutGrid,
  List,
  AlertTriangle,
  Truck,
  DollarSign,
  ShoppingCart,
  CheckCircle2,
  Clock,
  Building2,
  ArrowRight,
  Filter,
  X,
  FileText,
  Save,
  Check,
  Edit2,
  Sliders,
  Sparkles,
  Phone,
  MapPin,
  Calendar,
  ShieldCheck,
  Thermometer,
  RotateCcw,
  Boxes,
  TrendingDown,
  TrendingUp,
  Trash2
} from 'lucide-react';
import { MaterialItem, PurchaseRecord } from '../../types';
import { INITIAL_MATERIALS, INITIAL_PURCHASE_RECORDS } from '../../data/mockEnhancedData';
import { safeGetStorage, safeSetStorage } from '../../utils/safeStorage';
import { globalVersionEngine } from '../../utils/versionPointerEngine';

interface MaterialViewProps {
  showToast: (msg: string) => void;
}

const STORAGE_KEY = 'obsidian_truck_materials';
const PURCHASE_STORAGE_KEY = 'obsidian_truck_purchase_records';

export const MaterialView: React.FC<MaterialViewProps> = ({ showToast }) => {
  // 1. Persistent state for materials & purchase records
  const [materials, setMaterials] = useState<MaterialItem[]>(() => {
    return safeGetStorage<MaterialItem[]>(STORAGE_KEY, INITIAL_MATERIALS);
  });

  // Listen to external data restoration from Version Tracking Engine
  useEffect(() => {
    const handleDataRestored = (e: Event) => {
      const customEvt = e as CustomEvent<{ module: string }>;
      if (!customEvt.detail || customEvt.detail.module === 'materials') {
        const fresh = safeGetStorage<MaterialItem[]>(STORAGE_KEY, INITIAL_MATERIALS);
        setMaterials(fresh);
      }
    };
    window.addEventListener('obsidian_data_restored', handleDataRestored);
    return () => window.removeEventListener('obsidian_data_restored', handleDataRestored);
  }, []);

  const [purchaseRecords, setPurchaseRecords] = useState<PurchaseRecord[]>(() => {
    return safeGetStorage<PurchaseRecord[]>(PURCHASE_STORAGE_KEY, INITIAL_PURCHASE_RECORDS);
  });

  // Save to storage
  const saveMaterials = (newMaterials: MaterialItem[]) => {
    setMaterials(newMaterials);
    safeSetStorage(STORAGE_KEY, newMaterials);
  };

  const savePurchaseRecords = (newRecords: PurchaseRecord[]) => {
    setPurchaseRecords(newRecords);
    safeSetStorage(PURCHASE_STORAGE_KEY, newRecords);
  };

  // Filters & Views
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [selectedStatus, setSelectedStatus] = useState<string>('全部');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>('全部');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<Partial<MaterialItem>>({
    sku: '',
    name: '',
    category: '肉类原料',
    currentStock: 10,
    safetyStock: 10,
    reorderSuggestion: 20,
    unit: 'kg',
    purchasePrice: 45.0,
    storageLocation: '冷库 A-01',
    storageTempZone: '冷藏 0-4℃',
    supplier: '中粮安达直供冷链',
    supplierContact: '张经理',
    supplierPhone: '13812345678',
    supplierLeadDays: 1,
    supplierRating: 5,
    shelfLifeDays: 7,
    batchNo: `LOT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-01`,
    standardYieldRate: 0.85,
    spec: '标准真空袋装'
  });

  const [adjustModalItem, setAdjustModalItem] = useState<MaterialItem | null>(null);
  const [adjustTargetStock, setAdjustTargetStock] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('日常实盘校准');

  const [restockModalItem, setRestockModalItem] = useState<MaterialItem | null>(null);
  const [restockQty, setRestockQty] = useState<number>(20);
  const [restockPrice, setRestockPrice] = useState<number>(0);
  const [restockSupplier, setRestockSupplier] = useState<string>('');
  const [restockNote, setRestockNote] = useState<string>('');

  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState<boolean>(false);
  const [newOrderForm, setNewOrderForm] = useState({
    sku: 'SKU-RM-001',
    itemName: '澳洲和牛肋条肉 (冷藏真空)',
    category: '肉类原料',
    supplier: '中粮安达直供冷链',
    quantity: 15,
    unit: 'kg',
    unitPrice: 128.0,
    buyer: '张采购 (EMP-8003)',
    notes: '急采晚市高峰预备货源'
  });

  // Calculate KPI metrics
  const lowStockCount = materials.filter((m) => m.currentStock <= m.safetyStock).length;
  const totalSpend = purchaseRecords.reduce((sum, r) => sum + r.totalAmount, 0);
  const inTransitCount = purchaseRecords.filter((r) => r.status === 'in_transit').length;
  const pendingCount = purchaseRecords.filter((r) => r.status === 'pending_approval').length;
  const allSuppliers = useMemo(() => {
    return Array.from(new Set(materials.map((m) => m.supplier).filter(Boolean)));
  }, [materials]);

  const categories = ['全部', '肉类原料', '海鲜水产', '蔬菜品类', '豆制品类', '饮品辅料', '消耗包材', '主食面点'];

  // Filtered materials
  const filteredMaterials = materials.filter((m) => {
    const matchCat = selectedCategory === '全部' || m.category === selectedCategory;
    const matchStatus =
      selectedStatus === '全部' ||
      (selectedStatus === '预警补充' && m.currentStock <= m.safetyStock) ||
      (selectedStatus === '采购在途' && m.status === 'in_transit') ||
      (selectedStatus === '库存充裕' && m.currentStock > m.safetyStock);
    const matchSupplier = selectedSupplierFilter === '全部' || m.supplier === selectedSupplierFilter;
    const matchSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.supplier && m.supplier.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.storageLocation && m.storageLocation.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchStatus && matchSupplier && matchSearch;
  });

  // Edit Material Action
  const handleOpenEdit = (item: MaterialItem) => {
    setEditingMaterial({ ...item });
    setIsEditModalOpen(true);
  };

  const handleSaveEditMaterial = () => {
    if (!editingMaterial) return;
    const oldMaterial = materials.find((m) => m.id === editingMaterial.id);
    const updatedItem = { ...editingMaterial, updatedAt: new Date().toISOString() };
    const updatedList = materials.map((m) => (m.id === editingMaterial.id ? updatedItem : m));
    
    if (oldMaterial) {
      globalVersionEngine.recordDataMutation({
        module: 'materials',
        entityId: editingMaterial.id,
        entityName: editingMaterial.name,
        actionType: 'update',
        beforeData: oldMaterial,
        afterData: updatedItem
      });
    }

    saveMaterials(updatedList);
    setIsEditModalOpen(false);
    setEditingMaterial(null);
    showToast(`原料档案 [${editingMaterial.name}] 信息修改已保存生效！`);
  };

  // Quick Stock Adjustment Action
  const handleOpenAdjust = (item: MaterialItem) => {
    setAdjustModalItem(item);
    setAdjustTargetStock(item.currentStock);
    setAdjustReason('日常实盘校对修正');
  };

  const handleConfirmAdjust = () => {
    if (!adjustModalItem) return;
    const variance = adjustTargetStock - adjustModalItem.currentStock;
    const updatedItem = {
      ...adjustModalItem,
      currentStock: adjustTargetStock,
      status: (adjustTargetStock <= adjustModalItem.safetyStock ? 'warning' : 'normal') as 'warning' | 'normal',
      updatedAt: new Date().toISOString(),
      remark: `${new Date().toLocaleDateString()}: ${adjustReason} (${variance >= 0 ? '+' : ''}${variance.toFixed(1)}${adjustModalItem.unit})`
    };
    const updatedList = materials.map((m) =>
      m.id === adjustModalItem.id ? updatedItem : m
    );

    globalVersionEngine.recordDataMutation({
      module: 'materials',
      entityId: adjustModalItem.id,
      entityName: adjustModalItem.name,
      actionType: 'update',
      beforeData: adjustModalItem,
      afterData: updatedItem,
      customSummary: `库存实盘校准：${adjustModalItem.currentStock} -> ${adjustTargetStock} ${adjustModalItem.unit} (${adjustReason})`
    });

    saveMaterials(updatedList);
    setAdjustModalItem(null);
    showToast(`库存校准完成！[${adjustModalItem.name}] 库存量更新为 ${adjustTargetStock} ${adjustModalItem.unit}`);
  };

  // Quick Inline Stock Inc/Dec
  const handleInlineStockChange = (id: string, delta: number) => {
    const target = materials.find((m) => m.id === id);
    if (!target) return;
    const nextStock = Math.max(0, parseFloat((target.currentStock + delta).toFixed(1)));
    const updatedItem = {
      ...target,
      currentStock: nextStock,
      status: (nextStock <= target.safetyStock ? 'warning' : 'normal') as 'warning' | 'normal',
      updatedAt: new Date().toISOString()
    };
    const updatedList = materials.map((m) =>
      m.id === id ? updatedItem : m
    );

    globalVersionEngine.recordDataMutation({
      module: 'materials',
      entityId: target.id,
      entityName: target.name,
      actionType: 'update',
      beforeData: target,
      afterData: updatedItem,
      customSummary: `快捷修改库存：${target.currentStock} -> ${nextStock} ${target.unit}`
    });

    saveMaterials(updatedList);
    showToast(`[${target.name}] 库存已调整为 ${nextStock} ${target.unit}`);
  };

  // Create New Material
  const handleOpenCreateModal = () => {
    const nextSku = `SKU-RM-${String(materials.length + 1).padStart(3, '0')}`;
    setCreateForm({
      sku: nextSku,
      name: '',
      category: '肉类原料',
      currentStock: 10,
      safetyStock: 10,
      reorderSuggestion: 20,
      unit: 'kg',
      purchasePrice: 45.0,
      storageLocation: '冷库 A-01',
      storageTempZone: '冷藏 0-4℃',
      supplier: '中粮安达直供冷链',
      supplierContact: '张经理',
      supplierPhone: '13812345678',
      supplierLeadDays: 1,
      supplierRating: 5,
      shelfLifeDays: 7,
      batchNo: `LOT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-01`,
      standardYieldRate: 0.85,
      spec: '标准真空袋装'
    });
    setIsCreateModalOpen(true);
  };

  const handleConfirmCreateMaterial = () => {
    if (!createForm.name?.trim()) {
      showToast('请输入原料品名');
      return;
    }
    const newMat: MaterialItem = {
      id: `mat-${Date.now()}`,
      sku: createForm.sku || `SKU-RM-${Date.now().toString().slice(-4)}`,
      name: createForm.name.trim(),
      category: (createForm.category as any) || '肉类原料',
      currentStock: Number(createForm.currentStock) || 0,
      safetyStock: Number(createForm.safetyStock) || 5,
      reorderSuggestion: Number(createForm.reorderSuggestion) || 10,
      unit: createForm.unit || 'kg',
      purchasePrice: Number(createForm.purchasePrice) || 0,
      storageLocation: createForm.storageLocation || '冷库 A-01',
      storageTempZone: createForm.storageTempZone || '冷藏 0-4℃',
      supplier: createForm.supplier || '自采渠道',
      supplierContact: createForm.supplierContact || '',
      supplierPhone: createForm.supplierPhone || '',
      supplierLeadDays: Number(createForm.supplierLeadDays) || 1,
      supplierRating: Number(createForm.supplierRating) || 5,
      purchaseCount: 1,
      lastPurchased: new Date().toISOString().slice(0, 10),
      status: (Number(createForm.currentStock) || 0) <= (Number(createForm.safetyStock) || 5) ? 'warning' : 'normal',
      shelfLifeDays: Number(createForm.shelfLifeDays) || 7,
      batchNo: createForm.batchNo || `LOT-${Date.now().toString().slice(-6)}`,
      standardYieldRate: Number(createForm.standardYieldRate) || 0.85,
      spec: createForm.spec || '',
      updatedAt: new Date().toISOString()
    };

    saveMaterials([newMat, ...materials]);
    globalVersionEngine.recordDataMutation({
      module: 'materials',
      entityId: newMat.id,
      entityName: newMat.name,
      actionType: 'create',
      beforeData: null,
      afterData: newMat,
      customSummary: `新增原物料档案【${newMat.name}】(${newMat.sku})`
    });
    setIsCreateModalOpen(false);
    showToast(`新原料档案 [${newMat.name}] 创建成功并已入库！`);
  };

  // Delete Material
  const handleDeleteMaterial = (id: string, name: string) => {
    const target = materials.find((m) => m.id === id);
    if (confirm(`确认删除原料档案 [${name}] 吗？`)) {
      const updated = materials.filter((m) => m.id !== id);
      if (target) {
        globalVersionEngine.recordDataMutation({
          module: 'materials',
          entityId: id,
          entityName: name,
          actionType: 'delete',
          beforeData: target,
          afterData: null,
          customSummary: `删除原物料档案【${name}】`
        });
      }
      saveMaterials(updated);
      showToast(`原料档案 [${name}] 已删除`);
    }
  };

  // Restock PO Actions
  const handleOpenRestock = (item: MaterialItem) => {
    setRestockModalItem(item);
    setRestockQty(item.reorderSuggestion || 20);
    setRestockPrice(item.purchasePrice || 0);
    setRestockSupplier(item.supplier || '');
    setRestockNote('按建议补货量下单');
  };

  const handleConfirmRestock = () => {
    if (!restockModalItem) return;

    const newRecord: PurchaseRecord = {
      id: `po-${Date.now()}`,
      purchaseNo: `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toLocaleString('zh-CN', { hour12: false }).slice(0, 16),
      itemName: restockModalItem.name,
      category: restockModalItem.category,
      supplier: restockSupplier,
      quantity: restockQty,
      unit: restockModalItem.unit,
      unitPrice: restockPrice,
      totalAmount: restockQty * restockPrice,
      status: 'completed',
      buyer: '李店长 (EMP-8001)',
      notes: restockNote || '快捷补货直入库'
    };

    const updatedMaterials = materials.map((m) =>
      m.id === restockModalItem.id
        ? {
            ...m,
            currentStock: m.currentStock + restockQty,
            lastPurchased: new Date().toISOString().slice(0, 10),
            status: m.currentStock + restockQty <= m.safetyStock ? ('warning' as const) : ('normal' as const),
            purchaseCount: m.purchaseCount + 1,
            purchasePrice: restockPrice,
            supplier: restockSupplier
          }
        : m
    );

    saveMaterials(updatedMaterials);
    savePurchaseRecords([newRecord, ...purchaseRecords]);
    setRestockModalItem(null);
    showToast(`补货成功！已入库 ${restockModalItem.name} +${restockQty}${restockModalItem.unit}，并生成采购单据`);
  };

  const handleCreateNewOrder = () => {
    const newRecord: PurchaseRecord = {
      id: `po-${Date.now()}`,
      purchaseNo: `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toLocaleString('zh-CN', { hour12: false }).slice(0, 16),
      itemName: newOrderForm.itemName,
      category: newOrderForm.category,
      supplier: newOrderForm.supplier,
      quantity: newOrderForm.quantity,
      unit: newOrderForm.unit,
      unitPrice: newOrderForm.unitPrice,
      totalAmount: newOrderForm.quantity * newOrderForm.unitPrice,
      status: 'in_transit',
      buyer: newOrderForm.buyer,
      notes: newOrderForm.notes
    };

    savePurchaseRecords([newRecord, ...purchaseRecords]);
    setIsNewOrderModalOpen(false);
    showToast(`采购订单已下发至供应商 [${newOrderForm.supplier}]，状态：在途冷链配送`);
  };

  return (
    <div id="material-view" className="space-y-3.5 text-xs text-[#0f172a]">
      {/* 1. Header */}
      <div className="bg-white p-3.5 sm:p-4 rounded-[4px] border border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base font-bold text-[#0f172a]">原料档案与安全库存管理</h1>
            <span className="px-2 py-0.5 rounded-[2px] bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0] text-[11px] font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>动态库存 & 合作商直管</span>
            </span>
          </div>
          <p className="text-[11.5px] sm:text-[12px] text-[#64748b] mt-1 leading-relaxed">
            支持动态修改库存量、安全库存警戒线、参考价格、供应商档案与快捷补货盘点
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-create-new-material-archive"
            type="button"
            onClick={handleOpenCreateModal}
            className="px-3 py-2 rounded-[3px] bg-white border border-[#cbd5e1] text-[#0f172a] hover:bg-[#f8fafc] font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors active:scale-95 text-xs"
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>新建原料档案</span>
          </button>
          <button
            id="btn-create-new-purchase-order"
            type="button"
            onClick={() => setIsNewOrderModalOpen(true)}
            className="px-3.5 py-2 rounded-[3px] bg-[#0f172a] text-white hover:bg-black font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors active:scale-95 text-xs"
          >
            <ShoppingCart className="w-4 h-4 text-emerald-400" />
            <span>下发新采购单</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Strip (6 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
        <div className="bg-[#fef2f2]/60 p-2.5 sm:p-3 rounded-[4px] border border-[#fecaca]">
          <div className="text-[10.5px] text-[#991b1b] font-medium flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
            <span>低库存预警</span>
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-red-600 mt-1">
            {lowStockCount} <span className="text-xs font-normal">项告急</span>
          </div>
          <div className="text-[10px] text-[#991b1b]/80 mt-0.5">低于安全警戒线</div>
        </div>

        <div className="bg-white p-2.5 sm:p-3 rounded-[4px] border border-[#e2e8f0]">
          <div className="text-[10.5px] text-[#64748b] font-medium flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-emerald-500 shrink-0" />
            <span>累计采购支出</span>
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-[#0f172a] mt-1 truncate">
            ¥{totalSpend.toFixed(0)}
          </div>
          <div className="text-[10px] text-[#64748b] mt-0.5">全量采购单累计</div>
        </div>

        <div className="bg-white p-2.5 sm:p-3 rounded-[4px] border border-[#e2e8f0]">
          <div className="text-[10.5px] text-[#64748b] font-medium flex items-center gap-1">
            <Boxes className="w-3 h-3 text-blue-500 shrink-0" />
            <span>原料档案总数</span>
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-[#0f172a] mt-1">
            {materials.length} <span className="text-xs font-normal">种物料</span>
          </div>
          <div className="text-[10px] text-[#64748b] mt-0.5">覆盖7大核心品类</div>
        </div>

        <div className="bg-[#eff6ff]/60 p-2.5 sm:p-3 rounded-[4px] border border-[#bfdbfe]">
          <div className="text-[10.5px] text-[#1e40af] font-medium flex items-center gap-1">
            <Truck className="w-3 h-3 text-blue-600 shrink-0" />
            <span>在途配送订单</span>
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-[#2563eb] mt-1">
            {inTransitCount} <span className="text-xs font-normal">单冷链</span>
          </div>
          <div className="text-[10px] text-[#1e40af]/80 mt-0.5">预计今日内到店</div>
        </div>

        <div className="bg-[#fffbeb]/60 p-2.5 sm:p-3 rounded-[4px] border border-[#fde68a]">
          <div className="text-[10.5px] text-[#92400e] font-medium flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600 shrink-0" />
            <span>采购历史单据</span>
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-amber-600 mt-1">
            {purchaseRecords.length} <span className="text-xs font-normal">笔</span>
          </div>
          <div className="text-[10px] text-[#92400e]/80 mt-0.5">全量留存履约单据</div>
        </div>

        <div className="bg-white p-2.5 sm:p-3 rounded-[4px] border border-[#e2e8f0]">
          <div className="text-[10.5px] text-[#64748b] font-medium flex items-center gap-1">
            <Building2 className="w-3 h-3 text-purple-500 shrink-0" />
            <span>合作供应商数</span>
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-[#0f172a] mt-1">
            {allSuppliers.length} <span className="text-xs font-normal">家直供</span>
          </div>
          <div className="text-[10px] text-[#64748b] mt-0.5">支持快捷筛选对接</div>
        </div>
      </div>

      {/* 3. Toolbar (Filter + Supplier Quick Bar + View Toggle + Search) */}
      <div className="bg-white p-2.5 sm:p-3 rounded-[4px] border border-[#e2e8f0] space-y-2 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Categories Horizontal Scroll */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar w-full sm:w-auto">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-[3px] text-[11px] font-semibold transition-all cursor-pointer shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-[#0f172a] text-white shadow-xs'
                      : 'bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 hide-scrollbar">
              {['全部', '预警补充', '采购在途', '库存充裕'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSelectedStatus(st)}
                  className={`px-2 py-0.5 rounded-[3px] text-[10.5px] font-medium transition-all cursor-pointer shrink-0 ${
                    selectedStatus === st
                      ? 'bg-amber-100 text-amber-800 font-bold border border-amber-300'
                      : 'bg-[#f8fafc] text-[#64748b] border border-[#e2e8f0] hover:bg-[#e2e8f0]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-[#94a3b8] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜索品名/编码/合作商/库位..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[3px] pl-8 pr-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center border border-[#cbd5e1] rounded-[3px] overflow-hidden bg-white shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 cursor-pointer transition-colors ${
                  viewMode === 'grid' ? 'bg-[#0f172a] text-white' : 'text-[#64748b] hover:bg-[#f1f5f9]'
                }`}
                title="卡片平铺网格"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 cursor-pointer transition-colors ${
                  viewMode === 'table' ? 'bg-[#0f172a] text-white' : 'text-[#64748b] hover:bg-[#f1f5f9]'
                }`}
                title="采购流水表格"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Supplier Filter Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 border-t border-[#f1f5f9] text-[11px] hide-scrollbar">
          <span className="text-[#64748b] shrink-0 font-medium flex items-center gap-1">
            <Building2 className="w-3 h-3 text-purple-600" />
            <span>合作供应商：</span>
          </span>
          <button
            type="button"
            onClick={() => setSelectedSupplierFilter('全部')}
            className={`px-2 py-0.5 rounded-[2px] transition-colors shrink-0 ${
              selectedSupplierFilter === '全部'
                ? 'bg-purple-100 text-purple-800 font-bold'
                : 'text-[#64748b] hover:bg-[#f1f5f9]'
            }`}
          >
            全部合作商 ({allSuppliers.length})
          </button>
          {allSuppliers.map((sup) => (
            <button
              key={sup}
              type="button"
              onClick={() => setSelectedSupplierFilter(sup)}
              className={`px-2 py-0.5 rounded-[2px] transition-colors shrink-0 ${
                selectedSupplierFilter === sup
                  ? 'bg-purple-100 text-purple-800 font-bold border border-purple-200'
                  : 'text-[#475569] bg-[#f8fafc] hover:bg-[#f1f5f9]'
              }`}
            >
              {sup}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Main Content */}
      {viewMode === 'grid' ? (
        /* Mode A: Material Cards Grid with Full Editing & Quick Actions */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredMaterials.map((mat) => {
            const isLow = mat.currentStock <= mat.safetyStock;
            return (
              <div
                key={mat.id}
                className={`bg-white rounded-[3px] border shadow-2xs flex flex-col justify-between overflow-hidden transition-all ${
                  isLow ? 'border-red-300 ring-1 ring-red-100' : 'border-[#e2e8f0] hover:border-[#0f172a]/40'
                }`}
              >
                <div className="p-3.5 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[10px] text-[#64748b] bg-[#f1f5f9] px-1.5 py-0.2 rounded-[2px]">
                          {mat.sku}
                        </span>
                        <span className="px-1.5 py-0.2 rounded-[2px] bg-blue-50 text-blue-700 text-[10px] font-medium">
                          {mat.category}
                        </span>
                        {mat.storageTempZone && (
                          <span className="px-1.5 py-0.2 rounded-[2px] bg-slate-100 text-slate-600 text-[10px] flex items-center gap-0.5">
                            <Thermometer className="w-2.5 h-2.5" />
                            <span>{mat.storageTempZone}</span>
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-sm text-[#0f172a] mt-1 flex items-center gap-1.5">
                        <span>{mat.name}</span>
                        {mat.spec && <span className="text-[11px] font-normal text-[#64748b]">({mat.spec})</span>}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1">
                      {isLow ? (
                        <span className="px-1.5 py-0.5 rounded-[2px] bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold flex items-center gap-0.5 shrink-0">
                          <AlertTriangle className="w-3 h-3" />
                          <span>缺料告急</span>
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-[2px] bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-medium shrink-0">
                          库存充裕
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(mat)}
                        className="p-1 rounded-[2px] text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] transition-colors cursor-pointer"
                        title="修改原料与安全库存信息"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                      </button>
                    </div>
                  </div>

                  {/* Stock Gauge & Quick +/- Adjuster */}
                  <div className="bg-[#f8fafc] p-2.5 rounded-[3px] border border-[#e2e8f0] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748b] text-[11px]">当前在库存量：</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleInlineStockChange(mat.id, -1)}
                          className="w-5 h-5 rounded-[2px] bg-white border border-[#cbd5e1] text-[#64748b] hover:bg-[#f1f5f9] flex items-center justify-center font-mono font-bold cursor-pointer transition-colors active:scale-95"
                          title="快速扣减 1 单位"
                        >
                          -
                        </button>
                        <span className={`font-mono font-bold text-sm ${isLow ? 'text-red-600' : 'text-[#0f172a]'}`}>
                          {mat.currentStock} {mat.unit}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleInlineStockChange(mat.id, 1)}
                          className="w-5 h-5 rounded-[2px] bg-white border border-[#cbd5e1] text-[#64748b] hover:bg-[#f1f5f9] flex items-center justify-center font-mono font-bold cursor-pointer transition-colors active:scale-95"
                          title="快速增加 1 单位"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenAdjust(mat)}
                          className="ml-1 text-[10px] text-blue-600 hover:underline cursor-pointer"
                        >
                          盘点校准
                        </button>
                      </div>
                    </div>

                    <div className="w-full bg-[#e2e8f0] h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${isLow ? 'bg-red-500' : 'bg-emerald-500'}`}
                        style={{
                          width: `${Math.min(100, (mat.currentStock / Math.max(1, mat.safetyStock * 2)) * 100)}%`
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10.5px] text-[#64748b]">
                      <span className="flex items-center gap-0.5">
                        <span>安全线:</span>
                        <strong className="text-red-600 font-mono">{mat.safetyStock} {mat.unit}</strong>
                      </span>
                      <span>建议补货: +{mat.reorderSuggestion} {mat.unit}</span>
                    </div>
                  </div>

                  {/* Supplier & Price Details */}
                  <div className="space-y-1.5 text-[11px] text-[#475569] bg-white pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748b]">参考采购价格:</span>
                      <span className="font-mono font-bold text-[#0f172a] text-xs">
                        ¥{mat.purchasePrice.toFixed(2)} <span className="text-[10px] font-normal text-[#64748b]">/ {mat.unit}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[#64748b]">合作供应商:</span>
                      <span className="text-[#0f172a] font-medium truncate max-w-[150px] flex items-center gap-1" title={mat.supplier}>
                        <Building2 className="w-3 h-3 text-purple-600 shrink-0" />
                        <span className="truncate">{mat.supplier}</span>
                      </span>
                    </div>

                    {mat.supplierContact && (
                      <div className="flex items-center justify-between text-[10.5px] text-[#64748b]">
                        <span>对接联系人:</span>
                        <span className="text-[#334155] flex items-center gap-1">
                          <span>{mat.supplierContact}</span>
                          {mat.supplierPhone && (
                            <span className="font-mono text-[10px] text-blue-600">{mat.supplierPhone}</span>
                          )}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10.5px]">
                      <span className="text-[#64748b]">库位与温区:</span>
                      <span className="text-[#0f172a] truncate max-w-[140px]">{mat.storageLocation}</span>
                    </div>

                    {mat.shelfLifeDays && (
                      <div className="flex items-center justify-between text-[10.5px] text-[#64748b]">
                        <span>保质期 / 批号:</span>
                        <span className="font-mono text-[#334155]">
                          {mat.shelfLifeDays}天 · {mat.batchNo || 'LOT-最新'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="bg-[#f8fafc] px-3 py-2 border-t border-[#e2e8f0] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(mat)}
                    className="px-2 py-1 rounded-[2px] bg-white border border-[#cbd5e1] text-[#475569] hover:bg-[#f1f5f9] text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Sliders className="w-3 h-3 text-blue-500" />
                    <span>设置参数</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenRestock(mat)}
                    className="px-3 py-1 rounded-[2px] bg-[#0f172a] text-white hover:bg-black font-semibold flex items-center gap-1 cursor-pointer transition-colors text-[11px]"
                  >
                    <ShoppingCart className="w-3 h-3 text-emerald-400" />
                    <span>快捷补货入库</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Mode B: Full 10-Column Purchase Flow Table with Mobile Cards */
        <div className="bg-white rounded-[3px] border border-[#e2e8f0] shadow-2xs overflow-hidden">
          {/* Mobile Card Layout (< md) */}
          <div className="md:hidden divide-y divide-[#e2e8f0]">
            {purchaseRecords.map((rec) => (
              <div key={rec.id} className="p-3 space-y-2 hover:bg-[#f8fafc]/70 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[10px] text-[#64748b] bg-[#f1f5f9] px-1.5 py-0.2 rounded-[2px]">
                        {rec.purchaseNo}
                      </span>
                      <span className="px-1.5 py-0.2 rounded-[2px] bg-blue-50 text-blue-700 text-[10px] font-medium">
                        {rec.category}
                      </span>
                    </div>
                    <h4 className="font-bold text-xs text-[#0f172a] mt-1">{rec.itemName}</h4>
                  </div>
                  <div>
                    {rec.status === 'completed' && (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-[2px] text-[10px] font-semibold">
                        已入库
                      </span>
                    )}
                    {rec.status === 'in_transit' && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-[2px] text-[10px] font-semibold flex items-center gap-1">
                        <Truck className="w-2.5 h-2.5" />
                        <span>在途冷链</span>
                      </span>
                    )}
                    {rec.status === 'pending_approval' && (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-[2px] text-[10px] font-semibold">
                        待审核
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-[#f8fafc] p-2 rounded-[2px] border border-[#f1f5f9] text-[11px]">
                  <div>
                    <span className="text-[#64748b]">采购数量: </span>
                    <strong className="font-mono text-[#0f172a]">{rec.quantity} {rec.unit}</strong>
                    <span className="text-[#64748b] text-[10px] block">单价: ¥{rec.unitPrice.toFixed(2)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[#64748b]">订单总额: </span>
                    <div className="font-mono font-bold text-xs text-[#16a34a]">
                      ¥{rec.totalAmount.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#64748b] pt-0.5">
                  <div className="truncate max-w-[170px]">供应商: {rec.supplier}</div>
                  <div>采买: {rec.buyer} · {rec.timestamp}</div>
                </div>
              </div>
            ))}

            {/* Mobile Footer Total */}
            <div className="p-3 bg-[#f8fafc] border-t border-[#e2e8f0] flex items-center justify-between text-xs font-bold text-[#0f172a]">
              <span>全量共 {purchaseRecords.length} 笔订单</span>
              <div className="text-right">
                <span className="text-[11px] text-[#64748b] font-normal mr-1.5">总采购支出:</span>
                <span className="font-mono text-sm text-[#16a34a]">¥{totalSpend.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Desktop Table (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fafc] text-[#64748b] border-b border-[#e2e8f0] font-semibold">
                <tr>
                  <th className="p-2.5">采购单号</th>
                  <th className="p-2.5">下单时间</th>
                  <th className="p-2.5">原料品名</th>
                  <th className="p-2.5">合作供应商</th>
                  <th className="p-2.5 text-right">采购数量</th>
                  <th className="p-2.5 text-right">采购单价</th>
                  <th className="p-2.5 text-right">订单总金额</th>
                  <th className="p-2.5 text-center">履约状态</th>
                  <th className="p-2.5">采买人</th>
                  <th className="p-2.5">备注与操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {purchaseRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-[#f8fafc]/70 transition-colors">
                    <td className="p-2.5 font-mono font-medium text-[#0f172a]">{rec.purchaseNo}</td>
                    <td className="p-2.5 text-[#64748b]">{rec.timestamp}</td>
                    <td className="p-2.5 font-bold text-[#0f172a]">
                      <div>{rec.itemName}</div>
                      <div className="text-[10px] text-[#64748b] font-normal">{rec.category}</div>
                    </td>
                    <td className="p-2.5 text-[#475569]">{rec.supplier}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-[#0f172a]">
                      {rec.quantity} {rec.unit}
                    </td>
                    <td className="p-2.5 text-right text-[#64748b]">¥{rec.unitPrice.toFixed(2)}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-[#16a34a]">
                      ¥{rec.totalAmount.toFixed(2)}
                    </td>
                    <td className="p-2.5 text-center">
                      {rec.status === 'completed' && (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-[2px] text-[10px] font-semibold">
                          已入库
                        </span>
                      )}
                      {rec.status === 'in_transit' && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-[2px] text-[10px] font-semibold flex items-center justify-center gap-1">
                          <Truck className="w-2.5 h-2.5" />
                          <span>在途冷链</span>
                        </span>
                      )}
                      {rec.status === 'pending_approval' && (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-[2px] text-[10px] font-semibold">
                          待审核
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 text-[#64748b]">{rec.buyer}</td>
                    <td className="p-2.5 text-[#64748b]">
                      <div className="text-[11px] truncate max-w-[140px]">{rec.notes || '无'}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#f8fafc] font-bold text-[#0f172a] border-t border-[#e2e8f0]">
                <tr>
                  <td colSpan={4} className="p-2.5">
                    全量合计：{purchaseRecords.length} 笔订单
                  </td>
                  <td colSpan={2} className="p-2.5 text-right">总采购支出金额：</td>
                  <td className="p-2.5 text-right font-mono text-sm text-[#16a34a]">
                    ¥{totalSpend.toFixed(2)}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: Edit Material & Safety Stock Parameters (编辑原料档案与安全库存) */}
      {isEditModalOpen && editingMaterial && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-[4px] border border-[#e2e8f0] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs my-6">
            <div className="bg-[#f8fafc] px-4 py-3 border-b border-[#e2e8f0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-[2px] bg-[#0f172a] text-white flex items-center justify-center font-bold">
                  <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#0f172a]">编辑原料档案与安全库存参数</h3>
                  <p className="text-[11px] text-[#64748b]">修改当前在库量、警戒阈值、参考价格及合作商信息</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-[#64748b] hover:text-[#0f172a] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5 max-h-[75vh] overflow-y-auto">
              {/* 1. Basic Info */}
              <div className="space-y-2">
                <h4 className="font-bold text-[#0f172a] text-xs flex items-center gap-1.5 pb-1 border-b border-[#f1f5f9]">
                  <Boxes className="w-3.5 h-3.5 text-blue-600" />
                  <span>基础物料信息</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-[#64748b] font-medium mb-1">原料品名 *</label>
                    <input
                      type="text"
                      value={editingMaterial.name}
                      onChange={(e) => setEditingMaterial({ ...editingMaterial, name: e.target.value })}
                      className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] font-bold focus:outline-none focus:border-[#0f172a]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#64748b] font-medium mb-1">SKU 编码</label>
                    <input
                      type="text"
                      value={editingMaterial.sku}
                      onChange={(e) => setEditingMaterial({ ...editingMaterial, sku: e.target.value })}
                      className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs font-mono text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-[#64748b] font-medium mb-1">所属品类</label>
                    <select
                      value={editingMaterial.category}
                      onChange={(e) => setEditingMaterial({ ...editingMaterial, category: e.target.value as any })}
                      className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                    >
                      {categories.filter((c) => c !== '全部').map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#64748b] font-medium mb-1">计量单位</label>
                    <input
                      type="text"
                      value={editingMaterial.unit}
                      onChange={(e) => setEditingMaterial({ ...editingMaterial, unit: e.target.value })}
                      placeholder="kg, 份, 箱, 瓶..."
                      className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#64748b] font-medium mb-1">规格包装</label>
                    <input
                      type="text"
                      value={editingMaterial.spec || ''}
                      onChange={(e) => setEditingMaterial({ ...editingMaterial, spec: e.target.value })}
                      placeholder="如 1kg/袋, 25kg/箱"
                      className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Stock & Threshold Parameters */}
              <div className="space-y-2 pt-1">
                <h4 className="font-bold text-[#0f172a] text-xs flex items-center gap-1.5 pb-1 border-b border-[#f1f5f9]">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>库存与安全预警参数</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-[#f8fafc] p-3 rounded-[3px] border border-[#e2e8f0]">
                  <div>
                    <label className="block text-[11px] text-[#0f172a] font-bold mb-1">
                      当前在库存量 ({editingMaterial.unit}) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={editingMaterial.currentStock}
                      onChange={(e) =>
                        setEditingMaterial({ ...editingMaterial, currentStock: Number(e.target.value) })
                      }
                      className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono font-bold text-sm text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                    />
                    <span className="text-[10px] text-[#64748b]">实时系统记账存量</span>
                  </div>

                  <div>
                    <label className="block text-[11px] text-red-600 font-bold mb-1">
                      安全库存警戒线 ({editingMaterial.unit}) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={editingMaterial.safetyStock}
                      onChange={(e) =>
                        setEditingMaterial({ ...editingMaterial, safetyStock: Number(e.target.value) })
                      }
                      className="w-full bg-white border border-red-300 rounded-[2px] px-2.5 py-1.5 font-mono font-bold text-sm text-red-600 focus:outline-none focus:border-red-600"
                    />
                    <span className="text-[10px] text-red-500">低于此值触发红色报警</span>
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#64748b] font-medium mb-1">
                      建议补货量 ({editingMaterial.unit})
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={editingMaterial.reorderSuggestion}
                      onChange={(e) =>
                        setEditingMaterial({ ...editingMaterial, reorderSuggestion: Number(e.target.value) })
                      }
                      className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                    />
                    <span className="text-[10px] text-[#64748b]">一键补货默认填充</span>
                  </div>
                </div>
              </div>

              {/* 3. Price & Supplier Partner Details */}
              <div className="space-y-2 pt-1">
                <h4 className="font-bold text-[#0f172a] text-xs flex items-center gap-1.5 pb-1 border-b border-[#f1f5f9]">
                  <Building2 className="w-3.5 h-3.5 text-purple-600" />
                  <span>参考价格与合作供应商档案</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-[#0f172a] font-bold mb-1">
                      参考采购价格 (元/{editingMaterial.unit}) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[#64748b]">¥</span>
                      <input
                        type="number"
                        step="0.1"
                        value={editingMaterial.purchasePrice}
                        onChange={(e) =>
                          setEditingMaterial({ ...editingMaterial, purchasePrice: Number(e.target.value) })
                        }
                        className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] pl-6 pr-2.5 py-1.5 font-mono font-bold text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#64748b] font-medium mb-1">合作商名称 *</label>
                    <input
                      type="text"
                      value={editingMaterial.supplier}
                      onChange={(e) => setEditingMaterial({ ...editingMaterial, supplier: e.target.value })}
                      placeholder="如 中粮安达直供冷链"
                      className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] font-semibold focus:outline-none focus:border-[#0f172a]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-[#64748b] font-medium mb-1">合作商联系人</label>
                    <input
                      type="text"
                      value={editingMaterial.supplierContact || ''}
                      onChange={(e) =>
                        setEditingMaterial({ ...editingMaterial, supplierContact: e.target.value })
                      }
                      placeholder="如 张经理"
                      className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#64748b] font-medium mb-1">联系电话/微信</label>
                    <input
                      type="text"
                      value={editingMaterial.supplierPhone || ''}
                      onChange={(e) =>
                        setEditingMaterial({ ...editingMaterial, supplierPhone: e.target.value })
                      }
                      placeholder="如 138-0000-0000"
                      className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] font-mono focus:outline-none focus:border-[#0f172a]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#64748b] font-medium mb-1">供货周期 (天)</label>
                    <input
                      type="number"
                      value={editingMaterial.supplierLeadDays || 1}
                      onChange={(e) =>
                        setEditingMaterial({ ...editingMaterial, supplierLeadDays: Number(e.target.value) })
                      }
                      className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] font-mono focus:outline-none focus:border-[#0f172a]"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Storage & Temperature */}
              <div className="space-y-2 pt-1">
                <h4 className="font-bold text-[#0f172a] text-xs flex items-center gap-1.5 pb-1 border-b border-[#f1f5f9]">
                  <Thermometer className="w-3.5 h-3.5 text-sky-600" />
                  <span>存放库位与温区控制</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-[#64748b] font-medium mb-1">存放库位</label>
                    <input
                      type="text"
                      value={editingMaterial.storageLocation}
                      onChange={(e) =>
                        setEditingMaterial({ ...editingMaterial, storageLocation: e.target.value })
                      }
                      placeholder="如 冷库 A-03"
                      className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#64748b] font-medium mb-1">存储温区</label>
                    <select
                      value={editingMaterial.storageTempZone || '冷藏 0-4℃'}
                      onChange={(e) =>
                        setEditingMaterial({ ...editingMaterial, storageTempZone: e.target.value })
                      }
                      className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                    >
                      <option value="冷冻 -18℃">冷冻 -18℃</option>
                      <option value="冷藏 0-4℃">冷藏 0-4℃</option>
                      <option value="恒温 12-15℃">恒温 12-15℃</option>
                      <option value="常温阴凉通风">常温阴凉通风</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#64748b] font-medium mb-1">保质期 (天)</label>
                    <input
                      type="number"
                      value={editingMaterial.shelfLifeDays || 7}
                      onChange={(e) =>
                        setEditingMaterial({ ...editingMaterial, shelfLifeDays: Number(e.target.value) })
                      }
                      className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] font-mono focus:outline-none focus:border-[#0f172a]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-[#f8fafc] px-4 py-3 border-t border-[#e2e8f0] flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleDeleteMaterial(editingMaterial.id, editingMaterial.name)}
                className="text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer text-xs font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>删除档案</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3 py-1.5 rounded-[2px] bg-white text-[#64748b] border border-[#cbd5e1] hover:bg-[#f1f5f9] cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditMaterial}
                  className="px-4 py-1.5 rounded-[2px] bg-[#0f172a] text-white hover:bg-black font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Save className="w-3.5 h-3.5 text-emerald-400" />
                  <span>保存修改并生效</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Create New Raw Material (新建原料档案) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-[4px] border border-[#e2e8f0] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs my-6">
            <div className="bg-[#f8fafc] px-4 py-3 border-b border-[#e2e8f0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-[2px] bg-[#0f172a] text-white flex items-center justify-center font-bold">
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#0f172a]">新建原料档案与库存基准</h3>
                  <p className="text-[11px] text-[#64748b]">录入新食材或消耗物料，设定安全库存与直通供应商</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[#64748b] hover:text-[#0f172a] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">原料品名 *</label>
                  <input
                    type="text"
                    placeholder="如：内蒙古锡盟羔羊后腿肉"
                    value={createForm.name || ''}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] font-bold focus:outline-none focus:border-[#0f172a]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">SKU 编码</label>
                  <input
                    type="text"
                    value={createForm.sku || ''}
                    onChange={(e) => setCreateForm({ ...createForm, sku: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs font-mono text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">品类划分</label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value as any })}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                  >
                    {categories.filter((c) => c !== '全部').map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">计量单位</label>
                  <input
                    type="text"
                    placeholder="kg, 份, 箱, 串..."
                    value={createForm.unit || 'kg'}
                    onChange={(e) => setCreateForm({ ...createForm, unit: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">规格包装</label>
                  <input
                    type="text"
                    placeholder="如 1kg/袋, 25kg/箱"
                    value={createForm.spec || ''}
                    onChange={(e) => setCreateForm({ ...createForm, spec: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                  />
                </div>
              </div>

              {/* Stock & Thresholds */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-[#f8fafc] p-3 rounded-[3px] border border-[#e2e8f0]">
                <div>
                  <label className="block text-[11px] text-[#0f172a] font-bold mb-1">期初库存量 *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={createForm.currentStock}
                    onChange={(e) => setCreateForm({ ...createForm, currentStock: Number(e.target.value) })}
                    className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono font-bold text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-red-600 font-bold mb-1">安全库存警戒线 *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={createForm.safetyStock}
                    onChange={(e) => setCreateForm({ ...createForm, safetyStock: Number(e.target.value) })}
                    className="w-full bg-white border border-red-300 rounded-[2px] px-2.5 py-1.5 font-mono font-bold text-xs text-red-600 focus:outline-none focus:border-red-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">建议补货量</label>
                  <input
                    type="number"
                    step="0.1"
                    value={createForm.reorderSuggestion}
                    onChange={(e) => setCreateForm({ ...createForm, reorderSuggestion: Number(e.target.value) })}
                    className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                  />
                </div>
              </div>

              {/* Price & Supplier */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-[#0f172a] font-bold mb-1">参考采购价格 (元/单位) *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={createForm.purchasePrice}
                    onChange={(e) => setCreateForm({ ...createForm, purchasePrice: Number(e.target.value) })}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono font-bold text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">合作商名称 *</label>
                  <input
                    type="text"
                    placeholder="如 威海乳山直供海产"
                    value={createForm.supplier || ''}
                    onChange={(e) => setCreateForm({ ...createForm, supplier: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] font-semibold focus:outline-none focus:border-[#0f172a]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">存放库位</label>
                  <input
                    type="text"
                    value={createForm.storageLocation || '冷库 A-01'}
                    onChange={(e) => setCreateForm({ ...createForm, storageLocation: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">温区控制</label>
                  <select
                    value={createForm.storageTempZone || '冷藏 0-4℃'}
                    onChange={(e) => setCreateForm({ ...createForm, storageTempZone: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                  >
                    <option value="冷冻 -18℃">冷冻 -18℃</option>
                    <option value="冷藏 0-4℃">冷藏 0-4℃</option>
                    <option value="恒温 12-15℃">恒温 12-15℃</option>
                    <option value="常温阴凉通风">常温阴凉通风</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">保质期 (天)</label>
                  <input
                    type="number"
                    value={createForm.shelfLifeDays || 7}
                    onChange={(e) => setCreateForm({ ...createForm, shelfLifeDays: Number(e.target.value) })}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] font-mono focus:outline-none focus:border-[#0f172a]"
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#f8fafc] px-4 py-3 border-t border-[#e2e8f0] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-3 py-1.5 rounded-[2px] bg-white text-[#64748b] border border-[#cbd5e1] hover:bg-[#f1f5f9] cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmCreateMaterial}
                className="px-4 py-1.5 rounded-[2px] bg-[#0f172a] text-white hover:bg-black font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>完成录入并归档</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Quick Stock Adjustment (盘点校准弹窗) */}
      {adjustModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-md rounded-[4px] border border-[#e2e8f0] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="bg-[#f8fafc] px-4 py-3 border-b border-[#e2e8f0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-[2px] bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Sliders className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-bold text-sm text-[#0f172a]">实盘校准与快速库存调整</h3>
              </div>
              <button
                type="button"
                onClick={() => setAdjustModalItem(null)}
                className="text-[#64748b] hover:text-[#0f172a] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="bg-[#f8fafc] p-3 rounded-[3px] border border-[#e2e8f0] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#0f172a]">{adjustModalItem.name}</span>
                  <span className="font-mono text-xs text-[#64748b]">{adjustModalItem.sku}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-[#64748b]">
                  <span>系统账面结存:</span>
                  <span className="font-mono font-bold text-[#0f172a]">
                    {adjustModalItem.currentStock} {adjustModalItem.unit}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-[#0f172a] font-bold mb-1">
                  实盘修正后在库量 ({adjustModalItem.unit}) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={adjustTargetStock}
                  onChange={(e) => setAdjustTargetStock(Number(e.target.value))}
                  className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-3 py-2 font-mono font-bold text-base text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#64748b] font-medium mb-1">调整原因与备注</label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                >
                  <option value="日常实盘校对修正">日常实盘校对修正</option>
                  <option value="备料损耗与切配余量">备料损耗与切配余量</option>
                  <option value="早市验货误差盘点">早市验货误差盘点</option>
                  <option value="打烊封账清点实物">打烊封账清点实物</option>
                </select>
              </div>

              {/* Variance display */}
              <div className="p-2.5 rounded-[2px] bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-[#64748b]">差额波动：</span>
                <span
                  className={`font-mono font-bold ${
                    adjustTargetStock - adjustModalItem.currentStock >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {adjustTargetStock - adjustModalItem.currentStock >= 0 ? '+' : ''}
                  {(adjustTargetStock - adjustModalItem.currentStock).toFixed(1)} {adjustModalItem.unit}
                </span>
              </div>
            </div>

            <div className="bg-[#f8fafc] px-4 py-2.5 border-t border-[#e2e8f0] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setAdjustModalItem(null)}
                className="px-3 py-1 rounded-[2px] bg-white text-[#64748b] border border-[#cbd5e1] hover:bg-[#f1f5f9] cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmAdjust}
                className="px-3.5 py-1 rounded-[2px] bg-[#0f172a] text-white hover:bg-black font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>确认校准并保存</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Quick Restock Modal (采购详情与快捷补货弹窗) */}
      {restockModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-lg rounded-[3px] border border-[#e2e8f0] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="bg-[#f8fafc] px-4 py-3 border-b border-[#e2e8f0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-[2px] bg-[#0f172a] text-white flex items-center justify-center font-bold">
                  <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <h3 className="font-bold text-sm text-[#0f172a]">原料档案与快捷补货入库</h3>
              </div>
              <button
                type="button"
                onClick={() => setRestockModalItem(null)}
                className="text-[#64748b] hover:text-[#0f172a] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5">
              {/* Material Info Card */}
              <div className="bg-[#f8fafc] p-3 rounded-[3px] border border-[#e2e8f0] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#0f172a]">{restockModalItem.name}</span>
                  <span className="font-mono text-xs text-[#64748b]">{restockModalItem.sku}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <span className="text-[#64748b]">当前库存:</span>
                    <div className="font-mono font-bold text-[#0f172a]">
                      {restockModalItem.currentStock} {restockModalItem.unit}
                    </div>
                  </div>
                  <div>
                    <span className="text-[#64748b]">安全警戒线:</span>
                    <div className="font-mono text-red-600 font-bold">
                      {restockModalItem.safetyStock} {restockModalItem.unit}
                    </div>
                  </div>
                  <div>
                    <span className="text-[#64748b]">库位:</span>
                    <div className="text-[#0f172a]">{restockModalItem.storageLocation}</div>
                  </div>
                </div>
              </div>

              {/* Form fields */}
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">
                    合作供应商 (带建议直供标)
                  </label>
                  <select
                    value={restockSupplier}
                    onChange={(e) => setRestockSupplier(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                  >
                    <option value={restockModalItem.supplier}>
                      {restockModalItem.supplier} {restockModalItem.supplierSuggest ? '⭐ [官方推荐直供]' : ''}
                    </option>
                    {allSuppliers.map((sup) => (
                      <option key={sup} value={sup}>{sup}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-[#64748b] font-medium mb-1">
                      进货单价 (元/{restockModalItem.unit})
                    </label>
                    <input
                      type="number"
                      value={restockPrice}
                      onChange={(e) => setRestockPrice(Number(e.target.value))}
                      className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#64748b] font-medium mb-1">
                      补货数量 ({restockModalItem.unit})
                    </label>
                    <input
                      type="number"
                      value={restockQty}
                      onChange={(e) => setRestockQty(Number(e.target.value))}
                      className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono font-bold text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">入库备注</label>
                  <input
                    type="text"
                    placeholder="如：早市清晨冷链验货合格"
                    value={restockNote}
                    onChange={(e) => setRestockNote(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                  />
                </div>

                {/* Calculation Summary */}
                <div className="bg-[#f0fdf4] p-2.5 rounded-[2px] border border-[#bbf7d0] flex items-center justify-between text-xs">
                  <span className="text-[#166534] font-medium">本次补货总支出：</span>
                  <span className="font-mono font-bold text-[#16a34a] text-sm">
                    ¥{(restockQty * restockPrice).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-[#f8fafc] px-4 py-2.5 border-t border-[#e2e8f0] flex items-center justify-between">
              <span className="text-[11px] text-[#64748b]">提交后系统将自动累加理论库存并记录流水</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRestockModalItem(null)}
                  className="px-3 py-1 rounded-[2px] bg-white text-[#64748b] border border-[#cbd5e1] hover:bg-[#f1f5f9] cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRestock}
                  className="px-3.5 py-1 rounded-[2px] bg-[#0f172a] text-white hover:bg-black font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>立刻进货入库</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: New Purchase Order Modal */}
      {isNewOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-lg rounded-[3px] border border-[#e2e8f0] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="bg-[#f8fafc] px-4 py-3 border-b border-[#e2e8f0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-[2px] bg-[#0f172a] text-white flex items-center justify-center font-bold">
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <h3 className="font-bold text-sm text-[#0f172a]">下发新采购订单 (PO Generation)</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewOrderModalOpen(false)}
                className="text-[#64748b] hover:text-[#0f172a] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <label className="block text-[11px] text-[#64748b] font-medium mb-1">采购原料品名</label>
                <select
                  value={newOrderForm.sku}
                  onChange={(e) => {
                    const found = materials.find((m) => m.sku === e.target.value);
                    if (found) {
                      setNewOrderForm({
                        ...newOrderForm,
                        sku: found.sku,
                        itemName: found.name,
                        category: found.category,
                        supplier: found.supplier,
                        unit: found.unit,
                        unitPrice: found.purchasePrice
                      });
                    }
                  }}
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                >
                  {materials.map((m) => (
                    <option key={m.sku} value={m.sku}>
                      {m.name} ({m.sku}) - 存量 {m.currentStock}{m.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">合作供应商</label>
                  <input
                    type="text"
                    value={newOrderForm.supplier}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, supplier: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">经办采买人</label>
                  <input
                    type="text"
                    value={newOrderForm.buyer}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, buyer: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">采购数量 ({newOrderForm.unit})</label>
                  <input
                    type="number"
                    value={newOrderForm.quantity}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, quantity: Number(e.target.value) })}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono font-bold text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">单价 (元)</label>
                  <input
                    type="number"
                    value={newOrderForm.unitPrice}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, unitPrice: Number(e.target.value) })}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-[#64748b] font-medium mb-1">订单要求与发货说明</label>
                <input
                  type="text"
                  value={newOrderForm.notes}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, notes: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                />
              </div>

              <div className="bg-[#eff6ff] p-2.5 rounded-[2px] border border-[#bfdbfe] flex items-center justify-between text-xs">
                <span className="text-[#1e40af] font-medium">预计订单总额：</span>
                <span className="font-mono font-bold text-[#2563eb] text-sm">
                  ¥{(newOrderForm.quantity * newOrderForm.unitPrice).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="bg-[#f8fafc] px-4 py-2.5 border-t border-[#e2e8f0] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsNewOrderModalOpen(false)}
                className="px-3 py-1 rounded-[2px] bg-white text-[#64748b] border border-[#cbd5e1] hover:bg-[#f1f5f9] cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleCreateNewOrder}
                className="px-3.5 py-1 rounded-[2px] bg-[#0f172a] text-white hover:bg-black font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5 text-sky-400" />
                <span>下发采购单</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
