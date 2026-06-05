import api from '../axios';

export const getAdminStats = async () => {
	const res = await api.get('/admin/stats');
	return res.data;
};

export const getAdminUsers = async (page = 1, limit = 10) => {
	const res = await api.get('/admin/users', { params: { page, limit } });
	return res.data;
};

export const toggleUserBan = async (id: string) => {
	const res = await api.put(`/admin/users/${id}/ban`);
	return res.data;
};

export const toggleUserVerification = async (id: string) => {
	const res = await api.put(`/admin/users/${id}/verify`);
	return res.data;
};

export const getAdminRooms = async (page = 1, limit = 10) => {
	const res = await api.get('/admin/rooms', { params: { page, limit } });
	return res.data;
};

export const changeRoomStatus = async (id: string, status: 'AVAILABLE' | 'HIDDEN') => {
	const res = await api.put(`/admin/rooms/${id}/status`, { status });
	return res.data;
};

export const removeRoom = async (id: string) => {
	const res = await api.delete(`/admin/rooms/${id}`);
	return res.data;
};

export const analyzeRoomFraud = async (id: string) => {
	const res = await api.get(`/admin/rooms/${id}/fraud`);
	return res.data;
};

export const getAdminReviews = async (page = 1, limit = 10) => {
	const res = await api.get('/admin/reviews', { params: { page, limit } });
	return res.data;
};

export const analyzeReviewFraud = async (id: string) => {
	const res = await api.get(`/admin/reviews/${id}/fraud`);
	return res.data;
};

export const changeReviewStatus = async (id: string, isVerified: boolean) => {
	const res = await api.put(`/admin/reviews/${id}/status`, { isVerified });
	return res.data;
};

export const removeReview = async (id: string) => {
	const res = await api.delete(`/admin/reviews/${id}`);
	return res.data;
};

export const getAdminReports = async (page = 1, limit = 10) => {
	const res = await api.get('/admin/reports', { params: { page, limit } });
	return res.data;
};

export const updateReportStatus = async (id: string, status: string) => {
	const res = await api.put(`/admin/reports/${id}/status`, { status });
	return res.data;
};

export const reportRoom = async (roomId: string, reason: string) => {
	const res = await api.post(`/rooms/${roomId}/report`, { reason });
	return res.data;
};
