import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LayoutGrid,
  Truck,
  Check,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react';
import { MerchantTab } from './MerchantSystemView';

export interface TabItemConfig {
  id: MerchantTab;
  label: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  badgeAlert?: boolean;
}

interface MerchantSidebarProps {
  activeTab: MerchantTab;
  onSelectTab: (tab: MerchantTab) => void;
  tabsConfig: TabItemConfig[];
  categories: string[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  truckName?: string;
}

const CATEGORY_STYLES: Record<string, { dot: string; text: string; bg: string; badge: string }> = {
  '实时经营': { dot: 'bg-emerald-500', text: 'text-emerald-800', bg: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-800' },
  '支付财务与报表': { dot: 'bg-amber-500', text: 'text-amber-800', bg: 'bg-amber-50', badge: 'bg-amber-100 text-amber-800' },
  '菜品供应链': { dot: 'bg-sky-500', text: 'text-sky-800', bg: 'bg-sky-50', badge: 'bg-sky-100 text-sky-800' },
  '营销会员': { dot: 'bg-purple-500', text: 'text-purple-800', bg: 'bg-purple-50', badge: 'bg-purple-100 text-purple-800' },
  '门店与位置': { dot: 'bg-orange-500', text: 'text-orange-800', bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-800' },
  '系统团队与硬件': { dot: 'bg-slate-500', text: 'text-slate-800', bg: 'bg-slate-50', badge: 'bg-slate-100 text-slate-800' },
};

export const MerchantSidebar: React.FC<MerchantSidebarProps> = ({
  activeTab,
  onSelectTab,
  tabsConfig,
  categories,
  isCollapsed,
  onToggleCollapse,
  isOpenMobile,
  onCloseMobile,
  truckName
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  const filteredTabs = useMemo(() => {
    if (!searchQuery.trim()) return tabsConfig;
    const q = searchQuery.toLowerCase().trim();
    return tabsConfig.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
    );
  }, [tabsConfig, searchQuery]);

  const activeTabConfig = useMemo(() => {
    return tabsConfig.find((t) => t.id === activeTab) || tabsConfig[0];
  }, [tabsConfig, activeTab]);

  const totalUrgentBadges = useMemo(() => {
    return tabsConfig
      .filter((t) => t.badgeAlert && t.badge && t.badge > 0)
      .reduce((sum, t) => sum + (t.badge || 0), 0);
  }, [tabsConfig]);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#ffffff] text-[#37352f] select-none font-sans overflow-hidden">
      {/* 1. Sidebar Header / Title bar */}
      <div className="p-2.5 sm:p-3 border-b border-[#e6e6e4] flex items-center justify-between bg-[#fafaf9] gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-[4px] bg-[#201f1d] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
            <LayoutGrid className="w-4 h-4 text-emerald-400" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-[#201f1d] tracking-tight">功能导航</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#efefed] text-[#5a5854] rounded-[3px] font-bold">
                  28模块
                </span>
              </div>
              {truckName && (
                <div className="text-[10px] text-[#787774] truncate flex items-center gap-1 mt-0.5" title={truckName}>
                  <Truck className="w-3 h-3 text-[#2b593f] shrink-0" />
                  <span className="truncate max-w-[130px] xl:max-w-[170px]">{truckName}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Desktop Collapse Button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden md:flex p-1.5 hover:bg-[#efefed] rounded-[4px] text-[#787774] hover:text-[#201f1d] transition-all cursor-pointer items-center justify-center border border-transparent hover:border-[#d3d1cb]"
          title={isCollapsed ? '展开完整侧边栏' : '收起为精简图标栏'}
        >
          {isCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>

        {/* Mobile Close Button */}
        <button
          type="button"
          onClick={onCloseMobile}
          className="md:hidden p-1.5 hover:bg-[#efefed] rounded-[4px] text-[#787774] hover:text-[#201f1d] transition-all cursor-pointer items-center justify-center"
          title="关闭导航栏"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Search & Filter Bar (Only when expanded) */}
      {!isCollapsed && (
        <div className="p-2 border-b border-[#efefed] bg-[#ffffff] shrink-0">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-[#9b9a97] absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索功能模块 (支持名称/拼音)..."
              className="w-full pl-8 pr-7 py-1.5 bg-[#f7f7f5] hover:bg-[#efefed] focus:bg-[#ffffff] border border-[#e6e6e4] focus:border-[#201f1d] rounded-[4px] text-xs text-[#201f1d] placeholder:text-[#9b9a97] outline-none transition-all"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 text-[#9b9a97] hover:text-[#201f1d] p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            ) : (
              <span className="absolute right-2 text-[10px] font-mono text-[#b0afa9] bg-[#efefed] px-1 py-0.2 rounded border border-[#e0dfdb] pointer-events-none">
                /
              </span>
            )}
          </div>
        </div>
      )}

      {/* 3. Navigation List grouped by categories */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-1.5 space-y-2.5 custom-scrollbar">
        {categories.map((cat) => {
          const catTabs = filteredTabs.filter((t) => t.category === cat);
          if (catTabs.length === 0) return null;
          const isCatCollapsed = !searchQuery && Boolean(collapsedCategories[cat]);
          const catStyle = CATEGORY_STYLES[cat] || { dot: 'bg-neutral-400', text: 'text-neutral-700', bg: 'bg-neutral-100', badge: 'bg-neutral-100 text-neutral-700' };

          return (
            <div key={cat} className="space-y-0.5">
              {/* Category Header */}
              {!isCollapsed ? (
                <button
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className="w-full px-2 py-1 flex items-center justify-between text-[11px] font-bold text-[#787774] hover:text-[#201f1d] rounded-[3px] transition-colors cursor-pointer group tracking-tight"
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${catStyle.dot}`} />
                    <span>{cat}</span>
                    <span className="text-[10px] font-mono font-normal text-[#9b9a97]">({catTabs.length})</span>
                  </div>
                  <ChevronDown
                    className={`w-3 h-3 text-[#9b9a97] group-hover:text-[#201f1d] transition-transform duration-150 ${
                      isCatCollapsed ? '-rotate-90' : ''
                    }`}
                  />
                </button>
              ) : (
                <div className="w-full border-t border-[#e6e6e4] my-2 pt-1 flex flex-col items-center">
                  <span className={`w-1.5 h-1.5 rounded-full ${catStyle.dot} mb-0.5`} />
                  <span className="text-[9px] text-[#9b9a97] text-center font-bold truncate">
                    {cat.slice(0, 2)}
                  </span>
                </div>
              )}

              {/* Category Tab Items */}
              {!isCatCollapsed && (
                <div className="space-y-0.5">
                  {catTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isSelected = activeTab === tab.id;

                    if (isCollapsed) {
                      // Compact Icon-only mode for mini desktop sidebar
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            onSelectTab(tab.id);
                            onCloseMobile();
                          }}
                          title={`${tab.label} · ${tab.category}`}
                          className={`w-full h-10 rounded-[5px] flex items-center justify-center relative transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#201f1d] text-white shadow-xs'
                              : 'text-[#5a5853] hover:bg-[#efefed] hover:text-[#201f1d]'
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-[#6a6864]'}`} />
                          {isSelected && (
                            <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-emerald-400 rounded-r" />
                          )}
                          {tab.badge !== undefined && tab.badge > 0 && (
                            <span
                              className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
                                tab.badgeAlert ? 'bg-rose-500 animate-pulse' : 'bg-emerald-600'
                              }`}
                            />
                          )}
                        </button>
                      );
                    }

                    // Full Detailed Mode
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          onSelectTab(tab.id);
                          onCloseMobile();
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-[4px] text-xs font-medium flex items-center justify-between gap-2 transition-all cursor-pointer text-left ${
                          isSelected
                            ? 'bg-[#201f1d] text-white font-semibold shadow-xs'
                            : 'text-[#45433d] hover:bg-[#efefed] hover:text-[#191918]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 truncate">
                          <Icon
                            className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                              isSelected ? 'text-emerald-400' : 'text-[#787774]'
                            }`}
                          />
                          <span className="truncate">{tab.label}</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {tab.badge !== undefined && tab.badge > 0 && (
                            <span
                              className={`text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded-[3px] ${
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : tab.badgeAlert
                                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                  : 'bg-[#e6e6e4] text-[#37352f]'
                              }`}
                            >
                              {tab.badge}
                            </span>
                          )}
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {filteredTabs.length === 0 && (
          <div className="p-4 text-center text-xs text-[#9b9a97]">
            未找到匹配「{searchQuery}」的功能模块
          </div>
        )}
      </div>

      {/* 4. Sidebar Footer - Current Active State Summary & Collapse trigger */}
      <div className="p-2.5 border-t border-[#e6e6e4] bg-[#fafaf9] shrink-0">
        {!isCollapsed ? (
          <div className="flex items-center justify-between text-[11px] text-[#787774]">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="truncate font-semibold text-[#201f1d]">
                {activeTabConfig.label}
              </span>
            </div>
            {totalUrgentBadges > 0 && (
              <span className="bg-rose-50 text-rose-600 border border-rose-200 font-bold text-[10px] px-1.5 py-0.2 rounded-[2px] font-mono shrink-0">
                {totalUrgentBadges} 待处理
              </span>
            )}
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1 hover:bg-[#efefed] rounded text-[#787774] hover:text-[#201f1d] cursor-pointer"
              title="展开完整侧边栏"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Full-height column) */}
      <aside
        className={`hidden md:flex flex-col shrink-0 h-full z-30 transition-all duration-200 border-r border-[#e6e6e4] bg-white ${
          isCollapsed ? 'w-16' : 'w-64 xl:w-72'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={onCloseMobile}
          />
          {/* Slide-out Drawer */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200 bg-white">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
