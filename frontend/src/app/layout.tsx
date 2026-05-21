import type { Metadata } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import './globals.css';
import { PropsWithChildren } from 'react';
import Providers from './providers';

const beVietnam = Be_Vietnam_Pro({
	subsets: ['latin', 'vietnamese'],
	weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
	display: 'swap',
});

export const metadata: Metadata = {
	title: 'Room Matching - Tìm phòng trọ uy tín',
	description: 'Nền tảng tìm kiếm và đánh giá phòng trọ minh bạch tại Việt Nam',
};

export default function RootLayout({ children }: PropsWithChildren) {
	return (
		<html lang='vi' suppressHydrationWarning>
			<head>
				<script
					dangerouslySetInnerHTML={{
						__html: `
							(function() {
								try {
									var theme = localStorage.getItem('theme');
									if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
										document.documentElement.classList.add('dark');
									}
								} catch (e) {}
							})();
						`,
					}}
				/>
			</head>
			<body className={beVietnam.className}>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
