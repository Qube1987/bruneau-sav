import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { startOfWeek, endOfWeek, addWeeks, format } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface Appointment {
  id: number;
  journee: boolean;
  objet: string;
  debut: string;
  fin: string;
  couleur: string;
  users?: Array<{
    user: string;
  }>;
  clients?: Array<{
    id: number;
    nom: string;
  }>;
}

interface CalendarData {
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
  currentWeekStart: Date;
  currentWeekEnd: Date;
}

export const useCalendar = () => {
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [data, setData] = useState<CalendarData>({
    appointments: [],
    loading: false,
    error: null,
    currentWeekStart: startOfWeek(new Date(), { weekStartsOn: 1 }),
    currentWeekEnd: endOfWeek(new Date(), { weekStartsOn: 1 })
  });

  const fetchAppointments = async (userIds: string[], weekOffset: number) => {
    if (userIds.length === 0) {
      setData(prev => ({
        ...prev,
        appointments: [],
        loading: false,
        error: null
      }));
      return;
    }

    setData(prev => ({ ...prev, loading: true, error: null }));

    try {
      const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });

      setData(prev => ({
        ...prev,
        currentWeekStart: weekStart,
        currentWeekEnd: weekEnd
      }));

      const allAppointments: Appointment[] = [];

      for (const userId of userIds) {
        console.log(`Fetching appointments for user ${userId} from ${format(weekStart, 'yyyy-MM-dd')} to ${format(weekEnd, 'yyyy-MM-dd')}`);

        const { data: response, error } = await supabase.functions.invoke('extrabat-proxy', {
          body: {
            endpoint: `utilisateur/${userId}/rendez-vous`,
            apiVersion: 'v1',
            params: {
              date_debut: format(weekStart, 'yyyy-MM-dd'),
              date_fin: format(weekEnd, 'yyyy-MM-dd'),
              include: 'client'
            }
          }
        });

        if (error) {
          console.error(`Error fetching appointments for user ${userId}:`, error);
          throw error;
        }

        if (!response.success) {
          console.error(`Extrabat API error for user ${userId}:`, response.error);
          throw new Error(response.error);
        }

        console.log(`Response for user ${userId}:`, response.data);

        if (response.data) {
          const appointmentsArray = Array.isArray(response.data)
            ? response.data
            : Object.values(response.data);

          if (appointmentsArray.length > 0) {
            console.log(`Adding ${appointmentsArray.length} appointments for user ${userId}`);
            allAppointments.push(...appointmentsArray);
          } else {
            console.log(`No appointments for user ${userId}`);
          }
        } else {
          console.log(`No data received for user ${userId}`);
        }
      }

      allAppointments.sort((a, b) => {
        const dateA = new Date(a.debut);
        const dateB = new Date(b.debut);
        return dateA.getTime() - dateB.getTime();
      });

      console.log('All appointments after sorting:', allAppointments);
      console.log('Total appointments:', allAppointments.length);

      setData(prev => ({
        ...prev,
        appointments: allAppointments,
        loading: false
      }));
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
      setData(prev => ({
        ...prev,
        appointments: [],
        loading: false,
        error: error instanceof Error ? error.message : 'Erreur lors de la récupération des rendez-vous'
      }));
    }
  };

  useEffect(() => {
    fetchAppointments(selectedUserIds, currentWeekOffset);
  }, [selectedUserIds, currentWeekOffset]);

  const goToPreviousWeek = () => {
    setCurrentWeekOffset(prev => prev - 1);
  };

  const goToNextWeek = () => {
    setCurrentWeekOffset(prev => prev + 1);
  };

  const goToCurrentWeek = () => {
    setCurrentWeekOffset(0);
  };

  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const refresh = () => {
    fetchAppointments(selectedUserIds, currentWeekOffset);
  };

  return {
    ...data,
    selectedUserIds,
    toggleUser,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    refresh
  };
};
