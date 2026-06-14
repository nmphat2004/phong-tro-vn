'use client';
import { useState, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import Personal from '@/components/profiles/personal';
import Security from '@/components/profiles/security';
import Notification from '@/components/profiles/notification';
import SavedRooms from '@/components/profiles/saved-rooms';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { useRouter } from 'next/navigation';

type Tab = 'personal' | 'security' | 'notifications' | 'saved';

const ProfileContent = () => {
	const router = useRouter();
	const searchParams = useSearchParams();
	const defaultTab = (searchParams.get('tab') as Tab) || 'personal';
	const [activeTab, setActiveTab] = useState<Tab>(defaultTab);
	const { user, isLoading } = useAuthStore();

	const tabs = [
		{ id: 'personal' as Tab, label: 'Thông tin cá nhân' },
		{ id: 'security' as Tab, label: 'Bảo mật' },
		{ id: 'notifications' as Tab, label: 'Thông báo' },
		{ id: 'saved' as Tab, label: 'Phòng đã lưu' },
	];

	useEffect(() => {
		if (!isLoading && !user) {
			router.push('/login');
		}
	}, [user, isLoading, router]);

	if (isLoading || !user) return null;

	return (
		<div className='min-h-screen bg-secondary/35'>
			<div className='max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8'>
				{/* Tabs */}
				<div className='bg-card rounded-xl shadow-sm mb-6 overflow-hidden border border-border/50'>
					<div className='flex overflow-x-auto pb-0.5 md:pb-0 scrollbar-none border-b border-border/60 bg-card/50 flex-nowrap'>
						{tabs.map((tab) => (
							<button
								key={tab.id}
								onClick={() => setActiveTab(tab.id)}
								className={`px-5 py-3.5 sm:px-8 sm:py-4 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all border-b-2 flex-1 md:flex-none text-center cursor-pointer ${
									activeTab === tab.id ?
										'border-primary text-primary bg-primary/5'
									:	'border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/40'
								}`}>
								{tab.label}
							</button>
						))}
					</div>

					<div className='p-4 sm:p-6'>
						{/* Personal Information Tab */}
						{activeTab === 'personal' && <Personal />}

						{/* Security Tab */}
						{activeTab === 'security' && <Security />}

						{/* Notifications Tab */}
						{activeTab === 'notifications' && <Notification />}

						{/* Saved Rooms Tab */}
						{activeTab === 'saved' && <SavedRooms />}
					</div>
				</div>
			</div>
		</div>
	);
};

export default function ProfilePage() {
	return (
		<Suspense fallback={
			<div className='min-h-screen bg-secondary flex items-center justify-center'>
				<div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
			</div>
		}>
			<ProfileContent />
		</Suspense>
	);
}
