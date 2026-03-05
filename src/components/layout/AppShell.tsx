import React, { ReactNode, useState, useRef, useEffect } from 'react';
import { SMSSettings } from '../sav/SMSSettings';
import { UserManagement } from '../users/UserManagement';
import { PushSettings } from '../users/PushSettings';
import { GlobalSavSearch } from './GlobalSavSearch';
import { useAuth } from '../../hooks/useAuth';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  LogOut,
  User,
  ChevronDown,
  Menu,
  X,
  MessageSquare,
  Users,
  Wrench,
  AlertTriangle,
  Phone,
  Bell,
  BellOff,
  Clock,
  Settings,
  FileWarning,
  Check,
  CheckCheck
} from 'lucide-react';

interface CallNote {
  id: string;
  client_name: string | null;
  client_phone: string | null;
  call_subject: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
}

interface SavNotification {
  id: string;
  client_name: string;
  system_type: string;
  problem_desc: string;
  urgent: boolean;
  created_at: string;
}

interface AppShellProps {
  children: ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSMSSettings, setShowSMSSettings] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showPushSettings, setShowPushSettings] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [callNotesList, setCallNotesList] = useState<CallNote[]>([]);
  const [newSavList, setNewSavList] = useState<SavNotification[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [notifClearedAt, setNotifClearedAt] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notifPanelRef.current && !notifPanelRef.current.contains(event.target as Node)) {
        setShowNotifPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load user's notification preferences (cleared_at timestamp + dismissed IDs)
  useEffect(() => {
    if (!user?.id) return;

    const loadReadState = async () => {
      // Get the notifications_cleared_at from the users table (matched by email)
      const { data: userData } = await supabase
        .from('users')
        .select('notifications_cleared_at')
        .eq('email', user.email)
        .maybeSingle();

      if (userData?.notifications_cleared_at) {
        setNotifClearedAt(userData.notifications_cleared_at);
      }

      // Get individually dismissed notification IDs
      const { data: dismissals } = await supabase
        .from('notification_dismissals')
        .select('notification_type, notification_id')
        .eq('user_id', user.id);

      if (dismissals) {
        setDismissedIds(new Set(dismissals.map(d => `${d.notification_type}:${d.notification_id}`)));
      }
    };

    loadReadState();
  }, [user?.id]);

  // Filter out read notifications
  const visibleSavList = newSavList.filter(sav => {
    if (dismissedIds.has(`sav:${sav.id}`)) return false;
    if (notifClearedAt && new Date(sav.created_at) <= new Date(notifClearedAt)) return false;
    return true;
  });

  const visibleCallNotesList = callNotesList.filter(note => {
    if (dismissedIds.has(`call_note:${note.id}`)) return false;
    if (notifClearedAt && new Date(note.created_at) <= new Date(notifClearedAt)) return false;
    return true;
  });

  const totalNotifCount = visibleSavList.length + visibleCallNotesList.length;

  const fetchNotifLists = async () => {
    setLoadingNotifs(true);
    try {
      const [callNotesResult, savResult] = await Promise.all([
        supabase
          .from('call_notes')
          .select('id, client_name, client_phone, call_subject, priority, created_at')
          .eq('is_completed', false)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('sav_requests')
          .select('id, client_name, system_type, problem_desc, urgent, created_at')
          .eq('status', 'nouvelle')
          .order('created_at', { ascending: false })
          .limit(20)
      ]);
      if (!callNotesResult.error) setCallNotesList(callNotesResult.data || []);
      if (!savResult.error) setNewSavList(savResult.data || []);
    } catch (err) {
      console.error('Error fetching notification lists:', err);
    } finally {
      setLoadingNotifs(false);
    }
  };

  useEffect(() => {
    fetchNotifLists();

    const channel = supabase
      .channel('notifications-badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'call_notes' }, () => {
        fetchNotifLists();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sav_requests' }, () => {
        fetchNotifLists();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleBellClick = () => {
    if (!showNotifPanel) {
      fetchNotifLists();
    }
    setShowNotifPanel(!showNotifPanel);
  };

  const dismissNotification = async (type: 'sav' | 'call_note', notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.id) return;

    const key = `${type}:${notificationId}`;
    // Optimistic update
    setDismissedIds(prev => new Set(prev).add(key));

    try {
      await supabase
        .from('notification_dismissals')
        .upsert({
          user_id: user.id,
          notification_type: type,
          notification_id: notificationId,
          dismissed_at: new Date().toISOString()
        }, { onConflict: 'user_id,notification_type,notification_id' });
    } catch (err) {
      console.error('Error dismissing notification:', err);
      // Revert optimistic update
      setDismissedIds(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;

    const now = new Date().toISOString();
    // Optimistic update
    setNotifClearedAt(now);

    try {
      // Update the user's cleared_at timestamp
      await supabase
        .from('users')
        .update({ notifications_cleared_at: now })
        .eq('email', user.email);

      // Clean up old individual dismissals (they're now redundant)
      await supabase
        .from('notification_dismissals')
        .delete()
        .eq('user_id', user.id);

      setDismissedIds(new Set());
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const getSystemTypeLabel = (type: string) => {
    switch (type) {
      case 'ssi': return 'SSI';
      case 'type4': return 'Type 4';
      case 'intrusion': return 'Intrusion';
      case 'video': return 'Vidéo';
      case 'controle_acces': return 'Ctrl accès';
      case 'interphone': return 'Interphone';
      case 'portail': return 'Portail';
      case 'autre': return 'Autre';
      default: return type;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'normal': return 'bg-blue-100 text-blue-700';
      case 'low': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Urgent';
      case 'high': return 'Haute';
      case 'normal': return 'Normale';
      case 'low': return 'Basse';
      default: return priority;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffMin < 1) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin}min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and title */}
            <div className="flex items-center min-w-0 flex-1">
              <button
                type="button"
                className="h-11 w-11 flex items-center justify-center rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 md:hidden flex-shrink-0"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
              <div className="flex items-center min-w-0">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <img
                    src="/BRUNEAU_PROTECTION_LOGO_QUADRI.png"
                    alt="Bruneau Protection"
                    className="h-8 w-auto"
                  />
                  <span className="text-xl font-bold text-primary-900 hidden sm:block">SAV</span>
                </div>
              </div>
            </div>

            {/* Global Search */}
            <GlobalSavSearch />

            {/* Navigation Tabs */}
            <div className="hidden md:flex items-center space-x-1 mx-2 lg:mx-4 flex-shrink-0">
              <Link
                to="/"
                className={`px-2 lg:px-3 py-2 rounded-lg font-medium transition-colors flex items-center text-xs lg:text-sm whitespace-nowrap ${location.pathname === '/' || location.pathname === '/billing'
                  ? 'bg-primary-100 text-primary-800'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
              >
                <AlertTriangle className="h-3 w-3 lg:h-4 lg:w-4 mr-1" />
                SAV
              </Link>
              <Link
                to="/maintenance"
                className={`px-2 lg:px-3 py-2 rounded-lg font-medium transition-colors flex items-center text-xs lg:text-sm whitespace-nowrap ${location.pathname === '/maintenance'
                  ? 'bg-primary-100 text-primary-800'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
              >
                <Wrench className="h-3 w-3 lg:h-4 lg:w-4 mr-1" />
                Maintenance
              </Link>
              <Link
                to="/callnotes"
                className={`px-2 lg:px-3 py-2 rounded-lg font-medium transition-colors flex items-center text-xs lg:text-sm whitespace-nowrap ${location.pathname === '/callnotes'
                  ? 'bg-primary-100 text-primary-800'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
              >
                <Phone className="h-3 w-3 lg:h-4 lg:w-4 mr-1" />
                Rappels
              </Link>
            </div>

            {/* Right side: bell + user menu */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Bell button with dropdown panel */}
              <div className="relative" ref={notifPanelRef}>
                <button
                  onClick={handleBellClick}
                  className="relative p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Notifications"
                >
                  <Bell className={`h-5 w-5 ${totalNotifCount > 0 ? 'text-primary-700' : 'text-gray-700'}`} />
                  {totalNotifCount > 0 && (
                    <span
                      className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold shadow-sm"
                      style={{ animation: 'badgePulse 2s ease-in-out infinite' }}
                    >
                      {totalNotifCount > 99 ? '99+' : totalNotifCount}
                    </span>
                  )}
                  <style>{`
                    @keyframes badgePulse {
                      0%, 100% { transform: scale(1); }
                      50% { transform: scale(1.1); }
                    }
                    @keyframes notifSlideIn {
                      from { opacity: 0; transform: translateY(-8px) scale(0.98); }
                      to { opacity: 1; transform: translateY(0) scale(1); }
                    }
                  `}</style>
                </button>

                {/* Notification dropdown panel */}
                {showNotifPanel && (
                  <div
                    className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto top-16 sm:top-full sm:mt-2 w-auto sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden"
                    style={{ animation: 'notifSlideIn 0.2s ease-out' }}
                  >
                    {/* Header */}
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-primary-50 to-white">
                      <div className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-primary-700" />
                        <h3 className="text-base font-bold text-gray-900">Notifications</h3>
                        {totalNotifCount > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-red-500 text-white text-xs font-bold">
                            {totalNotifCount}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {totalNotifCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                            title="Tout marquer comme lu"
                          >
                            <CheckCheck className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Tout lu</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setShowPushSettings(true);
                            setShowNotifPanel(false);
                          }}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Paramètres Push"
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setShowNotifPanel(false)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="max-h-[420px] overflow-y-auto overscroll-contain">
                      {loadingNotifs ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                        </div>
                      ) : visibleSavList.length === 0 && visibleCallNotesList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                          <div className="p-4 bg-gray-50 rounded-full mb-4">
                            <BellOff className="h-8 w-8 text-gray-300" />
                          </div>
                          <p className="text-sm font-medium text-gray-500">Aucune notification</p>
                          <p className="text-xs text-gray-400 mt-1">Tout est à jour !</p>
                        </div>
                      ) : (
                        <>
                          {/* New SAV Requests Section */}
                          {visibleSavList.length > 0 && (
                            <div>
                              <div className="px-5 py-2 bg-orange-50 border-b border-orange-100 flex items-center gap-2">
                                <AlertTriangle className="h-3.5 w-3.5 text-orange-600" />
                                <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Nouvelles demandes SAV</span>
                                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold">
                                  {visibleSavList.length}
                                </span>
                              </div>
                              <div className="divide-y divide-gray-50">
                                {visibleSavList.map((sav) => (
                                  <div
                                    key={sav.id}
                                    className="relative group"
                                  >
                                    <button
                                      onClick={() => {
                                        navigate('/');
                                        setShowNotifPanel(false);
                                      }}
                                      className="w-full text-left px-5 py-3.5 hover:bg-orange-50/50 transition-all duration-150 pr-12"
                                    >
                                      <div className="flex gap-3">
                                        <div className="flex-shrink-0 mt-0.5">
                                          <FileWarning className={`h-5 w-5 ${sav.urgent ? 'text-red-500' : 'text-orange-500'}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-start justify-between gap-2">
                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                              {sav.client_name}
                                            </p>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                              {sav.urgent && (
                                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
                                                  Urgent
                                                </span>
                                              )}
                                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
                                                {getSystemTypeLabel(sav.system_type)}
                                              </span>
                                            </div>
                                          </div>
                                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                                            {sav.problem_desc}
                                          </p>
                                          <div className="flex items-center gap-1 mt-1.5">
                                            <Clock className="h-3 w-3 text-gray-400" />
                                            <span className="text-[11px] text-gray-400">
                                              {formatTimeAgo(sav.created_at)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </button>
                                    <button
                                      onClick={(e) => dismissNotification('sav', sav.id, e)}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-300 hover:text-green-600 hover:bg-green-50 opacity-0 group-hover:opacity-100 transition-all duration-150"
                                      title="Marquer comme lu"
                                    >
                                      <Check className="h-4 w-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Call Notes / Reminders Section */}
                          {visibleCallNotesList.length > 0 && (
                            <div>
                              <div className="px-5 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
                                <Phone className="h-3.5 w-3.5 text-blue-600" />
                                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Rappels en attente</span>
                                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-blue-500 text-white text-[10px] font-bold">
                                  {visibleCallNotesList.length}
                                </span>
                              </div>
                              <div className="divide-y divide-gray-50">
                                {visibleCallNotesList.map((note) => (
                                  <div
                                    key={note.id}
                                    className="relative group"
                                  >
                                    <button
                                      onClick={() => {
                                        navigate('/callnotes');
                                        setShowNotifPanel(false);
                                      }}
                                      className="w-full text-left px-5 py-3.5 hover:bg-gray-50 transition-all duration-150 pr-12"
                                    >
                                      <div className="flex gap-3">
                                        <div className="flex-shrink-0 mt-0.5">
                                          <Phone className={`h-5 w-5 ${note.priority === 'urgent' ? 'text-red-500' : note.priority === 'high' ? 'text-orange-500' : 'text-blue-500'}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-start justify-between gap-2">
                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                              {note.client_name || 'Client inconnu'}
                                            </p>
                                            <span className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${getPriorityColor(note.priority)}`}>
                                              {getPriorityLabel(note.priority)}
                                            </span>
                                          </div>
                                          {note.call_subject && (
                                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                                              {note.call_subject}
                                            </p>
                                          )}
                                          <div className="flex items-center gap-1 mt-1.5">
                                            <Clock className="h-3 w-3 text-gray-400" />
                                            <span className="text-[11px] text-gray-400">
                                              {formatTimeAgo(note.created_at)}
                                            </span>
                                            {note.client_phone && (
                                              <span className="ml-auto text-[11px] text-gray-400">
                                                📞 {note.client_phone}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </button>
                                    <button
                                      onClick={(e) => dismissNotification('call_note', note.id, e)}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-300 hover:text-green-600 hover:bg-green-50 opacity-0 group-hover:opacity-100 transition-all duration-150"
                                      title="Marquer comme lu"
                                    >
                                      <Check className="h-4 w-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Footer */}
                    {(visibleSavList.length > 0 || visibleCallNotesList.length > 0) && (
                      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center gap-3">
                        {visibleSavList.length > 0 && (
                          <button
                            onClick={() => {
                              navigate('/');
                              setShowNotifPanel(false);
                            }}
                            className="flex-1 text-center text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors"
                          >
                            Voir les SAV →
                          </button>
                        )}
                        {visibleSavList.length > 0 && visibleCallNotesList.length > 0 && (
                          <div className="w-px h-4 bg-gray-300"></div>
                        )}
                        {visibleCallNotesList.length > 0 && (
                          <button
                            onClick={() => {
                              navigate('/callnotes');
                              setShowNotifPanel(false);
                            }}
                            className="flex-1 text-center text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
                          >
                            Voir les rappels →
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* User menu */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  className="flex items-center gap-2 p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  title="Menu utilisateur"
                >
                  <User className="h-5 w-5 text-gray-700" />
                  <ChevronDown className={`h-4 w-4 text-gray-700 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <p className="text-sm text-gray-900 font-medium truncate">{user?.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowSMSSettings(true);
                        setUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Configuration SMS
                    </button>
                    <button
                      onClick={() => {
                        setShowUserManagement(true);
                        setUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                    >
                      <Users className="h-4 w-4" />
                      Gestion utilisateurs
                    </button>
                    <button
                      onClick={() => {
                        signOut();
                        setUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                    >
                      <LogOut className="h-4 w-4" />
                      Déconnexion
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white relative z-50 overflow-hidden">
            <div className="px-4 py-2 space-y-1">
              <Link
                to="/"
                className={`block px-3 py-3 rounded-md font-medium ${location.pathname === '/' || location.pathname === '/billing'
                  ? 'bg-primary-100 text-primary-800'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <AlertTriangle className="h-4 w-4 inline mr-2" />
                SAV
              </Link>
              <Link
                to="/maintenance"
                className={`block px-3 py-3 rounded-md font-medium ${location.pathname === '/maintenance'
                  ? 'bg-primary-100 text-primary-800'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Wrench className="h-4 w-4 inline mr-2" />
                Maintenance
              </Link>
              <Link
                to="/callnotes"
                className={`block px-3 py-3 rounded-md font-medium ${location.pathname === '/callnotes'
                  ? 'bg-primary-100 text-primary-800'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Phone className="h-4 w-4 inline mr-2" />
                Appels & Rappels
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 overflow-hidden">
        {children}
      </main>

      {/* SMS Settings Modal */}
      {showSMSSettings && (
        <SMSSettings onClose={() => setShowSMSSettings(false)} />
      )}

      {/* Push Settings Modal */}
      {showPushSettings && (
        <PushSettings onClose={() => setShowPushSettings(false)} />
      )}

      {/* User Management Modal */}
      {showUserManagement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Gestion des utilisateurs</h2>
                <button
                  onClick={() => setShowUserManagement(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <UserManagement />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};