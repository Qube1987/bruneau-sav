import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.tsx';
import { LoginForm } from './components/auth/LoginForm';
import { AppShell } from './components/layout/AppShell';
import { SavList } from './components/sav/SavList';
import { BillingList } from './components/sav/BillingList';
import { MaintenanceList } from './components/maintenance/MaintenanceList';
import { CallNotes } from './components/callnotes/CallNotes';
import { Loader } from 'lucide-react';

// Error fallback component
const ErrorFallback: React.FC<{ error: Error }> = ({ error }) => {
  return (
    <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-red-800 mb-4">Something went wrong</h2>
        <p className="text-red-600 mb-4">The application encountered an error:</p>
        <details className="bg-red-100 p-3 rounded text-sm">
          <summary className="cursor-pointer font-medium">Error details</summary>
          <pre className="mt-2 whitespace-pre-wrap">{error.message}</pre>
        </details>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Reload page
        </button>
      </div>
    </div>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  // Check if environment variables are set
  React.useEffect(() => {
    console.log('App environment check:', {
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL ? 'Set' : 'Missing',
      supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Missing',
      mode: import.meta.env.MODE,
      prod: import.meta.env.PROD
    });
  }, []);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Router>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppShell>
                  <SavList />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing"
            element={
              <ProtectedRoute>
                <AppShell>
                  <BillingList />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/maintenance"
            element={
              <ProtectedRoute>
                <AppShell>
                  <MaintenanceList />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/callnotes"
            element={
              <ProtectedRoute>
                <AppShell>
                  <CallNotes />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
};

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;