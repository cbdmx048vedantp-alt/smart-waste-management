import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Sparkles, Truck, Layers } from 'lucide-react';
import { Complaint, Crew } from '../types';
import Map, { Marker, NavigationControl, MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapContainerProps {
  complaints: Complaint[];
  crews?: Crew[];
  onSelectComplaint?: (complaint: Complaint) => void;
  selectedComplaintId?: string | null;
  onSelectCoordinates?: (lat: number, lng: number, address: string) => void;
  className?: string;
}

const MAPTILER_KEY = 'UE7iZNNqIhT01qV7bUd2';

export default function MapContainer({
  complaints,
  crews = [],
  onSelectComplaint,
  selectedComplaintId,
  onSelectCoordinates,
  className = "relative w-full h-[520px] rounded-2xl overflow-hidden glass-card shadow-2xl bg-white",
}: MapContainerProps) {
  const mapRef = useRef<MapRef>(null);
  const [selectedPin, setSelectedPin] = useState<Complaint | null>(null);
  const [mapStyle, setMapStyle] = useState('streets-v2');
  const [showStyleMenu, setShowStyleMenu] = useState(false);

  const MAP_STYLES = [
    { id: 'streets-v2', name: 'Streets' },
    { id: 'satellite', name: 'Satellite' },
    { id: 'hybrid', name: 'Hybrid' },
    { id: 'topo-v2', name: 'Topographic' },
    { id: 'basic-v2', name: 'Basic' },
    { id: 'dataviz', name: 'Data Viz' },
    { id: 'winter-v2', name: 'Winter' },
  ];

  // Dynamic flying effect to center the map on a selected pin
  useEffect(() => {
    if (selectedComplaintId && mapRef.current) {
      const selected = complaints.find(c => c.id === selectedComplaintId);
      if (selected) {
        mapRef.current.flyTo({
          center: [selected.lng, selected.lat],
          zoom: 14,
          duration: 1200
        });
      }
    }
  }, [selectedComplaintId, complaints]);

  // Dynamic flying effect to automatically focus on newly raised complaints
  useEffect(() => {
    if (mapRef.current && complaints.length > 0) {
      const latest = complaints[0];
      const isNew = latest.createdAt ? (Date.now() - new Date(latest.createdAt).getTime() < 8000) : false;
      if (isNew) {
        mapRef.current.flyTo({
          center: [latest.lng, latest.lat],
          zoom: 14,
          duration: 1250
        });
      }
    }
  }, [complaints]);

  const getMarkerColor = (complaint: Complaint) => {
    if (complaint.status === 'resolved') return '#10b981'; // emerald-500
    if (complaint.status === 'assigned') return '#0ea5e9'; // sky-500
    return '#f59e0b'; // amber-500
  };

  return (
    <div className={className}>
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: 72.8777,
          latitude: 19.0760,
          zoom: 12
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={`https://api.maptiler.com/maps/${mapStyle}/style.json?key=${MAPTILER_KEY}`}
        onClick={(e) => {
          if (onSelectCoordinates) {
            const lat = e.lngLat.lat;
            const lng = e.lngLat.lng;
            const selectedAddress = `Selected coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            onSelectCoordinates(lat, lng, selectedAddress);
          }
        }}
      >
        {complaints.map((comp) => {
          const isSelected = selectedComplaintId === comp.id || selectedPin?.id === comp.id;
          return (
            <Marker
              key={comp.id}
              longitude={comp.lng}
              latitude={comp.lat}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedPin(comp);
                if (onSelectComplaint) onSelectComplaint(comp);
              }}
            >
              <div className={`relative flex items-center justify-center w-8 h-8 rounded-full border shadow-xl transition-transform cursor-pointer ${isSelected ? 'scale-125 z-20' : 'z-10'}`} style={{ backgroundColor: getMarkerColor(comp), borderColor: '#ffffff', color: '#fff' }}>
                {comp.wasteType.substring(0, 2).toUpperCase()}
              </div>
            </Marker>
          );
        })}

        {crews.map((crew) => {
          let displayLat = crew.lat;
          let displayLng = crew.lng;

          if (crew.status === 'active_cleaning') {
            let assignedComplaint = complaints.find(c => c.id === crew.assignedComplaintId);
            if (!assignedComplaint) {
              assignedComplaint = complaints.find(c => c.assignedTo === crew.name && c.status !== 'resolved');
            }
            if (assignedComplaint) {
              displayLat = assignedComplaint.lat;
              displayLng = assignedComplaint.lng;
            }
          }

          return (
            <Marker
              key={`crew-${crew.name}`}
              longitude={displayLng}
              latitude={displayLat}
              anchor="center"
            >
              <div className={`relative flex items-center justify-center w-8 h-8 rounded-full border shadow-xl ${crew.status === 'active_cleaning' ? 'bg-cyan-600 border-cyan-300' : 'bg-slate-600 border-slate-300'} text-white`}>
                <Truck className="w-4 h-4" />
              </div>
            </Marker>
          );
        })}
        <NavigationControl position="bottom-left" showCompass={false} />
      </Map>

      {/* Map Style Selector */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={() => setShowStyleMenu(!showStyleMenu)}
          className="bg-white/90 backdrop-blur-md p-2 rounded-xl shadow-lg border border-slate-200/80 hover:bg-slate-50 transition-colors text-slate-700 flex items-center justify-center cursor-pointer"
          title="Change Map Style"
        >
          <Layers className="w-5 h-5" />
        </button>
        
        {showStyleMenu && (
          <div className="absolute top-full right-0 mt-2 w-40 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-2 border-b border-slate-100 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Map View
            </div>
            <div className="p-1">
              {MAP_STYLES.map(style => (
                <button
                  key={style.id}
                  onClick={() => {
                    setMapStyle(style.id);
                    setShowStyleMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors cursor-pointer ${mapStyle === style.id ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  {style.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Marker Detail Sidebar Popup Panel */}
      {selectedPin && (
        <div className="absolute bottom-4 right-4 left-4 sm:left-auto sm:w-[380px] max-h-[360px] overflow-y-auto bg-white/95 border border-gray-200/80 rounded-xl p-4 shadow-2xl z-20 backdrop-blur-md animate-in fade-in slide-in-from-bottom-5 duration-300 text-gray-800">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border ${
                  selectedPin.status === 'resolved' 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : selectedPin.status === 'assigned'
                    ? 'bg-sky-50 text-sky-700 border-sky-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {selectedPin.status.toUpperCase()}
                </span>
              </div>
              <h3 className="text-lg font-bold text-emerald-800 mt-1">{selectedPin.wasteType} Garbage</h3>
            </div>
            <button
              onClick={() => setSelectedPin(null)}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="flex gap-3 mb-3 items-center">
            {selectedPin.imageUrl ? (
              <img src={selectedPin.imageUrl} alt="Waste location" className="w-16 h-16 rounded-lg object-cover border border-gray-200 bg-gray-50 flex-shrink-0" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                <MapPin className="w-6 h-6" />
              </div>
            )}
            <div className="text-xs text-gray-600 leading-relaxed">
              <span className="font-semibold text-gray-500">Location:</span> {selectedPin.address}
              <p className="mt-1 font-semibold text-gray-500">Reporter: <span className="font-bold text-emerald-700">{selectedPin.citizenName}</span></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
