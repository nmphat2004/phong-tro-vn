'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from 'lucide-react';

const demandColor: Record<string, string> = {
	very_high: 'bg-red-500',
	high: 'bg-orange-400',
	medium: 'bg-yellow-400',
	low: 'bg-green-500',
};
const demandLabel: Record<string, string> = {
	very_high: 'Rất cao',
	high: 'Cao',
	medium: 'Trung bình',
	low: 'Thấp ✅',
};

export default function SeasonalWidget({ district }: { district?: string }) {
	const { data, isLoading } = useQuery({
		queryKey: ['seasonal', district],
		queryFn: () =>
			api
				.get(`/analytics/seasonal${district ? `?district=${district}` : ''}`)
				.then((r) => r.data),
		staleTime: 1000 * 60 * 60, // cache 1 giờ
	});

	if (isLoading) {
		return (
			<div className='border rounded-xl p-5 space-y-3'>
				<Skeleton className='h-5 w-48' />
				<Skeleton className='h-20 w-full' />
			</div>
		);
	}

	if (!data) return null;

	return (
		<div className='border rounded-xl p-5 space-y-4'>
			<h3 className='font-semibold flex items-center gap-2'>
				<Calendar className='w-4 h-4 text-blue-600' />
				Thời điểm thuê tốt nhất
			</h3>

			{/* Hybrid Recommendation Panel */}
			{data.aiAdvice && (
				<div className='bg-linear-to-br from-indigo-50/60 to-purple-50/60 dark:from-indigo-950/20 dark:to-purple-950/20 rounded-xl p-4 text-sm border border-indigo-100/80 dark:border-indigo-900/30 shadow-sm space-y-2'>
					<span className='font-semibold text-[10px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-100/60 dark:bg-indigo-900/40 px-2.5 py-0.5 rounded-full w-max flex items-center gap-1.5'>
						✨ Gợi ý thời điểm thuê
					</span>
					<div className='text-slate-800 dark:text-slate-200 leading-relaxed font-medium antialiased'>
						{data.aiAdvice}
					</div>
				</div>
			)}

			{/* 12 tháng bar chart */}
			<div>
				<p className='text-xs text-gray-500 mb-2'>
					Mức độ cạnh tranh theo tháng:
				</p>
				<div className='flex items-end gap-1 h-16'>
					{data.predictions?.map((p: any) => (
						<div
							key={p.month}
							className='flex-1 flex flex-col items-center gap-1'
							title={`${p.monthName}: ${demandLabel[p.demandLevel]}`}>
							<div
								className={`w-full rounded-t-sm transition-all ${demandColor[p.demandLevel]} ${
									p.isCurrentMonth ?
										'ring-2 ring-blue-600 ring-offset-1'
									:	'opacity-80'
								}`}
								style={{
									height: `${
										p.demandLevel === 'very_high' ? 64
										: p.demandLevel === 'high' ? 48
										: p.demandLevel === 'medium' ? 32
										: 20
									}px`,
								}}
							/>
							<span
								className={`text-[9px] ${p.isCurrentMonth ? 'font-bold text-blue-600' : 'text-gray-400'}`}>
								T{p.month}
							</span>
						</div>
					))}
				</div>
			</div>

			{/* Tháng tốt nhất */}
			<div className='flex gap-2 text-xs'>
				<div className='flex-1 bg-green-50 rounded-lg p-2 text-center'>
					<p className='text-green-700 font-semibold'>
						{data.bestMonth?.monthName}
					</p>
					<p className='text-green-600'>Tốt nhất 🟢</p>
				</div>
				<div className='flex-1 bg-red-50 rounded-lg p-2 text-center'>
					<p className='text-red-700 font-semibold'>
						{data.worstMonth?.monthName}
					</p>
					<p className='text-red-600'>Khó nhất 🔴</p>
				</div>
			</div>

			{/* Legend */}
			<div className='flex items-center gap-3 text-xs text-gray-500'>
				{Object.entries(demandLabel).map(([key, label]) => (
					<div key={key} className='flex items-center gap-1'>
						<div className={`w-2 h-2 rounded-sm ${demandColor[key]}`} />
						<span>{label}</span>
					</div>
				))}
			</div>
		</div>
	);
}
