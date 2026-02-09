'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import ReportFrame from '@/components/ReportFrame';
import { getSession } from '@/lib/auth';

interface SessionData {
  username: string;
  clientName: string;
  reportUrl: string;
  driveUrl: string;
  loginTime: number;
  isAdmin?: boolean;
  token: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const currentSession = getSession();
    
    if (!currentSession) {
      router.push('/');
      return;
    }

    // Valida a sessão no servidor
    fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: currentSession.token }),
    })
      .then(res => {
        if (!res.ok) {
          // Sessão inválida no servidor
          router.push('/');
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data) {
          // Atualiza dados da sessão com os do servidor (mais atualizados)
          const updatedSession: SessionData = {
            ...currentSession,
            clientName: data.client.name,
            reportUrl: data.client.reportUrl,
            driveUrl: data.client.driveUrl,
            isAdmin: data.client.isAdmin,
          };
          setSession(updatedSession);
        }
      })
      .catch(() => {
        // Se o servidor estiver offline, usa dados locais
        setSession(currentSession);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [router]);

  if (isLoading || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-700 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full spinner mx-auto" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 bg-yellow-400 rounded-full" />
            </div>
          </div>
          <p className="mt-4 text-white/80 font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <Header session={session} />

      {/* Relatório em Iframe */}
      <ReportFrame 
        reportUrl={session.reportUrl} 
        clientName={session.clientName} 
      />
    </div>
  );
}
