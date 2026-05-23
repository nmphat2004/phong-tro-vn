'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';
import useSocket from '@/hooks/useSocket';
import { useNotificationStore } from '@/stores/notification.store';
import {
	Bookmark,
	ChevronDown,
	Home,
	LayoutDashboard,
	LogOut,
	MessageCircle,
	Moon,
	PlusCircle,
	Search,
	Sparkles,
	Sun,
	UploadIcon,
	User,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import NotificationBell from './notification-bell';

const roleLabel: Record<string, string> = {
	LANDLORD: 'Chủ trọ',
	RENTER: 'Người thuê',
	ADMIN: 'Quản trị',
};

const roleColor: Record<string, string> = {
	LANDLORD: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
	RENTER: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white',
	ADMIN: 'bg-gradient-to-r from-red-500 to-pink-500 text-white',
};

const Header = () => {
	const { user, logout, isLoading } = useAuthStore();
	const { theme, toggleTheme } = useThemeStore();
	const { chatUnreadCount } = useNotificationStore();
	useSocket();
	const router = useRouter();
	const [searchKeyword, setSearchKeyword] = useState('');

	const handleLogout = () => {
		logout();
		router.push('/login');
	};

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (searchKeyword.trim()) {
			router.push(`/rooms?keyword=${encodeURIComponent(searchKeyword.trim())}`);
		} else {
			router.push('/rooms');
		}
	};

	return (
		<header className='sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm'>
			<div className='flex max-w-7xl mx-auto px-4 py-4 items-center justify-between'>
				{/* Logo */}
				<Link href='/' className='flex items-center gap-2 group'>
					<div className='w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow'>
						<Home className='w-4 h-4 text-white' />
					</div>
					<span className='text-xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent'>
						Phòng trọ VN
					</span>
				</Link>

				{/* Search Bar */}
				<form
					onSubmit={handleSearch}
					className='hidden md:flex items-center flex-1 max-w-md mx-6'>
					<div className='relative w-full'>
						<Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
						<input
							type='text'
							value={searchKeyword}
							onChange={(e) => setSearchKeyword(e.target.value)}
							placeholder='Tìm kiếm phòng trọ...'
							className='w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-secondary/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all'
						/>
					</div>
				</form>

				{/* Auth buttons */}
				<div className='flex items-center gap-2'>
					{/* Dark Mode Toggle */}
					<Button
						variant='ghost'
						size='icon'
						onClick={toggleTheme}
						className='rounded-xl hover:bg-primary/5'
						title={theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}>
						{theme === 'dark' ?
							<Sun className='w-5 h-5 text-amber-500' />
						:	<Moon className='w-5 h-5' />}
					</Button>

					{isLoading ?
						<div className='flex items-center gap-3'>
							<Skeleton className='w-10 h-10 rounded-md' />
							<Skeleton className='w-10 h-10 rounded-md' />
							<Skeleton className='w-10 h-10 rounded-full hidden md:block' />
						</div>
					: user ?
						<>
							<Link href='/chat'>
								<Button
									variant='ghost'
									size='icon'
									className='relative rounded-xl hover:bg-primary/5'>
									<MessageCircle className='w-5 h-5' />
									{chatUnreadCount > 0 && (
										<span className='absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white animate-pulse'>
											{chatUnreadCount}
										</span>
									)}
								</Button>
							</Link>
							<NotificationBell />
							<DropdownMenu>
								<DropdownMenuTrigger className='outline-none'>
									<div className='flex items-center gap-2 pl-2 pr-1 py-1 rounded-full hover:bg-secondary/80 transition-colors duration-200 cursor-pointer border border-transparent hover:border-border/50'>
										<Avatar className='w-8 h-8 ring-2 ring-primary/20'>
											<AvatarImage src={user.avatarUrl} />
											<AvatarFallback className='bg-gradient-to-br from-primary to-blue-600 text-white text-sm font-bold'>
												{user.fullName?.charAt(0).toUpperCase()}
											</AvatarFallback>
										</Avatar>
										<ChevronDown className='w-3.5 h-3.5 text-muted-foreground hidden sm:block' />
									</div>
								</DropdownMenuTrigger>
								<DropdownMenuContent
									align='end'
									className='w-72 p-0 rounded-2xl overflow-hidden shadow-2xl border border-border/50 bg-popover/95 backdrop-blur-xl'>
									{/* Profile Header */}
									<Link href='/profile'>
										<div className='px-4 py-4 bg-secondary/50 hover:bg-secondary/80 transition-colors duration-300 cursor-pointer'>
											<div className='flex items-center gap-3'>
												<Avatar className='w-12 h-12 ring-2 ring-background shadow-md'>
													<AvatarImage src={user.avatarUrl} />
													<AvatarFallback className='bg-gradient-to-br from-primary to-blue-600 text-white font-bold text-lg'>
														{user.fullName?.charAt(0).toUpperCase()}
													</AvatarFallback>
												</Avatar>
												<div className='flex-1 min-w-0'>
													<p className='font-semibold text-sm text-foreground truncate'>
														{user.fullName}
													</p>
													<p className='text-xs text-muted-foreground truncate'>
														{user.email}
													</p>
													<span
														className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${roleColor[user.role] || 'bg-gray-100 text-gray-600'}`}>
														<Sparkles className='w-2.5 h-2.5' />
														{roleLabel[user.role] || user.role}
													</span>
												</div>
											</div>
										</div>
									</Link>

									<DropdownMenuSeparator className='my-0' />

									{/* Navigation Items */}
									<div className='p-1.5'>
										<DropdownMenuItem
											onClick={() => router.push('/profile')}
											className='rounded-xl px-3 py-2.5 cursor-pointer gap-3 group/item'>
											<div className='w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center group-focus/item:bg-white/20 transition-colors'>
												<User className='w-4 h-4 text-blue-600 group-focus/item:text-white' />
											</div>
											<div className='flex-1'>
												<p className='text-sm font-medium'>Trang cá nhân</p>
												<p className='text-xs text-muted-foreground group-focus/item:text-white/70'>
													Xem và chỉnh sửa hồ sơ
												</p>
											</div>
										</DropdownMenuItem>

										<DropdownMenuItem
											onClick={() => router.push('/profile?tab=saved')}
											className='rounded-xl px-3 py-2.5 cursor-pointer gap-3 group/item'>
											<div className='w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center group-focus/item:bg-white/20 transition-colors'>
												<Bookmark className='w-4 h-4 text-rose-500 group-focus/item:text-white' />
											</div>
											<div className='flex-1'>
												<p className='text-sm font-medium'>Phòng đã lưu</p>
												<p className='text-xs text-muted-foreground group-focus/item:text-white/70'>
													Xem lại phòng yêu thích
												</p>
											</div>
										</DropdownMenuItem>

										{user.role === 'LANDLORD' && (
											<>
												<DropdownMenuSeparator className='my-1' />

												<DropdownMenuItem
													onClick={() => router.push('/dashboard')}
													className='rounded-xl px-3 py-2.5 cursor-pointer gap-3 group/item'>
													<div className='w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center group-focus/item:bg-white/20 transition-colors'>
														<LayoutDashboard className='w-4 h-4 text-emerald-600 group-focus/item:text-white' />
													</div>
													<div className='flex-1'>
														<p className='text-sm font-medium'>Dashboard</p>
														<p className='text-xs text-muted-foreground group-focus/item:text-white/70'>
															Quản lý phòng cho thuê
														</p>
													</div>
												</DropdownMenuItem>

												<DropdownMenuItem
													onClick={() => router.push('/post')}
													className='rounded-xl px-3 py-2.5 cursor-pointer gap-3 group/item'>
													<div className='w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center group-focus/item:bg-white/20 transition-colors'>
														<UploadIcon className='w-4 h-4 text-violet-600 group-focus/item:text-white' />
													</div>
													<div className='flex-1'>
														<p className='text-sm font-medium'>Đăng tin mới</p>
														<p className='text-xs text-muted-foreground group-focus/item:text-white/70'>
															Tạo tin đăng phòng trọ
														</p>
													</div>
												</DropdownMenuItem>
											</>
										)}
									</div>

									<DropdownMenuSeparator className='my-0' />

									{/* Logout */}
									<div className='p-1.5'>
										<DropdownMenuItem
											onClick={handleLogout}
											className='rounded-xl px-3 py-2.5 cursor-pointer gap-3 text-red-500 group/item'>
											<div className='w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center group-focus/item:bg-red-500/20 transition-colors'>
												<LogOut className='w-4 h-4 text-red-500' />
											</div>
											<span className='text-sm font-medium'>Đăng xuất</span>
										</DropdownMenuItem>
									</div>
								</DropdownMenuContent>
							</DropdownMenu>
						</>
					:	<div className='flex items-center gap-3'>
							<Link href='/login'>
								<Button
									variant='ghost'
									size='lg'
									className='hidden md:inline-flex'>
									Đăng nhập
								</Button>
							</Link>
							<Link href='/register'>
								<Button
									variant='default'
									size='lg'
									className='bg-primary hover:bg-primary/90 text-white'>
									<PlusCircle className='w-4 h-4 mr-2' />
									Đăng tin miễn phí
								</Button>
							</Link>
						</div>
					}
				</div>
			</div>
		</header>
	);
};

export default Header;
