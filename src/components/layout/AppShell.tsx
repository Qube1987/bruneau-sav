import React, { ReactNode, useState } from 'react';
import { SMSSettings } from '../sav/SMSSettings';
import { UserManagement } from '../users/UserManagement';
import { useAuth } from '../../hooks/useAuth';
import { useLocation, Link } from 'react-router-dom';
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
  Phone
} from 'lucide-react';

interface AppShellProps {
  children: ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSMSSettings, setShowSMSSettings] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);

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
                <div className="flex-shrink-0">
                  <img src="/sav-android-chrome-512x512_(1).png" alt="SAV Icon" className="h-8 w-8 mr-2 sm:mr-3 rounded-lg" />
                </div>
                <h1 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 truncate">Gestion SAV</h1>
              </div>
            </div>

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

            {/* User menu */}
            <div className="relative flex-shrink-0 min-w-0 mr-4">
              <button
                type="button"
                className="flex items-center text-sm rounded-lg h-11 px-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors min-w-0"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="h-7 w-7 sm:h-8 sm:w-8 bg-primary-100 rounded-full flex items-center justify-center mr-1 sm:mr-2 flex-shrink-0">
                  <User className="h-4 w-4 text-primary-600" />
                </div>
                <ChevronDown className="ml-1 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 sm:w-56 bg-white rounded-md shadow-lg py-1 z-50 overflow-hidden">
                  <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                    <div className="font-medium truncate text-xs sm:text-sm">{user?.email}</div>
                  </div>
                  <button
                    onClick={() => {
                      setShowSMSSettings(true);
                      setUserMenuOpen(false);
                    }}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    <MessageSquare className="mr-3 h-4 w-4" />
                    Configuration SMS
                  </button>
                  <button
                    onClick={() => {
                      setShowUserManagement(true);
                      setUserMenuOpen(false);
                    }}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    <Users className="mr-3 h-4 w-4" />
                    Gestion utilisateurs
                  </button>
                  <button
                    onClick={() => {
                      signOut();
                      setUserMenuOpen(false);
                    }}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    Déconnexion
                  </button>
                </div>
              )}
            </div>

            {/* Logo */}
            <div className="hidden lg:flex items-center flex-shrink-0">
              <img
                src="/BRUNEAU_PROTECTION_LOGO_QUADRI.png"
                alt="Bruneau Protection"
                className="h-10"
              />
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