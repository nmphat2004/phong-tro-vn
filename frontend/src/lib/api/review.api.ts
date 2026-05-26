/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReviewResponse } from '@/types';
import api from '../axios';

export const getReviews = async (roomId: string, page = 1) => {
	const res = await api.get<ReviewResponse>(`/rooms/${roomId}/reviews`, {
		params: { page },
	});
	return res.data;
};

export const createReview = async (roomId: string, data: any) => {
	const res = await api.post(`/rooms/${roomId}/reviews`, data);
	return res.data;
};

export const checkReviewEligibility = async (roomId: string) => {
	const res = await api.get<{ eligible: boolean; reason?: string }>(
		`/rooms/${roomId}/reviews/eligibility`,
	);
	return res.data;
};

export const updateReview = async (roomId: string, reviewId: string, data: any) => {
	const res = await api.put(`/rooms/${roomId}/reviews/${reviewId}`, data);
	return res.data;
};

export const deleteReview = async (roomId: string, reviewId: string) => {
	const res = await api.delete(`/rooms/${roomId}/reviews/${reviewId}`);
	return res.data;
};
