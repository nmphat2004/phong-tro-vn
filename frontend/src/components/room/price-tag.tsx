interface PriceTagProps {
	amount: number;
	period?: string;
	size?: 'sm' | 'md' | 'lg';
}

export function PriceTag({
	amount,
	period = '/tháng',
	size = 'md',
}: PriceTagProps) {
	const formatPrice = (price: any) => {
		const val = Number(price) / 1000000;
		if (isNaN(val)) return '0';
		return Number(val.toFixed(2)).toString();
	};

	const textSizes = {
		sm: 'text-base',
		md: 'text-lg',
		lg: 'text-2xl',
	};

	const periodSizes = {
		sm: 'text-xs',
		md: 'text-sm',
		lg: 'text-base',
	};

	return (
		<div className='inline-flex items-baseline gap-1'>
			<span className={`${textSizes[size]} text-accent font-bold`}>
				{formatPrice(amount)}tr
			</span>
			<span className={`${periodSizes[size]} text-muted-foreground`}>
				{period}
			</span>
		</div>
	);
}
