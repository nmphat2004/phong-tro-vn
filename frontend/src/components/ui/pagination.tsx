'use client';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
	page: number;
	totalPages: number;
	total: number;
	limit: number;
	onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, limit, onPageChange }: PaginationProps) {
	if (totalPages <= 1) return null;

	const from = (page - 1) * limit + 1;
	const to = Math.min(page * limit, total);

	// Generate page numbers to show
	const getPageNumbers = () => {
		const pages: (number | '...')[] = [];
		const maxVisible = 5;

		if (totalPages <= maxVisible + 2) {
			for (let i = 1; i <= totalPages; i++) pages.push(i);
		} else {
			pages.push(1);
			if (page > 3) pages.push('...');

			const start = Math.max(2, page - 1);
			const end = Math.min(totalPages - 1, page + 1);

			for (let i = start; i <= end; i++) pages.push(i);

			if (page < totalPages - 2) pages.push('...');
			pages.push(totalPages);
		}
		return pages;
	};

	return (
		<div className='flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-border'>
			{/* Info */}
			<p className='text-sm text-muted-foreground order-2 sm:order-1'>
				Hiển thị <span className='font-semibold text-foreground'>{from}-{to}</span> trong{' '}
				<span className='font-semibold text-foreground'>{total}</span> kết quả
			</p>

			{/* Controls */}
			<div className='flex items-center gap-1 order-1 sm:order-2'>
				{/* First page */}
				<button
					onClick={() => onPageChange(1)}
					disabled={page === 1}
					className='p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors'
					title='Trang đầu'>
					<ChevronsLeft className='w-4 h-4' />
				</button>

				{/* Previous */}
				<button
					onClick={() => onPageChange(page - 1)}
					disabled={page === 1}
					className='p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors'
					title='Trang trước'>
					<ChevronLeft className='w-4 h-4' />
				</button>

				{/* Page numbers */}
				<div className='flex items-center gap-1'>
					{getPageNumbers().map((p, idx) =>
						p === '...' ?
							<span key={`dots-${idx}`} className='px-2 text-muted-foreground text-sm'>
								...
							</span>
						:	<button
								key={p}
								onClick={() => onPageChange(p)}
								className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors ${
									p === page
										? 'bg-blue-600 text-white shadow-sm'
										: 'text-muted-foreground hover:bg-secondary hover:text-foreground'
								}`}>
								{p}
							</button>,
					)}
				</div>

				{/* Next */}
				<button
					onClick={() => onPageChange(page + 1)}
					disabled={page === totalPages}
					className='p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors'
					title='Trang sau'>
					<ChevronRight className='w-4 h-4' />
				</button>

				{/* Last page */}
				<button
					onClick={() => onPageChange(totalPages)}
					disabled={page === totalPages}
					className='p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors'
					title='Trang cuối'>
					<ChevronsRight className='w-4 h-4' />
				</button>
			</div>
		</div>
	);
}
