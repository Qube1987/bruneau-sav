import React, { useState, useEffect } from 'react';
import { useCalendar } from '../../hooks/useCalendar';
import { format, isSameDay, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Calendar as CalendarIcon, RefreshCw, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface User {
  id: string;
  display_name: string | null;
  email: string;
  extrabat_code: string | null;
}

export const Calendar: React.FC = () => {
  const {
    appointments,
    loading,
    error,
    currentWeekStart,
    currentWeekEnd,
    selectedUserIds,
    toggleUser,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    refresh
  } = useCalendar();

  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    console.log('Total appointments received:', appointments.length);
    console.log('Appointments data:', appointments);
  }, [appointments]);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, display_name, email, extrabat_code')
        .not('extrabat_code', 'is', null)
        .order('display_name');

      if (error) {
        console.error('Error fetching users:', error);
      } else {
        console.log('Fetched users with Extrabat codes:', data);
        setUsers(data || []);
      }
      setLoadingUsers(false);
    };

    fetchUsers();
  }, []);

  const weekDays = [];
  const currentDate = new Date(currentWeekStart);
  for (let i = 0; i < 5; i++) {
    weekDays.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const getAppointmentsForDay = (day: Date) => {
    const filtered = appointments.filter(apt => {
      try {
        const aptDate = parseISO(apt.debut);
        const matches = isSameDay(aptDate, day);
        if (matches) {
          console.log(`Appointment for ${format(day, 'yyyy-MM-dd')}:`, apt);
        }
        return matches;
      } catch (error) {
        console.error('Error parsing appointment date:', apt.debut, error);
        return false;
      }
    });
    return filtered.sort((a, b) => {
      return parseISO(a.debut).getTime() - parseISO(b.debut).getTime();
    });
  };

  const formatTime = (dateString: string) => {
    const date = parseISO(dateString);
    return format(date, 'HH:mm');
  };

  const timeSlots = Array.from({ length: 12 }, (_, i) => i + 7);

  const getAppointmentForTimeSlot = (day: Date, hour: number) => {
    const dayAppointments = getAppointmentsForDay(day);
    return dayAppointments.filter(apt => {
      const startHour = parseISO(apt.debut).getHours();
      const endHour = parseISO(apt.fin).getHours();
      const endMinutes = parseISO(apt.fin).getMinutes();
      const actualEndHour = endMinutes > 0 ? endHour + 1 : endHour;
      return startHour <= hour && hour < actualEndHour;
    });
  };

  const getAppointmentStartHour = (apt: any) => {
    return parseISO(apt.debut).getHours();
  };

  const getAppointmentDuration = (apt: any) => {
    const start = parseISO(apt.debut);
    const end = parseISO(apt.fin);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return Math.max(1, Math.ceil(diffHours));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-3 hover:opacity-70 transition-opacity"
          >
            <CalendarIcon className="h-6 w-6 text-primary-600" />
            <h2 className="text-xl font-bold text-gray-900">Agendas</h2>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-600" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-600" />
            )}
          </button>

          {isExpanded && (
            <div className="flex items-center space-x-2">
              <button
                onClick={goToPreviousWeek}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Semaine précédente"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>

              <button
                onClick={goToCurrentWeek}
                className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Aujourd'hui
              </button>

              <button
                onClick={goToNextWeek}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Semaine suivante"
              >
                <ChevronRight className="h-5 w-5 text-gray-600" />
              </button>

              <button
                onClick={refresh}
                disabled={loading}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                title="Actualiser"
              >
                <RefreshCw className={`h-5 w-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}
        </div>

        {isExpanded && (
          <>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span className="font-medium">
                {format(currentWeekStart, 'd MMMM', { locale: fr })} - {format(currentWeekEnd, 'd MMMM yyyy', { locale: fr })}
              </span>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-700">Techniciens:</span>
              {loadingUsers ? (
                <span className="text-sm text-gray-500">Chargement...</span>
              ) : users.length === 0 ? (
                <span className="text-sm text-gray-500">Aucun technicien avec code Extrabat</span>
              ) : (
                users.map(user => (
                  <label
                    key={user.id}
                    className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user.extrabat_code || '')}
                      onChange={() => {
                        console.log(`Toggling user: ${user.display_name} (${user.extrabat_code})`);
                        user.extrabat_code && toggleUser(user.extrabat_code);
                      }}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {user.display_name || user.email} ({user.extrabat_code})
                    </span>
                  </label>
                ))
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {selectedUserIds.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Sélectionnez un ou plusieurs techniciens pour afficher leurs agendas</p>
              </div>
            ) : loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 mx-auto mb-2 text-primary-600 animate-spin" />
                <p className="text-gray-600">Chargement des rendez-vous...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                  <div className="grid gap-2" style={{ gridTemplateColumns: '60px repeat(5, minmax(140px, 1fr))' }}>
                    <div className="sticky left-0 bg-white z-10"></div>
                    {weekDays.map((day, index) => {
                      const isToday = isSameDay(day, new Date());
                      return (
                        <div
                          key={index}
                          className={`text-center p-2 rounded-lg border ${
                            isToday ? 'bg-primary-50 border-primary-300' : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="text-xs font-medium text-gray-600 uppercase">
                            {format(day, 'EEE', { locale: fr })}
                          </div>
                          <div className={`text-lg font-bold ${isToday ? 'text-primary-600' : 'text-gray-900'}`}>
                            {format(day, 'd MMM', { locale: fr })}
                          </div>
                        </div>
                      );
                    })}

                    {timeSlots.map((hour) => (
                      <React.Fragment key={hour}>
                        <div className="sticky left-0 bg-white z-10 flex items-center justify-end pr-2 text-xs font-medium text-gray-600 border-t border-gray-100">
                          {hour}:00
                        </div>
                        {weekDays.map((day, dayIndex) => {
                          const dayAppointments = getAppointmentsForDay(day);
                          const slotAppointments = getAppointmentForTimeSlot(day, hour);
                          const isToday = isSameDay(day, new Date());

                          const appointmentStartingHere = dayAppointments.find(apt => getAppointmentStartHour(apt) === hour);

                          // Determine cell background color
                          let cellStyle: React.CSSProperties = {};
                          let cellClassName = 'min-h-[60px] border-t border-gray-200 relative';

                          if (slotAppointments.length > 0) {
                            // Créneau occupé - coloriser avec la couleur de l'événement
                            const appointmentColor = slotAppointments[0].couleur || '3B82F6'; // Bleu par défaut si pas de couleur

                            // Convert hex color to rgba with opacity
                            const hexColor = appointmentColor.startsWith('#') ? appointmentColor.slice(1) : appointmentColor;
                            const r = parseInt(hexColor.substring(0, 2), 16);
                            const g = parseInt(hexColor.substring(2, 4), 16);
                            const b = parseInt(hexColor.substring(4, 6), 16);

                            cellStyle.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.25)`;
                            cellClassName += ' transition-colors';
                          } else {
                            // Créneau libre
                            cellClassName += isToday ? ' bg-primary-50/30' : ' bg-white hover:bg-gray-50';
                          }

                          return (
                            <div
                              key={`${dayIndex}-${hour}`}
                              className={cellClassName}
                              style={cellStyle}
                            >
                              {appointmentStartingHere && (
                                <div
                                  className="absolute inset-x-0 top-0 p-2 rounded text-xs border-l-4 shadow-sm m-0.5"
                                  style={{
                                    borderLeftColor: `#${appointmentStartingHere.couleur}`,
                                    backgroundColor: `#${appointmentStartingHere.couleur}50`,
                                    height: `calc(${getAppointmentDuration(appointmentStartingHere) * 60}px - 4px)`,
                                    zIndex: 1
                                  }}
                                >
                                  <div className="flex items-start space-x-1 mb-1">
                                    <Clock className="h-3 w-3 text-gray-600 mt-0.5 flex-shrink-0" />
                                    <span className="font-semibold text-gray-700 text-[10px]">
                                      {formatTime(appointmentStartingHere.debut)} - {formatTime(appointmentStartingHere.fin)}
                                    </span>
                                  </div>
                                  <p className="text-gray-900 font-semibold line-clamp-2 text-xs leading-tight">
                                    {appointmentStartingHere.objet}
                                  </p>
                                  {appointmentStartingHere.clients && appointmentStartingHere.clients.length > 0 && (
                                    <p className="text-gray-700 text-[10px] mt-1 line-clamp-1">
                                      {appointmentStartingHere.clients[0].nom}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
