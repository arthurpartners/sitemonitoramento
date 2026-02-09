'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from '@/components/LoginForm';
import { isAuthenticated } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Redireciona para dashboard se já estiver autenticado
    if (isAuthenticated()) {
      router.push('/dashboard');
    } else {
      setIsChecking(false);
    }
  }, [router]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-700 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full spinner" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-purple-800 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Elementos Decorativos */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Círculos decorativos */}
        <div className="absolute top-10 left-10 w-64 h-64 bg-yellow-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-600/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/4 w-48 h-48 bg-yellow-400/5 rounded-full blur-2xl float-animation" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="w-full h-full" style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }} />
        </div>

        {/* Linhas diagonais decorativas */}
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FACC15" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#FACC15" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1="0" y1="100%" x2="50%" y2="0" stroke="url(#grad1)" strokeWidth="1" />
          <line x1="20%" y1="100%" x2="70%" y2="0" stroke="url(#grad1)" strokeWidth="1" />
          <line x1="50%" y1="100%" x2="100%" y2="20%" stroke="url(#grad1)" strokeWidth="1" />
        </svg>
      </div>

      {/* Card de Login */}
      <div className="w-full max-w-md animate-fade-in relative z-10">
        <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-10 backdrop-blur-sm">
          {/* Nome */}
          <div className="flex justify-center mb-8">
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-gray-800">Partners Comunicação</p>
            </div>
          </div>

          {/* Título */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Portal de Relatórios
            </h1>
            <p className="text-gray-500 text-sm">
              Acesse seus relatórios
            </p>
          </div>

          {/* Divisor com ícone */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
          </div>

          {/* Formulário */}
          <LoginForm />
        </div>

        {/* Texto de Copyright */}
        <p className="text-center text-purple-200/60 text-sm mt-8">
          © {new Date().getFullYear()} Partners Comunicação Integrada
        </p>
      </div>
    </main>
  );
}

