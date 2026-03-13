import React, { useState, useEffect, useRef } from 'react';
import { useCalendar } from '../../hooks/useCalendar';
import { format, isSameDay, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Calendar as CalendarIcon, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface User {
  id: string;
  display_name: string | null;
  email: string;
  extrabat_code: string | null;
}

// User colors adapted to SAV app palette
const USER_COLORS = [
  '#6b5aa0', // primary-600
  '#E72C63', // accent-500
  '#0ea5e9', // sky-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
];

const HOUR_START = 7;
const HOUR_END = 19;
const HOUR_HEIGHT = 44;
const TOTAL_HOURS = HOUR_END - HOUR_START;

const DAYS_FR_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function pad2(n: number) { return String(n).padStart(2, '0'); }

interface ParsedAppointment {
  id: number | string;
  _start: Date;
  _end: Date;
  _title: string;
  _clientName: string;
  _objet: string;
  _color: string;
  _userName: string;
  _userCode: string;
  _address: string;
  _phone: string;
}

function parseRawAppointments(
  appointments: any[],
  userCode: string,
  userName: string,
  color: string
): ParsedAppointment[] {
  const result: ParsedAppointment[] = [];
  for (const apt of appointments) {
    if (!apt.debut || !apt.fin) continue;
    try {
      const start = new Date(apt.debut.replace(' ', 'T'));
      const end = new Date(apt.fin.replace(' ', 'T'));
      if (isNaN(start.getTime()) || isNaN(end.getTime())) continue;

      let clientName = '';
      if (apt.clients && apt.clients.length > 0 && apt.clients[0].nom) {
        clientName = apt.clients[0].nom;
      } else if (apt.rdvClients?.[0]?.nom) {
        clientName = apt.rdvClients[0].nom;
      } else if (apt.client_nom) {
        clientName = apt.client_nom;
      }

      const objet = typeof apt.objet === 'string' ? apt.objet : '';
      let address = '';
      if (apt.lieu) {
        address = typeof apt.lieu === 'string' ? apt.lieu :
          [apt.lieu.description, apt.lieu.codePostal, apt.lieu.ville].filter(Boolean).join(', ');
      }

      result.push({
        id: apt.id,
        _start: start,
        _end: end,
        _title: clientName || objet || '(sans titre)',
        _clientName: clientName,
        _objet: objet,
        _color: color,
        _userName: userName,
        _userCode: userCode,
        _address: address,
        _phone: typeof apt.telephone === 'string' ? apt.telephone : '',
      });
    } catch {
      continue;
    }
  }
  return result;
}

interface LayoutItem {
  apt: ParsedAppointment;
  col: number;
  totalCols: number;
}

function layoutAptsForDay(dayApts: ParsedAppointment[]): LayoutItem[] {
  if (dayApts.length === 0) return [];
  const laid: LayoutItem[] = dayApts.map(apt => ({ apt, col: 0, totalCols: 1 }));
  for (let i = 0; i < laid.length; i++) {
    const usedCols = new Set<number>();
    for (let j = 0; j < i; j++) {
      if (laid[j].apt._start < laid[i].apt._end && laid[j].apt._end > laid[i].apt._start) {
        usedCols.add(laid[j].col);
      }
    }
    let col = 0;
    while (usedCols.has(col)) col++;
    laid[i].col = col;
  }
  for (let i = 0; i < laid.length; i++) {
    let maxCol = laid[i].col;
    for (let j = 0; j < laid.length; j++) {
      if (i !== j && laid[j].apt._start < laid[i].apt._end && laid[j].apt._end > laid[i].apt._start) {
        maxCol = Math.max(maxCol, laid[j].col);
      }
    }
    laid[i].totalCols = maxCol + 1;
  }
  return laid;
}

export const Calendar: React.FC = () => {
  const {
    appointments: rawAppointments,
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
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [focusedDayIndex, setFocusedDayIndex] = useState<number | null>(null);
  const [activeAptData, setActiveAptData] = useState<any>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, display_name, email, extrabat_code')
        .not('extrabat_code', 'is', null)
        .order('display_name');

      if (!error) setUsers(data || []);
      setLoadingUsers(false);
    };
    fetchUsers();
  }, []);

  // Build color map for users
  const userColorMap = new Map<string, string>();
  users.forEach((user, i) => {
    if (user.extrabat_code) {
      userColorMap.set(user.extrabat_code, USER_COLORS[i % USER_COLORS.length]);
    }
  });

  // Parse raw appointments into positioned format
  const parsedAppointments: ParsedAppointment[] = React.useMemo(() => {
    const result: ParsedAppointment[] = [];
    // Group by user
    for (const userCode of selectedUserIds) {
      const user = users.find(u => u.extrabat_code === userCode);
      const userName = user?.display_name || user?.email || userCode;
      const color = userColorMap.get(userCode) || USER_COLORS[0];
      const userApts = rawAppointments.filter((apt: any) => {
        // If appointment has users array, check for match
        if (apt.users && apt.users.length > 0) {
          return apt.users.some((u: any) => u.user === userCode);
        }
        // Otherwise include all since they're fetched per user
        return true;
      });
      result.push(...parseRawAppointments(userApts, userCode, userName, color));
    }
    return result;
  }, [rawAppointments, selectedUserIds, users, userColorMap]);

  const weekDays: Date[] = [];
  const currentDate = new Date(currentWeekStart);
  for (let i = 0; i < 5; i++) {
    weekDays.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const getAptsForDay = (day: Date) => {
    return parsedAppointments
      .filter(apt => isSameDay(apt._start, day))
      .sort((a, b) => a._start.getTime() - b._start.getTime());
  };

  const getAptStyle = (apt: ParsedAppointment) => {
    const startHours = apt._start.getHours() + apt._start.getMinutes() / 60;
    const endHours = apt._end.getHours() + apt._end.getMinutes() / 60;
    const top = Math.max(0, (startHours - HOUR_START)) * HOUR_HEIGHT;
    const height = Math.max(HOUR_HEIGHT * 0.4, (endHours - startHours) * HOUR_HEIGHT);
    return { top: `${top}px`, height: `${height}px` };
  };

  const today = new Date();
  const timeLabels = Array.from({ length: TOTAL_HOURS }, (_, i) => HOUR_START + i);

  const toggleFullScreen = async () => {
    if (!document.fullscreenElement) {
      try {
        if (panelRef.current?.requestFullscreen) await panelRef.current.requestFullscreen();
        setIsFullScreen(true);
      } catch {
        setIsFullScreen(true);
      }
    } else {
      try {
        if (document.exitFullscreen) await document.exitFullscreen();
      } catch { /* ignore */ }
      setIsFullScreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 4);

  return (
    <div
      ref={panelRef}
      className={`rounded-xl border border-gray-200 bg-white overflow-hidden transition-all duration-300 ${isFullScreen ? 'fixed inset-0 z-[1000] rounded-none border-none' : ''
        }`}
      style={isFullScreen ? { display: 'flex', flexDirection: 'column' } : {}}
    >
      {/* Header / Toggle */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-primary-900 to-primary-800">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-1 min-w-0"
        >
          <CalendarIcon className="h-4 w-4 text-white/80 shrink-0" />
          <span className="text-sm font-semibold text-white">Agendas</span>
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-white/60 shrink-0" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-white/60 shrink-0" />
          )}
        </button>

        {isExpanded && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={goToPreviousWeek}
              className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
              title="Semaine précédente"
            >
              <ChevronLeft className="h-4 w-4 text-white/80" />
            </button>
            <button
              onClick={goToCurrentWeek}
              className="px-2 py-1 text-xs font-medium text-white bg-accent-500 hover:bg-accent-600 rounded-md transition-colors"
            >
              Auj.
            </button>
            <button
              onClick={goToNextWeek}
              className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
              title="Semaine suivante"
            >
              <ChevronRight className="h-4 w-4 text-white/80" />
            </button>
            <span className="text-xs text-white/60 ml-2 hidden sm:inline whitespace-nowrap">
              {currentWeekStart.getDate()} {MONTHS_FR[currentWeekStart.getMonth()]} — {weekEnd.getDate()} {MONTHS_FR[weekEnd.getMonth()]}
            </span>
            {loading && (
              <RefreshCw className="h-3.5 w-3.5 text-accent-400 animate-spin ml-1" />
            )}
            <button
              onClick={toggleFullScreen}
              className="p-1.5 rounded-md hover:bg-white/10 transition-colors ml-1"
              title="Plein écran"
            >
              {isFullScreen ? (
                <Minimize2 className="h-4 w-4 text-white/80" />
              ) : (
                <Maximize2 className="h-4 w-4 text-white/80" />
              )}
            </button>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className={`flex flex-col ${isFullScreen ? 'flex-1 min-h-0' : ''}`}>
          {/* User checkboxes */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border-b border-gray-100 overflow-x-auto scrollbar-hide">
            {loadingUsers ? (
              <span className="text-xs text-gray-400">Chargement...</span>
            ) : users.length === 0 ? (
              <span className="text-xs text-gray-400">Aucun technicien</span>
            ) : (
              users.map(user => {
                const code = user.extrabat_code || '';
                const color = userColorMap.get(code) || USER_COLORS[0];
                const isSelected = selectedUserIds.includes(code);
                return (
                  <label
                    key={user.id}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md border cursor-pointer transition-all text-xs font-medium whitespace-nowrap select-none ${isSelected
                        ? 'border-primary-300 bg-primary-50 text-primary-800 shadow-sm'
                        : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => user.extrabat_code && toggleUser(user.extrabat_code)}
                      className="hidden"
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: color }}
                    />
                    <span>{user.display_name || user.email}</span>
                  </label>
                );
              })
            )}
          </div>

          {error && (
            <div className="px-3 py-2 bg-red-50 border-b border-red-100">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {selectedUserIds.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <CalendarIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Sélectionnez un ou plusieurs techniciens</p>
            </div>
          ) : (
            /* Timeline Grid */
            <div
              className={`overflow-auto ${isFullScreen ? 'flex-1 min-h-0' : ''}`}
              style={!isFullScreen ? { maxHeight: '480px' } : {}}
            >
              <div
                className="grid"
                style={{
                  gridTemplateColumns: focusedDayIndex !== null
                    ? '44px 1fr'
                    : '44px repeat(5, 1fr)',
                  minWidth: focusedDayIndex !== null ? '0' : '500px',
                }}
              >
                {/* Time gutter header */}
                <div className="sticky left-0 z-[3] bg-white h-9 border-b border-r border-gray-200" />

                {/* Day headers */}
                {weekDays.map((day, di) => {
                  if (focusedDayIndex !== null && focusedDayIndex !== di) return null;
                  const isDayToday = isSameDay(day, today);
                  return (
                    <div
                      key={di}
                      className={`h-9 flex items-center justify-center gap-1 border-b border-gray-200 sticky top-0 z-[2] cursor-pointer transition-colors ${isDayToday
                          ? 'bg-primary-50'
                          : 'bg-gray-50 hover:bg-gray-100'
                        } ${di < weekDays.length - 1 ? 'border-r border-gray-100' : ''}`}
                      onClick={() => setFocusedDayIndex(focusedDayIndex === di ? null : di)}
                    >
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                        {DAYS_FR_SHORT[day.getDay()]}
                      </span>
                      <span
                        className={`text-sm font-bold ${isDayToday
                            ? 'bg-primary-900 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-xs'
                            : 'text-gray-700'
                          }`}
                      >
                        {day.getDate()}
                      </span>
                    </div>
                  );
                })}

                {/* Time gutter body */}
                <div
                  className="sticky left-0 z-[3] bg-white border-r border-gray-200 relative"
                  style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}
                >
                  {timeLabels.map(h => (
                    <div
                      key={h}
                      className="absolute right-1 text-[10px] font-medium text-gray-400 leading-none"
                      style={{ top: `${(h - HOUR_START) * HOUR_HEIGHT}px`, transform: 'translateY(-50%)' }}
                    >
                      {h}:00
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {weekDays.map((day, di) => {
                  if (focusedDayIndex !== null && focusedDayIndex !== di) return null;
                  const isDayToday = isSameDay(day, today);
                  const dayApts = getAptsForDay(day);
                  const laidOut = layoutAptsForDay(dayApts);

                  // Current time indicator
                  let nowTop: number | null = null;
                  if (isDayToday) {
                    const nowH = today.getHours() + today.getMinutes() / 60;
                    if (nowH >= HOUR_START && nowH <= HOUR_END) {
                      nowTop = (nowH - HOUR_START) * HOUR_HEIGHT;
                    }
                  }

                  return (
                    <div
                      key={di}
                      className={`relative overflow-hidden ${di < weekDays.length - 1 ? 'border-r border-gray-100' : ''
                        } ${isDayToday ? 'bg-primary-50/30' : ''}`}
                      style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}
                    >
                      {/* Hour grid lines */}
                      {timeLabels.map(h => (
                        <div
                          key={h}
                          className="absolute left-0 right-0 border-t border-gray-100"
                          style={{ top: `${(h - HOUR_START) * HOUR_HEIGHT}px` }}
                        />
                      ))}

                      {/* Current time red line */}
                      {nowTop !== null && (
                        <div
                          className="absolute left-0 right-0 z-[2]"
                          style={{ top: `${nowTop}px` }}
                        >
                          <div className="absolute -left-1 -top-[3px] w-2 h-2 rounded-full bg-red-500" />
                          <div className="h-[2px] bg-red-500 w-full" />
                        </div>
                      )}

                      {/* Appointments */}
                      {laidOut.map(({ apt, col, totalCols }, ai) => {
                        const style = getAptStyle(apt);
                        const widthPct = 100 / totalCols;
                        const leftPct = col * widthPct;
                        const startStr = `${pad2(apt._start.getHours())}:${pad2(apt._start.getMinutes())}`;
                        const endStr = `${pad2(apt._end.getHours())}:${pad2(apt._end.getMinutes())}`;
                        const aptId = apt.id || `${di}-${ai}`;

                        return (
                          <div
                            key={aptId}
                            className="absolute rounded-[4px] border-l-[3px] px-1 py-0.5 overflow-hidden cursor-pointer transition-all duration-150 hover:brightness-95 hover:shadow-md hover:z-[5] z-[1] group"
                            style={{
                              top: style.top,
                              height: style.height,
                              left: `${leftPct}%`,
                              width: `${widthPct - 2}%`,
                              backgroundColor: `${apt._color}18`,
                              borderLeftColor: apt._color,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveAptData((prev: any) =>
                                prev?.id === aptId
                                  ? null
                                  : {
                                    id: aptId,
                                    clientName: apt._clientName,
                                    objet: apt._objet,
                                    userName: apt._userName,
                                    color: apt._color,
                                    startStr,
                                    endStr,
                                    address: apt._address,
                                    phone: apt._phone,
                                  }
                              );
                            }}
                          >
                            <div className="text-[9px] font-semibold text-gray-500 leading-tight whitespace-nowrap">
                              {startStr}
                            </div>
                            {apt._clientName && (
                              <div
                                className="text-[10px] font-bold leading-tight whitespace-nowrap overflow-hidden text-ellipsis"
                                style={{ color: apt._color }}
                              >
                                {apt._clientName}
                              </div>
                            )}
                            <div className="text-[9px] text-gray-500 leading-tight overflow-hidden line-clamp-2">
                              {apt._objet}
                            </div>
                            {selectedUserIds.length > 1 && (
                              <div
                                className="text-[8px] font-semibold mt-0.5 opacity-70"
                                style={{ color: apt._color }}
                              >
                                {apt._userName}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Appointment Detail Sheet */}
      {activeAptData && (
        <div
          className="fixed inset-0 bg-black/30 z-[100] flex items-end justify-center animate-fadeIn"
          onClick={() => setActiveAptData(null)}
        >
          <div
            className="bg-white border border-gray-200 rounded-t-xl p-4 w-full max-w-md shadow-2xl animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-base font-bold" style={{ color: activeAptData.color }}>
                {activeAptData.startStr} → {activeAptData.endStr}
              </div>
              <button
                onClick={() => setActiveAptData(null)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none p-1"
              >
                ✕
              </button>
            </div>
            {activeAptData.clientName && (
              <div className="text-base font-bold text-gray-900 leading-tight mb-0.5">
                {activeAptData.clientName}
              </div>
            )}
            <div className="text-sm text-gray-500 leading-relaxed mb-2">
              {activeAptData.objet}
            </div>
            {activeAptData.address && (
              <div className="mb-2">
                <a
                  href={`geo:0,0?q=${encodeURIComponent(activeAptData.address)}`}
                  className="text-xs text-primary-700 hover:text-primary-900 flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  📍 {activeAptData.address}
                </a>
              </div>
            )}
            {activeAptData.phone && (
              <div className="mb-2 flex items-center gap-2">
                <a
                  href={`tel:${activeAptData.phone.replace(/[\s.]/g, '')}`}
                  className="text-xs text-primary-700 hover:text-primary-900"
                  onClick={(e) => e.stopPropagation()}
                >
                  📞 {activeAptData.phone}
                </a>
                <a
                  href={`sms:${activeAptData.phone.replace(/[\s.]/g, '')}`}
                  className="text-xs text-accent-500 hover:text-accent-600"
                  onClick={(e) => e.stopPropagation()}
                  title="Envoyer un SMS"
                >
                  💬
                </a>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: activeAptData.color }}>
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: activeAptData.color }}
              />
              {activeAptData.userName}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 100ms ease; }
        .animate-slideUp { animation: slideUp 200ms ease; }
      `}</style>
    </div>
  );
};
