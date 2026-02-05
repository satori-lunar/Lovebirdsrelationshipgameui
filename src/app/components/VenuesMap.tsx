import { useEffect, useRef, useState } from 'react';
import type { Place } from '../services/nearbyPlacesService';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { X, MapPin } from 'lucide-react';

interface VenuesMapProps {
  venues: Place[];
  centerLocation: { latitude: number; longitude: number };
  onClose: () => void;
}

// Category colors for markers
const categoryColors: Record<string, string> = {
  restaurant: '#FF6B6B',
  cafe: '#A0522D',
  bar: '#9D4EDD',
  park: '#06D6A0',
  museum: '#FFD60A',
  theater: '#FF006E',
  activity: '#4361EE',
};

export function VenuesMap({ venues, centerLocation, onClose }: VenuesMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load Google Maps script
  useEffect(() => {
    // Check if already loaded
    if (window.google && window.google.maps) {
      setIsLoaded(true);
      return;
    }

    // Check if script is already being loaded
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      // Wait for it to load
      const checkLoaded = setInterval(() => {
        if (window.google && window.google.maps) {
          setIsLoaded(true);
          clearInterval(checkLoaded);
        }
      }, 100);
      return () => clearInterval(checkLoaded);
    }

    // Get API key
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.error('❌ VITE_GOOGLE_MAPS_API_KEY not found in environment variables');
      setError('Google Maps API key not configured');
      return;
    }

    // Load the script with proper parameters
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('✅ Google Maps loaded successfully');
      setIsLoaded(true);
    };
    script.onerror = () => {
      console.error('❌ Failed to load Google Maps script');
      setError('Failed to load Google Maps');
    };
    document.head.appendChild(script);

    return () => {
      // Don't remove script on unmount - keep it loaded for reuse
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || map) return;

    try {
      const newMap = new google.maps.Map(mapRef.current, {
        center: { lat: centerLocation.latitude, lng: centerLocation.longitude },
        zoom: 12,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
        ],
      });

      setMap(newMap);
    } catch (err) {
      console.error('Error initializing map:', err);
      setError('Failed to initialize map');
    }
  }, [isLoaded, centerLocation, map]);

  // Add markers
  useEffect(() => {
    if (!map || !venues || venues.length === 0) return;

    const markers: google.maps.Marker[] = [];
    const infoWindows: google.maps.InfoWindow[] = [];

    // Add center marker (user location)
    const centerMarker = new google.maps.Marker({
      position: { lat: centerLocation.latitude, lng: centerLocation.longitude },
      map: map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#4F46E5',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 3,
      },
      title: 'Your Location',
      zIndex: 1000,
    });

    const centerInfo = new google.maps.InfoWindow({
      content: '<div style="padding: 8px;"><strong>Your Location</strong></div>',
    });

    centerMarker.addListener('click', () => {
      infoWindows.forEach(iw => iw.close());
      centerInfo.open(map, centerMarker);
    });

    // Add venue markers
    venues.forEach((venue) => {
      const marker = new google.maps.Marker({
        position: { lat: venue.latitude, lng: venue.longitude },
        map: map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: categoryColors[venue.category] || '#888888',
          fillOpacity: 0.9,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
        title: venue.name,
      });

      const ratingStr = venue.rating !== undefined && venue.rating !== null
        ? `⭐ ${venue.rating.toFixed(1)} rating`
        : '⭐ No rating';
      const distanceStr = venue.distance !== undefined && venue.distance !== null
        ? `📍 ${venue.distance.toFixed(1)} miles away`
        : '📍 Distance unknown';

      const content = `
        <div style="padding: 12px; max-width: 250px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">${venue.name || 'Unknown Venue'}</h3>
          <div style="display: flex; flex-direction: column; gap: 4px; font-size: 14px; color: #666;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="width: 12px; height: 12px; border-radius: 50%; background: ${categoryColors[venue.category] || '#888'}; display: inline-block;"></span>
              <span>${venue.category || 'unknown'}</span>
            </div>
            <div>${ratingStr}</div>
            <div>${distanceStr}</div>
            ${venue.address ? `<div style="font-size: 12px; color: #999; margin-top: 4px;">${venue.address}</div>` : ''}
          </div>
        </div>
      `;

      const infoWindow = new google.maps.InfoWindow({
        content: content,
      });

      marker.addListener('click', () => {
        infoWindows.forEach(iw => iw.close());
        centerInfo.close();
        infoWindow.open(map, marker);
      });

      markers.push(marker);
      infoWindows.push(infoWindow);
    });

    // Fit bounds to show all markers
    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: centerLocation.latitude, lng: centerLocation.longitude });
    venues.forEach(venue => {
      bounds.extend({ lat: venue.latitude, lng: venue.longitude });
    });
    map.fitBounds(bounds);

    // Cleanup
    return () => {
      markers.forEach(marker => marker.setMap(null));
      centerMarker.setMap(null);
    };
  }, [map, venues, centerLocation]);

  if (error) {
    return (
      <Card className="p-8 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={onClose}>Close</Button>
      </Card>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl h-[80vh] flex flex-col relative">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-bold">Venues Map</h2>
            <p className="text-sm text-gray-600">Showing {venues.length} venues within 10 miles</p>
          </div>
          <Button onClick={onClose} variant="outline" size="sm">
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 p-4 border-b bg-gray-50">
          {Object.entries(categoryColors).map(([category, color]) => {
            const count = venues.filter(v => v.category === category).length;
            if (count === 0) return null;
            return (
              <div key={category} className="flex items-center gap-2 text-sm">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="capitalize">{category}</span>
                <span className="text-gray-500">({count})</span>
              </div>
            );
          })}
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-3 h-3 text-indigo-600" />
            <span>Your Location</span>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <p className="text-gray-600">Loading map...</p>
            </div>
          )}
          <div ref={mapRef} className="w-full h-full" />
        </div>

        {/* Stats */}
        <div className="p-4 border-t bg-gray-50 grid grid-cols-4 gap-4 text-center text-sm">
          <div>
            <div className="font-bold text-lg">{venues.filter(v => v.distance <= 0.5).length}</div>
            <div className="text-gray-600">Within 0.5 mi</div>
          </div>
          <div>
            <div className="font-bold text-lg">{venues.filter(v => v.distance <= 1).length}</div>
            <div className="text-gray-600">Within 1 mi</div>
          </div>
          <div>
            <div className="font-bold text-lg">{venues.filter(v => v.distance <= 3).length}</div>
            <div className="text-gray-600">Within 3 mi</div>
          </div>
          <div>
            <div className="font-bold text-lg">{venues.length}</div>
            <div className="text-gray-600">Total venues</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
