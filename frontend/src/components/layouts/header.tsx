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
	Menu,
	MessageCircle,
	Moon,
	PlusCircle,
	Search,
	Sparkles,
	Sun,
	UploadIcon,
	User,
	X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
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
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [showMobileSearch, setShowMobileSearch] = useState(false);

	useEffect(() => {
		if (mobileMenuOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
		return () => {
			document.body.style.overflow = '';
		};
	}, [mobileMenuOpen]);

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
		<>
			<header className='sticky top-0 z-50 h-16 bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-xs flex items-center'>
				<div className='flex w-full max-w-7xl mx-auto px-4 items-center justify-between'>
				{/* Logo */}
				<Link href='/' className='flex items-center gap-2.5 group'>
					<div className='w-8.5 h-8.5 bg-linear-to-br from-primary to-indigo-600 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300'>
						<Home className='w-4.5 h-4.5 text-white' />
					</div>
					<span className='text-xl font-extrabold bg-linear-to-r from-primary to-indigo-600 bg-clip-text text-transparent tracking-tight'>
						Phòng trọ VN
					</span>
				</Link>

				{/* Search Bar (Desktop) */}
				<form
					onSubmit={handleSearch}
					className='hidden md:flex items-center flex-1 max-w-md mx-6'>
					<div className='relative w-full'>
						<Search className='absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
						<input
							type='text'
							value={searchKeyword}
							onChange={(e) => setSearchKeyword(e.target.value)}
							placeholder='Tìm kiếm phòng trọ...'
							className='w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-secondary/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all'
						/>
					</div>
				</form>

				{/* Action Buttons & Navigation */}
				<div className='flex items-center gap-1.5 sm:gap-2'>
					{/* Mobile Search Toggle */}
					<Button
						variant='ghost'
						size='icon'
						onClick={() => setShowMobileSearch(!showMobileSearch)}
						className='md:hidden rounded-xl hover:bg-primary/5'
						title='Tìm kiếm'>
						<Search className='w-5 h-5' />
					</Button>

					{/* Dark Mode Toggle */}
					<Button
						variant='ghost'
						size='icon'
						onClick={toggleTheme}
						className='rounded-xl hover:bg-primary/5'
						title={theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}>
						{theme === 'dark' ?
							<Sun className='w-5 h-5 text-amber-500' />
							: <Moon className='w-5 h-5' />}
					</Button>

					{isLoading ?
						<div className='flex items-center gap-2 sm:gap-3'>
							<Skeleton className='w-8 h-8 sm:w-10 sm:h-10 rounded-md' />
							<Skeleton className='w-8 h-8 sm:w-10 sm:h-10 rounded-md' />
							<Skeleton className='w-8 h-8 sm:w-10 sm:h-10 rounded-full hidden md:block' />
						</div>
						: user ?
							<>
								{/* Chat Icon (Always visible for logged in users for quick access) */}
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

								{/* Notifications (Desktop) */}
								<div className='hidden md:block'>
									<NotificationBell />
								</div>

								{/* Desktop User Dropdown */}
								<div className='hidden md:block'>
									<DropdownMenu>
										<DropdownMenuTrigger className='outline-none'>
											<div className='flex items-center gap-2 pl-2 pr-1 py-1 rounded-full hover:bg-secondary/80 transition-colors duration-200 cursor-pointer border border-transparent hover:border-border/50'>
												<Avatar className='w-8 h-8 ring-2 ring-primary/20'>
													<AvatarImage src={user.avatarUrl} />
													<AvatarFallback className='bg-linear-to-br from-primary to-indigo-600 text-white text-sm font-bold'>
														{user.fullName?.charAt(0).toUpperCase()}
													</AvatarFallback>
												</Avatar>
												<ChevronDown className='w-3.5 h-3.5 text-muted-foreground' />
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
															<AvatarFallback className='bg-linear-to-br from-primary to-indigo-600 text-white font-bold text-lg'>
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
								</div>
							</>
							: <div className='flex items-center gap-2 sm:gap-3'>
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
										size='sm'
										className='bg-primary hover:bg-primary/90 text-white md:h-11 md:px-8 md:text-sm'>
										<PlusCircle className='w-4 h-4 sm:mr-2' />
										<span className='hidden sm:inline'>Đăng tin miễn phí</span>
										<span className='inline sm:hidden'>Đăng tin</span>
									</Button>
								</Link>
							</div>
					}

					{/* Mobile Hamburger menu */}
					<Button
						variant='ghost'
						size='icon'
						onClick={() => setMobileMenuOpen(true)}
						className='md:hidden rounded-xl hover:bg-primary/5'
						title='Menu'>
						<Menu className='w-5 h-5' />
					</Button>
				</div>
			</div>

			{/* Mobile Search Bar (Expandable) */}
			{showMobileSearch && (
				<div className='md:hidden border-b border-border bg-background px-4 py-3 animate-in slide-in-from-top duration-200'>
					<form onSubmit={(e) => { handleSearch(e); setShowMobileSearch(false); }} className='relative w-full'>
						<Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
						<input
							type='text'
							value={searchKeyword}
							onChange={(e) => setSearchKeyword(e.target.value)}
							placeholder='Tìm kiếm phòng trọ...'
							className='w-full pl-10 pr-10 py-2 rounded-xl border border-border bg-secondary/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all'
							autoFocus
						/>
						{searchKeyword && (
							<button
								type='button'
								onClick={() => setSearchKeyword('')}
								className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'>
								<X className='w-4 h-4' />
							</button>
						)}
					</form>
				</div>
			)}
			</header>

			{/* Mobile Menu Drawer */}
			{mobileMenuOpen && (
				<div className='fixed inset-0 z-50 md:hidden'>
					{/* Backdrop */}
					<div
						className='fixed inset-0 bg-black/55 backdrop-blur-xs transition-opacity duration-300'
						onClick={() => setMobileMenuOpen(false)}
					/>
					{/* Drawer Content */}
					<div className='fixed inset-y-0 right-0 w-full max-w-[280px] bg-background border-l border-border p-5 shadow-2xl flex flex-col justify-between z-50 animate-in slide-in-from-right duration-350 ease-out'>
						<div>
							{/* Drawer Header */}
							<div className='flex items-center justify-between pb-4 border-b border-border'>
								<Link
									href='/'
									className='flex items-center gap-2'
									onClick={() => setMobileMenuOpen(false)}>
									<div className='w-7 h-7 bg-linear-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center shadow-md'>
										<Home className='w-3.5 h-3.5 text-white' />
									</div>
									<span className='text-lg font-bold bg-linear-to-r from-primary to-blue-600 bg-clip-text text-transparent'>
										Phòng trọ VN
									</span>
								</Link>
								<Button
									variant='ghost'
									size='icon'
									className='h-8 w-8 rounded-xl'
									onClick={() => setMobileMenuOpen(false)}>
									<X className='w-4 h-4' />
								</Button>
							</div>

							{/* Drawer Search */}
							<div className='py-4 border-b border-border'>
								<form onSubmit={(e) => { handleSearch(e); setMobileMenuOpen(false); }} className='relative w-full'>
									<Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
									<input
										type='text'
										value={searchKeyword}
										onChange={(e) => setSearchKeyword(e.target.value)}
										placeholder='Tìm kiếm phòng trọ...'
										className='w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-secondary/50 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all'
									/>
								</form>
							</div>

							{/* Navigation Links */}
							<div className='flex flex-col gap-1 py-4'>
								<Link
									href='/rooms'
									className='flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary text-sm font-medium transition-colors'
									onClick={() => setMobileMenuOpen(false)}>
									<Search className='w-4 h-4 text-muted-foreground' />
									Tìm phòng trọ
								</Link>

								{user ? (
									<>
										<Link
											href='/profile'
											className='flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary text-sm font-medium transition-colors'
											onClick={() => setMobileMenuOpen(false)}>
											<User className='w-4 h-4 text-muted-foreground' />
											Trang cá nhân
										</Link>
										<Link
											href='/profile?tab=saved'
											className='flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary text-sm font-medium transition-colors'
											onClick={() => setMobileMenuOpen(false)}>
											<Bookmark className='w-4 h-4 text-muted-foreground' />
											Phòng đã lưu
										</Link>

										{user.role === 'LANDLORD' && (
											<>
												<div className='h-px bg-border my-2' />
												<Link
													href='/dashboard'
													className='flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary text-sm font-medium transition-colors'
													onClick={() => setMobileMenuOpen(false)}>
													<LayoutDashboard className='w-4 h-4 text-muted-foreground' />
													Dashboard
												</Link>
												<Link
													href='/post'
													className='flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary text-sm font-medium transition-colors'
													onClick={() => setMobileMenuOpen(false)}>
													<UploadIcon className='w-4 h-4 text-muted-foreground' />
													Đăng tin mới
												</Link>
											</>
										)}
									</>
								) : (
									<>
										<Link
											href='/login'
											className='flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary text-sm font-medium transition-colors'
											onClick={() => setMobileMenuOpen(false)}>
											<User className='w-4 h-4 text-muted-foreground' />
											Đăng nhập
										</Link>
										<Link
											href='/register'
											className='flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary text-sm font-medium transition-colors'
											onClick={() => setMobileMenuOpen(false)}>
											<PlusCircle className='w-4 h-4 text-muted-foreground' />
											Đăng ký tài khoản
										</Link>
									</>
								)}
							</div>
						</div>

						{/* Drawer Footer (User Info & Logout) */}
						<div className='pt-4 border-t border-border'>
							{user ? (
								<div className='flex flex-col gap-3'>
									<div className='flex items-center gap-3 px-2'>
										<Avatar className='w-10 h-10 ring-2 ring-primary/20'>
											<AvatarImage src={user.avatarUrl} />
											<AvatarFallback className='bg-linear-to-br from-primary to-indigo-600 text-white font-bold'>
												{user.fullName?.charAt(0).toUpperCase()}
											</AvatarFallback>
										</Avatar>
										<div className='flex-1 min-w-0'>
											<p className='font-semibold text-xs text-foreground truncate'>
												{user.fullName}
											</p>
											<span
												className={`inline-flex items-center gap-0.5 mt-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${roleColor[user.role] || 'bg-gray-100 text-gray-600'}`}>
												{roleLabel[user.role] || user.role}
											</span>
										</div>
									</div>
									<Button
										variant='destructive'
										onClick={() => {
											handleLogout();
											setMobileMenuOpen(false);
										}}
										className='w-full rounded-xl gap-2 text-xs h-9'>
										<LogOut className='w-3.5 h-3.5' />
										Đăng xuất
									</Button>
								</div>
							) : (
								<div className='flex flex-col gap-2'>
									<Link href='/login' onClick={() => setMobileMenuOpen(false)}>
										<Button variant='outline' className='w-full rounded-xl text-xs h-9'>
											Đăng nhập
										</Button>
									</Link>
									<Link href='/register' onClick={() => setMobileMenuOpen(false)}>
										<Button className='w-full rounded-xl text-xs h-9 bg-primary text-white hover:bg-primary/90'>
											Đăng ký
										</Button>
									</Link>
								</div>
							)}
						</div>
					</div>
				</div>
			)}
		</>
	);
};

export default Header;
