import { getSavedRooms, unsaveRoom } from '@/lib/api/user.api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import RoomCard from '../room/room-card';
import { Button } from '../ui/button';

const SavedRooms = () => {
	const queryClient = useQueryClient();
	const { data: savedRooms = [], isLoading } = useQuery({
		queryKey: ['saved-rooms'],
		queryFn: getSavedRooms,
	});

	const { mutate: removeSavedRoom, isPending: isRemoving } = useMutation({
		mutationFn: (roomId: string) => unsaveRoom(roomId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['saved-rooms'] });
			toast.success('Đã bỏ lưu phòng');
		},
		onError: () => {
			toast.error('Không thể bỏ lưu phòng, vui lòng thử lại');
		},
	});

	if (isLoading) {
		return (
			<div className='py-16 flex justify-center'>
				<Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
			</div>
		);
	}

	return (
		<div>
			{savedRooms.length > 0 ?
				<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
					{savedRooms.map((room) => (
						<div key={room.id} className='relative'>
							<Button
								onClick={() => removeSavedRoom(room.id)}
								disabled={isRemoving}
								className='absolute top-3 right-3 z-10 w-8 h-8 bg-card rounded-full shadow-md flex items-center justify-center hover:scale-110 transition-transform'>
								<Heart className='text-red-500 fill-red-500' size={18} />
							</Button>
							<RoomCard room={room} />
						</div>
					))}
				</div>
			:	<div className='text-center py-16'>
					<Heart className='mx-auto mb-4 border-border' size={64} />
					<h3 className='text-xl mb-2'>Không có phòng đã lưu</h3>
					<p className='text-muted-foreground mb-6'>
						Bắt đầu khám phá để lưu phòng yêu thích của bạn
					</p>
					<Link href='/rooms'>
						<Button className='bg-primary text-white px-6 h-10 rounded-lg'>
							Bắt đầu khám phá
						</Button>
					</Link>
				</div>
			}
		</div>
	);
};

export default SavedRooms;
