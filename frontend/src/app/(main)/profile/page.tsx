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
		<div className='min-h-screen bg-secondary'>
			<div className='max-w-6xl mx-auto px-6 py-8'>
				{/* Tabs */}
				<div className='bg-card rounded-xl shadow-sm mb-6'>
					<div>
						{tabs.map((tab) => (
							<Button
								variant='default'
								key={tab.id}
								onClick={() => setActiveTab(tab.id)}
								className={`px-8 py-5 text-sm font-medium whitespace-nowrap transition-colors ${
									activeTab === tab.id ?
										' text-white'
									:	'border-transparent bg-card text-muted-foreground hover:text-secondary-foreground hover:bg-secondary'
								}`}>
								{tab.label}
							</Button>
						))}
					</div>

					<div className='p-6'>
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
