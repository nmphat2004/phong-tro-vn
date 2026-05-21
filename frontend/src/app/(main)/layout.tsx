'use client';
import Footer from '@/components/layouts/footer';
import Header from '@/components/layouts/header';
import { useAuthStore } from '@/stores/auth.store';
import { useRouter, usePathname } from 'next/navigation';
import { PropsWithChildren, useEffect } from 'react';

const MainLayout = ({ children }: PropsWithChildren) => {
	const pathname = usePathname();
	const router = useRouter();
	const { user } = useAuthStore();
	const isChatPage = pathname === '/chat';
	const isRoomDetailPage = pathname.startsWith('/rooms/') && pathname !== '/rooms';
	const shouldRedirectAdmin = user?.role === 'ADMIN' && !isRoomDetailPage;

	useEffect(() => {
		if (shouldRedirectAdmin) {
			router.replace('/admin/dashboard');
		}
	}, [shouldRedirectAdmin, router]);

	// Trả về null nếu là Admin để không render các thành phần giao diện người dùng (ngoại trừ trang chi tiết phòng)
	if (shouldRedirectAdmin) return null;

	return (
		<div className='min-h-screen flex flex-col'>
			<Header />
			<main className='flex-1'>{children}</main>
			{!isChatPage && <Footer />}
		</div>
	);
};

export default MainLayout;
