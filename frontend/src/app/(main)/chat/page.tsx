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
		<div className='bg-background h-[calc(100dvh-64px)] overflow-hidden'>
			<div className='max-w-7xl mx-auto h-full px-0 sm:px-4'>
				<div className='flex h-full border-x border-border/50 bg-card'>
					{/* Left Column - Conversations List */}
					<div className={`w-full md:w-80 md:shrink-0 border-r border-border/50 bg-card flex flex-col ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'
						}`}>
						{/* Search */}
						<div className='p-4 border-b border-border/50'>
							<div className='relative'>
								<Search className='absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
								<Input
									placeholder='Tìm kiếm cuộc trò chuyện...'
									value={searchText}
									onChange={(e) => setSearchText(e.target.value)}
									className='pl-10 rounded-xl bg-secondary/40 border-border/60 focus-visible:ring-primary/20'
								/>
							</div>
						</div>

						{/* Filter Tabs */}
						<div className='flex border-b border-border/50 bg-secondary/15'>
							<button
								onClick={() => setFilterTab('all')}
								className={`flex-1 px-4 py-3 text-xs sm:text-sm font-semibold transition-all border-b-2 cursor-pointer ${filterTab === 'all' ?
										'border-primary text-primary bg-primary/5'
										: 'border-transparent text-muted-foreground hover:text-foreground'
									}`}>
								Tất cả
							</button>
							<button
								onClick={() => setFilterTab('unread')}
								className={`flex-1 px-4 py-3 text-xs sm:text-sm font-semibold transition-all border-b-2 cursor-pointer ${filterTab === 'unread' ?
										'border-primary text-primary bg-primary/5'
										: 'border-transparent text-muted-foreground hover:text-foreground'
									}`}>
								Chưa đọc
							</button>
						</div>

						{/* Conversation List */}
						<div className='flex-1 overflow-y-auto divide-y divide-border/30'>
							{isLoadingConversations || isCreatingConversation ?
								<div className='h-full flex items-center justify-center'>
									<Loader2 className='h-6 w-6 animate-spin text-primary' />
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
											className={`w-full p-4 hover:bg-secondary/45 transition-all text-left border-l-4 cursor-pointer ${activeConversationId === conversation.id ?
													'bg-primary/5 border-primary'
													: 'border-transparent'
												}`}>
											<div className='flex items-start gap-3'>
												<div className='relative'>
													<Avatar className="ring-2 ring-background">
														<AvatarImage src={conversation.avatar} />
														<AvatarFallback className="bg-primary/10 text-primary font-bold">
															{conversation.name?.charAt(0).toUpperCase()}
														</AvatarFallback>
													</Avatar>
													{onlineUsers.includes(conversation.partnerId) && (
														<span className='absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-card rounded-full ring-1 ring-background' />
													)}
												</div>
												<div className='flex-1 min-w-0'>
													<div className='flex items-center justify-between mb-1 min-w-0 gap-2'>
														<div className='flex items-center gap-1.5 min-w-0 flex-1'>
															<p className='truncate font-bold text-sm text-foreground'>{conversation.name}</p>
															{conversation.isOwner ? (
																<span className='px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-primary/10 text-primary shrink-0 uppercase tracking-wider'>
																	Chủ nhà
																</span>
															) : (
																<span className='px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 uppercase tracking-wider'>
																	Khách
																</span>
															)}
														</div>
														<span className='text-[10px] text-muted-foreground shrink-0 ml-auto font-medium'>
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
														variant='outline'
														className='text-[10px] mb-2 w-full justify-start py-0.5 px-2 bg-secondary/30 border-border/40 text-muted-foreground rounded-md font-medium'>
														<span className='block truncate text-left w-full'>
															{conversation.roomName}
														</span>
													</Badge>
													<div className='flex items-center justify-between'>
														<p className='text-sm text-muted-foreground truncate font-medium flex-1'>
															{conversation.lastMessage}
														</p>
														{conversation.unread > 0 && (
															<span className='w-4.5 h-4.5 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center shrink-0 ml-2 font-bold animate-pulse'>
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
						<div className={`flex-1 flex flex-col bg-secondary/10 ${mobileView === 'list' ? 'hidden md:flex' : 'flex'
							}`}>
							{/* Chat Header */}
							<div className='p-4 border-b border-border/50 bg-card flex items-center justify-between h-16 shrink-0'>
								<div className='flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1 text-left'>
									<Button
										variant='ghost'
										size='icon'
										onClick={() => setMobileView('list')}
										className='md:hidden -ml-2 rounded-xl h-9 w-9 shrink-0 cursor-pointer hover:bg-secondary'>
										<ArrowLeft className='w-5 h-5 text-foreground' />
									</Button>
									<div className='relative shrink-0'>
										<Avatar className="ring-2 ring-primary/10">
											<AvatarImage src={currentConversation.avatar} />
											<AvatarFallback className="bg-primary/10 text-primary font-bold">
												{currentConversation.name?.charAt(0).toUpperCase()}
											</AvatarFallback>
										</Avatar>
										{onlineUsers.includes(currentConversation.partnerId) && (
											<span className='absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-card rounded-full ring-1 ring-background' />
										)}
									</div>
									<div className='min-w-0 flex-1'>
										<div className='flex items-center gap-1.5 sm:gap-2 flex-wrap'>
											<p className='font-bold text-foreground text-sm truncate max-w-[120px] sm:max-w-none'>{currentConversation.name}</p>
											{currentConversation.isOwner ? (
												<span className='px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-primary/10 text-primary uppercase tracking-wider shrink-0'>
													Chủ nhà
												</span>
											) : (
												<span className='px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 uppercase tracking-wider shrink-0'>
													Khách thuê
												</span>
											)}
										</div>
										<p className='text-[10px] text-muted-foreground font-medium mt-0.5'>
											{onlineUsers.includes(currentConversation.partnerId) ?
												'Đang hoạt động'
												: 'Ngoại tuyến'}
										</p>
									</div>
								</div>
								<button className='p-2 hover:bg-secondary/80 rounded-xl transition-colors shrink-0 cursor-pointer text-muted-foreground hover:text-foreground'>
									<MoreVertical className='w-5 h-5' />
								</button>
							</div>

							{/* Pinned Room Card */}
							<div className='p-3 sm:p-4 bg-secondary/25 border-b border-border/40'>
								<Link
									href={`/rooms/${currentConversation.roomId}`}
									className='flex items-center gap-3.5 p-2.5 sm:p-3 bg-card border border-border/50 rounded-2xl hover:shadow-lg hover:shadow-primary/3 transition-all duration-300 group'>
									<div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 bg-secondary">
										<Image
											src={
												currentConversation.roomImage ||
												'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=200'
											}
											alt={currentConversation.roomName}
											fill
											className='object-cover group-hover:scale-103 transition-transform duration-500'
										/>
									</div>
									<div className='flex-1 min-w-0 text-left'>
										<div className='flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1'>
											<p className='font-bold text-xs sm:text-sm text-foreground truncate max-w-[150px] sm:max-w-[400px] group-hover:text-primary transition-colors'>
												{currentConversation.roomName}
											</p>
											{currentConversation.isOwner ? (
												<span className='px-1 py-0.5 rounded text-[8px] font-extrabold bg-primary/10 text-primary uppercase tracking-wider shrink-0'>
													Của bạn
												</span>
											) : (
												<span className='px-1 py-0.5 rounded text-[8px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 uppercase tracking-wider shrink-0'>
													Của {currentConversation.name?.split(' ')?.[0] || 'chủ trọ'}
												</span>
											)}
										</div>
										<PriceTag
											amount={currentConversation.roomPrice}
											size='sm'
										/>
									</div>
									<Button variant='secondary' size='sm' className='shrink-0 text-xs px-3.5 py-1.5 h-8.5 rounded-xl cursor-pointer hover:bg-secondary'>
										Xem tin
									</Button>
								</Link>
							</div>

							{/* Messages */}
							<div className='flex-1 overflow-y-auto p-4 space-y-4 bg-secondary/15'>
								{isLoadingMessages ?
									<div className='h-full flex items-center justify-center'>
										<Loader2 className='h-6 w-6 animate-spin text-primary' />
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
																<span className='text-[10px] text-muted-foreground bg-card border border-border/40 px-3 py-1 rounded-full font-medium shadow-xs'>
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
																className={`max-w-[80%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed text-left ${message.senderId === user?.id ?
																		'bg-primary text-primary-foreground rounded-br-none shadow-xs'
																		: 'bg-card border border-border/50 text-foreground rounded-bl-none shadow-xs'
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
							<div className='p-3 sm:p-4 border-t border-border/50 bg-card shrink-0'>
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
											className='h-10 text-sm rounded-xl bg-secondary/40 border-border/60 focus-visible:ring-primary/20'
										/>
									</div>

									<Button
										variant='default'
										size='icon'
										onClick={handleSendMessage}
										disabled={!messageInput.trim()}
										className='h-10 w-10 rounded-xl cursor-pointer bg-primary text-primary-foreground hover:bg-primary/95 shrink-0'>
										<Send className='w-4 h-4' />
									</Button>
								</div>
							</div>
						</div>
					)}

					{!currentConversation && (
						<div className={`flex-1 flex items-center justify-center bg-secondary/15 ${mobileView === 'list' ? 'hidden md:flex' : 'flex'
							}`}>
							<div className='text-center p-6'>
								<p className='text-muted-foreground text-sm sm:text-base font-semibold'>
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
				<div className='h-[calc(100dvh-64px)] flex items-center justify-center bg-background'>
					<Loader2 className='h-8 w-8 animate-spin text-primary' />
				</div>
			}>
			<ChatContent />
		</Suspense>
	);
}
