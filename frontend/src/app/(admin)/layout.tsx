'use client';
import { useAuthStore } from '@/stores/auth.store';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
	LayoutDashboard,
	Users,
	Home,
	Star,
	AlertTriangle,
	LogOut,
	Menu,
	X,
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
	const [sidebarOpen, setSidebarOpen] = useState(false);

	useEffect(() => {
		if (!isLoading) {
			if (!user) {
				router.push('/login');
			} else if (user.role !== 'ADMIN') {
				router.push('/');
			}
		}
	}, [user, isLoading, router]);

	// Close sidebar when navigating on mobile
	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setSidebarOpen(false);
	}, [pathname]);

	if (isLoading || !user || user.role !== 'ADMIN') {
		return (
			<div className='min-h-screen flex items-center justify-center bg-background'>
				<Skeleton className='w-48 h-12' />
			</div>
		);
	}

	const navItems = [
		{ label: 'Tổng quan', href: '/admin/dashboard', icon: LayoutDashboard },
		{ label: 'Tin đăng', href: '/admin/rooms', icon: Home },
		{ label: 'Người dùng', href: '/admin/users', icon: Users },
		{ label: 'Đánh giá', href: '/admin/reviews', icon: Star },
		{ label: 'Báo cáo', href: '/admin/reports', icon: AlertTriangle },
	];

	return (
		<div className='min-h-screen flex bg-background'>
			{/* Mobile overlay */}
			{sidebarOpen && (
				<div
					className='fixed inset-0 bg-black/50 z-40 lg:hidden'
					onClick={() => setSidebarOpen(false)}
				/>
			)}

			{/* Sidebar */}
			<div
				className={`fixed h-full z-50 bg-zinc-950 border-r border-zinc-800/40 flex flex-col w-64 transition-transform duration-300 ease-in-out
					${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
				{/* Logo + close button */}
				<div className='px-6 py-6 flex items-center justify-between'>
					<div className='flex items-center gap-3'>
						<div className='w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-md shadow-primary/20'>
							<Home className='w-[18px] h-[18px] text-white' />
						</div>
						<span className='text-lg font-extrabold text-white tracking-tight'>
							Phòng trọ VN
						</span>
					</div>
					<button
						onClick={() => setSidebarOpen(false)}
						className='lg:hidden p-1.5 rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer'>
						<X className='w-5 h-5' />
					</button>
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
								className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer
									${
										isActive ?
											'bg-primary text-white shadow-md shadow-primary/25'
										:	'text-zinc-400 hover:bg-white/5 hover:text-white'
									}`}>
								<Icon className='w-[18px] h-[18px]' />
								<span>{item.label}</span>
							</Link>
						);
					})}
				</nav>

				{/* User Info */}
				<div className='p-4 border-t border-zinc-800/60'>
					<div className='flex items-center gap-3 mb-3 px-2'>
						<Avatar className='w-10 h-10 border-2 border-primary/30'>
							<AvatarImage src={user.avatarUrl} />
							<AvatarFallback className='bg-primary text-white text-sm font-bold'>
								{user.fullName?.substring(0, 2).toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<div className='flex-1 min-w-0'>
							<p className='text-sm font-bold text-white truncate'>
								{user.fullName}
							</p>
							<p className='text-xs text-zinc-400 truncate font-medium'>{user.email}</p>
						</div>
					</div>
					<button
						onClick={() => {
							logout();
							router.push('/login');
						}}
						className='w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-zinc-400 hover:bg-red-500/10 hover:text-red-400 transition-colors font-semibold cursor-pointer'>
						<LogOut className='w-4 h-4' />
						Đăng xuất
					</button>
				</div>
			</div>

			{/* Main Content */}
			<div className='flex-1 lg:ml-64 min-h-screen'>
				{/* Mobile header */}
				<div className='sticky top-0 z-30 lg:hidden bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3'>
					<button
						onClick={() => setSidebarOpen(true)}
						className='p-2 rounded-xl hover:bg-secondary text-foreground transition-colors'>
						<Menu className='w-5 h-5' />
					</button>
				</div>

				{/* Page content */}
				<div className='p-4 sm:p-6 lg:p-8'>{children}</div>
			</div>
		</div>
	);
}
