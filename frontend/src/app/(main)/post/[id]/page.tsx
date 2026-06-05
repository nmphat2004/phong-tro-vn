/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Check, GripVertical, Loader2, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import z from 'zod';
import { getAmenities, getRoomById, updateRoom } from '@/lib/api/room.api';
import { uploadImage } from '@/lib/api/upload.api';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { Amenity } from '@/types';
import dynamic from 'next/dynamic';
import api from '@/lib/axios';

const PostMapPreview = dynamic(
	() => import('@/components/room/post-map-preview'),
	{
		ssr: false,
		loading: () => (
			<div className='h-[300px] w-full bg-secondary animate-pulse rounded-xl' />
		),
	},
);

const roomSchema = z.object({
	title: z.string().min(5, 'Tiêu đề phải từ 5 ký tự trở lên'),
	roomType: z.string().min(1, 'Vui lòng chọn loại phòng'),
	address: z.string().min(5, 'Vui lòng nhập địa chỉ chi tiết'),
	price: z.coerce.number().min(100000, 'Giá thuê phải lớn hơn 100,000đ'),
	area: z.coerce.number().min(5, 'Diện tích phải từ 5m² trở lên'),
	floor: z.coerce.number().default(0),
	description: z.string().min(10, 'Mô tả phải từ 10 ký tự trở lên'),
	amenities: z.array(z.string()).default([]),
	rules: z.string().default(''),
	electricityCost: z.coerce.number().default(0),
	waterCost: z.coerce.number().default(0),
	deposit: z.coerce.number().default(0),
	minStay: z.string().optional().default(''),
});

type RoomFormData = z.infer<typeof roomSchema>;

const EditRoomPage = () => {
	const params = useParams();
	const roomId = params.id as string;
	const router = useRouter();
	const queryClient = useQueryClient();
	const { user, isLoading: authLoading } = useAuthStore();
	const [currentStep, setCurrentStep] = useState(1);
	const [isUpdating, setIsUpdating] = useState(false);
	const [uploadedImages, setUploadedImages] = useState<
		{ file?: File; preview: string; hash?: string; isNew: boolean }[]
	>([]);
	const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
	const [isGeocoding, setIsGeocoding] = useState(false);

	const { data: room, isLoading: isLoadingRoom } = useQuery({
		queryKey: ['room', roomId],
		queryFn: () => getRoomById(roomId),
	});

	const {
		register,
		handleSubmit,
		watch,
		formState: { errors },
		setValue,
		getValues,
		reset,
		trigger,
	} = useForm<RoomFormData>({
		resolver: zodResolver(roomSchema) as Resolver<RoomFormData>,
		mode: 'onBlur',
	});

	useEffect(() => {
		if (room) {
			reset({
				title: room.title,
				roomType: room.type,
				address: room.address,
				price: Number(room.price),
				area: room.area || 0,
				floor: room.floor || 0,
				description: room.description || '',
				amenities: room.amenities?.map((a: any) => a.amenity.name) || [],
				rules: room.rule || '',
				electricityCost: Number(room.electricityCost) || 0,
				waterCost: Number(room.waterCost) || 0,
				deposit: Number(room.deposit) || 0,
				minStay: room.minStay || '',
			});
			if (room.images) {
				setUploadedImages(
					room.images.map((img: any) => ({
						preview: img.url,
						hash: img.hash,
						isNew: false,
					})),
				);
			}
			if (room.lat !== undefined && room.lng !== undefined) {
				setCoords({ lat: Number(room.lat), lng: Number(room.lng) });
			}
		}
	}, [room, reset]);

	const formData = watch();

	const handleGeocode = async (address: string) => {
		if (!address || address.length < 5) return;
		try {
			setIsGeocoding(true);
			const res = await api.get('/analytics/geocode', { params: { address } });
			if (res.data) {
				setCoords(res.data);
				toast.success(
					'Đã xác định vị trí! Bạn có thể kéo ghim để chỉnh sửa chính xác hơn.',
				);
			} else {
				toast.error(
					'Không tìm thấy vị trí chính xác. Vui lòng nhập địa chỉ chi tiết hơn.',
				);
			}
		} catch (err) {
			console.error('Geocoding error:', err);
			toast.error('Lỗi khi định vị. Vui lòng thử lại.');
		} finally {
			setIsGeocoding(false);
		}
	};

	useLayoutEffect(() => {
		if (!authLoading && user?.role !== 'LANDLORD') {
			toast.error('Bạn cần có tài khoản Chủ trọ để truy cập trang này!');
			router.push('/');
		}
	}, [user, authLoading, router]);

	const steps = [
		{ number: 1, title: 'Thông tin cơ bản' },
		{ number: 2, title: 'Mô tả & Tiện nghi' },
		{ number: 3, title: 'Hình ảnh' },
		{ number: 4, title: 'Xem trước & Cập nhật' },
	];

	const roomTypes = [
		{ value: 'room', label: 'Phòng trọ', icon: '🏠' },
		{ value: 'house', label: 'Nhà riêng', icon: '🏡' },
		{ value: 'shared', label: 'Ký túc xá', icon: '🏫' },
		{ value: 'shophouse', label: 'Mặt bằng', icon: '🏪' },
		{ value: 'apartment', label: 'Căn hộ chung cư', icon: '🏢' },
		{ value: 'mini', label: 'Căn hộ mini', icon: '🏘️' },
		{ value: 'service', label: 'Căn hộ dịch vụ', icon: '🏗️' },
	];

	const amenitiesList = [
		{ value: 'Điều hòa', label: 'AirVent' },
		{ value: 'Giữ xe', label: 'Car' },
		{ value: 'Thang máy', label: 'Building2' },
		{ value: 'An ninh', label: 'Shield' },
		{ value: 'Kệ bếp', label: 'ChefHat' },
		{ value: 'Máy giặt', label: 'WashingMachine' },
		{ value: 'Đầy đủ nội thất', label: 'Sofa' },
		{ value: 'Có gác', label: 'ArrowUp' },
		{ value: 'Tủ lạnh', label: 'Refrigerator' },
		{ value: 'Không chung chủ', label: 'UserX' },
		{ value: 'Giờ giấc tự do', label: 'Clock' },
	];

	const toggleAmenity = (amenity: string) => {
		const current = getValues('amenities') || [];
		if (current.includes(amenity)) {
			setValue(
				'amenities',
				current.filter((a) => a !== amenity),
			);
		} else {
			setValue('amenities', [...current, amenity]);
		}
	};

	const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (files) {
			const newImages = Array.from(files).map((file) => ({
				file,
				preview: URL.createObjectURL(file),
				isNew: true,
			}));
			setUploadedImages([...uploadedImages, ...newImages]);
		}
	};

	const removeImage = (index: number) => {
		setUploadedImages(uploadedImages.filter((_, i) => i !== index));
	};

	const { data: amenitiesData = [] } = useQuery({
		queryKey: ['amenities'],
		queryFn: getAmenities,
	});

	const onSubmit = async (data: RoomFormData) => {
		try {
			setIsUpdating(true);

			if (uploadedImages.length < 1) {
				toast.error('Vui lòng tải lên ít nhất 1 hình ảnh');
				setCurrentStep(3);
				return;
			}

			const imageUrls: string[] = [];
			const imageHashes: string[] = [];
			for (const image of uploadedImages) {
				if (image.isNew && image.file) {
					const result = await uploadImage(image.file);
					imageUrls.push(result.url);
					imageHashes.push(result.hash);
				} else {
					imageUrls.push(image.preview);
					imageHashes.push(image.hash || '');
				}
			}

			// Map selection values to IDs
			const selectedAmenityIds = (data.amenities || [])
				.map((name) => amenitiesData.find((a: any) => a.name === name)?.id)
				.filter(Boolean) as string[];

			const roomData = {
				title: data.title,
				type: data.roomType,
				price: data.price,
				electricityCost: data.electricityCost || 0,
				waterCost: data.waterCost || 0,
				deposit: data.deposit || 0,
				minStay: data.minStay || '',
				description: data.description,
				address: data.address,
				rule: data.rules,
				area: data.area,
				floor: data.floor || 0,
				lat: coords?.lat,
				lng: coords?.lng,
				imageUrls,
				imageHashes,
				primaryImageUrl: imageUrls[0],
				amenityIds: selectedAmenityIds,
			};

			await updateRoom(roomId, roomData);
			await queryClient.invalidateQueries({ queryKey: ['dashboard-my-rooms'] });
			await queryClient.invalidateQueries({ queryKey: ['room', roomId] });
			toast.success('Tin đăng đã được cập nhật thành công!');
			router.push('/dashboard');
		} catch (err: any) {
			const errorMessage =
				err.response?.data?.message || err.message || 'Có lỗi xảy ra';
			toast.error(errorMessage);
		} finally {
			setIsUpdating(false);
		}
	};

	const handleNextStep = async () => {
		if (currentStep === 1) {
			const valid = await trigger([
				'title',
				'roomType',
				'address',
				'price',
				'area',
			]);
			if (!valid) {
				toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
				return;
			}
			setCurrentStep(currentStep + 1);
		} else if (currentStep === 2) {
			const valid = await trigger(['description']);
			if (!valid) {
				toast.error('Mô tả phải từ 10 ký tự trở lên');
				return;
			}
			setCurrentStep(currentStep + 1);
		} else if (currentStep === 3) {
			if (uploadedImages.length < 1) {
				toast.error('Vui lòng tải lên ít nhất 1 hình ảnh');
				return;
			}
			setCurrentStep(currentStep + 1);
		}
	};

	if (authLoading || isLoadingRoom) {
		return (
			<div className='min-h-screen flex items-center justify-center bg-background'>
				<div className='flex flex-col items-center gap-4'>
					<Loader2 className='w-12 h-12 border-primary animate-spin' />
					<p className='text-muted-foreground animate-pulse'>
						Đang tải thông tin phòng...
					</p>
				</div>
			</div>
		);
	}

	if (
		!user ||
		user.role !== 'LANDLORD' ||
		(room && room.ownerId !== user?.id)
	) {
		if (room && room.ownerId !== user?.id) {
			return (
				<div className='min-h-screen flex items-center justify-center'>
					<p>Bạn không có quyền chỉnh sửa tin đăng này.</p>
				</div>
			);
		}
		return null;
	}

	return (
		<div className='bg-background min-h-screen py-8'>
			<div className='max-w-5xl mx-auto px-4'>
				<div className='mb-8'>
					<div className='flex items-center justify-between mb-4'>
						{steps.map((step, index) => (
							<div key={step.number} className='flex items-center flex-1'>
								<div className='flex flex-col items-center'>
									<div
										className={`w-10 h-10 rounded-full flex items-center justify-center ${currentStep >= step.number ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'}`}>
										{currentStep > step.number ?
											<Check className='w-5 h-5' />
										:	step.number}
									</div>
									<span className='text-sm mt-2'>{step.title}</span>
								</div>
								{index < steps.length - 1 && (
									<div
										className={`flex-1 h-1 mx-4 ${currentStep > step.number ? 'bg-primary' : 'bg-secondary'}`}></div>
								)}
							</div>
						))}
					</div>
				</div>

				<form onSubmit={handleSubmit(onSubmit)}>
					<div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
						<div className='lg:col-span-2 bg-card border border-border rounded-xl p-6'>
							{currentStep === 1 && (
								<div className='space-y-6'>
									<h2 className='text-2xl font-bold'>Thông tin cơ bản</h2>

									<div>
										<Label className='block mb-2'>Tiêu đề *</Label>
										<Input
											placeholder='Ví dụ: Phòng trọ 25m² gần ĐH Bách Khoa'
											{...register('title')}
											className={errors.title ? 'border-red-500' : ''}
										/>
										{errors.title && (
											<p className='text-sm text-red-500 mt-1'>
												{errors.title.message}
											</p>
										)}
									</div>

									<div>
										<Label className='block mb-3 text-lg'>Loại phòng *</Label>
										<div className='grid grid-cols-2 gap-3'>
											{roomTypes.map((type) => (
												<Button
													type='button'
													variant='outline'
													size='lg'
													key={type.value}
													onClick={() => setValue('roomType', type.value)}
													className={`p-4 h-20 border rounded-lg text-left transition-all ${formData.roomType === type.value ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-border hover:bg-secondary'}`}>
													<div className='text-2xl mb-2'>{type.icon}</div>
													<div>{type.label}</div>
												</Button>
											))}
										</div>
										{errors.roomType && (
											<p className='text-sm text-red-500 mt-1'>
												{errors.roomType.message}
											</p>
										)}
									</div>

									<div>
										<Label className='block mb-2'>Địa chỉ *</Label>
										<div className='flex gap-2 mb-3'>
											<Input
												placeholder='Nhập địa chỉ chi tiết (số nhà, đường, phường, quận)'
												{...register('address')}
												className={errors.address ? 'border-red-500 flex-1' : 'flex-1'}
											/>
										</div>

										{/* Feature: Paste Google Maps Link */}
										<div className='p-4 bg-primary/5 border border-primary/20 rounded-xl mb-4'>
											<Label className='text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mb-2 block'>
												Dán link Google Maps
											</Label>
											<div className='flex gap-2'>
												<Input
													id='gmaps-url'
													placeholder='Dán liên kết từ Google Maps vào đây (ví dụ: https://maps.app.goo.gl/...)'
													className='bg-card border-primary/30 focus:border-primary'
												/>
												<Button
													type='button'
													variant='default'
													className='bg-primary text-primary-foreground hover:bg-primary/90'
													onClick={() => {
														const url = (
															document.getElementById(
																'gmaps-url',
															) as HTMLInputElement
														).value;
														if (url) handleGeocode(url);
													}}>
													Áp dụng
												</Button>
											</div>
											<p className='text-[10px] text-blue-500 dark:text-blue-400 mt-2 italic'>
												* Mở Google Maps, chọn vị trí nhà bạn, nhấn Chia sẻ{' '}
												{`->`} Sao chép liên kết rồi dán vào đây.
											</p>
										</div>

										{errors.address && (
											<p className='text-sm text-red-500 mt-1'>
												{errors.address.message}
											</p>
										)}
										{coords && (
											<div className='mt-4 animate-in fade-in slide-in-from-top-2 duration-300'>
												<Label className='text-xs text-muted-foreground mb-2 block font-medium uppercase'>
													Xem trước vị trí:
												</Label>
												<PostMapPreview
													lat={coords.lat}
													lng={coords.lng}
													onChange={(lat, lng) => setCoords({ lat, lng })}
												/>
											</div>
										)}
									</div>

									<div className='grid grid-cols-2 gap-4'>
										<div>
											<Label className='block mb-2'>Giá thuê (đ/tháng) *</Label>
											<Input
												type='number'
												placeholder='4500000'
												{...register('price')}
												className={errors.price ? 'border-red-500' : ''}
											/>
											{errors.price && (
												<p className='text-sm text-red-500 mt-1'>
													{errors.price.message}
												</p>
											)}
										</div>
										<div>
											<Label className='block mb-2'>Diện tích (m²) *</Label>
											<Input
												type='number'
												placeholder='25'
												{...register('area')}
												className={errors.area ? 'border-red-500' : ''}
											/>
											{errors.area && (
												<p className='text-sm text-red-500 mt-1'>
													{errors.area.message}
												</p>
											)}
										</div>
									</div>

									<div className='grid grid-cols-2 gap-4'>
										<div>
											<Label className='block mb-2'>Tầng</Label>
											<Input
												type='number'
												placeholder='3'
												{...register('floor')}
											/>
										</div>
										<div>
											<Label className='block mb-2'>
												Thời gian ở tối thiểu
											</Label>
											<Input placeholder='3 tháng' {...register('minStay')} />
										</div>
									</div>

									<div className='grid grid-cols-3 gap-4'>
										<div>
											<Label className='block mb-2'>Tiền điện (đ/kWh)</Label>
											<Input
												type='number'
												placeholder='3500'
												{...register('electricityCost')}
											/>
										</div>
										<div>
											<Label className='block mb-2'>Tiền nước (đ/m³)</Label>
											<Input
												type='number'
												placeholder='25000'
												{...register('waterCost')}
											/>
										</div>
										<div>
											<Label className='block mb-2'>Tiền cọc (đ)</Label>
											<Input
												type='number'
												placeholder='5000000'
												{...register('deposit')}
											/>
										</div>
									</div>
								</div>
							)}

							{currentStep === 2 && (
								<div className='space-y-6'>
									<h2 className='text-2xl font-bold'>Mô tả và Tiện nghi</h2>

									<div>
										<Label className='block mb-3 text-lg'>
											Mô tả chi tiết *
										</Label>
										<Textarea
											className='w-full px-4 py-3 rounded-lg border border-border bg-input-background min-h-[200px]'
											placeholder='Mô tả chi tiết về phòng của bạn...'
											{...register('description')}
										/>
										<div className='flex items-center justify-between mt-2'>
											<p className='text-sm text-muted-foreground'>
												{formData.description?.length || 0} ký tự
											</p>
											{errors.description && (
												<p className='text-sm text-red-500'>
													{errors.description.message}
												</p>
											)}
										</div>
									</div>

									<div>
										<Label className='block mb-2'>Tiện nghi</Label>
										<div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
											{amenitiesList.map((amenity) => (
												<Button
													type='button'
													variant='outline'
													size='lg'
													key={amenity.value}
													onClick={() => toggleAmenity(amenity.value)}
													className={`p-3 border rounded-lg transition-all ${formData.amenities?.includes(amenity.value) ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-border hover:bg-secondary'}`}>
													{amenity.value}
												</Button>
											))}
										</div>
									</div>

									<div>
										<Label className='block mb-2'>Quy định nhà</Label>
										<Textarea
											className='w-full px-4 py-3 rounded-lg border border-border bg-input-background min-h-[120px]'
											placeholder='Ví dụ: Không nuôi thú cưng, không hút thuốc trong phòng...'
											{...register('rules')}
										/>
									</div>
								</div>
							)}

							{currentStep === 3 && (
								<div className='space-y-6'>
									<h2 className='text-2xl font-bold'>Hình ảnh</h2>

									<div>
										<Label
											htmlFor='image-upload'
											className='block border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:bg-secondary transition-colors'>
											<Upload className='w-12 h-12 mx-auto mb-4 text-muted-foreground' />
											<p className='mb-2'>
												Kéo thả hình ảnh vào đây hoặc nhấn để chọn
											</p>
											<p className='text-sm text-muted-foreground'>
												Tối thiểu 1 ảnh
											</p>
											<Input
												id='image-upload'
												type='file'
												multiple
												accept='image/*'
												className='hidden'
												onChange={handleImageUpload}
											/>
										</Label>
									</div>

									{uploadedImages.length > 0 && (
										<div>
											<div className='flex items-center justify-between mb-3'>
												<label>Đã có {uploadedImages.length} ảnh</label>
												<p className='text-sm text-muted-foreground'>
													Kéo để sắp xếp
												</p>
											</div>
											<div className='grid grid-cols-3 gap-4'>
												{uploadedImages.map((image, index) => (
													<div key={index} className='relative group'>
														<Image
															src={image.preview}
															width='200'
															height='200'
															alt={`Upload ${index + 1}`}
															className='w-full h-32 object-cover rounded-lg'
														/>
														<div className='absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2'>
															<button
																type='button'
																className='p-2 bg-card rounded-full hover:scale-110 transition-transform'>
																<GripVertical className='w-4 h-4' />
															</button>
															<button
																type='button'
																onClick={() => removeImage(index)}
																className='p-2 bg-card rounded-full hover:scale-110 transition-transform'>
																<X className='w-4 h-4 text-destructive' />
															</button>
														</div>
														{index === 0 && (
															<Badge
																variant='secondary'
																className='absolute top-2 left-2 text-xs'>
																Ảnh bìa
															</Badge>
														)}
													</div>
												))}
											</div>
										</div>
									)}
								</div>
							)}

							{currentStep === 4 && (
								<div className='space-y-6'>
									<h2 className='text-2xl font-bold'>Xem trước cập nhật</h2>

									<div className='bg-secondary rounded-xl p-6 space-y-4'>
										<div>
											<h3 className='text-xl font-semibold mb-2'>
												{formData.title}
											</h3>
											<p className='text-muted-foreground'>
												{formData.address}
											</p>
										</div>

										<div className='grid grid-cols-2 gap-4'>
											<div>
												<span className='text-sm text-muted-foreground block mb-1'>
													Loại phòng
												</span>
												<p className='text-lg font-medium'>
													{
														roomTypes.find((t) => t.value === formData.roomType)
															?.label
													}
												</p>
											</div>
											<div>
												<span className='text-sm text-muted-foreground block mb-1'>
													Giá thuê
												</span>
												<p className='text-xl text-accent font-semibold'>
													{Number(formData.price).toLocaleString('vi-VN')}
													₫/tháng
												</p>
											</div>
											<div>
												<span className='text-sm text-muted-foreground block mb-1'>
													Diện tích
												</span>
												<p className='text-lg'>{formData.area}m²</p>
											</div>
											{formData.floor && formData.floor > 0 ? (
												<div>
													<span className='text-sm text-muted-foreground block mb-1'>
														Tầng
													</span>
													<p className='text-lg'>{formData.floor}</p>
												</div>
											) : null}
											{formData.minStay && formData.minStay !== '0' && formData.minStay !== '--' ? (
												<div>
													<span className='text-sm text-muted-foreground block mb-1'>
														Thời gian ở tối thiểu
													</span>
													<p className='text-lg'>{formData.minStay}</p>
												</div>
											) : null}
											{formData.electricityCost && formData.electricityCost > 0 ? (
												<div>
													<span className='text-sm text-muted-foreground block mb-1'>
														Tiền điện
													</span>
													<p className='text-lg'>
														{Number(formData.electricityCost).toLocaleString('vi-VN')}đ/kWh
													</p>
												</div>
											) : null}
											{formData.waterCost && formData.waterCost > 0 ? (
												<div>
													<span className='text-sm text-muted-foreground block mb-1'>
														Tiền nước
													</span>
													<p className='text-lg'>
														{Number(formData.waterCost).toLocaleString('vi-VN')}đ/tháng
													</p>
												</div>
											) : null}
											{formData.deposit && formData.deposit > 0 ? (
												<div>
													<span className='text-sm text-muted-foreground block mb-1'>
														Tiền đặt cọc
													</span>
													<p className='text-lg'>
														{Number(formData.deposit).toLocaleString('vi-VN')}đ
													</p>
												</div>
											) : null}
										</div>

										<Separator />

										<div>
											<span className='text-sm text-muted-foreground block mb-2 font-semibold'>
												Mô tả
											</span>
											<p className='whitespace-pre-line text-sm'>
												{formData.description}
											</p>
										</div>

										{formData.amenities && formData.amenities.length > 0 && (
											<>
												<Separator />
												<div>
													<span className='text-sm text-muted-foreground block mb-2 font-semibold'>
														Tiện nghi
													</span>
													<div className='flex flex-wrap gap-2'>
														{formData.amenities.map((amenity) => (
															<Badge key={amenity} variant='default'>
																{
																	amenitiesList.find((a) => a.value === amenity)
																		?.value
																}
															</Badge>
														))}
													</div>
												</div>
											</>
										)}

										{formData.rules && (
											<>
												<Separator />
												<div>
													<span className='text-sm text-muted-foreground block mb-2 font-semibold'>
														Quy định nhà
													</span>
													<p className='whitespace-pre-line text-sm'>
														{formData.rules}
													</p>
												</div>
											</>
										)}

										{coords && (
											<>
												<Separator />
												<div>
													<span className='text-sm text-muted-foreground block mb-3 font-semibold'>
														Bản đồ vị trí
													</span>
													<PostMapPreview
														lat={coords.lat}
														lng={coords.lng}
														onChange={(lat, lng) => setCoords({ lat, lng })}
													/>
												</div>
											</>
										)}
									</div>

									<div className='flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg'>
										<div className='text-blue-600 dark:text-blue-400 mt-0.5'>ℹ️</div>
										<div className='flex-1 text-sm'>
											<p className='mb-1'>
												Các thay đổi sẽ được cập nhật ngay lập tức.
											</p>
											<p className='text-muted-foreground'>
												Đảm bảo thông tin chính xác để giữ uy tín cho tin đăng
												của bạn.
											</p>
										</div>
									</div>
								</div>
							)}

							<div className='flex items-center justify-between mt-8 pt-6 border-t border-border'>
								{currentStep > 1 ?
									<Button
										type='button'
										variant='secondary'
										onClick={() => setCurrentStep(currentStep - 1)}>
										Quay lại
									</Button>
								:	<div />}

								{currentStep < 4 ?
									<Button
										key='next-btn'
										type='button'
										variant='default'
										onClick={handleNextStep}>
										Tiếp tục
									</Button>
								:	<Button
										key='submit-btn'
										type='submit'
										disabled={isUpdating}
										className='bg-accent hover:bg-accent/90'>
										{isUpdating ? 'Đang cập nhật...' : 'Cập nhật tin'}
									</Button>
								}
							</div>
						</div>

						<div className='lg:col-span-1'>
							<div className='sticky top-24 bg-card border border-border rounded-xl p-6'>
								<h3 className='mb-4'>💡 Mẹo chỉnh sửa</h3>
								<ul className='space-y-3 text-sm text-muted-foreground'>
									<li>✓ Cập nhật giá thuê nếu có thay đổi</li>
									<li>✓ Thêm ảnh mới nếu bạn vừa sửa sang lại phòng</li>
									<li>✓ Mô tả rõ các tiện ích mới thêm vào</li>
									<li>✓ Kiểm tra kỹ địa chỉ và số điện thoại</li>
								</ul>

								<Separator className='my-4' />

								<div className='text-sm font-medium text-primary'>
									Việc cập nhật thông tin thường xuyên giúp tin đăng của bạn nổi
									bật hơn.
								</div>
							</div>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
};

export default EditRoomPage;
