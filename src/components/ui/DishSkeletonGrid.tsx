import React from 'react';
import { ChefHat, Flame, Clock } from 'lucide-react';
import { ViewMode } from '../../types';

interface DishSkeletonGridProps {
  count?: number;
  viewMode?: ViewMode;
}

/**
 * 单张卡片加载态 - 骨架屏版 (1:1 对齐 DishCard 的视觉几何与暗调黑曜石设计规范)
 */
export const DishCardSkeleton: React.FC<{ index?: number }> = ({ index = 0 }) => {
  return (
    <div
      className="bg-white rounded-xl overflow-hidden shadow-xs border border-[#e2e3e1] flex flex-col relative select-none animate-skeleton"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* 顶部 1:1 / 142px 黑曜石暗调机位图片骨架槽 */}
      <div className="relative h-[130px] sm:h-[142px] w-full bg-[#161616] overflow-hidden">
        {/* Shimmer 光影流动层 */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent -translate-x-full animate-shimmer" />

        {/* 居中主厨图腾水印 */}
        <div className="absolute inset-0 flex items-center justify-center opacity-25">
          <ChefHat className="w-8 h-8 text-neutral-400" />
        </div>

        {/* 左上角用餐模式胶囊骨架 */}
        <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1">
          <div className="h-4 w-11 bg-white/15 backdrop-blur-xs rounded flex items-center gap-1 px-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
            <div className="h-1.5 w-5 bg-white/30 rounded" />
          </div>
        </div>

        {/* 右上角特色标胶囊骨架 */}
        <div className="absolute top-1.5 right-1.5 z-10 flex items-center gap-1">
          <div className="h-4 w-12 bg-amber-500/20 backdrop-blur-xs border border-amber-500/30 rounded flex items-center gap-1 px-1">
            <Flame className="w-2.5 h-2.5 text-amber-400/60" />
            <div className="h-1.5 w-6 bg-amber-400/40 rounded" />
          </div>
        </div>

        {/* 底部出餐与制作时间骨架 */}
        <div className="absolute bottom-1.5 left-1.5 right-1.5 z-10 flex justify-between items-center">
          <div className="h-4 w-14 bg-black/60 backdrop-blur-xs rounded flex items-center gap-1 px-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
            <div className="h-1.5 w-7 bg-white/30 rounded" />
          </div>
          <div className="h-4 w-11 bg-black/60 backdrop-blur-xs rounded flex items-center gap-1 px-1.5">
            <Clock className="w-2 h-2 text-white/40" />
            <div className="h-1.5 w-5 bg-white/30 rounded" />
          </div>
        </div>
      </div>

      {/* 底部信息区骨架 */}
      <div className="p-2 sm:p-2.5 flex flex-col flex-grow justify-between bg-white">
        <div>
          {/* 中文菜品标题骨架 */}
          <div className="flex items-center justify-between gap-2">
            <div className="h-3.5 sm:h-4 bg-neutral-200 rounded w-3/4" />
            <div className="h-3 bg-neutral-100 rounded w-6" />
          </div>

          {/* 英文品名骨架 */}
          <div className="h-2.5 bg-neutral-100 rounded w-1/2 mt-1.5" />

          {/* 优惠标签/阶梯立减计算条骨架 */}
          <div className="mt-2 mb-1 p-1 bg-amber-50/60 border border-amber-100/70 rounded flex items-center justify-between">
            <div className="h-2 w-16 bg-amber-200/70 rounded" />
            <div className="h-2 w-8 bg-amber-200/50 rounded" />
          </div>
        </div>

        {/* 价格与操作加购区骨架 */}
        <div className="flex items-center justify-between pt-1.5 border-t border-[#f0f0ee] gap-1.5 min-w-0 mt-1">
          <div className="flex items-baseline gap-1">
            <div className="h-4 sm:h-5 bg-neutral-800 rounded w-14" />
            <div className="h-2.5 bg-neutral-200 rounded w-8 hidden sm:block" />
          </div>

          {/* 加购按钮骨架 */}
          <div className="h-6 sm:h-6.5 w-14 bg-black rounded-lg flex items-center justify-center gap-1 px-1.5">
            <div className="w-2 h-2 rounded-full bg-white/50" />
            <div className="h-2 w-6 bg-white/70 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 列表单行加载态 - 骨架屏版 (对齐 DishListRow 的布局体系)
 */
export const DishListRowSkeleton: React.FC<{ index?: number }> = ({ index = 0 }) => {
  return (
    <div
      className="bg-white rounded-xl overflow-hidden shadow-xs border border-[#e2e3e1] flex flex-row items-stretch relative select-none animate-skeleton"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* 缩略图骨架槽 */}
      <div className="relative w-24 sm:w-32 min-h-[90px] sm:min-h-[100px] bg-[#161616] overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent -translate-x-full animate-shimmer" />
        <div className="absolute inset-0 flex items-center justify-center opacity-25">
          <ChefHat className="w-6 h-6 text-neutral-400" />
        </div>
        <div className="absolute top-1 left-1">
          <div className="h-3.5 w-9 bg-white/20 backdrop-blur-xs rounded" />
        </div>
        <div className="absolute bottom-1 left-1">
          <div className="h-3.5 w-10 bg-black/60 backdrop-blur-xs rounded" />
        </div>
      </div>

      {/* 右侧信息骨架 */}
      <div className="p-2 sm:p-2.5 flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2">
            <div className="h-3.5 sm:h-4 bg-neutral-200 rounded w-2/3" />
            <div className="h-3 bg-amber-500/20 rounded w-12" />
          </div>
          <div className="h-2.5 bg-neutral-100 rounded w-1/3 mt-1.5" />
          <div className="h-2 bg-neutral-100 rounded w-4/5 mt-1 hidden sm:block" />
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-[#f0f0ee]">
          <div className="flex items-baseline gap-1">
            <div className="h-4 sm:h-5 bg-neutral-800 rounded w-14" />
            <div className="h-2.5 bg-neutral-200 rounded w-8 hidden sm:block" />
          </div>
          <div className="h-6 w-14 bg-black rounded-lg flex items-center justify-center gap-1">
            <div className="w-2 h-2 rounded-full bg-white/50" />
            <div className="h-2 w-6 bg-white/70 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 完整骨架屏网格组件 - 支持视图模式与数量自定义
 */
export const DishSkeletonGrid: React.FC<DishSkeletonGridProps> = ({
  count = 8,
  viewMode = 'grid'
}) => {
  const items = Array.from({ length: count }, (_, i) => i);

  if (viewMode === 'list') {
    return (
      <div className="space-y-1.5 pt-0">
        {items.map((i) => (
          <DishListRowSkeleton key={i} index={i} />
        ))}
      </div>
    );
  }

  if (viewMode === 'grid2') {
    return (
      <div className="grid grid-cols-2 gap-x-1.5 sm:gap-x-2.5 gap-y-1.5 sm:gap-y-2 pt-0">
        {items.map((i) => (
          <DishCardSkeleton key={i} index={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-1.5 sm:gap-x-2.5 gap-y-1.5 sm:gap-y-2 pt-0">
      {items.map((i) => (
        <DishCardSkeleton key={i} index={i} />
      ))}
    </div>
  );
};
