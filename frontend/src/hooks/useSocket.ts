/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useAuthStore } from '@/stores/auth.store';
import useChatStore from '@/stores/chat.store';
import { useNotificationStore } from '@/stores/notification.store';
import { useCallback, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { getUnreadSummary, sendMessageViaApi } from '@/lib/api/chat.api';

let socketInstance: Socket | null = null;

const useSocket = () => {
	const { accessToken, user } = useAuthStore();
	const {
		addMessage,
		setTyping,
		setOnlineUsers,
		addUserOnline,
		removeUserOffline,
	} = useChatStore();
	const { setUnreadSummary } = useNotificationStore();

	useEffect(() => {
		if (!accessToken || !user) return;
		if (socketInstance) return;

		socketInstance = io(`${process.env.NEXT_PUBLIC_API_URL}/chat`, {
			auth: { token: accessToken },
			transports: ['websocket'],
		});

		socketInstance.on('connect', () => console.log('Socket Connected!'));

		socketInstance.on('online_users', (users: string[]) => {
			setOnlineUsers(users);
		});

		socketInstance.on('user_online', (userId: string) => {
			addUserOnline(userId);
		});

		socketInstance.on('user_offline', (userId: string) => {
			removeUserOffline(userId);
		});

		getUnreadSummary()
			.then((summary) => {
				setUnreadSummary({
					chatUnreadCount: summary.chatUnreadCount,
					notificationUnreadCount: summary.notificationUnreadCount,
				});
			})
			.catch(() => {});

		socketInstance.on('new_message', (msg: any) => {
			addMessage(msg);
		});

		socketInstance.on('unread_summary', (summary: any) => {
			setUnreadSummary({
				chatUnreadCount: summary.chatUnreadCount || 0,
				notificationUnreadCount: summary.notificationUnreadCount || 0,
			});
		});

		socketInstance.on('user_typing', ({ conversationId }: any) => {
			setTyping(conversationId, true);
			setTimeout(() => setTyping(conversationId, false), 2000);
		});

		socketInstance.on('disconnect', () => console.log('Socket disconnected!'));

		return () => {
			// Chỉ ngắt kết nối thực sự khi người dùng logout (token bị xóa khỏi store)
			const currentToken = useAuthStore.getState().accessToken;
			if (!currentToken) {
				socketInstance?.disconnect();
				socketInstance = null;
			}
		};
	}, [
		accessToken,
		user?.id,
		addMessage,
		setTyping,
		setUnreadSummary,
		setOnlineUsers,
		addUserOnline,
		removeUserOffline,
	]);

	const joinConversation = useCallback((id: string) => {
		socketInstance?.emit('join_conversation', id);
	}, []);

	const sendMessage = useCallback(
		async (conversationId: string, content: string) => {
			if (socketInstance?.connected) {
				socketInstance.emit('send_message', { conversationId, content });
			} else {
				// Fallback: gửi qua REST API khi socket không kết nối
				try {
					const msg = await sendMessageViaApi(conversationId, content);
					addMessage(msg);
				} catch (error) {
					console.error('Failed to send message via API:', error);
				}
			}
		},
		[addMessage],
	);

	const sendTyping = useCallback((conversationId: string) => {
		socketInstance?.emit('typing', conversationId);
	}, []);

	return { joinConversation, sendMessage, sendTyping };
};

export default useSocket;
