'use client';
import { useAuthStore } from '@/stores/auth.store';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import {
	LayoutDashboard,
	Users,
	Home,
	Star,
	AlertTriangle,
	Settings,
	LogOut,
	HelpCircle,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { user, isLoading, logout } = useAuthStore();
	const router = useRouter();
	const pathname = usePathname();

	useEffect(() => {
		if (!isLoading) {
			if (!user) {
				router.push('/login');
			} else if (user.role !== 'ADMIN') {
				router.push('/');
			}
		}
	}, [user, isLoading, router]);

	if (isLoading || !user || user.role !== 'ADMIN') {
		return (
			<div className='min-h-screen flex items-center justify-center bg-background'>
				<Skeleton className='w-48 h-12' />
			</div>
		);
	}

	const navItems = [
		{ label: 'Tổng quan', href: '/admin/dashboard', icon: LayoutDashboard },
		{ label: 'Danh sách phòng', href: '/admin/rooms', icon: Home },
		{ label: 'Người dùng', href: '/admin/users', icon: Users },
		{ label: 'Đánh giá', href: '/admin/reviews', icon: Star },
		{ label: 'Báo cáo', href: '/admin/reports', icon: AlertTriangle },
	];

	return (
		<div className='min-h-screen flex bg-background'>
			{/* Sidebar - Dark Theme */}
			<div className='w-64 bg-[#1a1a2e] flex flex-col fixed h-full'>
				{/* Logo */}
				<div className='px-6 py-6 flex items-center gap-3'>
					<div className='w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center'>
						<Home className='w-5 h-5 text-white' />
					</div>
					<span className='text-xl font-bold text-white tracking-tight'>
						Phòng trọ VN
					</span>
				</div>

				{/* Navigation */}
				<nav className='flex-1 px-4 py-2 flex flex-col gap-1'>
					{navItems.map((item) => {
						const isActive = pathname === item.href;
						const Icon = item.icon;
						return (
							<Link
								key={item.href}
								href={item.href}
								className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
									${
										isActive ?
											'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
										:	'text-gray-400 hover:bg-white/5 hover:text-white'
									}`}>
								<Icon className='w-[18px] h-[18px]' />
								<span>{item.label}</span>
							</Link>
						);
					})}
				</nav>

				{/* User Info */}
				<div className='p-4 border-t border-white/10'>
					<div className='flex items-center gap-3 mb-3 px-2'>
						<Avatar className='w-10 h-10 border-2 border-blue-500/30'>
							<AvatarImage src={user.avatarUrl} />
							<AvatarFallback className='bg-blue-600 text-white text-sm font-bold'>
								{user.fullName?.substring(0, 2).toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<div className='flex-1 min-w-0'>
							<p className='text-sm font-semibold text-white truncate'>
								{user.fullName}
							</p>
							<p className='text-xs text-gray-400 truncate'>{user.email}</p>
						</div>
					</div>
					<button
						onClick={() => {
							logout();
							router.push('/login');
						}}
						className='w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors font-medium'>
						<LogOut className='w-4 h-4' />
						Đăng xuất
					</button>
				</div>
			</div>

			{/* Main Content */}
			<div className='flex-1 ml-64 p-8 overflow-auto min-h-screen'>
				{children}
			</div>
		</div>
	);
}
