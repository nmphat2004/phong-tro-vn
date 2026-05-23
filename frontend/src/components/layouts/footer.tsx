import { Facebook, Home, Mail, Phone } from 'lucide-react';
import Link from 'next/link';

const Footer = () => {
	return (
		<footer className='bg-secondary border-t border-border mt-16'>
			<div className='max-w-7xl mx-auto px-4 py-12'>
				<div className='grid grid-cols-1 md:grid-cols-4 gap-8'>
					<div>
						<div className='flex items-center gap-2 mb-4'>
							<Home className='w-6 h-6 text-primary' /> Phòng trọ VN
						</div>
						<p className='text-sm text-muted-foreground'>
							Nền tảng tìm kiếm và đánh giá phòng trọ minh bạch tại Việt Nam
						</p>
					</div>

					<div>
						<h4 className='mb-4'>Về chúng tôi</h4>
						<ul className='space-y-2 text-sm text-muted-foreground'>
							<li>
								<Link href='#' className='hover:text-primary'>
									Giới thiệu
								</Link>
							</li>
							<li>
								<Link href='#' className='hover:text-primary'>
									Liên hệ
								</Link>
							</li>
							<li>
								<Link href='#' className='hover:text-primary'>
									Quy chế hoạt động
								</Link>
							</li>
							<li>
								<Link href='#' className='hover:text-primary'>
									Chính sách bảo mật
								</Link>
							</li>
						</ul>
					</div>
					<div>
						<h4 className='mb-4'>Hỗ trợ</h4>
						<ul className='space-y-2 text-sm text-muted-foreground'>
							<li>
								<Link href='#' className='hover:text-primary'>
									Câu hỏi thường gặp
								</Link>
							</li>
							<li>
								<Link href='#' className='hover:text-primary'>
									Hướng dẫn đăng tin
								</Link>
							</li>
							<li>
								<Link href='#' className='hover:text-primary'>
									Quy định sử dụng
								</Link>
							</li>
							<li>
								<Link href='#' className='hover:text-primary'>
									Giải quyết khiếu nại
								</Link>
							</li>
						</ul>
					</div>

					<div>
						<h4 className='mb-4'>Liên hệ</h4>
						<div className='space-y-3 text-sm text-muted-foreground'>
							<div className='flex items-center gap-2'>
								<Phone className='w-4 h-4' />
								<span>1900 1234</span>
							</div>
							<div className='flex items-center gap-2'>
								<Mail className='w-4 h-4' />
								<span>contact@phongtrovn.vn</span>
							</div>
							<div className='flex items-center gap-3 mt-4'>
								<a href='#' className='text-primary hover:text-primary/80'>
									<Facebook className='w-5 h-5' />
								</a>
							</div>
						</div>
					</div>
				</div>
				<div className='mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground'>
					© 2026 Phòng trọ VN. All rights reserved.
				</div>
			</div>
		</footer>
	);
};

export default Footer;
