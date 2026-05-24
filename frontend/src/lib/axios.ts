/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { refreshToken } from './api/auth.api';

const api = axios.create({
	baseURL: process.env.NEXT_PUBLIC_API_URL,
});

let isRefreshing = false;
let refreshQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
	refreshQueue.forEach((prom) => {
		if (error) {
			prom.reject(error);
		} else {
			prom.resolve(token);
		}
	});
	refreshQueue = [];
};

// Set JSON content-type for non-FormData requests
api.interceptors.request.use((config) => {
	const token = localStorage.getItem('accessToken');
	if (token) config.headers.Authorization = `Bearer ${token}`;

	// Only set Content-Type for JSON if data is not FormData
	if (config.data && !(config.data instanceof FormData)) {
		config.headers['Content-Type'] = 'application/json';
	}

	return config;
});

api.interceptors.response.use(
	(response) => response,
	async (error) => {
		const originalRequest = error.config;
		const isAuthPath =
			originalRequest.url?.includes('/auth/login') ||
			originalRequest.url?.includes('/auth/register') ||
			originalRequest.url?.includes('/auth/refresh');

		if (
			error.response?.status === 401 &&
			!originalRequest._retry &&
			!isAuthPath
		) {
			if (isRefreshing) {
				return new Promise((resolve, reject) => {
					refreshQueue.push({ resolve, reject });
				})
					.then((token) => {
						originalRequest.headers.Authorization = `Bearer ${token}`;
						return api(originalRequest);
					})
					.catch((err) => Promise.reject(err));
			}

			originalRequest._retry = true;
			isRefreshing = true;

			const currentRefreshToken = localStorage.getItem('refreshToken');
			if (!currentRefreshToken) {
				isRefreshing = false;
				return Promise.reject(error);
			}

			try {
				const { accessToken, refreshToken: newRefreshToken } =
					await refreshToken(currentRefreshToken);

				localStorage.setItem('accessToken', accessToken);
				localStorage.setItem('refreshToken', newRefreshToken);

				api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
				processQueue(null, accessToken);

				originalRequest.headers.Authorization = `Bearer ${accessToken}`;
				return api(originalRequest);
			} catch (err) {
				processQueue(err, null);
				localStorage.removeItem('accessToken');
				localStorage.removeItem('refreshToken');
				// Redirect to login if needed or let the app handle auth state
				if (typeof window !== 'undefined' && window.location.pathname !== '/login' && window.location.pathname !== '/register') {
					window.location.href = '/login';
				}
				return Promise.reject(err);
			} finally {
				isRefreshing = false;
			}
		}

		return Promise.reject(error);
	},
);

export default api;
