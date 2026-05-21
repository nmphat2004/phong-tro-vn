/* eslint-disable @typescript-eslint/no-explicit-any */
import { changePassword, deleteMe } from '@/lib/api/user.api';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import z from 'zod';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { EyeOff, Eye, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

const changePasswordSchema = z
	.object({
		currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
		newPassword: z.string().min(6, 'Mật khẩu mới ít nhất 6 ký tự'),
		confirmNewPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
	})
	.refine((data) => data.newPassword !== data.currentPassword, {
		message: 'Mật khẩu mới phải khác mật khẩu hiện tại',
		path: ['newPassword'],
	})
	.refine((data) => data.newPassword === data.confirmNewPassword, {
		message: 'Mật khẩu xác nhận không khớp',
		path: ['confirmNewPassword'],
	});

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

const Security = () => {
	const [showPasswords, setShowPasswords] = useState({
		current: false,
		new: false,
		confirm: false,
	});
	const router = useRouter();
	const { logout, user } = useAuthStore();

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<ChangePasswordForm>({
		resolver: zodResolver(changePasswordSchema),
		defaultValues: {
			currentPassword: '',
			newPassword: '',
			confirmNewPassword: '',
		},
	});

	const onSubmit = async (data: ChangePasswordForm) => {
		try {
			await changePassword({
				currentPassword: data.currentPassword,
				newPassword: data.newPassword,
			});
			toast.success('Đổi mật khẩu thành công');
			reset();
		} catch (error: any) {
			const msg = error.response?.data?.message;
			toast.error(Array.isArray(msg) ? msg[0] : msg || 'Đổi mật khẩu thất bại');
		}
	};

	const handleDelete = async () => {
		const confirm = window.confirm('Bạn có chắc là muốn xóa tài khoản?');
		if (confirm) {
			try {
				await deleteMe();
				logout();
				toast.success('Xóa tài khoản thành công');
				router.push('/');
			} catch (error: any) {
				toast.error(error.response?.data?.message || 'Xóa tài khoản thất bại');
			}
		}
	};

	return (
		<div className='space-y-6'>
			{/* Change Password */}
			<div>
				<h3 className='text-lg font-medium mb-4'>Đổi mật khẩu</h3>
				<form onSubmit={handleSubmit(onSubmit)} className='space-y-4 max-w-md'>
					<div className='relative'>
						<label className='block text-sm font-medium mb-2'>
							Mật khẩu hiện tại
						</label>
						<Input
							type={showPasswords.current ? 'text' : 'password'}
							{...register('currentPassword')}
							placeholder='••••••••'
							className='w-full h-11 px-3 bg-input-background border border-border rounded-lg text-secondary-foreground'
						/>
						<Button
							type='button'
							variant='ghost'
							onClick={() =>
								setShowPasswords({
									...showPasswords,
									current: !showPasswords.current,
								})
							}
							className='absolute right-3 top-1/2 -translate-y-1/10 text-muted-foreground hover:text-foreground'>
							{showPasswords.current ?
								<EyeOff size={18} />
							:	<Eye size={18} />}
						</Button>
						{errors.currentPassword && (
							<p className='text-xs text-red-500 mt-1'>
								{errors.currentPassword.message}
							</p>
						)}
					</div>

					<div className='relative'>
						<label className='block text-sm font-medium mb-2'>
							Mật khẩu mới
						</label>
						<Input
							type={showPasswords.new ? 'text' : 'password'}
							{...register('newPassword')}
							placeholder='••••••••'
							className='w-full h-11 px-3 bg-input-background border border-border rounded-lg text-secondary-foreground'
						/>
						<Button
							type='button'
							variant='ghost'
							onClick={() =>
								setShowPasswords({
									...showPasswords,
									new: !showPasswords.new,
								})
							}
							className='absolute right-3 top-1/2 -translate-y-1/10 text-muted-foreground hover:text-foreground'>
							{showPasswords.new ?
								<EyeOff size={18} />
							:	<Eye size={18} />}
						</Button>
						{errors.newPassword && (
							<p className='text-xs text-red-500 mt-1'>
								{errors.newPassword.message}
							</p>
						)}
					</div>

					<div className='relative'>
						<label className='block text-sm font-medium mb-2'>
							Xác nhận lại mật khẩu
						</label>
						<Input
							type={showPasswords.confirm ? 'text' : 'password'}
							{...register('confirmNewPassword')}
							placeholder='••••••••'
							className='w-full h-11 px-3 bg-input-background border border-border rounded-lg text-secondary-foreground'
						/>
						<Button
							type='button'
							variant='ghost'
							onClick={() =>
								setShowPasswords({
									...showPasswords,
									confirm: !showPasswords.confirm,
								})
							}
							className='absolute right-3 top-1/2 -translate-y-1/10 text-muted-foreground hover:text-foreground'>
							{showPasswords.confirm ?
								<EyeOff size={18} />
							:	<Eye size={18} />}
						</Button>
						{errors.confirmNewPassword && (
							<p className='text-xs text-red-500 mt-1'>
								{errors.confirmNewPassword.message}
							</p>
						)}
					</div>

					<Button
						type='submit'
						disabled={isSubmitting}
						variant='default'
						className='bg-primary text-white px-6 h-10 rounded-lg hover:bg-primary/90'>
						{isSubmitting ?
							<>
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
								Đang cập nhật...
							</>
						:	'Cập nhật'}
					</Button>
				</form>
			</div>

			{/* Danger Zone */}
			{user?.role !== 'ADMIN' && (
				<div className='border-2 border-red-500 rounded-xl p-6 mt-8'>
					<h3 className='text-lg font-medium text-red-600 mb-4'>
						Vùng nguy hiểm
					</h3>
					<div className='space-y-3'>
						<div className='flex items-start justify-between pt-3 border-t border-red-200'>
							<div>
								<p className='font-medium'>Xóa tài khoản</p>
								<p className='text-sm text-red-600'>
									Không thể hoàn tác hành động này
								</p>
							</div>
							<Button
								onClick={handleDelete}
								className='px-4 h-9 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm'>
								Xóa
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default Security;
