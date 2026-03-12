import { useState, useCallback, useEffect, useRef } from 'react';

export interface UserLocation {
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: number;
}

/**
 * Calculates the distance in km between two GPS points using
 * the Haversine formula.
 */
export const haversineDistance = (
    lat1: number, lon1: number,
    lat2: number, lon2: number
): number => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Formats a distance in km to a human-readable string.
 */
export const formatDistance = (distanceKm: number): string => {
    if (distanceKm < 1) {
        return `${Math.round(distanceKm * 1000)} m`;
    }
    if (distanceKm < 10) {
        return `${distanceKm.toFixed(1)} km`;
    }
    return `${Math.round(distanceKm)} km`;
};

export const useUserLocation = () => {
    const [location, setLocation] = useState<UserLocation | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [permissionState, setPermissionState] = useState<PermissionState | null>(null);
    const watchIdRef = useRef<number | null>(null);

    // Check permission state on mount
    useEffect(() => {
        if ('permissions' in navigator) {
            navigator.permissions.query({ name: 'geolocation' }).then((result) => {
                setPermissionState(result.state);
                result.addEventListener('change', () => {
                    setPermissionState(result.state);
                });
            }).catch(() => {
                // Permissions API not fully supported
            });
        }
    }, []);

    const requestLocation = useCallback((): Promise<UserLocation | null> => {
        return new Promise((resolve) => {
            if (!('geolocation' in navigator)) {
                setError('La géolocalisation n\'est pas disponible sur cet appareil');
                resolve(null);
                return;
            }

            setLoading(true);
            setError(null);

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const loc: UserLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: position.timestamp,
                    };
                    setLocation(loc);
                    setLoading(false);
                    setPermissionState('granted');
                    resolve(loc);
                },
                (err) => {
                    setLoading(false);
                    switch (err.code) {
                        case err.PERMISSION_DENIED:
                            setError('Accès à la position refusé. Activez la géolocalisation dans les paramètres.');
                            setPermissionState('denied');
                            break;
                        case err.POSITION_UNAVAILABLE:
                            setError('Position non disponible');
                            break;
                        case err.TIMEOUT:
                            setError('Délai de demande de position dépassé');
                            break;
                        default:
                            setError('Erreur de géolocalisation');
                    }
                    resolve(null);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000, // Cache position for 1 minute
                }
            );
        });
    }, []);

    const startWatching = useCallback(() => {
        if (!('geolocation' in navigator)) return;

        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
        }

        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp,
                });
                setError(null);
            },
            (err) => {
                console.warn('Watch position error:', err.message);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 30000,
            }
        );
    }, []);

    const stopWatching = useCallback(() => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, []);

    return {
        location,
        loading,
        error,
        permissionState,
        requestLocation,
        startWatching,
        stopWatching,
    };
};
