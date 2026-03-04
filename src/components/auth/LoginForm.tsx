import React, { useState } from 'react';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError('');

    const { error } = await signIn(email, password);

    if (error) {
      setError('Email ou mot de passe incorrect');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 sm:p-10">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6">
                <img
                  src="/BRUNEAU_PROTECTION_LOGO_QUADRI.png"
                  alt="Bruneau Protection"
                  className="h-12 sm:h-16 w-auto object-contain"
                />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">SAV Bruneau Protection</h1>
              <p className="text-sm sm:text-base text-gray-600">Connectez-vous pour accéder à votre espace</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm font-medium leading-relaxed">{error}</p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                  Adresse email
                </label>
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary-600 transition-colors">
                    <Mail size={20} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white transition-all min-h-[52px] text-gray-900 placeholder:text-gray-400"
                    placeholder="votre@email.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                  Mot de passe
                </label>
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary-600 transition-colors">
                    <Lock size={20} />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white transition-all min-h-[52px] text-gray-900 placeholder:text-gray-400"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !email || !password}
                  className="w-full bg-primary-900 text-white py-4 px-6 rounded-xl hover:bg-primary-800 active:scale-[0.98] focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2 transition-all font-bold shadow-lg shadow-primary-900/20 min-h-[56px]"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Connexion en cours...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="h-5 w-5" />
                      <span>Se connecter</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Footer */}
            <div className="mt-10 pt-6 border-t border-gray-100 text-center">
              <p className="text-xs sm:text-sm text-gray-400 font-medium">
                Accès réservé aux utilisateurs autorisés
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};