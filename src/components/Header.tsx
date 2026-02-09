'use client';

import { useRouter } from 'next/navigation';
import { clearSession, getSession, logAccess } from '@/lib/auth';

interface Session {
  username: string;
  clientName: string;
  reportUrl: string;
  driveUrl: string;
  loginTime: number;
  isAdmin?: boolean;
  token: string;
}

interface HeaderProps {
  session: Session;
}

export default function Header({ session }: HeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    // Destrói sessão no servidor
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: session.token }),
      });
    } catch (error) {
      console.error('Erro ao fazer logout no servidor:', error);
    }
    clearSession();
    router.push('/');
  };

  const handleOpenDrive = async () => {
    if (session.driveUrl && !session.driveUrl.includes('PLACEHOLDER')) {
      // Registra acesso ao Drive
      await logAccess(session.token, 'open_drive');
      window.open(session.driveUrl, '_blank', 'noopener,noreferrer');
    } else {
      alert('O link do Google Drive ainda não foi configurado para este cliente.');
    }
  };

  return (
    <header className="bg-gradient-to-r from-purple-900 via-purple-800 to-purple-700 text-white shadow-lg">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <div className="flex-shrink-0">
            <img
              src="/logo.svg"
              alt="Partners Comunicação"
              width={160}
              height={40}
              className="h-8 sm:h-10 w-auto brightness-0 invert"
              loading="eager"
            />
          </div>

          {/* Nome do Cliente - Centro */}
          <div className="hidden sm:flex items-center gap-2 text-center">
            <span className="text-purple-200 text-sm">Bem-vindo,</span>
            <span className="font-semibold text-white">{session.clientName}</span>
          </div>

          {/* Botões - Direita */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Botão Arquivos */}
            <button
              onClick={handleOpenDrive}
              className="flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg
                bg-yellow-400 text-gray-900 font-semibold text-sm
                hover:bg-yellow-300 hover:shadow-lg
                transition-all duration-200 transform hover:-translate-y-0.5"
            >
              <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span className="hidden sm:inline">Acessar Arquivos</span>
              <span className="sm:hidden">Arquivos</span>
            </button>

            {/* Botão Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg
                bg-transparent border-2 border-white/50 text-white font-medium text-sm
                hover:bg-white hover:text-purple-700 hover:border-white
                transition-all duration-200"
            >
              <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>

        {/* Nome do Cliente - Mobile */}
        <div className="sm:hidden pb-3 text-center border-t border-purple-600/30 pt-2 -mt-1">
          <span className="text-purple-200 text-xs">Bem-vindo, </span>
          <span className="font-semibold text-white text-sm">{session.clientName}</span>
        </div>
      </div>
    </header>
  );
}
