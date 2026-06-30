'use client';
import SeasonalWidget from '@/components/analytics/seasonal-widget';
import FilterChip from '@/components/room/filter-chip';
import RoomCard from '@/components/room/room-card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { hcmDistricts, priceRanges } from '@/data/data';
import { getRooms } from '@/lib/api/room.api';
import { useQuery } from '@tanstack/react-query';
import {
	ArrowLeft,
	Building,
	Building2,
	ChevronDown,
	ChevronRight,
	Grid,
	Home,
	Hotel,
	List,
	School,
	Search,
	X,
} from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, Suspense } from 'react';

// ─── Constants ───────────────────────────────────────────────

const roomTypesList = [
	{ value: 'room', label: 'Phòng trọ', icon: Home },
	{ value: 'house', label: 'Nhà riêng', icon: Hotel },
	{ value: 'shared', label: 'Ký túc xá', icon: School },
	{ value: 'apartment', label: 'Căn hộ chung cư', icon: Building2 },
	{ value: 'mini', label: 'Căn hộ mini', icon: Building },
	{ value: 'service', label: 'Căn hộ dịch vụ', icon: Building2 },
];

const labelToValueMap: Record<string, string> = {
	'phòng trọ': 'room',
	'nhà riêng': 'house',
	'nhà nguyên căn': 'house',
	'ký túc xá': 'shared',
	'căn hộ chung cư': 'apartment',
	'căn hộ mini': 'mini',
	'chung cư mini': 'mini',
	'căn hộ dịch vụ': 'service',
};

const normalizeRoomType = (val: string | null): string => {
	if (!val) return '';
	const cleaned = val.replace(/\+/g, ' ').trim().toLowerCase();
	return labelToValueMap[cleaned] || val;
};

const getRoomTypeLabel = (value: string) => {
	return roomTypesList.find((t) => t.value === value)?.label || value;
};

const amenitiesList = [
	{ value: 'furnished', name: 'Đầy đủ nội thất' },
	{ value: 'loft', name: 'Có gác' },
	{ value: 'kitchen', name: 'Kệ bếp' },
	{ value: 'ac', name: 'Có máy lạnh' },
	{ value: 'washing', name: 'Có máy giặt' },
	{ value: 'fridge', name: 'Có tủ lạnh' },
	{ value: 'elevator', name: 'Có thang máy' },
	{ value: 'no_shared', name: 'Không chung chủ' },
	{ value: 'flexible_hours', name: 'Giờ giấc tự do' },
	{ value: 'security', name: 'Có bảo vệ 24/24' },
	{ value: 'parking', name: 'Có hầm để xe' },
];

const areaRanges = [
	{ label: 'Dưới 20m²', min: 0, max: 20 },
	{ label: '20-30m²', min: 20, max: 30 },
	{ label: '30-50m²', min: 30, max: 50 },
	{ label: 'Trên 50m²', min: 50, max: 1000 },
];

type OpenFilter =
	| 'roomType'
	| 'price'
	| 'area'
	| 'district'
	| 'amenities'
	| null;

// ─── Component ───────────────────────────────────────────────

const RoomsContent = () => {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const filterRef = useRef<HTMLDivElement>(null);

	// ─── State ───────────────────────────────────────────────
	const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
	const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
	const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
	const [minArea, setMinArea] = useState(
		Number(searchParams.get('minArea')) || 0,
	);
	const [maxArea, setMaxArea] = useState(
		Number(searchParams.get('maxArea')) || 1000,
	);
	const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'newest');
	const [selectedDistrict, setSelectedDistrict] = useState(
		searchParams.get('district') || 'all',
	);
	const [selectedAmenities, setSelectedAmenities] = useState<string[]>(
		searchParams.get('amenities')?.split(',').filter(Boolean) || [],
	);
	const [selectedRoomType, setSelectedRoomType] = useState(
		normalizeRoomType(searchParams.get('roomType')),
	);
	const [minRating, setMinRating] = useState(searchParams.get('rating') || '');
	const [layout, setLayout] = useState<'grid' | 'list'>('list');
	const [page, setPage] = useState(1);
	const [selectedWard, setSelectedWard] = useState(
		searchParams.get('ward') || '',
	);
	const [districtModalOpen, setDistrictModalOpen] = useState(false);
	const [districtModalView, setDistrictModalView] = useState<
		'districts' | 'wards'
	>('districts');
	const [browsingDistrict, setBrowsingDistrict] = useState('');
	const [openFilter, setOpenFilter] = useState<OpenFilter>(null);

	// ─── Click outside to close dropdown ─────────────────────
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
				setOpenFilter(null);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const toggleFilter = (filter: OpenFilter) => {
		setOpenFilter((prev) => (prev === filter ? null : filter));
	};

	// ─── Helpers ─────────────────────────────────────────────
	const getActivePriceLabel = () => {
		const r = priceRanges.find((r) => r.min === minPrice && r.max === maxPrice);
		return r && r.label !== 'Tất cả' ? r.label : '';
	};

	const getActiveAreaLabel = () => {
		const r = areaRanges.find((r) => r.min === minArea && r.max === maxArea);
		return r ? r.label : '';
	};

	const hasActiveFilters =
		!!selectedRoomType ||
		!!(minPrice || maxPrice) ||
		minArea !== 0 ||
		maxArea !== 1000 ||
		selectedDistrict !== 'all' ||
		!!selectedWard ||
		selectedAmenities.length > 0;

	// ─── URL sync ────────────────────────────────────────────
	const updateUrl = useCallback(
		(updates: Record<string, string>) => {
			const params = new URLSearchParams(searchParams.toString());
			Object.entries(updates).forEach(([key, value]) => {
				if (value) {
					params.set(key, value);
				} else {
					params.delete(key);
				}
			});
			const qs = params.toString();
			router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
		},
		[searchParams, router, pathname],
	);

	// ─── Handlers ────────────────────────────────────────────
	const handlePriceRangeSelect = (range: (typeof priceRanges)[number]) => {
		setMinPrice(range.min);
		setMaxPrice(range.max);
		setPage(1);
		updateUrl({ minPrice: range.min, maxPrice: range.max });
	};

	const handleRoomTypeSelect = (type: string) => {
		const next = selectedRoomType === type ? '' : type;
		setSelectedRoomType(next);
		setPage(1);
		updateUrl({ roomType: next });
	};

	const handleAreaSelect = (range: { min: number; max: number }) => {
		if (minArea === range.min && maxArea === range.max) {
			setMinArea(0);
			setMaxArea(1000);
			updateUrl({ minArea: '', maxArea: '' });
		} else {
			setMinArea(range.min);
			setMaxArea(range.max);
			updateUrl({
				minArea: String(range.min),
				maxArea: String(range.max),
			});
		}
		setPage(1);
	};

	const handleDistrictSelect = (districtName: string) => {
		const next = selectedDistrict === districtName ? 'all' : districtName;
		setSelectedDistrict(next);
		setSelectedWard('');
		setPage(1);
		updateUrl({ district: next === 'all' ? '' : next, ward: '' });
	};

	const handleWardSelect = (wardName: string) => {
		const next = selectedWard === wardName ? '' : wardName;
		setSelectedWard(next);
		setPage(1);
		updateUrl({ ward: next });
	};

	const handleSortBy = (e: any) => {
		const newValue = e.target.value;
		setSortBy(newValue);
		updateUrl({ sortBy: newValue });
	};

	const toggleAmenity = (amenity: string) => {
		const next =
			selectedAmenities.includes(amenity) ?
				selectedAmenities.filter((a) => a !== amenity)
			:	[...selectedAmenities, amenity];

		setSelectedAmenities(next);
		updateUrl({ amenities: next.length > 0 ? next.join(',') : '' });
	};

	const handleReset = () => {
		setKeyword('');
		setMinPrice('');
		setMaxPrice('');
		setMinArea(0);
		setMaxArea(1000);
		setSelectedDistrict('all');
		setSelectedWard('');
		setSelectedAmenities([]);
		setSelectedRoomType('');
		setMinRating('');
		setPage(1);
		setOpenFilter(null);
		router.push(pathname, { scroll: false });
	};

	// ─── Data fetching ───────────────────────────────────────
	const { data, isLoading } = useQuery({
		queryKey: [
			'rooms',
			keyword,
			minPrice,
			maxPrice,
			sortBy,
			selectedDistrict,
			selectedWard,
			selectedAmenities,
			selectedRoomType,
			minRating,
			minArea,
			maxArea,
			page,
		],
		queryFn: () =>
			getRooms({
				keyword: keyword || undefined,
				minPrice: minPrice ? Number(minPrice) : undefined,
				maxPrice: maxPrice ? Number(maxPrice) : undefined,
				minRating: minRating ? Number(minRating) : undefined,
				selectedDistrict:
					selectedWard ? `${selectedWard}, ${selectedDistrict}`
					: selectedDistrict !== 'all' ? selectedDistrict
					: undefined,
				amenities:
					selectedAmenities.length > 0 ?
						selectedAmenities.join(',')
					:	undefined,
				roomType: selectedRoomType || undefined,
				minArea: minArea ? Number(minArea) : undefined,
				maxArea: maxArea === 1000 ? undefined : Number(maxArea),
				sortBy,
				page,
				limit: 12,
			}),
	});

	// ─── Chip style helper ───────────────────────────────────
	const chipClass = (active: boolean) =>
		`px-3.5 py-1.5 text-sm rounded-xl border transition-all duration-200 cursor-pointer ${
			active ?
				'bg-primary text-primary-foreground border-primary shadow-xs'
			:	'bg-background text-foreground border-border/80 hover:bg-secondary hover:text-foreground'
		}`;

	const filterBtnClass = (hasValue: boolean, isOpen: boolean) =>
		`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
			hasValue ?
				'border-primary bg-primary/8 text-primary shadow-xs'
			:	'border-border/80 hover:bg-secondary hover:text-foreground bg-background text-muted-foreground'
		} ${isOpen ? 'ring-2 ring-primary/20' : ''}`;

	// ─── Render ──────────────────────────────────────────────
	return (
		<div className='bg-background min-h-screen'>
			<div className='max-w-7xl mx-auto px-4 py-6'>
				{/* ── Filter Bar ────────────────────────────── */}
				<div
					ref={filterRef}
					className='bg-card border border-border/50 rounded-2xl mb-6 shadow-sm'>
					{/* Filter buttons row */}
					<div className='flex items-center gap-2.5 p-4 flex-wrap'>
						{/* Room Type */}
						<button
							onClick={() => toggleFilter('roomType')}
							className={filterBtnClass(
								!!selectedRoomType,
								openFilter === 'roomType',
							)}>
							{getRoomTypeLabel(selectedRoomType) || 'Danh mục'}
							<ChevronDown
								className={`w-4 h-4 transition-transform duration-200 ${openFilter === 'roomType' ? 'rotate-180' : ''}`}
							/>
						</button>

						{/* Price */}
						<button
							onClick={() => toggleFilter('price')}
							className={filterBtnClass(
								!!(minPrice || maxPrice),
								openFilter === 'price',
							)}>
							{getActivePriceLabel() || 'Khoảng giá'}
							<ChevronDown
								className={`w-4 h-4 transition-transform duration-200 ${openFilter === 'price' ? 'rotate-180' : ''}`}
							/>
						</button>

						{/* Area */}
						<button
							onClick={() => toggleFilter('area')}
							className={filterBtnClass(
								minArea !== 0 || maxArea !== 1000,
								openFilter === 'area',
							)}>
							{getActiveAreaLabel() || 'Diện tích'}
							<ChevronDown
								className={`w-4 h-4 transition-transform duration-200 ${openFilter === 'area' ? 'rotate-180' : ''}`}
							/>
						</button>

						{/* District */}
						<button
							onClick={() => {
								setDistrictModalOpen(true);
								setDistrictModalView('districts');
							}}
							className={filterBtnClass(selectedDistrict !== 'all', false)}>
							{selectedWard ?
								selectedWard
							: selectedDistrict !== 'all' ?
								selectedDistrict
							:	'Quận/Huyện'}
							<ChevronDown className='w-4 h-4 text-muted-foreground' />
						</button>

						{/* Amenities */}
						<button
							onClick={() => toggleFilter('amenities')}
							className={filterBtnClass(
								selectedAmenities.length > 0,
								openFilter === 'amenities',
							)}>
							Đặc điểm nổi bật
							{selectedAmenities.length > 0 && (
								<span className='bg-primary text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold'>
									{selectedAmenities.length}
								</span>
							)}
							<ChevronDown
								className={`w-4 h-4 transition-transform duration-200 ${openFilter === 'amenities' ? 'rotate-180' : ''}`}
							/>
						</button>

						{/* Reset */}
						{hasActiveFilters && (
							<button
								onClick={handleReset}
								className='text-sm text-muted-foreground hover:text-destructive font-semibold transition-colors cursor-pointer ml-2.5'>
								Đặt lại bộ lọc
							</button>
						)}

						{/* ── Right side: Sort + Layout ── */}
						<div className='w-full lg:w-auto lg:ml-auto flex items-center justify-between lg:justify-end gap-3 pt-4 lg:pt-0 border-t border-border/30 lg:border-t-0'>
							<div className="relative flex-1 lg:flex-none">
								<select
									value={sortBy}
									onChange={handleSortBy}
									className='w-full px-3.5 py-2.5 pr-8 rounded-xl border border-border bg-background text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium'>
									<option value='newest'>Mới nhất</option>
									<option value='price_asc'>Giá: Thấp → Cao</option>
									<option value='price_desc'>Giá: Cao → Thấp</option>
									<option value='rating'>Đánh giá cao nhất</option>
								</select>
								<ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
							</div>

							<div className='flex items-center gap-1 border border-border/80 rounded-xl p-1 shrink-0 bg-background'>
								<Button
									variant='ghost'
									size='sm'
									onClick={() => setLayout('list')}
									className={`p-2 rounded-lg cursor-pointer ${layout === 'list' ? 'bg-primary text-white hover:bg-primary/90' : 'text-muted-foreground hover:bg-secondary'}`}>
									<List className='w-4 h-4' />
								</Button>
								<Button
									variant='ghost'
									size='sm'
									onClick={() => setLayout('grid')}
									className={`p-2 rounded-lg cursor-pointer ${layout === 'grid' ? 'bg-primary text-white hover:bg-primary/90' : 'text-muted-foreground hover:bg-secondary'}`}>
									<Grid className='w-4 h-4' />
								</Button>
							</div>
						</div>
					</div>

					{/* ── Dropdown Panels ─────────────────────── */}
					{openFilter && (
						<div className='border-t border-border p-5'>
							{/* Room Type */}
							{openFilter === 'roomType' && (
								<div>
									<Label className='block mb-3 text-sm font-medium'>
										Danh mục cho thuê
									</Label>
									<div className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2'>
										{roomTypesList.map((type) => {
											const Icon = type.icon;
											const isActive = selectedRoomType === type.value;
											return (
												<button
													key={type.value}
													onClick={() => handleRoomTypeSelect(type.value)}
													className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs transition-all duration-200 cursor-pointer ${
														isActive ?
															'bg-primary text-primary-foreground border-primary'
														:	'bg-background text-foreground border-border hover:bg-secondary'
													}`}>
													<Icon className='w-6 h-6' />
													<span className='leading-tight text-center'>
														{type.label}
													</span>
												</button>
											);
										})}
									</div>
								</div>
							)}

							{/* Price */}
							{openFilter === 'price' && (
								<div>
									<Label className='block mb-3 text-sm font-medium'>
										Khoảng giá
									</Label>
									<div className='flex flex-wrap gap-2'>
										{priceRanges.map((range) => (
											<button
												key={range.label}
												onClick={() => handlePriceRangeSelect(range)}
												className={chipClass(
													range.min === minPrice && range.max === maxPrice,
												)}>
												{range.label}
											</button>
										))}
									</div>
								</div>
							)}

							{/* Area */}
							{openFilter === 'area' && (
								<div>
									<Label className='block mb-3 text-sm font-medium'>
										Diện tích
									</Label>
									<div className='flex flex-wrap gap-2'>
										{areaRanges.map((range) => (
											<button
												key={range.label}
												onClick={() => handleAreaSelect(range)}
												className={chipClass(
													minArea === range.min && maxArea === range.max,
												)}>
												{range.label}
											</button>
										))}
									</div>
								</div>
							)}

							{/* Amenities */}
							{openFilter === 'amenities' && (
								<div>
									<Label className='block mb-3 text-sm font-medium'>
										Đặc điểm nổi bật
									</Label>
									<div className='flex flex-wrap gap-2'>
										{amenitiesList.map((amenity) => (
											<button
												key={amenity.value}
												onClick={() => toggleAmenity(amenity.value)}
												className={chipClass(
													selectedAmenities.includes(amenity.value),
												)}>
												{amenity.name}
											</button>
										))}
									</div>
								</div>
							)}
						</div>
					)}

					{/* ── Active Filter Chips ────────────────── */}
					{hasActiveFilters && (
						<div className='border-t border-border px-4 py-3 flex items-center gap-2 flex-wrap'>
							<span className='text-sm text-muted-foreground mr-1'>
								Đang lọc:
							</span>
							{selectedRoomType && (
								<FilterChip
									label={getRoomTypeLabel(selectedRoomType)}
									active
									onRemove={() => handleRoomTypeSelect(selectedRoomType)}
								/>
							)}
							{getActivePriceLabel() && (
								<FilterChip
									label={getActivePriceLabel()}
									active
									onRemove={() => handlePriceRangeSelect(priceRanges[0])}
								/>
							)}
							{getActiveAreaLabel() && (
								<FilterChip
									label={getActiveAreaLabel()}
									active
									onRemove={() => {
										setMinArea(0);
										setMaxArea(1000);
										setPage(1);
										updateUrl({
											minArea: '',
											maxArea: '',
										});
									}}
								/>
							)}
							{selectedDistrict !== 'all' && (
								<FilterChip
									label={selectedDistrict}
									active
									onRemove={() => {
										handleDistrictSelect('all');
										setSelectedWard('');
										updateUrl({ ward: '' });
									}}
								/>
							)}
							{selectedWard && (
								<FilterChip
									label={selectedWard}
									active
									onRemove={() => {
										setSelectedWard('');
										updateUrl({ ward: '' });
									}}
								/>
							)}
							{selectedAmenities.map((amenity) => (
								<FilterChip
									key={amenity}
									label={
										amenitiesList.find((a) => a.value === amenity)?.name ||
										amenity
									}
									active
									onRemove={() => toggleAmenity(amenity)}
								/>
							))}
						</div>
					)}
				</div>

				{/* ── Result count ────────────────────────────── */}
				{!isLoading && data && (
					<p className='text-sm text-muted-foreground mb-4'>
						Tìm thấy{' '}
						<span className='font-semibold text-foreground'>
							{data.meta.total}
						</span>{' '}
						phòng
					</p>
				)}

				{/* ── Room list ───────────────────────────────── */}
				{isLoading ?
					<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5'>
						{Array.from({ length: 8 }).map((_, i) => (
							<div key={i} className='rounded-xl border overflow-hidden'>
								<Skeleton className='h-48 w-full' />
								<div className='p-4 space-y-2'>
									<Skeleton className='h-4 w-3/4' />
									<Skeleton className='h-3 w-full' />
									<Skeleton className='h-5 w-1/2' />
								</div>
							</div>
						))}
					</div>
				: data?.data.length === 0 ?
					<div className='text-center py-20 text-gray-400'>
						<Search className='w-12 h-12 mx-auto mb-3 opacity-30' />
						<p className='text-lg'>Không tìm thấy phòng phù hợp</p>
						<p className='text-sm mt-1'>Thử thay đổi bộ lọc tìm kiếm</p>
					</div>
				:	<div
						className={
							layout === 'grid' ?
								'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
							:	'flex flex-col gap-4'
						}>
						{data?.data.map((room) => (
							<RoomCard room={room} key={room.id} layout={layout} />
						))}
					</div>
				}

				<div className='mt-8'>
					<SeasonalWidget />
				</div>

				{/* ── Pagination ──────────────────────────────── */}
				{data && data?.meta.totalPages > 1 && (
					<div className='flex justify-center gap-2 mt-8'>
						<Button
							variant='outline'
							disabled={page === 1}
							onClick={() => setPage((prev) => prev - 1)}>
							Trước
						</Button>
						<span className='flex items-center px-4 text-sm text-gray-600'>
							Trang {page} / {data?.meta.totalPages}
						</span>
						<Button
							variant='outline'
							disabled={page === data?.meta.totalPages}
							onClick={() => setPage((prev) => prev + 1)}>
							Tiếp
						</Button>
					</div>
				)}

				{/* ── District/Ward Modal ────────────────────── */}
				{districtModalOpen && (
					<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40'>
						<div className='bg-card rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col'>
							{/* Modal header */}
							<div className='flex items-center gap-3 px-5 py-4 border-b border-border'>
								{districtModalView === 'wards' ?
									<button
										onClick={() => setDistrictModalView('districts')}
										className='p-1 hover:bg-secondary rounded-lg transition-colors cursor-pointer'>
										<ArrowLeft className='w-5 h-5' />
									</button>
								:	null}
								<h3 className='text-lg font-semibold flex-1'>
									{districtModalView === 'districts' ?
										'Hồ Chí Minh'
									:	browsingDistrict}
								</h3>
								<button
									onClick={() => setDistrictModalOpen(false)}
									className='p-1 hover:bg-secondary rounded-lg transition-colors cursor-pointer'>
									<X className='w-5 h-5' />
								</button>
							</div>

							{/* Modal body */}
							<div className='overflow-y-auto flex-1'>
								{districtModalView === 'districts' ?
									<>
										{/* Tất cả */}
										<button
											onClick={() => {
												handleDistrictSelect('all');
												setDistrictModalOpen(false);
											}}
											className='w-full flex items-center gap-3 px-5 py-3.5 hover:bg-secondary transition-colors text-left cursor-pointer'>
											<span
												className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selectedDistrict === 'all' ? 'border-primary bg-primary' : 'border-border'}`}>
												{selectedDistrict === 'all' && (
													<span className='text-white text-xs'>✓</span>
												)}
											</span>
											<span className='flex-1 font-medium'>Tất cả</span>
										</button>

										{hcmDistricts.map((d) => (
											<button
												key={d.name}
												onClick={() => {
													handleDistrictSelect(d.name);
													setBrowsingDistrict(d.name);
													setDistrictModalView('wards');
												}}
												className='w-full flex items-center gap-3 px-5 py-3.5 hover:bg-secondary transition-colors text-left cursor-pointer'>
												<span
													className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selectedDistrict === d.name ? 'border-primary bg-primary' : 'border-border'}`}>
													{selectedDistrict === d.name && (
														<span className='text-white text-xs'>✓</span>
													)}
												</span>
												<span className='flex-1'>{d.name}</span>
												<ChevronRight className='w-4 h-4 text-muted-foreground' />
											</button>
										))}
									</>
								:	<>
										{/* Tất cả phường */}
										<button
											onClick={() => {
												setSelectedWard('');
												updateUrl({ ward: '' });
												setDistrictModalOpen(false);
											}}
											className='w-full flex items-center gap-3 px-5 py-3.5 hover:bg-secondary transition-colors text-left cursor-pointer'>
											<span
												className={`w-5 h-5 rounded border-2 flex items-center justify-center ${!selectedWard ? 'border-primary bg-primary' : 'border-border'}`}>
												{!selectedWard && (
													<span className='text-white text-xs'>✓</span>
												)}
											</span>
											<span className='flex-1 font-medium'>Tất cả</span>
										</button>

										{hcmDistricts
											.find((d) => d.name === browsingDistrict)
											?.wards.map((w) => (
												<button
													key={w.name}
													onClick={() => {
														handleWardSelect(w.name);
														setDistrictModalOpen(false);
													}}
													className='w-full flex items-center gap-3 px-5 py-3.5 hover:bg-secondary transition-colors text-left cursor-pointer'>
													<span
														className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selectedWard === w.name ? 'border-primary bg-primary' : 'border-border'}`}>
														{selectedWard === w.name && (
															<span className='text-white text-xs'>✓</span>
														)}
													</span>
													<div className='flex-1'>
														<span className='block font-medium'>{w.name}</span>
														{w.streets && (
															<span className='block text-xs text-muted-foreground mt-0.5'>
																{w.streets[0]}
															</span>
														)}
													</div>
												</button>
											))}
									</>
								}
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default function RoomsPage() {
	return (
		<Suspense
			fallback={
				<div className='bg-background min-h-screen flex items-center justify-center'>
					<div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
				</div>
			}>
			<RoomsContent />
		</Suspense>
	);
}
