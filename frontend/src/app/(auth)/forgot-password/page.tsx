/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	forgotPassword,
	resetPassword,
	verifyResetCode,
} from '@/lib/api/auth.api';
import {
	ArrowLeft,
	CheckCircle,
	Eye,
	EyeOff,
	Home,
	Loader2,
	Lock,
	Mail,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

type Step = 'email' | 'otp' | 'newPassword' | 'done';

const ForgotPasswordPage = () => {
	const router = useRouter();
	const [step, setStep] = useState<Step>('email');
	const [isLoading, setIsLoading] = useState(false);
	const [email, setEmail] = useState('');
	const [otp, setOtp] = useState(['', '', '', '', '', '']);
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

	// ── Step 1: Send OTP ──────────────────────────────────────
	const handleSendCode = async () => {
		if (!email || !email.includes('@')) {
			toast.error('Vui lòng nhập email hợp lệ');
			return;
		}
		setIsLoading(true);
		try {
			await forgotPassword(email);
			toast.success('Mã xác nhận đã được gửi đến email của bạn');
			setStep('otp');
		} catch (error: any) {
			toast.error(
				error.response?.data?.message || 'Không thể gửi mã xác nhận',
			);
		} finally {
			setIsLoading(false);
		}
	};

	// ── Step 2: Verify OTP ────────────────────────────────────
	const handleOtpChange = (index: number, value: string) => {
		if (!/^\d*$/.test(value)) return;
		const newOtp = [...otp];
		newOtp[index] = value.slice(-1);
		setOtp(newOtp);
		if (value && index < 5) {
			otpRefs.current[index + 1]?.focus();
		}
	};

	const handleOtpKeyDown = (
		index: number,
		e: React.KeyboardEvent<HTMLInputElement>,
	) => {
		if (e.key === 'Backspace' && !otp[index] && index > 0) {
			otpRefs.current[index - 1]?.focus();
		}
	};

	const handleOtpPaste = (e: React.ClipboardEvent) => {
		e.preventDefault();
		const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
		const newOtp = [...otp];
		for (let i = 0; i < pasted.length; i++) {
			newOtp[i] = pasted[i];
		}
		setOtp(newOtp);
		const nextIndex = Math.min(pasted.length, 5);
		otpRefs.current[nextIndex]?.focus();
	};

	const handleVerifyCode = async () => {
		const code = otp.join('');
		if (code.length !== 6) {
			toast.error('Vui lòng nhập đủ 6 số');
			return;
		}
		setIsLoading(true);
		try {
			await verifyResetCode(email, code);
			toast.success('Mã xác nhận hợp lệ');
			setStep('newPassword');
		} catch (error: any) {
			toast.error(
				error.response?.data?.message ||
					'Mã xác nhận không hợp lệ hoặc đã hết hạn',
			);
		} finally {
			setIsLoading(false);
		}
	};

	// ── Step 3: Reset Password ────────────────────────────────
	const handleResetPassword = async () => {
		if (newPassword.length < 6) {
			toast.error('Mật khẩu ít nhất 6 ký tự');
			return;
		}
		if (newPassword !== confirmPassword) {
			toast.error('Mật khẩu xác nhận không khớp');
			return;
		}
		setIsLoading(true);
		try {
			const code = otp.join('');
			await resetPassword(email, code, newPassword);
			toast.success('Đặt lại mật khẩu thành công!');
			setStep('done');
		} catch (error: any) {
			toast.error(
				error.response?.data?.message || 'Không thể đặt lại mật khẩu',
			);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className='min-h-screen flex items-center justify-center bg-background p-4'>
			<Card className='w-full max-w-[440px] bg-card rounded-2xl shadow-lg p-8'>
				<CardHeader className='text-center mb-5'>
					<div className='flex items-center justify-center gap-2 font-semibold text-primary text-2xl'>
						<Home className='w-8 h-8 text-primary text-xl rounded-lg flex items-center justify-center' />{' '}
						Room Matching
					</div>
					<CardTitle className='text-xl mb-2'>
						{step === 'done' ? 'Thành công!' : 'Quên mật khẩu'}
					</CardTitle>
				</CardHeader>
				<CardContent>
					{/* ── Step 1: Email ──────────────────────────── */}
					{step === 'email' && (
						<div className='space-y-4'>
							<p className='text-sm text-muted-foreground text-center'>
								Nhập email đã đăng ký để nhận mã xác nhận
							</p>
							<div>
								<Label className='block text-sm font-medium mb-2'>Email</Label>
								<div className='relative'>
									<Mail
										className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'
										size={18}
									/>
									<Input
										type='email'
										placeholder='your@email.com'
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										onKeyDown={(e) => e.key === 'Enter' && handleSendCode()}
										className='w-full h-11 pl-10 pr-3 bg-input-background border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all'
									/>
								</div>
							</div>
							<Button
								onClick={handleSendCode}
								disabled={isLoading}
								className='w-full h-11 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center'>
								{isLoading ?
									<>
										<Loader2 className='mr-2 animate-spin' size={18} /> Đang
										gửi...
									</>
								:	'Gửi mã xác nhận'}
							</Button>
							<div className='text-center'>
								<Link
									href='/login'
									className='text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1'>
									<ArrowLeft size={14} /> Quay lại đăng nhập
								</Link>
							</div>
						</div>
					)}

					{/* ── Step 2: OTP ────────────────────────────── */}
					{step === 'otp' && (
						<div className='space-y-4'>
							<p className='text-sm text-muted-foreground text-center'>
								Nhập mã 6 số đã gửi đến{' '}
								<span className='font-medium text-foreground'>{email}</span>
							</p>
							<div
								className='flex justify-center gap-2'
								onPaste={handleOtpPaste}>
								{otp.map((digit, i) => (
									<input
										key={i}
										ref={(el) => {
											otpRefs.current[i] = el;
										}}
										type='text'
										inputMode='numeric'
										maxLength={1}
										value={digit}
										onChange={(e) => handleOtpChange(i, e.target.value)}
										onKeyDown={(e) => handleOtpKeyDown(i, e)}
										className='w-12 h-14 text-center text-xl font-bold rounded-lg border-2 border-border bg-input-background focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all'
									/>
								))}
							</div>
							<Button
								onClick={handleVerifyCode}
								disabled={isLoading || otp.join('').length !== 6}
								className='w-full h-11 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center'>
								{isLoading ?
									<>
										<Loader2 className='mr-2 animate-spin' size={18} /> Đang
										xác nhận...
									</>
								:	'Xác nhận mã'}
							</Button>
							<div className='text-center space-y-2'>
								<button
									onClick={handleSendCode}
									disabled={isLoading}
									className='text-sm text-primary hover:underline disabled:opacity-50 cursor-pointer'>
									Gửi lại mã
								</button>
								<br />
								<button
									onClick={() => setStep('email')}
									className='text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1 cursor-pointer'>
									<ArrowLeft size={14} /> Đổi email
								</button>
							</div>
						</div>
					)}

					{/* ── Step 3: New Password ──────────────────── */}
					{step === 'newPassword' && (
						<div className='space-y-4'>
							<p className='text-sm text-muted-foreground text-center'>
								Tạo mật khẩu mới cho tài khoản của bạn
							</p>
							<div>
								<Label className='block text-sm font-medium mb-2'>
									Mật khẩu mới
								</Label>
								<div className='relative'>
									<Lock
										className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'
										size={18}
									/>
									<Input
										type={showPassword ? 'text' : 'password'}
										placeholder='Ít nhất 6 ký tự'
										value={newPassword}
										onChange={(e) => setNewPassword(e.target.value)}
										className='w-full h-11 pl-10 pr-10 bg-input-background border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all'
									/>
									<button
										type='button'
										onClick={() => setShowPassword(!showPassword)}
										className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer'>
										{showPassword ?
											<EyeOff size={18} />
										:	<Eye size={18} />}
									</button>
								</div>
							</div>
							<div>
								<Label className='block text-sm font-medium mb-2'>
									Xác nhận mật khẩu
								</Label>
								<div className='relative'>
									<Lock
										className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'
										size={18}
									/>
									<Input
										type={showPassword ? 'text' : 'password'}
										placeholder='Nhập lại mật khẩu'
										value={confirmPassword}
										onChange={(e) => setConfirmPassword(e.target.value)}
										onKeyDown={(e) =>
											e.key === 'Enter' && handleResetPassword()
										}
										className='w-full h-11 pl-10 pr-3 bg-input-background border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all'
									/>
								</div>
							</div>
							<Button
								onClick={handleResetPassword}
								disabled={isLoading}
								className='w-full h-11 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center'>
								{isLoading ?
									<>
										<Loader2 className='mr-2 animate-spin' size={18} /> Đang
										đặt lại...
									</>
								:	'Đặt lại mật khẩu'}
							</Button>
						</div>
					)}

					{/* ── Step 4: Done ──────────────────────────── */}
					{step === 'done' && (
						<div className='text-center space-y-4'>
							<div className='flex justify-center'>
								<CheckCircle className='w-16 h-16 text-green-500' />
							</div>
							<p className='text-muted-foreground'>
								Mật khẩu đã được đặt lại thành công. Bạn có thể đăng nhập bằng
								mật khẩu mới.
							</p>
							<Button
								onClick={() => router.push('/login')}
								className='w-full h-11 bg-primary text-white rounded-lg hover:bg-primary/90'>
								Đăng nhập
							</Button>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
};

export default ForgotPasswordPage;
