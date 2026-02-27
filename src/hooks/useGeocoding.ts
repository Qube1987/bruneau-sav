import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface GeocodedLocation {
  lat: number;
  lng: number;
  displayName: string;
}

interface GeocodeCache {
  [address: string]: GeocodedLocation | null;
}

const memoryCache: GeocodeCache = {};

const cleanAddress = (address: string): string => {
  return address
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const useGeocoding = () => {
  const [loading, setLoading] = useState(false);

  const geocodeAddress = useCallback(async (address: string): Promise<GeocodedLocation | null> => {
    if (!address || address.trim() === '') {
      return null;
    }

    const originalAddress = address;
    const cleanedAddress = cleanAddress(address);

    if (memoryCache[originalAddress] !== undefined) {
      return memoryCache[originalAddress];
    }

    try {
      setLoading(true);

      const { data: cachedData, error: cacheError } = await supabase
        .from('geocode_cache')
        .select('latitude, longitude, display_name')
        .eq('address', originalAddress)
        .maybeSingle();

      if (!cacheError && cachedData) {
        if (cachedData.latitude === null || cachedData.longitude === null) {
          memoryCache[originalAddress] = null;
          return null;
        }
        const result: GeocodedLocation = {
          lat: cachedData.latitude,
          lng: cachedData.longitude,
          displayName: cachedData.display_name || originalAddress,
        };
        memoryCache[originalAddress] = result;
        return result;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanedAddress)}&limit=1`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Geocoding failed');
      }

      const data = await response.json();

      if (data && data.length > 0) {
        const result: GeocodedLocation = {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          displayName: data[0].display_name,
        };

        await supabase
          .from('geocode_cache')
          .upsert({
            address: originalAddress,
            latitude: result.lat,
            longitude: result.lng,
            display_name: result.displayName,
            updated_at: new Date().toISOString(),
          });

        memoryCache[originalAddress] = result;
        return result;
      }

      await supabase
        .from('geocode_cache')
        .upsert({
          address: originalAddress,
          latitude: null,
          longitude: null,
          display_name: null,
          updated_at: new Date().toISOString(),
        });

      memoryCache[originalAddress] = null;
      return null;
    } catch (error) {
      console.error('Geocoding error for address:', originalAddress, error);
      memoryCache[originalAddress] = null;
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const geocodeMultipleAddresses = useCallback(
    async (addresses: string[]): Promise<Map<string, GeocodedLocation | null>> => {
      const results = new Map<string, GeocodedLocation | null>();
      const uniqueAddresses = [...new Set(addresses.filter(addr => addr && addr.trim() !== ''))];

      try {
        const { data: cachedData } = await supabase
          .from('geocode_cache')
          .select('address, latitude, longitude, display_name')
          .in('address', uniqueAddresses);

        const cachedMap = new Map<string, GeocodedLocation>();
        if (cachedData) {
          cachedData.forEach(item => {
            const result: GeocodedLocation = {
              lat: item.latitude,
              lng: item.longitude,
              displayName: item.display_name || item.address,
            };
            cachedMap.set(item.address, result);
            memoryCache[item.address] = result;
            results.set(item.address, result);
          });
        }

        const uncachedAddresses = uniqueAddresses.filter(addr => !cachedMap.has(addr));

        for (const address of uncachedAddresses) {
          const result = await geocodeAddress(address);
          results.set(address, result);
        }
      } catch (error) {
        console.error('Error in geocodeMultipleAddresses:', error);
        for (const address of uniqueAddresses) {
          if (!results.has(address)) {
            const result = await geocodeAddress(address);
            results.set(address, result);
          }
        }
      }

      return results;
    },
    [geocodeAddress]
  );

  return {
    geocodeAddress,
    geocodeMultipleAddresses,
    loading,
  };
};
