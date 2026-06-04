'use client';
import {
	MapContainer,
	TileLayer,
	Marker,
	useMap,
	LayersControl,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useMemo } from 'react';

// Fix Leaflet marker icons
const icon = L.icon({
	iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
	shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
	iconSize: [25, 41],
	iconAnchor: [12, 41],
});

function ChangeView({ center }: { center: [number, number] }) {
	const map = useMap();
	useEffect(() => {
		map.setView(center, map.getZoom());
	}, [center, map]);
	return null;
}

interface PostMapPreviewProps {
	lat: number;
	lng: number;
	onChange?: (lat: number, lng: number) => void;
}

export default function PostMapPreview({
	lat,
	lng,
	onChange,
}: PostMapPreviewProps) {
	const position: [number, number] = [lat, lng];
	const markerRef = useRef<L.Marker>(null);

	const eventHandlers = useMemo(
		() => ({
			dragend() {
				const marker = markerRef.current;
				if (marker != null) {
					const newPos = marker.getLatLng();
					if (onChange) {
						onChange(newPos.lat, newPos.lng);
					}
				}
			},
		}),
		[onChange],
	);

	return (
		<div className='h-[400px] w-full rounded-xl overflow-hidden border border-border shadow-md relative z-0 group'>
			<MapContainer
				center={position}
				zoom={15}
				scrollWheelZoom={false}
				className='h-full w-full'>
				<LayersControl position='topright'>
					{/* Lớp bản đồ giao thông tiêu chuẩn */}
					<LayersControl.BaseLayer checked name='Bản đồ giao thông'>
						<TileLayer
							attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
							url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
						/>
					</LayersControl.BaseLayer>

					{/* Lớp bản đồ vệ tinh (Google Hybrid - có cả hình ảnh vệ tinh và tên đường) */}
					<LayersControl.BaseLayer name='Ảnh vệ tinh'>
						<TileLayer
							attribution='&copy; Google Maps'
							url='https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
						/>
					</LayersControl.BaseLayer>
				</LayersControl>

				<Marker
					draggable={true}
					eventHandlers={eventHandlers}
					position={position}
					icon={icon}
					ref={markerRef}
				/>
				<ChangeView center={position} />
			</MapContainer>

			<div className='absolute bottom-4 left-1/2 -translate-x-1/2 z-[400] bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 shadow-xl pointer-events-none'>
				<p className='text-xs font-bold text-white flex items-center gap-2'>
					<span className='w-2 h-2 bg-red-500 rounded-full animate-ping' />
					MẸO: Bật &#34;Ảnh vệ tinh&#34; ở góc phải để nhìn rõ nhà bạn và kéo
					ghim!
				</p>
			</div>
		</div>
	);
}
