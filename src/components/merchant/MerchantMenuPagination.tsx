import React from 'react';

interface MerchantMenuPaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export const MerchantMenuPagination: React.FC<MerchantMenuPaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange
}) => {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate numbered page buttons (e.g., 1, 2, 3 ... totalPages)
  const pageNumbers: (number | string)[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }
  } else {
    pageNumbers.push(1);
    if (currentPage > 3) {
      pageNumbers.push('...');
    }
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) {
      pageNumbers.push(i);
    }
    if (currentPage < totalPages - 2) {
      pageNumbers.push('...');
    }
    pageNumbers.push(totalPages);
  }

  return (
    <footer className="bg-white border border-[#D3D1CB] p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono rounded-none shadow-xs">
      <div className="text-neutral-600 flex items-center gap-3">
        <span>
          显示第 <strong className="text-[#1A1A17]">{startItem} - {endItem}</strong> 项，共{' '}
          <strong className="text-[#1A1A17]">{totalItems}</strong> 项菜品记录
        </span>

        <div className="flex items-center gap-1.5 pl-2 border-l border-[#D3D1CB]">
          <span className="text-neutral-400">每页:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="border border-[#D3D1CB] bg-white px-1.5 py-0.5 text-xs font-bold text-[#1A1A17] cursor-pointer focus:outline-none focus:border-[#1A1A17] rounded-none"
          >
            <option value={10}>10条</option>
            <option value={20}>20条</option>
            <option value={50}>50条</option>
            <option value={100}>100条</option>
          </select>
        </div>
      </div>

      <div className="flex items-center space-x-1">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          className={`px-2.5 py-1 border border-[#D3D1CB] bg-white rounded-none ${
            currentPage <= 1
              ? 'text-neutral-400 cursor-not-allowed'
              : 'hover:bg-[#FAF9F5] text-neutral-800 cursor-pointer'
          }`}
        >
          上一页
        </button>

        {pageNumbers.map((p, idx) => {
          if (p === '...') {
            return (
              <span key={`ellipsis-${idx}`} className="px-1 text-neutral-400">
                ...
              </span>
            );
          }
          const pageNum = Number(p);
          const isActive = pageNum === currentPage;
          return (
            <button
              key={`page-${pageNum}`}
              type="button"
              onClick={() => onPageChange(pageNum)}
              className={`px-2.5 py-1 rounded-none cursor-pointer ${
                isActive
                  ? 'bg-white border border-[#1A1A17] text-[#1A1A17] font-bold shadow-xs'
                  : 'border border-[#D3D1CB] bg-white hover:bg-[#FAF9F5] text-neutral-800'
              }`}
            >
              {pageNum}
            </button>
          );
        })}

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          className={`px-2.5 py-1 border border-[#D3D1CB] bg-white rounded-none ${
            currentPage >= totalPages
              ? 'text-neutral-400 cursor-not-allowed'
              : 'hover:bg-[#FAF9F5] text-neutral-800 cursor-pointer'
          }`}
        >
          下一页
        </button>
      </div>
    </footer>
  );
};
