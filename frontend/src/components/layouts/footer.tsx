import { Facebook, Home, Mail, Phone } from 'lucide-react';
import Link from 'next/link';

const Footer = () => {
	return (
		<footer className='bg-secondary/40 border-t border-border/50 mt-16 sm:mt-24'>
			<div className='max-w-7xl mx-auto px-4 py-12 sm:py-16'>
				<div className='grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12'>
					<div className='col-span-2 md:col-span-1 space-y-4'>
						<div className='flex items-center gap-2.5 font-bold text-foreground'>
							<div className='w-7.5 h-7.5 bg-linear-to-br from-primary to-indigo-600 rounded-lg flex items-center justify-center shadow-xs'>
								<Home className='w-4 h-4 text-white' />
							</div>
							<span className='text-lg font-extrabold tracking-tight'>Phòng trọ VN</span>
						</div>
						<p className='text-xs sm:text-sm text-muted-foreground leading-relaxed'>
							Nền tảng tìm kiếm và đánh giá phòng trọ minh bạch tại Việt Nam.
						</p>
					</div>

					<div className='col-span-1'>
						<h4 className='mb-3 text-sm font-semibold text-foreground uppercase tracking-wider'>Về chúng tôi</h4>
						<ul className='space-y-1.5 text-xs sm:text-sm text-muted-foreground'>
							<li>
								<Link href='#' className='hover:text-primary transition-colors'>
									Giới thiệu
								</Link>
							</li>
							<li>
								<Link href='#' className='hover:text-primary transition-colors'>
									Liên hệ
								</Link>
							</li>
							<li>
								<Link href='#' className='hover:text-primary transition-colors'>
									Quy chế hoạt động
								</Link>
							</li>
							<li>
								<Link href='#' className='hover:text-primary transition-colors'>
									Chính sách bảo mật
								</Link>
							</li>
						</ul>
					</div>
					<div className='col-span-1'>
						<h4 className='mb-3 text-sm font-semibold text-foreground uppercase tracking-wider'>Hỗ trợ</h4>
						<ul className='space-y-1.5 text-xs sm:text-sm text-muted-foreground'>
							<li>
								<Link href='#' className='hover:text-primary transition-colors'>
									Câu hỏi thường gặp
								</Link>
							</li>
							<li>
								<Link href='#' className='hover:text-primary transition-colors'>
									Hướng dẫn đăng tin
								</Link>
							</li>
							<li>
								<Link href='#' className='hover:text-primary transition-colors'>
									Quy định sử dụng
								</Link>
							</li>
							<li>
								<Link href='#' className='hover:text-primary transition-colors'>
									Giải quyết khiếu nại
								</Link>
							</li>
						</ul>
					</div>

					<div className='col-span-2 md:col-span-1'>
						<h4 className='mb-3 text-sm font-semibold text-foreground uppercase tracking-wider'>Liên hệ</h4>
						<div className='space-y-2 text-xs sm:text-sm text-muted-foreground'>
							<div className='flex items-center gap-2'>
								<Phone className='w-4 h-4 text-muted-foreground/75' />
								<span>1900 1234</span>
							</div>
							<div className='flex items-center gap-2'>
								<Mail className='w-4 h-4 text-muted-foreground/75' />
								<span className='truncate'>contact@phongtrovn.vn</span>
							</div>
							<div className='flex items-center gap-3 mt-3'>
								<a href='#' className='text-primary hover:text-primary/80 transition-colors' aria-label='Facebook'>
									<Facebook className='w-5 h-5' />
								</a>
							</div>
						</div>
					</div>
				</div>
				<div className='mt-8 pt-6 border-t border-border/60 text-center text-xs sm:text-sm text-muted-foreground'>
					© 2026 Phòng trọ VN. All rights reserved.
				</div>
			</div>
		</footer>
	);
};

export default Footer;
