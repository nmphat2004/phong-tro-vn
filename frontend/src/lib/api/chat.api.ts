import api from '../axios';

export interface ChatMessage {
	id: string;
	conversationId: string;
	senderId: string;
	content: string;
	sentAt: string;
	sender: {
		id: string;
		fullName: string;
		avatarUrl?: string;
	};
}

export interface Conversation {
	id: string;
	roomId: string;
	renterId: string;
	ownerId: string;
	room: {
		id: string;
		title: string;
		price: number;
		images?: { id: string; url: string; isPrimary: boolean }[];
	};
	renter: {
		id: string;
		fullName: string;
		avatarUrl?: string;
	};
	owner: {
		id: string;
		fullName: string;
		avatarUrl?: string;
	};
	messages: ChatMessage[];
}

export const getConversations = async () => {
	const res = await api.get<Conversation[]>('/chat/conversations');
	return res.data;
};

export const getMessages = async (
	conversationId: string,
	params?: { page?: number; limit?: number },
) => {
	const res = await api.get<{
		data: ChatMessage[];
		meta: { total: number; page: number; limit: number; totalPage: number };
	}>(`/chat/conversations/${conversationId}/messages`, { params });
	return res.data;
};

export const getOrCreateConversation = async (roomId: string) => {
	const res = await api.post<Conversation>('/chat/conversations', { roomId });
	return res.data;
};

export const markConversationRead = async (conversationId: string) => {
	const res = await api.patch<{ success: boolean }>(
		`/chat/conversations/${conversationId}/read`,
	);
	return res.data;
};

export const getUnreadSummary = async () => {
	const res = await api.get<{
		chatUnreadCount: number;
		notificationUnreadCount: number;
		totalUnreadCount: number;
	}>('/chat/unread-summary');
	return res.data;
};

export const sendMessageViaApi = async (
	conversationId: string,
	content: string,
) => {
	const res = await api.post<ChatMessage>(
		`/chat/conversations/${conversationId}/messages`,
		{ content },
	);
	return res.data;
};
