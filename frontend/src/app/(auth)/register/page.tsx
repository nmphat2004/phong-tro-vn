/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/auth.store';
import { Input } from '@base-ui/react/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Home, Loader2, Lock, Mail, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import z from 'zod';
import { register as registerApi } from '@/lib/api/auth.api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const schema = z.object({
	fullName: z.string().min(2, 'Họ và tên ít nhất 2 kí tự'),
	email: z.string().email('Email không hợp lệ'),
	password: z.string().min(6, 'Mật khẩu ít nhất 6 kí tự'),
	role: z.enum(['RENTER', 'LANDLORD']),
});

type FormData = z.infer<typeof schema>;

const RegisterPage = () => {
	const [isLoading, setIsLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const router = useRouter();
	const { setAuth, user, isLoading: isAuthLoading } = useAuthStore();

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		formState: { errors },
	} = useForm<FormData>({
		resolver: zodResolver(schema),
		defaultValues: { role: 'RENTER' },
	});

	const selectedRole = watch('role');

	const onSubmit = async (data: FormData) => {
		setIsLoading(true);
		try {
			const res = await registerApi(data);
			setAuth(res.user, res.accessToken, res.refreshToken);
			toast.success('Đăng kí thành công!');
			router.push('/');
		} catch (error: any) {
			toast.error(error.response?.data?.message || 'Đăng kí thất bại');
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (user) router.push('/');
	}, [user, router]);

	if (isAuthLoading || user) return null;

	return (
		<div className='min-h-screen flex items-center justify-center bg-background p-4'>
			<Card className='w-full max-w-[440px] bg-card rounded-2xl shadow-lg p-8'>
				<CardHeader className='text-center mb-5'>
					<div className='flex items-center justify-center gap-2 font-semibold text-primary text-2xl '>
						<Home className='w-8 h-8 text-primary text-xl rounded-lg flex items-center justify-center' />{' '}
						Phòng trọ VN
					</div>
					<CardTitle className='text-xl mb-2'>Tạo tài khoản</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
						{/* Chọn role */}
						<div className='grid grid-cols-2 gap-3 mb-6'>
							{(['RENTER', 'LANDLORD'] as const).map((role) => (
								<button
									key={role}
									type='button'
									onClick={() => setValue('role', role)}
									className={`p-4 rounded-xl border-2 text-sm transition-all ${
										selectedRole === role ?
											'border-primary bg-primary/5'
										:	'border-secondary hover:border-primary/30'
									}`}>
									{role === 'RENTER' ? '🏠 Tìm phòng' : '🏘️ Cho thuê'}
								</button>
							))}
						</div>

						<div>
							<Label className='block text-sm font-medium mb-2'>
								Họ và tên
							</Label>
							<div className='relative'>
								<User
									className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'
									size={18}
								/>
								<Input
									type='text'
									{...register('fullName')}
									placeholder='Nguyen Van A'
									className='w-full h-11 pl-10 pr-3 bg-input-background border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all'
								/>
							</div>
							{errors.fullName && (
								<p className='text-xs text-red-500 mt-2'>
									{errors.fullName.message}
								</p>
							)}
						</div>

						<div>
							<Label className='block text-sm font-medium mb-2'>Email</Label>
							<div className='relative'>
								<Mail
									className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'
									size={18}
								/>
								<Input
									type='email'
									{...register('email')}
									placeholder='your@email.com'
									className='w-full h-11 pl-10 pr-3 bg-input-background border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all'
								/>
							</div>
							{errors.email && (
								<p className='text-xs text-red-500 mt-2'>
									{errors.email.message}
								</p>
							)}
						</div>

						<div>
							<Label className='block text-sm font-medium mb-2'>Mật khẩu</Label>
							<div className='relative'>
								<Lock
									className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'
									size={18}
								/>
								<Input
									type={showPassword ? 'text' : 'password'}
									{...register('password')}
									placeholder='*******'
									className='w-full h-11 pl-10 pr-3 bg-input-background border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all'
								/>
								<Button
									type='button'
									variant='ghost'
									onClick={() => setShowPassword(!showPassword)}
									className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'>
									{showPassword ?
										<EyeOff size={18} />
									:	<Eye size={18} />}
								</Button>
							</div>
							{errors.password && (
								<p className='text-xs text-red-500 mt-2'>
									{errors.password.message}
								</p>
							)}
						</div>

						<Button
							type='submit'
							className='w-full h-11 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center'
							disabled={isLoading}>
							{isLoading ?
								<>
									<Loader2 className='mr-2 animate-spin' size={18} /> Đang đăng
									kí
								</>
							:	'Đăng kí'}
						</Button>
					</form>

					<div className='mt-6 text-center'>
						<p className='text-sm text-muted-foreground'>
							Đã có tài khoản?{' '}
							<Link href='/login' className='text-primary hover:underline'>
								Đăng nhập
							</Link>
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

export default RegisterPage;
