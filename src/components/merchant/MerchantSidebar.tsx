import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LayoutGrid,
  Sparkles,
  Layers,
  Truck,
  ShieldAlert,
  Flame,
  Check
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
    <div className="flex flex-col h-full bg-[#ffffff] border-r border-[#e6e6e4] text-[#37352f] select-none font-sans">
      {/* 1. Sidebar Header / Title bar */}
      <div className="p-3 border-b border-[#e6e6e4] flex items-center justify-between bg-[#fafaf9] gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-[3px] bg-[#37352f] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
            <LayoutGrid className="w-3.5 h-3.5" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-[#37352f] tracking-tight">功能导航</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#efefed] text-[#787774] rounded-[2px] font-bold">
                  25模块
                </span>
              </div>
              {truckName && (
                <div className="text-[10px] text-[#787774] truncate flex items-center gap-1 mt-0.5">
                  <Truck className="w-3 h-3 text-[#2b593f] shrink-0" />
                  <span className="truncate">{truckName}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Desktop Collapse Button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden md:flex p-1 hover:bg-[#efefed] rounded-[3px] text-[#787774] hover:text-[#37352f] transition-all cursor-pointer items-center justify-center border border-transparent hover:border-[#d3d1cb]"
          title={isCollapsed ? '展开完整侧边栏' : '折叠为精简侧边栏'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Mobile Close Button */}
        <button
          type="button"
          onClick={onCloseMobile}
          className="md:hidden p-1 hover:bg-[#efefed] rounded-[3px] text-[#787774] hover:text-[#37352f] transition-all cursor-pointer items-center justify-center"
          title="关闭导航栏"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Search & Filter Bar (Only when expanded) */}
      {!isCollapsed && (
        <div className="p-2 border-b border-[#efefed] bg-[#ffffff]">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-[#9b9a97] absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索 25 个功能模块..."
              className="w-full pl-8 pr-7 py-1.5 bg-[#f7f7f5] hover:bg-[#efefed] focus:bg-[#ffffff] border border-[#e6e6e4] focus:border-[#37352f] rounded-[4px] text-xs text-[#37352f] placeholder:text-[#9b9a97] outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 text-[#9b9a97] hover:text-[#37352f] p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. Navigation List grouped by categories */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-1.5 space-y-3 custom-scrollbar">
        {categories.map((cat) => {
          const catTabs = filteredTabs.filter((t) => t.category === cat);
          if (catTabs.length === 0) return null;
          const isCatCollapsed = !searchQuery && Boolean(collapsedCategories[cat]);

          return (
            <div key={cat} className="space-y-0.5">
              {/* Category Header */}
              {!isCollapsed ? (
                <button
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className="w-full px-2 py-1 flex items-center justify-between text-[11px] font-bold text-[#787774] hover:text-[#37352f] rounded-[3px] transition-colors cursor-pointer group uppercase tracking-wider"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{cat}</span>
                    <span className="text-[10px] font-normal text-[#9b9a97]">({catTabs.length})</span>
                  </div>
                  <ChevronDown
                    className={`w-3 h-3 text-[#9b9a97] group-hover:text-[#37352f] transition-transform duration-150 ${
                      isCatCollapsed ? '-rotate-90' : ''
                    }`}
                  />
                </button>
              ) : (
                <div className="w-full border-t border-[#e6e6e4] my-2 pt-1">
                  <div className="text-[9px] text-[#9b9a97] text-center font-bold truncate px-1">
                    {cat.slice(0, 2)}
                  </div>
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
                          title={`${tab.label} (${tab.category})`}
                          className={`w-full h-9 rounded-[4px] flex items-center justify-center relative transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#37352f] text-white shadow-2xs'
                              : 'text-[#5a5853] hover:bg-[#f1f1ef] hover:text-[#37352f]'
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-[#787774]'}`} />
                          {tab.badge !== undefined && tab.badge > 0 && (
                            <span
                              className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                                tab.badgeAlert ? 'bg-[#eb5757] animate-pulse' : 'bg-[#2b593f]'
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
                            ? 'bg-[#37352f] text-white font-semibold shadow-2xs'
                            : 'text-[#45433d] hover:bg-[#f1f1ef] hover:text-[#191918]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 truncate">
                          <Icon
                            className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                              isSelected ? 'text-white' : 'text-[#787774]'
                            }`}
                          />
                          <span className="truncate">{tab.label}</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {tab.badge !== undefined && tab.badge > 0 && (
                            <span
                              className={`text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded-[2px] ${
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : tab.badgeAlert
                                  ? 'bg-[#fbe4e4] text-[#eb5757] border border-[#f5c6cb]'
                                  : 'bg-[#e6e6e4] text-[#37352f]'
                              }`}
                            >
                              {tab.badge}
                            </span>
                          )}
                          {isSelected && <Check className="w-3.5 h-3.5 text-white/90 shrink-0" />}
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

      {/* 4. Sidebar Footer - Current Active State Summary */}
      {!isCollapsed && (
        <div className="p-2.5 border-t border-[#e6e6e4] bg-[#fafaf9] flex items-center justify-between text-[11px] text-[#787774]">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="truncate font-semibold text-[#37352f]">
              {activeTabConfig.label}
            </span>
          </div>
          {totalUrgentBadges > 0 && (
            <span className="bg-[#fbe4e4] text-[#eb5757] font-bold text-[10px] px-1.5 py-0.2 rounded-[2px] font-mono shrink-0">
              {totalUrgentBadges} 待处理
            </span>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Sticky left) */}
      <aside
        className={`hidden md:block shrink-0 sticky top-[48px] h-[calc(100vh-48px)] z-30 transition-all duration-200 ${
          isCollapsed ? 'w-14' : 'w-60 xl:w-64'
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
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
