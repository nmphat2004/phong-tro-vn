import { create } from 'zustand';
import { ChatMessage, Conversation as ApiConversation } from '@/lib/api/chat.api';

interface Conversation extends ApiConversation {
	unreadCount?: number;
}

interface ChatState {
	conversations: Conversation[];
	activeConversationId: string | null;
	messages: Record<string, ChatMessage[]>;
	unreadCount: number;
	isTyping: Record<string, boolean>;
	onlineUsers: string[];
	setConversations: (
		c: Conversation[] | ((prev: Conversation[]) => Conversation[]),
	) => void;
	setActiveConversation: (id: string) => void;
	addMessage: (msg: ChatMessage) => void;
	setMessage: (convId: string, msgs: ChatMessage[]) => void;
	setTyping: (convId: string, val: boolean) => void;
	incrementUnread: () => void;
	resetUnread: () => void;
	setOnlineUsers: (users: string[]) => void;
	addUserOnline: (userId: string) => void;
	removeUserOffline: (userId: string) => void;
}

const useChatStore = create<ChatState>((set) => ({
	conversations: [],
	activeConversationId: null,
	messages: {},
	unreadCount: 0,
	isTyping: {},
	onlineUsers: [],

	setConversations: (conversations) =>
		set((state) => ({
			conversations:
				typeof conversations === 'function' ?
					conversations(state.conversations)
				:	conversations,
		})),
	setActiveConversation: (id) => set({ activeConversationId: id }),

	addMessage: (msg) =>
		set((state) => {
			const existingMessages = state.messages[msg.conversationId] || [];
			if (existingMessages.some((m) => m.id === msg.id)) {
				return state;
			}
			return {
				messages: {
					...state.messages,
					[msg.conversationId]: [...existingMessages, msg],
				},
				conversations: state.conversations.map((c) =>
					c.id === msg.conversationId ?
						{ ...c, messages: [...(c.messages || []), msg] }
					:	c,
				),
			};
		}),

	setMessage: (convId, msgs) =>
		set((state) => ({
			messages: { ...state.messages, [convId]: msgs },
		})),

	setTyping: (convId, val) =>
		set((state) => ({
			isTyping: { ...state.isTyping, [convId]: val },
		})),

	incrementUnread: () => {
		set((state) => ({ unreadCount: state.unreadCount + 1 }));
	},

	resetUnread: () => set({ unreadCount: 0 }),

	setOnlineUsers: (users) => set({ onlineUsers: users }),
	addUserOnline: (userId) =>
		set((state) => ({
			onlineUsers: state.onlineUsers.includes(userId) ?
				state.onlineUsers
			:	[...state.onlineUsers, userId],
		})),
	removeUserOffline: (userId) =>
		set((state) => ({
			onlineUsers: state.onlineUsers.filter((id) => id !== userId),
		})),
}));

export default useChatStore;
