import api from '../axios';

export const uploadImage = async (file: File): Promise<{ url: string; hash: string }> => {
	const formData = new FormData();
	formData.append('files', file);

	const res = await api.post<{ urls: string[]; hashes: string[] }>('/upload/images', formData);

	return {
		url: res.data.urls[0],
		hash: res.data.hashes[0] || '',
	};
};
