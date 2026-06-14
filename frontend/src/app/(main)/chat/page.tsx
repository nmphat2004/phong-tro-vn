'use client';
import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { Search, Send, MoreVertical, Loader2, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { PriceTag } from '@/components/room/price-tag';
import {
	getConversations,
	getMessages,
	getOrCreateConversation,
	markConversationRead,
	getUnreadSummary,
} from '@/lib/api/chat.api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import useChatStore from '@/stores/chat.store';
import useSocket from '@/hooks/useSocket';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useNotificationStore } from '@/stores/notification.store';

const ChatContent = () => {
	const { user } = useAuthStore();
	const searchParams = useSearchParams();
	const roomId = searchParams.get('roomId');
	const conversationId = searchParams.get('conversationId');
	const queryClient = useQueryClient();
	const { joinConversation, sendMessage } = useSocket();
	const { setUnreadSummary } = useNotificationStore();
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const {
		conversations: storeConversations,
		setConversations,
		activeConversationId,
		setActiveConversation,
		messages,
		setMessage,
		addMessage,
		onlineUsers,
	} = useChatStore();

	const [messageInput, setMessageInput] = useState('');
	const [filterTab, setFilterTab] = useState('all');
	const [searchText, setSearchText] = useState('');
	const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

	useEffect(() => {
		if (roomId || conversationId) {
			setMobileView('chat');
		}
	}, [roomId, conversationId]);

	const { data: conversations = [], isLoading: isLoadingConversations } =
		useQuery({
			queryKey: ['chat-conversations'],
			queryFn: getConversations,
		});

	const processedRoomIdRef = useRef<string | null>(null);

	const { mutate: createConversation, isPending: isCreatingConversation } =
		useMutation({
			mutationFn: (id: string) => getOrCreateConversation(id),
			onSuccess: (conversation) => {
				setConversations((current) => {
					// Tránh thêm trùng
					if (current.some((c) => c.id === conversation.id)) {
						return current;
					}
					return [conversation, ...current];
				});
				setActiveConversation(conversation.id);
				// Refetch để đảm bảo dữ liệu đầy đủ
				queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
			},
			onError: () => {
				processedRoomIdRef.current = null;
				toast.error('Không thể mở cuộc trò chuyện');
			},
		});

	const {
		data: conversationMessages,
		isLoading: isLoadingMessages,
		refetch: refetchMessages,
	} = useQuery({
		queryKey: ['chat-messages', activeConversationId],
		queryFn: () =>
			getMessages(activeConversationId as string, { page: 1, limit: 50 }),
		enabled: Boolean(activeConversationId),
	});

	useEffect(() => {
		if (isLoadingConversations) return;
		setConversations(conversations);
		if (!activeConversationId && conversations[0]) {
			setActiveConversation(conversations[0].id);
		}
	}, [
		conversations,
		isLoadingConversations,
		activeConversationId,
		setActiveConversation,
		setConversations,
	]);

	useEffect(() => {
		if (!conversationMessages || !activeConversationId) return;
		setMessage(activeConversationId, conversationMessages.data);
	}, [conversationMessages, activeConversationId, setMessage]);

	useEffect(() => {
		if (!roomId || !user || isLoadingConversations) return;
		// Tránh xử lý lặp cho cùng roomId
		if (processedRoomIdRef.current === roomId) return;
		processedRoomIdRef.current = roomId;

		const existed = storeConversations.find((item) => item.roomId === roomId);
		if (existed) {
			setActiveConversation(existed.id);
			return;
		}
		createConversation(roomId);
	}, [
		roomId,
		user,
		isLoadingConversations,
		createConversation,
		setActiveConversation,
		storeConversations,
	]);

	// Handle direct conversation navigation from notification
	useEffect(() => {
		if (!conversationId || !user) return;
		setActiveConversation(conversationId as string);
	}, [conversationId, user, setActiveConversation]);

	useEffect(() => {
		if (activeConversationId) {
			joinConversation(activeConversationId);
			refetchMessages();
		}
	}, [activeConversationId, joinConversation, refetchMessages]);

	const conversationList = useMemo(() => {
		if (!storeConversations || storeConversations.length === 0) {
			return [];
		}

		const normalized = storeConversations
			.filter((conversation) => conversation?.owner && conversation?.renter)
			.map((conversation) => {
				const partner =
					conversation.owner.id === user?.id ?
						conversation.renter
						: conversation.owner;
				const lastMessage = conversation.messages?.[0];
				const unread =
					(
						lastMessage &&
						lastMessage.senderId !== user?.id &&
						(conversation.unreadCount === undefined ||
							conversation.unreadCount > 0)
					) ?
						1
						: 0;
				return {
					id: conversation.id,
					roomId: conversation.roomId,
					roomName: conversation.room?.title || 'Phòng',
					roomPrice: conversation.room?.price || 0,
					roomImage: conversation.room?.images?.[0]?.url,
					partnerId: partner?.id || '',
					avatar: partner?.avatarUrl || undefined,
					name: partner?.fullName || 'Người dùng',
					lastMessage: lastMessage?.content || 'Bắt đầu cuộc trò chuyện',
					timestamp: lastMessage?.sentAt || '',
					unread:
						conversation.id === activeConversationId ?
							0
							: (conversation.unreadCount ?? unread),
					isOwner: conversation.ownerId === user?.id,
				};
			});

		const byFilter = normalized.filter((item) =>
			filterTab === 'unread' ? item.unread > 0 : true,
		);

		if (!searchText.trim()) return byFilter;
		const keyword = searchText.toLowerCase();
		return byFilter.filter(
			(item) =>
				item.name.toLowerCase().includes(keyword) ||
				item.roomName.toLowerCase().includes(keyword),
		);
	}, [
		storeConversations,
		user?.id,
		filterTab,
		searchText,
		activeConversationId,
	]);

	const currentConversation = conversationList.find(
		(item) => item.id === activeConversationId,
	);
	const currentMessages = useMemo(() => {
		return (activeConversationId && messages[activeConversationId]) || [];
	}, [activeConversationId, messages]);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [currentMessages]);

	const handleSendMessage = async () => {
		if (!activeConversationId || !messageInput.trim()) return;
		const content = messageInput.trim();
		setMessageInput('');
		try {
			await sendMessage(activeConversationId, content);
		} catch {
			toast.error('Không thể gửi tin nhắn. Vui lòng thử lại.');
			setMessageInput(content);
		}
	};

	return (
		<div className='bg-background h-[calc(100vh-73px)]'>
			<div className='max-w-7xl mx-auto h-full'>
				<div className='flex h-full border-x border-border'>
					{/* Left Column - Conversations List */}
					<div className={`w-full md:w-80 md:shrink-0 border-r border-border bg-card flex flex-col ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'
						}`}>
						{/* Search */}
						<div className='p-4 border-b border-border'>
							<div className='relative'>
								<Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
								<Input
									placeholder='Tìm kiếm cuộc trò chuyện...'
									value={searchText}
									onChange={(e) => setSearchText(e.target.value)}
									className='pl-10'
								/>
							</div>
						</div>

						{/* Filter Tabs */}
						<div className='flex border-b border-border'>
							<button
								onClick={() => setFilterTab('all')}
								className={`flex-1 px-4 py-3 text-sm transition-colors ${filterTab === 'all' ?
										'border-b-2 border-primary text-primary'
										: 'text-muted-foreground hover:text-foreground'
									}`}>
								Tất cả
							</button>
							<button
								onClick={() => setFilterTab('unread')}
								className={`flex-1 px-4 py-3 text-sm transition-colors ${filterTab === 'unread' ?
										'border-b-2 border-primary text-primary'
										: 'text-muted-foreground hover:text-foreground'
									}`}>
								Chưa đọc
							</button>
						</div>

						{/* Conversation List */}
						<div className='flex-1 overflow-y-auto'>
							{isLoadingConversations || isCreatingConversation ?
								<div className='h-full flex items-center justify-center'>
									<Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
								</div>
								: conversationList.length === 0 ?
									<div className='h-full flex items-center justify-center px-4 text-center text-sm text-muted-foreground'>
										Bạn chưa có cuộc trò chuyện nào
									</div>
									: conversationList.map((conversation) => (
										<button
											key={conversation.id}
											onClick={async () => {
												setActiveConversation(conversation.id);
												setMobileView('chat');
												try {
													await markConversationRead(conversation.id);
													setConversations((current) =>
														current.map((conv) =>
															conv.id === conversation.id ?
																{ ...conv, unreadCount: 0 }
																: conv,
														),
													);
													await queryClient.invalidateQueries({
														queryKey: ['chat-conversations'],
													});
													const summary = await getUnreadSummary();
													setUnreadSummary({
														chatUnreadCount: summary.chatUnreadCount,
														notificationUnreadCount:
															summary.notificationUnreadCount,
													});
												} catch {
													// ignore
												}
											}}
											className={`w-full p-4 border-b border-border hover:bg-secondary transition-colors text-left ${activeConversationId === conversation.id ?
													'bg-secondary'
													: ''
												}`}>
											<div className='flex items-start gap-3'>
												<div className='relative'>
													<Avatar>
														<AvatarImage src={conversation.avatar} />
														<AvatarFallback>
															{conversation.name?.charAt(0).toUpperCase()}
														</AvatarFallback>
													</Avatar>
													{onlineUsers.includes(conversation.partnerId) && (
														<span className='absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-card rounded-full' />
													)}
												</div>
												<div className='flex-1 min-w-0'>
													<div className='flex items-center justify-between mb-1 min-w-0 gap-2'>
														<div className='flex items-center gap-1.5 min-w-0 flex-1'>
															<p className='truncate font-semibold text-sm text-foreground'>{conversation.name}</p>
															{conversation.isOwner ? (
																<span className='px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 shrink-0 uppercase tracking-wider'>
																	Chủ nhà
																</span>
															) : (
																<span className='px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 shrink-0 uppercase tracking-wider'>
																	Khách
																</span>
															)}
														</div>
														<span className='text-xs text-muted-foreground shrink-0 ml-auto'>
															{conversation.timestamp ?
																new Date(
																	conversation.timestamp,
																).toLocaleTimeString('vi-VN', {
																	hour: '2-digit',
																	minute: '2-digit',
																})
																: '--:--'}
														</span>
													</div>
													<Badge
														variant='default'
														className='text-xs mb-2 w-full'>
														<span className='block truncate w-full text-center'>
															{conversation.roomName}
														</span>
													</Badge>
													<div className='flex items-center justify-between'>
														<p className='text-sm text-muted-foreground truncate'>
															{conversation.lastMessage}
														</p>
														{conversation.unread > 0 && (
															<span className='w-5 h-5 bg-accent text-white text-xs rounded-full flex items-center justify-center shrink-0 ml-2'>
																{conversation.unread}
															</span>
														)}
													</div>
												</div>
											</div>
										</button>
									))
							}
						</div>
					</div>

					{/* Right Column - Chat Area */}
					{currentConversation && (
						<div className={`flex-1 flex flex-col ${mobileView === 'list' ? 'hidden md:flex' : 'flex'
							}`}>
							{/* Chat Header */}
							<div className='p-4 border-b border-border bg-card flex items-center justify-between'>
								<div className='flex items-center gap-2 sm:gap-3 min-w-0 flex-1'>
									<Button
										variant='ghost'
										size='icon'
										onClick={() => setMobileView('list')}
										className='md:hidden -ml-2 rounded-xl h-9 w-9 shrink-0'>
										<ArrowLeft className='w-5 h-5' />
									</Button>
									<div className='relative shrink-0'>
										<Avatar>
											<AvatarImage src={currentConversation.avatar} />
											<AvatarFallback>
												{currentConversation.name?.charAt(0).toUpperCase()}
											</AvatarFallback>
										</Avatar>
										{onlineUsers.includes(currentConversation.partnerId) && (
											<span className='absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-card rounded-full' />
										)}
									</div>
									<div className='min-w-0 flex-1'>
										<div className='flex items-center gap-1.5 sm:gap-2 flex-wrap'>
											<p className='font-semibold text-foreground truncate max-w-[120px] sm:max-w-none'>{currentConversation.name}</p>
											{currentConversation.isOwner ? (
												<span className='px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 uppercase tracking-wider shrink-0'>
													Chủ nhà
												</span>
											) : (
												<span className='px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 uppercase tracking-wider shrink-0'>
													Khách thuê
												</span>
											)}
										</div>
										<p className='text-xs text-muted-foreground truncate'>
											{onlineUsers.includes(currentConversation.partnerId) ?
												'Đang hoạt động'
												: 'Ngoại tuyến'}
										</p>
									</div>
								</div>
								<button className='p-2 hover:bg-secondary rounded-lg transition-colors shrink-0'>
									<MoreVertical className='w-5 h-5' />
								</button>
							</div>

							{/* Pinned Room Card */}
							<div className='p-3 sm:p-4 bg-secondary border-b border-border'>
								<Link
									href={`/rooms/${currentConversation.roomId}`}
									className='flex items-center gap-3 p-2.5 sm:p-3 bg-card border border-border rounded-lg hover:shadow-md transition-shadow'>
									<Image
										src={
											currentConversation.roomImage ||
											'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=200'
										}
										alt={currentConversation.roomName}
										width={120}
										height={120}
										className='w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover shrink-0'
									/>
									<div className='flex-1 min-w-0'>
										<div className='flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1'>
											<p className='font-medium text-xs sm:text-sm text-foreground truncate max-w-[150px] sm:max-w-[400px]'>
												{currentConversation.roomName}
											</p>
											{currentConversation.isOwner ? (
												<span className='px-1 py-0.5 rounded text-[8px] font-bold bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 uppercase tracking-wider shrink-0'>
													Của bạn
												</span>
											) : (
												<span className='px-1 py-0.5 rounded text-[8px] font-bold bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 uppercase tracking-wider shrink-0'>
													Của {currentConversation.name?.split(' ')?.[0] || 'chủ trọ'}
												</span>
											)}
										</div>
										<PriceTag
											amount={currentConversation.roomPrice}
											size='sm'
										/>
									</div>
									<Button variant='secondary' size='sm' className='shrink-0 text-xs px-2.5 py-1.5 h-8'>
										Xem tin
									</Button>
								</Link>
							</div>

							{/* Messages */}
							<div className='flex-1 overflow-y-auto p-4 space-y-4'>
								{isLoadingMessages ?
									<div className='h-full flex items-center justify-center'>
										<Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
									</div>
									: currentMessages.length === 0 ?
										<div className='h-full flex items-center justify-center text-sm text-muted-foreground'>
											Chưa có tin nhắn, hãy bắt đầu cuộc trò chuyện
										</div>
										: <>
											{currentMessages.map((message, index) => {
												const showTimestamp =
													index === 0 ||
													currentMessages[index - 1].sentAt !== message.sentAt;

												return (
													<div key={message.id}>
														{showTimestamp && (
															<div className='flex justify-center mb-4'>
																<span className='text-[10px] sm:text-xs text-muted-foreground bg-secondary px-3 py-1 rounded-full'>
																	{new Date(message.sentAt).toLocaleString(
																		'vi-VN',
																	)}
																</span>
															</div>
														)}
														<div
															className={`flex ${message.senderId === user?.id ?
																	'justify-end'
																	: 'justify-start'
																}`}>
															<div
																className={`max-w-[80%] sm:max-w-[70%] px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl text-sm ${message.senderId === user?.id ?
																		'bg-primary text-white rounded-br-sm'
																		: 'bg-secondary text-foreground rounded-bl-sm'
																	}`}>
																<p className='wrap-break-word whitespace-pre-wrap'>{message.content}</p>
															</div>
														</div>
													</div>
												);
											})}
											<div ref={messagesEndRef} />
										</>
								}
							</div>

							{/* Message Input */}
							<div className='p-3 sm:p-4 border-t border-border bg-card'>
								<div className='flex items-center gap-2 sm:gap-3'>
									<div className='flex-1 relative'>
										<Input
											placeholder='Nhập tin nhắn...'
											value={messageInput}
											onChange={(e) => setMessageInput(e.target.value)}
											onKeyPress={(e) => {
												if (e.key === 'Enter' && !e.shiftKey) {
													e.preventDefault();
													handleSendMessage();
												}
											}}
											className='h-9 sm:h-10 text-sm'
										/>
									</div>

									<Button
										variant='default'
										size='icon'
										onClick={handleSendMessage}
										disabled={!messageInput.trim()}
										className='h-9 w-9 sm:h-10 sm:w-10 rounded-xl'>
										<Send className='w-4 h-4' />
									</Button>
								</div>
							</div>
						</div>
					)}

					{!currentConversation && (
						<div className={`flex-1 flex items-center justify-center bg-secondary ${mobileView === 'list' ? 'hidden md:flex' : 'flex'
							}`}>
							<div className='text-center p-6'>
								<p className='text-muted-foreground text-sm sm:text-base'>
									Chọn một cuộc trò chuyện để bắt đầu
								</p>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default function MessagingPage() {
	return (
		<Suspense
			fallback={
				<div className='h-[calc(100vh-73px)] flex items-center justify-center bg-background'>
					<Loader2 className='h-8 w-8 animate-spin text-primary' />
				</div>
			}>
			<ChatContent />
		</Suspense>
	);
}
