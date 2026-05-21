/* eslint-disable @typescript-eslint/no-explicit-any */
import { uploadImage } from '@/lib/api/upload.api';
import { getMe, updateMe } from '@/lib/api/user.api';
import { refreshToken } from '@/lib/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import z from 'zod';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Camera, Loader2, Lock } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

const schema = z.object({
	fullName: z.string().min(2, 'Họ và tên ít nhất 2 kí tự'),
	role: z.enum(['RENTER', 'LANDLORD']),
	phone: z.string().min(10, 'Số điện thoại phải có 10 số'),
});

type FormData = z.infer<typeof schema>;

const Personal = () => {
	const queryClient = useQueryClient();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [isLoading, setIsLoading] = useState(false);
	const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
	const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<FormData>({
		resolver: zodResolver(schema),
		defaultValues: {
			fullName: '',
			role: 'RENTER',
			phone: '',
		},
	});

	const { data, isLoading: isLoadingUser } = useQuery({
		queryKey: ['me'],
		queryFn: getMe,
	});

	// Reset form khi data được load
	useEffect(() => {
		if (data) {
			reset({
				fullName: data.fullName || '',
				role: (data.role as 'RENTER' | 'LANDLORD') || 'RENTER',
				phone: data.phone || '',
			});
		}
	}, [data, reset]);

	const { updateTokens, fetchUser } = useAuthStore();

	const onSubmit = async (formData: FormData) => {
		setIsLoading(true);
		try {
			const roleChanged = data?.role !== formData.role;
			await updateMe(formData);

			// Nếu role thay đổi, refresh JWT tokens để role mới được phản ánh
			if (roleChanged) {
				const currentRefreshToken = localStorage.getItem('refreshToken');
				if (currentRefreshToken) {
					const tokens = await refreshToken(currentRefreshToken);
					updateTokens(tokens.accessToken, tokens.refreshToken);
				}
				await fetchUser();
			}

			queryClient.invalidateQueries({ queryKey: ['me'] });
			toast.success(
				roleChanged
					? `Cập nhật thành công! Bạn đã chuyển sang ${formData.role === 'LANDLORD' ? 'Chủ trọ' : 'Người thuê'}`
					: 'Cập nhật thành công',
			);
		} catch (error: any) {
			toast.error(error.response?.data?.message || 'Cập nhật thất bại');
		} finally {
			setIsLoading(false);
		}
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			handleAvatarUpload(file);
		}
	};

	const handleAvatarUpload = async (file: File) => {
		if (!file) return;

		// Validate file type
		if (!file.type.match(/^image\/(jpg|jpeg|png|webp)$/)) {
			toast.error('Chỉ hỗ trợ file ảnh (jpg, jpeg, png, webp)');
			return;
		}

		// Validate file size (5MB)
		if (file.size > 5 * 1024 * 1024) {
			toast.error('Kích thước file không được vượt quá 5MB');
			return;
		}

		try {
			setIsUploadingAvatar(true);

			// Create preview
			const reader = new FileReader();
			reader.onload = (e) => {
				setPreviewAvatar(e.target?.result as string);
			};
			reader.readAsDataURL(file);

			// Upload to server
			const imageUrl = await uploadImage(file);

			// Update user with new avatar URL
			await updateMe({ avatarUrl: imageUrl });

			// Reset preview and refetch user data
			setPreviewAvatar(null);
			queryClient.invalidateQueries({ queryKey: ['me'] });
			toast.success('Cập nhật ảnh đại diện thành công');
		} catch (error: any) {
			setPreviewAvatar(null);
			toast.error(
				error.response?.data?.message || 'Cập nhật ảnh đại diện thất bại',
			);
		} finally {
			setIsUploadingAvatar(false);
			// Reset file input
			if (fileInputRef.current) {
				fileInputRef.current.value = '';
			}
		}
	};

	const handleAvatarButtonClick = () => {
		fileInputRef.current?.click();
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
			{/* Hidden File Upload Input */}
			<input
				type='file'
				ref={fileInputRef}
				accept='image/jpg,image/jpeg,image/png,image/webp'
				onChange={handleFileChange}
				className='hidden'
			/>
			{/* Profile Section */}
			<div className='flex items-start gap-6 pb-6 border-b border-border'>
				<div className='relative'>
					<Avatar className='w-20 h-20 cursor-pointer'>
						<AvatarImage src={previewAvatar || data?.avatarUrl} />
						<AvatarFallback className='bg-primary/90 text-white text-xl'>
							{data?.fullName?.charAt(0).toUpperCase()}
						</AvatarFallback>
					</Avatar>
					<Button
						onClick={handleAvatarButtonClick}
						disabled={isUploadingAvatar}
						className='absolute bottom-0 right-0 w-7 h-7 bg-card rounded-full border-2 border-border flex items-center justify-center hover:bg-secondary disabled:opacity-50'>
						{isUploadingAvatar ?
							<Loader2
								size={14}
								className='text-muted-foreground animate-spin'
							/>
						:	<Camera size={14} className='text-muted-foreground' />}
					</Button>
				</div>
				<div>
					<h2 className='text-xl mb-1'>{data?.fullName}</h2>
					<div className='flex items-center gap-2 mb-2'>
						<Badge variant='outline' className='text-primary'>
							{data?.role === 'RENTER' ? 'Người thuê' : 'Chủ trọ'}
						</Badge>
						<span className='text-sm text-secondary-foreground'>
							Thành viên từ{' '}
							{data?.createdAt && new Date(data.createdAt).toLocaleDateString()}
						</span>
					</div>
					<Button
						variant='outline'
						className='text-sm text-secondary-foreground'
						onClick={handleAvatarButtonClick}
						disabled={isUploadingAvatar}>
						{isUploadingAvatar ? 'Đang tải lên...' : 'Đổi ảnh đại diện'}
					</Button>
				</div>
			</div>

			{/* Information Form */}
			<div className='space-y-4'>
				<div>
					<label className='block text-sm font-medium mb-2'>Họ và tên</label>
					<Input
						type='text'
						{...register('fullName')}
						className='w-full h-11 px-3 bg-input-background border border-border rounded-lg text-secondary-foreground'
					/>
					{errors.fullName && (
						<p className='text-xs text-red-500 mt-1'>
							{errors.fullName.message}
						</p>
					)}
				</div>

				<div>
					<Label className='block text-sm font-medium mb-2'>
						Loại tài khoản
					</Label>
					<select
						{...register('role')}
						className='w-full h-11 px-3 bg-input-background border border-border rounded-lg text-secondary-foreground appearance-none cursor-pointer'>
						<option value='RENTER'>Người thuê</option>
						<option value='LANDLORD'>Chủ trọ</option>
					</select>
					{errors.role && (
						<p className='text-xs text-red-500 mt-1'>{errors.role.message}</p>
					)}
				</div>

				<div>
					<Label className='block text-sm font-medium mb-2'>Email</Label>
					<div className='relative'>
						<Input
							type='email'
							value={data?.email ?? ''}
							disabled
							className='w-full h-11 px-3 pr-8 bg-secondary border border-border rounded-lg text-muted-foreground cursor-not-allowed'
						/>
						<Lock
							className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground'
							size={16}
						/>
					</div>
					<p className='text-xs text-red-500 mt-1'>Email không thể thay đổi</p>
				</div>

				<div>
					<label className='block text-sm font-medium mb-2'>
						Số điện thoại
					</label>
					<Input
						type='tel'
						{...register('phone')}
						className='w-full h-11 px-3 bg-input-background border border-border text-secondary-foreground'
					/>
					{errors.phone && (
						<p className='text-xs text-red-500 mt-1'>{errors.phone.message}</p>
					)}
				</div>

				<Button
					type='submit'
					className='w-full h-11 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center'
					disabled={isLoading || isLoadingUser}>
					{isLoading ?
						<>
							<Loader2 className='mr-2 animate-spin' size={18} /> Đang cập nhật
						</>
					:	'Cập nhật'}
				</Button>
			</div>
		</form>
	);
};

export default Personal;
