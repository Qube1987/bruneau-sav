import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon, LatLngBounds } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useGeocoding } from '../../hooks/useGeocoding';
import { Loader, AlertCircle, MapPin as MapPinIcon } from 'lucide-react';

interface MapLocation {
  id: string;
  clientName: string;
  address: string;
  status: string;
  type: 'sav' | 'maintenance';
  systemType?: string;
  urgent?: boolean;
  priority?: boolean;
  problemDesc?: string;
  estimatedDuration?: number;
  latitude?: number;
  longitude?: number;
}

interface MapViewProps {
  locations: MapLocation[];
  height?: string;
  onLocationClick?: (locationId: string) => void;
}

const customIcon = (type: 'sav' | 'maintenance', status: string) => {
  let color = '#6B7280';

  if (type === 'sav') {
    switch (status) {
      case 'nouvelle':
        color = '#3B82F6';
        break;
      case 'en_cours':
        color = '#F59E0B';
        break;
      case 'terminee':
        color = '#10B981';
        break;
      default:
        color = '#6B7280';
    }
  } else {
    switch (status) {
      case 'a_realiser':
        color = '#EF4444';
        break;
      case 'prevue':
        color = '#F97316';
        break;
      case 'realisee':
        color = '#10B981';
        break;
      default:
        color = '#6B7280';
    }
  }

  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
        <path fill="${color}" stroke="white" stroke-width="2" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    `)}`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const FitBounds: React.FC<{ bounds: LatLngBounds | null }> = ({ bounds }) => {
  const map = useMap();

  useEffect(() => {
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);

  return null;
};

export const MapView: React.FC<MapViewProps> = ({ locations, height = '600px', onLocationClick }) => {
  const { geocodeMultipleAddresses } = useGeocoding();
  const [geocodedLocations, setGeocodedLocations] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missingGeocodesCount, setMissingGeocodesCount] = useState(0);

  useEffect(() => {
    const fetchGeocodedLocations = async () => {
      try {
        setLoading(true);
        setError(null);

        // Separate locations that already have coordinates from those that need geocoding
        const locationsWithCoords = locations.filter(loc => loc.latitude && loc.longitude);
        const locationsNeedingGeocode = locations.filter(loc => (!loc.latitude || !loc.longitude) && loc.address && loc.address.trim() !== '');

        console.log('MapView: Total locations:', locations.length);
        console.log('MapView: With coordinates:', locationsWithCoords.length);
        console.log('MapView: Needing geocode:', locationsNeedingGeocode.length);

        // Create results map with stored coordinates
        const results = new Map<string, any>();
        locationsWithCoords.forEach(loc => {
          results.set(loc.address, {
            lat: loc.latitude,
            lng: loc.longitude,
            displayName: loc.address
          });
        });

        // Only geocode addresses that don't have coordinates
        // Limit to avoid performance issues
        if (locationsNeedingGeocode.length > 0 && locationsNeedingGeocode.length <= 10) {
          const addresses = locationsNeedingGeocode.map(loc => loc.address);
          const geocoded = await geocodeMultipleAddresses(addresses);
          geocoded.forEach((value, key) => {
            results.set(key, value);
          });
          setMissingGeocodesCount(0);
        } else if (locationsNeedingGeocode.length > 10) {
          console.warn(`${locationsNeedingGeocode.length} addresses need geocoding.`);
          setMissingGeocodesCount(locationsNeedingGeocode.length);
        } else {
          // No addresses need geocoding
          setMissingGeocodesCount(0);
        }

        setGeocodedLocations(results);
        setLoading(false);
      } catch (err) {
        console.error('Error geocoding addresses:', err);
        setError('Erreur lors du géocodage des adresses');
        setLoading(false);
      }
    };

    if (locations.length === 0) {
      setError('Aucune adresse à géocoder');
      setLoading(false);
      setMissingGeocodesCount(0);
      return;
    }

    fetchGeocodedLocations();
  }, [locations, geocodeMultipleAddresses]);

  const validLocations = locations.filter(loc => {
    // Check if location has stored coordinates
    if (loc.latitude && loc.longitude) {
      return true;
    }
    // Otherwise check geocoded results
    const geocoded = geocodedLocations.get(loc.address);
    return geocoded && geocoded.lat && geocoded.lng;
  });

  const bounds = validLocations.length > 0
    ? new LatLngBounds(
        validLocations.map(loc => {
          // Use stored coordinates if available
          if (loc.latitude && loc.longitude) {
            return [loc.latitude, loc.longitude];
          }
          // Otherwise use geocoded coordinates
          const geocoded = geocodedLocations.get(loc.address);
          return [geocoded.lat, geocoded.lng];
        })
      )
    : null;

  const defaultCenter: [number, number] = [46.603354, 1.888334];

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8" style={{ height }}>
        <div className="flex flex-col items-center justify-center h-full">
          <Loader className="h-8 w-8 animate-spin text-primary-600 mb-4" />
          <p className="text-gray-600">Géocodage des adresses en cours...</p>
          <p className="text-sm text-gray-500 mt-2">Cela peut prendre quelques instants</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8" style={{ height }}>
        <div className="flex flex-col items-center justify-center h-full">
          <AlertCircle className="h-8 w-8 text-red-500 mb-4" />
          <p className="text-gray-700 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (validLocations.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8" style={{ height }}>
        <div className="flex flex-col items-center justify-center h-full">
          <MapPinIcon className="h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600 font-medium mb-2">Aucune localisation disponible</p>
          <p className="text-sm text-gray-500 text-center">
            Les adresses n'ont pas pu être géocodées ou sont invalides.
          </p>
          {missingGeocodesCount > 0 && (
            <div className="mt-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800 font-medium text-center">
                {missingGeocodesCount} adresse{missingGeocodesCount > 1 ? 's' : ''} nécessite{missingGeocodesCount > 1 ? 'nt' : ''} un géocodage.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" style={{ height }}>
      {missingGeocodesCount > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
          <div className="flex items-center justify-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <p className="text-sm text-amber-800">
              <span className="font-medium">{missingGeocodesCount}</span> adresse{missingGeocodesCount > 1 ? 's' : ''} non géocodée{missingGeocodesCount > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}
      <MapContainer
        center={defaultCenter}
        zoom={6}
        style={{ height: missingGeocodesCount > 0 ? 'calc(100% - 44px)' : '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {bounds && <FitBounds bounds={bounds} />}
        {validLocations.map(location => {
          // Use stored coordinates if available, otherwise use geocoded
          const lat = location.latitude || geocodedLocations.get(location.address)?.lat;
          const lng = location.longitude || geocodedLocations.get(location.address)?.lng;

          if (!lat || !lng) return null;

          return (
            <Marker
              key={location.id}
              position={[lat, lng]}
              icon={customIcon(location.type, location.status)}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  {onLocationClick ? (
                    <button
                      onClick={() => onLocationClick(location.id)}
                      className="font-semibold text-blue-600 hover:text-blue-800 mb-2 cursor-pointer underline text-left"
                    >
                      {location.clientName}
                    </button>
                  ) : (
                    <h3 className="font-semibold text-gray-900 mb-2">{location.clientName}</h3>
                  )}
                  <div className="space-y-1 text-sm">
                    {location.problemDesc && (
                      <p className="text-gray-600">
                        <span className="font-medium">Problème:</span> {location.problemDesc}
                      </p>
                    )}
                    {location.systemType && (
                      <p className="text-gray-600">
                        <span className="font-medium">Système:</span> {location.systemType}
                      </p>
                    )}
                    <p className="text-gray-600">
                      <span className="font-medium">Statut:</span>{' '}
                      {location.status === 'nouvelle' && 'Nouvelle'}
                      {location.status === 'en_cours' && 'En cours'}
                      {location.status === 'terminee' && 'Terminée'}
                      {location.status === 'a_realiser' && 'À réaliser'}
                      {location.status === 'prevue' && 'Prévue'}
                      {location.status === 'realisee' && 'Réalisée'}
                    </p>
                    {(location.urgent || location.priority) && (
                      <p className="text-red-600 font-medium">⚠ Prioritaire</p>
                    )}
                    <p className="text-gray-500 text-xs mt-2 break-words">{location.address}</p>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
