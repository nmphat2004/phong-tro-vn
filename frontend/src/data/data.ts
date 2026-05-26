export const priceRanges = [
	{ label: 'Tất cả', min: '', max: '' },
	{ label: 'Dưới 1 triệu', min: '', max: '1000000' },
	{ label: '1 - 2 triệu', min: '1000000', max: '2000000' },
	{ label: '2 - 3 triệu', min: '2000000', max: '3000000' },
	{ label: '3 - 5 triệu', min: '3000000', max: '5000000' },
	{ label: '5 - 7 triệu', min: '5000000', max: '7000000' },
	{ label: '7 - 10 triệu', min: '7000000', max: '10000000' },
	{ label: '10 - 15 triệu', min: '10000000', max: '15000000' },
	{ label: 'Trên 15 triệu', min: '15000000', max: '' },
];

export const roomTypesList = [
	{ value: 'room', label: 'Phòng trọ' },
	{ value: 'house', label: 'Nhà riêng' },
	{ value: 'shared', label: 'Ký túc xá' },
	{ value: 'apartment', label: 'Căn hộ chung cư' },
	{ value: 'mini', label: 'Căn hộ mini' },
	{ value: 'service', label: 'Căn hộ dịch vụ' },
];

// ── Danh sách Quận/Huyện TP.HCM (trước sáp nhập) + Phường/Xã ──
export interface Ward {
	name: string;
	streets?: string[]; // đường chính trong phường (hiển thị phụ)
}

export interface District {
	name: string;
	wards: Ward[];
}

export const hcmDistricts: District[] = [
	{
		name: 'Quận 1',
		wards: [
			{ name: 'Phường Sài Gòn', streets: ['Bến Nghé, Đa Kao, Nguyễn Thái Bình (cũ)'] },
			{ name: 'Phường Tân Định', streets: ['Tân Định, Đa Kao (cũ)'] },
			{ name: 'Phường Bến Thành', streets: ['Bến Thành, Phạm Ngũ Lão, Cầu Ông Lãnh, Nguyễn Thái Bình (cũ)'] },
			{ name: 'Phường Cầu Ông Lãnh', streets: ['Nguyễn Cư Trinh, Cầu Kho, Cô Giang, Cầu Ông Lãnh (cũ)'] },
		],
	},
	{
		name: 'Quận 3',
		wards: [
			{ name: 'Phường Bàn Cờ', streets: ['Phường 1, 2, 3, 5, 4 (cũ)'] },
			{ name: 'Phường Xuân Hòa', streets: ['Võ Thị Sáu, Phường 4 (cũ)'] },
			{ name: 'Phường Nhiêu Lộc', streets: ['Phường 9, 11, 12, 14 (cũ)'] },
		],
	},
	{
		name: 'Quận 4',
		wards: [
			{ name: 'Phường Xóm Chiếu', streets: ['Phường 13, 16, 18, 15 (cũ)'] },
			{ name: 'Phường Khánh Hội', streets: ['Phường 8, 9, 2, 4, 15 (cũ)'] },
			{ name: 'Phường Vĩnh Hội', streets: ['Phường 1, 3, 2, 4 (cũ)'] },
		],
	},
	{
		name: 'Quận 5',
		wards: [
			{ name: 'Phường Chợ Quán', streets: ['Phường 1, 2, 4 (cũ)'] },
			{ name: 'Phường An Đông', streets: ['Phường 5, 7, 9 (cũ)'] },
			{ name: 'Phường Chợ Lớn', streets: ['Phường 11, 12, 13, 14 (cũ)'] },
			{ name: 'Phường 3' },
			{ name: 'Phường 6' },
			{ name: 'Phường 8' },
			{ name: 'Phường 10' },
		],
	},
	{
		name: 'Quận 6',
		wards: [
			{ name: 'Phường Bình Tây', streets: ['Phường 2, 9 (cũ)'] },
			{ name: 'Phường Bình Tiên', streets: ['Phường 1, 7, 8 (cũ)'] },
			{ name: 'Phường Bình Phú', streets: ['Phường 10, 11 (cũ), một phần Phường 16 Quận 8'] },
			{ name: 'Phường Phú Lâm', streets: ['Phường 12, 13, 14 (cũ)'] },
		],
	},
	{
		name: 'Quận 7',
		wards: [
			{ name: 'Phường Tân Thuận', streets: ['Bình Thuận, Tân Thuận Đông, Tân Thuận Tây (cũ)'] },
			{ name: 'Phường Phú Thuận', streets: ['Phú Thuận, một phần Phú Mỹ (cũ)'] },
			{ name: 'Phường Tân Mỹ', streets: ['Tân Phú, một phần Phú Mỹ (cũ)'] },
			{ name: 'Phường Tân Hưng', streets: ['Tân Phong, Tân Quy, Tân Kiểng, Tân Hưng (cũ)'] },
		],
	},
	{
		name: 'Quận 8',
		wards: [
			{ name: 'Phường Chánh Hưng', streets: ['Phường 4, Rạch Ông, Hưng Phú, Phường 5 (cũ)'] },
			{ name: 'Phường Phú Định', streets: ['Phường 14, 15, Xóm Củi, Phường 16 (cũ)'] },
			{ name: 'Phường Bình Đông', streets: ['Phường 6, Phường 5, Phường 7 (cũ), xã An Phú Tây'] },
		],
	},
	{
		name: 'Quận 10',
		wards: [
			{ name: 'Phường Diên Hồng', streets: ['Phường 6, Phường 8, Phường 14 (cũ)'] },
			{ name: 'Phường Vườn Lài', streets: ['Phường 1, 2, 4, 9, 10 (cũ)'] },
			{ name: 'Phường Hòa Hưng', streets: ['Phường 12, 13, 15, Phường 14 (cũ)'] },
		],
	},
	{
		name: 'Quận 11',
		wards: [
			{ name: 'Phường Minh Phụng', streets: ['Phường 1, 7, 16 (cũ)'] },
			{ name: 'Phường Bình Thới', streets: ['Phường 3, 10, 8 (cũ)'] },
			{ name: 'Phường Hòa Bình', streets: ['Phường 5, 14 (cũ)'] },
			{ name: 'Phường Phú Thọ', streets: ['Phường 11, 15, 8 (cũ)'] },
		],
	},
	{
		name: 'Quận 12',
		wards: [
			{ name: 'Phường Đông Hưng Thuận', streets: ['Tân Thới Nhất, Tân Hưng Thuận, Đông Hưng Thuận (cũ)'] },
			{ name: 'Phường Trung Mỹ Tây', streets: ['Tân Chánh Hiệp, Trung Mỹ Tây (cũ)'] },
			{ name: 'Phường Tân Thới Hiệp', streets: ['Hiệp Thành, Tân Thới Hiệp (cũ)'] },
			{ name: 'Phường Thới An', streets: ['Thạnh Xuân, Thới An (cũ)'] },
			{ name: 'Phường An Phú Đông', streets: ['Thạnh Lộc, An Phú Đông (cũ)'] },
		],
	},
	{
		name: 'Quận Bình Thạnh',
		wards: [
			{ name: 'Phường Gia Định', streets: ['Phường 1, 2, 7, 17 (cũ)'] },
			{ name: 'Phường Bình Thạnh', streets: ['Phường 12, 14, 26 (cũ)'] },
			{ name: 'Phường Bình Lợi Trung', streets: ['Phường 5, 11, 13 (cũ)'] },
			{ name: 'Phường Thạnh Mỹ Tây', streets: ['Phường 19, 22, 25 (cũ)'] },
			{ name: 'Phường Bình Quới', streets: ['Phường 27, 28 (cũ)'] },
		],
	},
	{
		name: 'Quận Bình Tân',
		wards: [
			{ name: 'Phường An Lạc', streets: ['Bình Trị Đông B, An Lạc A, An Lạc (cũ)'] },
			{ name: 'Phường Bình Tân', streets: ['Bình Hưng Hòa B, Bình Trị Đông A, Tân Tạo (cũ)'] },
			{ name: 'Phường Tân Tạo', streets: ['Tân Kiên, Tân Tạo A, Tân Tạo (cũ)'] },
			{ name: 'Phường Bình Trị Đông', streets: ['Bình Trị Đông, Bình Hưng Hòa A, Bình Trị Đông A (cũ)'] },
			{ name: 'Phường Bình Hưng Hòa', streets: ['Bình Hưng Hòa, Sơn Kỳ, Bình Hưng Hòa A (cũ)'] },
		],
	},
	{
		name: 'Quận Gò Vấp',
		wards: [
			{ name: 'Phường Hạnh Thông', streets: ['Phường 1, 3 (cũ)'] },
			{ name: 'Phường An Nhơn', streets: ['Phường 5, 6 (cũ)'] },
			{ name: 'Phường Gò Vấp', streets: ['Phường 10, 17 (cũ)'] },
			{ name: 'Phường An Hội Đông', streets: ['Phường 15, 16 (cũ)'] },
			{ name: 'Phường Thông Tây Hội', streets: ['Phường 8, 11 (cũ)'] },
			{ name: 'Phường An Hội Tây', streets: ['Phường 12, 14 (cũ)'] },
		],
	},
	{
		name: 'Quận Phú Nhuận',
		wards: [
			{ name: 'Phường Đức Nhuận', streets: ['Phường 4, 5, 9 (cũ)'] },
			{ name: 'Phường Cầu Kiệu', streets: ['Phường 1, 2, 7, 15 (cũ)'] },
			{ name: 'Phường Phú Nhuận', streets: ['Phường 8, 10, 11, 13, 15 (cũ)'] },
		],
	},
	{
		name: 'Quận Tân Bình',
		wards: [
			{ name: 'Phường Tân Sơn Hòa', streets: ['Phường 1, 2, 3 (cũ)'] },
			{ name: 'Phường Tân Sơn Nhất', streets: ['Phường 4, 5, 7 (cũ)'] },
			{ name: 'Phường Tân Hòa', streets: ['Phường 6, 8, 9 (cũ)'] },
			{ name: 'Phường Bảy Hiền', streets: ['Phường 10, 11, 12 (cũ)'] },
			{ name: 'Phường Tân Bình', streets: ['Phường 13, 14, 15 (cũ)'] },
			{ name: 'Phường Tân Sơn', streets: ['Phường 15 (cũ)'] },
		],
	},
	{
		name: 'Quận Tân Phú',
		wards: [
			{ name: 'Phường Tây Thạnh', streets: ['Tây Thạnh, Sơn Kỳ (cũ)'] },
			{ name: 'Phường Tân Sơn Nhì', streets: ['Tân Sơn Nhì, Sơn Kỳ, Tân Quý, Tân Thành (cũ)'] },
			{ name: 'Phường Phú Thọ Hòa', streets: ['Phú Thọ Hòa, Tân Thành, Tân Quý (cũ)'] },
			{ name: 'Phường Tân Phú', streets: ['Phú Trung, Hòa Thạnh, Tân Thới Hòa, Tân Thành (cũ)'] },
			{ name: 'Phường Phú Thạnh', streets: ['Hiệp Tân, Phú Thạnh, Tân Thới Hòa (cũ)'] },
		],
	},
	{
		name: 'Thủ Đức',
		wards: [
			{ name: 'Phường Hiệp Bình', streets: ['Hiệp Bình Chánh, Hiệp Bình Phước, Linh Đông (cũ)'] },
			{ name: 'Phường Thủ Đức', streets: ['Bình Thọ, Linh Chiểu, Trường Thọ, Linh Tây, Linh Đông (cũ)'] },
			{ name: 'Phường Tam Bình', streets: ['Bình Chiểu, Tam Phú, Tam Bình (cũ)'] },
			{ name: 'Phường Linh Xuân', streets: ['Linh Trung, Linh Xuân, Linh Tây (cũ)'] },
			{ name: 'Phường Tăng Nhơn Phú', streets: ['Tân Phú, Hiệp Phú, Tăng Nhơn Phú A, Tăng Nhơn Phú B, Long Thạnh Mỹ (cũ)'] },
			{ name: 'Phường Long Bình', streets: ['Long Bình, Long Thạnh Mỹ (cũ)'] },
			{ name: 'Phường Long Phước', streets: ['Trường Thạnh, Long Phước (cũ)'] },
			{ name: 'Phường Long Trường', streets: ['Phú Hữu, Long Trường (cũ)'] },
			{ name: 'Phường Cát Lái', streets: ['Thạnh Mỹ Lợi, Cát Lái (cũ)'] },
			{ name: 'Phường Bình Trưng', streets: ['Bình Trưng Đông, Bình Trưng Tây, An Phú (cũ)'] },
			{ name: 'Phường Phước Long', streets: ['Phước Bình, Phước Long A, Phước Long B (cũ)'] },
			{ name: 'Phường An Khánh', streets: ['Thủ Thiêm, An Lợi Đông, Thảo Điền, An Khánh, An Phú (cũ)'] },
		],
	},
	{
		name: 'Huyện Bình Chánh',
		wards: [
			{ name: 'Xã Vĩnh Lộc', streets: ['Vĩnh Lộc A, Phạm Văn Hai (cũ)'] },
			{ name: 'Xã Tân Vĩnh Lộc', streets: ['Vĩnh Lộc B, Phạm Văn Hai, Tân Tạo (cũ)'] },
			{ name: 'Xã Bình Lợi', streets: ['Lê Minh Xuân, Bình Lợi (cũ)'] },
			{ name: 'Xã Tân Nhựt', streets: ['Tân Túc, Tân Nhựt, Tân Tạo A, Tân Kiên (cũ), P16 Q8'] },
			{ name: 'Xã Bình Chánh', streets: ['Tân Quý Tây, Bình Chánh, An Phú Tây (cũ)'] },
			{ name: 'Xã Hưng Long', streets: ['Đa Phước, Qui Đức, Hưng Long (cũ)'] },
			{ name: 'Xã Bình Hưng', streets: ['Phong Phú, Bình Hưng (cũ), P7 Q8'] },
		],
	},
	{
		name: 'Huyện Cần Giờ',
		wards: [
			{ name: 'Xã Bình Khánh', streets: ['Tam Thôn Hiệp, Bình Khánh, An Thới Đông (cũ)'] },
			{ name: 'Xã An Thới Đông', streets: ['Lý Nhơn, An Thới Đông (cũ)'] },
			{ name: 'Xã Cần Giờ', streets: ['Long Hòa, Cần Thạnh (cũ)'] },
			{ name: 'Xã Thạnh An' },
		],
	},
	{
		name: 'Huyện Củ Chi',
		wards: [
			{ name: 'Xã Củ Chi', streets: ['Tân Phú Trung, Tân Thông Hội, Phước Vĩnh An (cũ)'] },
			{ name: 'Xã Tân An Hội', streets: ['Củ Chi, Phước Hiệp, Tân An Hội (cũ)'] },
			{ name: 'Xã Thái Mỹ', streets: ['Trung Lập Thượng, Phước Thạnh, Thái Mỹ (cũ)'] },
			{ name: 'Xã An Nhơn Tây', streets: ['Phú Mỹ Hưng, An Phú, An Nhơn Tây (cũ)'] },
			{ name: 'Xã Nhuận Đức', streets: ['Phạm Văn Cội, Trung Lập Hạ, Nhuận Đức (cũ)'] },
			{ name: 'Xã Phú Hòa Đông', streets: ['Tân Thạnh Tây, Tân Thạnh Đông, Phú Hòa Đông (cũ)'] },
			{ name: 'Xã Bình Mỹ', streets: ['Bình Mỹ, Hòa Phú, Trung An (cũ)'] },
		],
	},
	{
		name: 'Huyện Hóc Môn',
		wards: [
			{ name: 'Xã Đông Thạnh', streets: ['Thới Tam Thôn, Nhị Bình, Đông Thạnh (cũ)'] },
			{ name: 'Xã Hóc Môn', streets: ['Tân Hiệp, Tân Xuân, Hóc Môn (cũ)'] },
			{ name: 'Xã Xuân Thới Sơn', streets: ['Tân Thới Nhì, Xuân Thới Đông, Xuân Thới Sơn (cũ)'] },
			{ name: 'Xã Bà Điểm', streets: ['Xuân Thới Thượng, Trung Chánh, Bà Điểm (cũ)'] },
		],
	},
	{
		name: 'Huyện Nhà Bè',
		wards: [
			{ name: 'Xã Nhà Bè', streets: ['Nhà Bè, Phú Xuân, Phước Kiển, Phước Lộc (cũ)'] },
			{ name: 'Xã Hiệp Phước', streets: ['Nhơn Đức, Long Thới, Hiệp Phước (cũ)'] },
		],
	},
];
