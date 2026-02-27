import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { auth, supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  userProfile: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  canAccessBillingInfo: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user has access to billing information
  const canAccessBillingInfo = user?.email === 'quentin@bruneau27.com';

  // Load user profile from database
  const loadUserProfile = async (authUser: User | null) => {
    if (!authUser?.email) {
      setUserProfile(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', authUser.email)
        .maybeSingle();

      if (error) {
        console.error('Error loading user profile:', error);
        setUserProfile(null);
      } else {
        setUserProfile(data);
      }
    } catch (err) {
      console.error('Error loading user profile:', err);
      setUserProfile(null);
    }
  };

  useEffect(() => {
    // Get initial user
    auth.getCurrentUser().then(async ({ user }) => {
      setUser(user);
      await loadUserProfile(user);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      (async () => {
        const authUser = session?.user ?? null;
        setUser(authUser);
        await loadUserProfile(authUser);
        setLoading(false);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await auth.signIn(email, password);
    return { error };
  };

  const signOut = async () => {
    await auth.signOut();
  };

  const value = {
    user,
    userProfile,
    loading,
    signIn,
    signOut,
    canAccessBillingInfo,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};