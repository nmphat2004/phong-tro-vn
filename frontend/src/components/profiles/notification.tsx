import {
	getNotificationPreferences,
	getNotifications,
	markAllNotificationRead,
	markNotificationRead,
	updateNotificationPreferences,
} from '@/lib/api/notification.api';
import { useNotificationStore } from '@/stores/notification.store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Loader2, ShieldAlert, AlertTriangle, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/button';


// Hàm phụ trả về icon và màu sắc tương ứng với từng loại thông báo
const getNotificationIcon = (type: string) => {
	switch (type) {
		case 'ROOM_HIDDEN_FRAUD':
			return <ShieldAlert className='w-4 h-4 mt-1 text-red-500' />;
		case 'ROOM_FLAGGED_FRAUD':
		case 'REVIEW_FLAGGED_FRAUD':
			return <AlertTriangle className='w-4 h-4 mt-1 text-yellow-500' />;
		case 'NEW_REVIEW':
			return <Star className='w-4 h-4 mt-1 text-yellow-400' />;
		default:
			return <Bell className='w-4 h-4 mt-1 text-primary' />;
	}
};

const Notification = () => {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { chatUnreadCount, setUnreadSummary } = useNotificationStore();
	const [localPreferences, setLocalPreferences] = useState<{
		newMessage: boolean;
		savedListing: boolean;
		newReview: boolean;
		priceAlert: boolean;
	} | null>(null);

	const { data: preferences, isLoading: loadingPreferences } = useQuery({
		queryKey: ['notification-preferences'],
		queryFn: getNotificationPreferences,
	});
	const { data: notifications = [], isLoading: loadingNotifications } =
		useQuery({
			queryKey: ['notifications'],
			queryFn: getNotifications,
		});

	const savePreferencesMutation = useMutation({
		mutationFn: updateNotificationPreferences,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
			toast.success('Đã lưu cài đặt thông báo');
		},
		onError: () => toast.error('Không thể lưu cài đặt'),
	});

	const markReadMutation = useMutation({
		mutationFn: markNotificationRead,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['notifications'] });
			const unread = Math.max(
				0,
				notifications.filter((item) => !item.isRead).length - 1,
			);
			setUnreadSummary({
				chatUnreadCount,
				notificationUnreadCount: unread,
			});
		},
	});

	const markAllReadMutation = useMutation({
		mutationFn: markAllNotificationRead,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['notifications'] });
			setUnreadSummary({
				chatUnreadCount,
				notificationUnreadCount: 0,
			});
			toast.success('Đã đánh dấu tất cả thông báo là đã đọc');
		},
	});

	const selectedPreferences = localPreferences || preferences;

	if (loadingPreferences || loadingNotifications || !selectedPreferences) {
		return (
			<div className='py-16 flex justify-center'>
				<Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
			</div>
		);
	}

	return (
		<div className='space-y-6'>
			<div className='flex items-center justify-between gap-3'>
				<h3 className='text-lg font-medium'>Cài đặt thông báo</h3>
				<Button
					variant='outline'
					onClick={() => markAllReadMutation.mutate()}
					disabled={markAllReadMutation.isPending}>
					<CheckCheck className='w-4 h-4 mr-2' />
					Đọc tất cả
				</Button>
			</div>
			<div className='space-y-4'>
				{[
					{
						key: 'savedListing',
						label: 'Khi có người lưu phòng của bạn',
						desc: 'Nhận thông báo khi có người lưu phòng của bạn',
					},
					{
						key: 'newReview',
						label: 'Khi có đánh giá mới trên phòng của bạn',
						desc: 'Nhận thông báo khi có ai đó đánh giá phòng của bạn',
					},
					{
						key: 'priceAlert',
						label: 'Khi giá phòng giảm',
						desc: 'Nhận thông báo khi giá phòng giảm',
					},
				].map((item) => (
					<div
						key={item.key}
						className='flex items-start justify-between py-4 border-b border-border last:border-0'>
						<div className='flex-1'>
							<p className='font-medium mb-1'>{item.label}</p>
							<p className='text-sm text-muted-foreground'>{item.desc}</p>
						</div>
						<label className='relative inline-flex items-center cursor-pointer ml-4'>
							<input
								type='checkbox'
								checked={
									selectedPreferences[
										item.key as keyof typeof selectedPreferences
									]
								}
								onChange={(e) =>
									setLocalPreferences({
										...selectedPreferences,
										[item.key]: e.target.checked,
									})
								}
								className='sr-only peer'
							/>
							<div className="w-11 h-6 bg-[#cbced4] rounded-full peer peer-checked:bg-primary text-primary peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
						</label>
					</div>
				))}
			</div>

			<div className='flex justify-end pt-4'>
				<Button
					className='bg-primary text-white px-6 h-10 rounded-lg'
					onClick={() => savePreferencesMutation.mutate(selectedPreferences)}
					disabled={savePreferencesMutation.isPending}>
					Lưu cài đặt
				</Button>
			</div>

			<div className='pt-4 border-t space-y-3'>
				<h4 className='font-medium'>Thông báo gần đây</h4>
				{notifications.length === 0 ?
					<div className='text-sm text-muted-foreground'>
						Chưa có thông báo nào
					</div>
				:	notifications
						.filter((item) => item.type !== 'NEW_MESSAGE')
						.map((item) => (
							<button
								type='button'
								key={item.id}
								onClick={() => {
									if (!item.isRead) {
										markReadMutation.mutate(item.id);
									}
									// Always navigate to link if available
									if (item.link) {
										router.push(item.link);
									}
								}}
								className={`w-full text-left p-3 rounded-lg border transition-colors ${item.isRead ? 'bg-card' : 'bg-primary/5 border-primary/30'}`}>
								<div className='flex items-start gap-3'>
									{getNotificationIcon(item.type)}
									<div className='flex-1'>
										<p className='font-medium text-sm'>{item.title}</p>
										<p className='text-sm text-muted-foreground'>
											{item.content}
										</p>
										<p className='text-xs text-muted-foreground mt-1'>
											{new Date(item.createdAt).toLocaleString('vi-VN')}
										</p>
									</div>
								</div>
							</button>
						))
				}
			</div>
		</div>
	);
};

export default Notification;
