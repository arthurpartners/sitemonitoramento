'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, clearSession } from '@/lib/auth';

interface AccessLog {
  id: string;
  username: string;
  client_name: string;
  action: string;
  created_at: string;
}

interface AccessStats {
  totalAccesses: number;
  totalDriveAccesses: number;
  accessesByClient: { [key: string]: number };
  driveByClient: { [key: string]: number };
  accessesByDate: { [key: string]: number };
  recentLogs: AccessLog[];
}

interface ClientData {
  id: string;
  username: string;
  name: string;
  report_url: string;
  drive_url: string;
  is_admin: boolean;
  is_active: boolean;
  logo_url?: string;
  created_at: string;
  updated_at?: string;
}

interface LoginAttempt {
  id: string;
  username: string;
  success: boolean;
  ip: string;
  user_agent: string;
  created_at: string;
}

interface SessionInfo {
  id: string;
  client_id: string;
  ip: string;
  user_agent: string;
  expires_at: string;
  created_at: string;
  clients: { id: string; username: string; name: string } | null;
}

interface AuditLog {
  id: string;
  action: string;
  target: string;
  details: Record<string, unknown>;
  created_at: string;
  clients: { username: string; name: string } | null;
}

type TabType = 'metrics' | 'clients' | 'security' | 'audit';

export default function AdminPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('metrics');

  // Métricas
  const [stats, setStats] = useState<AccessStats | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Clientes
  const [clients, setClients] = useState<ClientData[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientData | null>(null);
  const [clientForm, setClientForm] = useState({
    username: '', password: '', name: '', report_url: '', drive_url: '', is_admin: false,
  });
  const [clientFormError, setClientFormError] = useState('');

  // Segurança
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
  const [activeSessions, setActiveSessions] = useState<SessionInfo[]>([]);
  const [isLoadingSecurity, setIsLoadingSecurity] = useState(false);

  // Auditoria
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  useEffect(() => {
    const currentSession = getSession();

    if (!currentSession) {
      router.push('/');
      return;
    }

    if (!currentSession.isAdmin) {
      router.push('/dashboard');
      return;
    }

    setToken(currentSession.token);

    // Define datas padrão (últimos 30 dias)
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);

    setIsLoading(false);
  }, [router]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!token) return;
    setIsLoadingStats(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/admin/stats?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) setStats(data);
      else setStats(null);
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    } finally {
      setIsLoadingStats(false);
    }
  }, [token, startDate, endDate]);

  useEffect(() => {
    if (startDate && endDate && token) {
      fetchStats();
    }
  }, [startDate, endDate, token, fetchStats]);

  // Fetch clients
  const fetchClients = useCallback(async () => {
    if (!token) return;
    setIsLoadingClients(true);
    try {
      const response = await fetch('/api/admin/clients', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setClients(response.ok && Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    } finally {
      setIsLoadingClients(false);
    }
  }, [token]);

  // Fetch security data
  const fetchSecurity = useCallback(async () => {
    if (!token) return;
    setIsLoadingSecurity(true);
    try {
      const [attemptsRes, sessionsRes] = await Promise.all([
        fetch(`/api/admin/attempts?onlyFailed=false`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('/api/admin/sessions', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);
      const attempts = await attemptsRes.json();
      const sessions = await sessionsRes.json();
      setLoginAttempts(attemptsRes.ok && Array.isArray(attempts) ? attempts : []);
      setActiveSessions(sessionsRes.ok && Array.isArray(sessions) ? sessions : []);
    } catch (error) {
      console.error('Erro ao buscar dados de segurança:', error);
    } finally {
      setIsLoadingSecurity(false);
    }
  }, [token]);

  // Fetch audit
  const fetchAudit = useCallback(async () => {
    if (!token) return;
    setIsLoadingAudit(true);
    try {
      const response = await fetch('/api/admin/audit', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setAuditLogs(response.ok && Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao buscar auditoria:', error);
    } finally {
      setIsLoadingAudit(false);
    }
  }, [token]);

  // Load data when tab changes
  useEffect(() => {
    if (!token) return;
    if (activeTab === 'clients') fetchClients();
    if (activeTab === 'security') fetchSecurity();
    if (activeTab === 'audit') fetchAudit();
  }, [activeTab, token, fetchClients, fetchSecurity, fetchAudit]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
    } catch (error) {
      console.error('Erro no logout:', error);
    }
    clearSession();
    router.push('/');
  };

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR');
  };

  const formatDate = (dateString: string) => {
    // Se for apenas YYYY-MM-DD (sem hora), adiciona T12:00:00 para evitar
    // que o fuso horário mude o dia ao converter
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [y, m, d] = dateString.split('-');
      return `${d}/${m}/${y}`;
    }
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Client CRUD
  const openCreateClient = () => {
    setEditingClient(null);
    setClientForm({ username: '', password: '', name: '', report_url: '', drive_url: '', is_admin: false });
    setClientFormError('');
    setShowClientModal(true);
  };

  const openEditClient = (client: ClientData) => {
    setEditingClient(client);
    setClientForm({
      username: client.username,
      password: '',
      name: client.name,
      report_url: client.report_url,
      drive_url: client.drive_url,
      is_admin: client.is_admin,
    });
    setClientFormError('');
    setShowClientModal(true);
  };

  const handleSaveClient = async () => {
    setClientFormError('');

    if (!clientForm.name || !clientForm.username) {
      setClientFormError('Nome e username são obrigatórios');
      return;
    }

    if (!editingClient && !clientForm.password) {
      setClientFormError('Senha é obrigatória para novo cliente');
      return;
    }

    try {
      const method = editingClient ? 'PUT' : 'POST';
      const body = editingClient
        ? { id: editingClient.id, ...clientForm, password: clientForm.password || undefined }
        : clientForm;

      const response = await fetch('/api/admin/clients', {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        setClientFormError(data.error || 'Erro ao salvar');
        return;
      }

      setShowClientModal(false);
      fetchClients();
    } catch {
      setClientFormError('Erro de conexão');
    }
  };

  const handleToggleActive = async (client: ClientData) => {
    try {
      await fetch('/api/admin/clients', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ id: client.id, is_active: !client.is_active }),
      });
      fetchClients();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const handleDeleteClient = async (client: ClientData) => {
    if (!confirm(`Tem certeza que deseja EXCLUIR o cliente "${client.name}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      await fetch(`/api/admin/clients?id=${client.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      fetchClients();
    } catch (error) {
      console.error('Erro ao deletar cliente:', error);
    }
  };

  const handleForceLogout = async (clientId: string) => {
    try {
      await fetch(`/api/admin/sessions?clientId=${clientId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      fetchSecurity();
    } catch (error) {
      console.error('Erro ao forçar logout:', error);
    }
  };

  // Filtros rápidos
  const setQuickFilter = (days: number) => {
    const today = new Date();
    const pastDate = new Date(today);
    pastDate.setDate(pastDate.getDate() - days);
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(pastDate.toISOString().split('T')[0]);
  };

  const setCurrentMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'create_client': 'Criou cliente',
      'update_client': 'Atualizou cliente',
      'delete_client': 'Excluiu cliente',
      'force_logout': 'Forçou logout',
      'reset_password': 'Resetou senha',
    };
    return labels[action] || action;
  };

  const fieldLabels: Record<string, string> = {
    'username': 'Usuário',
    'name': 'Nome',
    'report_url': 'URL do Relatório',
    'drive_url': 'URL do Drive',
    'is_admin': 'Permissão Admin',
    'is_active': 'Status',
    'logo_url': 'Logo',
    'password_hash': 'Senha',
  };

  function normalizeDetails(details: unknown): Record<string, unknown> {
    if (details != null && typeof details === 'object' && !Array.isArray(details)) return details as Record<string, unknown>;
    if (typeof details === 'string') {
      try { return JSON.parse(details) as Record<string, unknown>; } catch { return {}; }
    }
    return {};
  }

  const formatAuditDetails = (action: string, details: Record<string, unknown>): string => {
    if (!details || Object.keys(details).length === 0) {
      if (action === 'force_logout') return 'Sessão encerrada';
      if (action === 'delete_client') return 'Cliente excluído';
      return '—';
    }

    switch (action) {
      case 'create_client': {
        const tipo = details.tipo as string | undefined;
        return tipo ? `Tipo: ${tipo}` : '—';
      }

      case 'update_client': {
        const campos = details.campos_alterados as string[] | undefined;
        if (campos && campos.length > 0) {
          return campos.length === 1
            ? `${campos[0]} atualizado(a)`
            : `${campos.join(', ')} atualizados`;
        }
        const campo = details.campo_alterado as string | undefined;
        const valor = details.valor as string | undefined;
        if (campo && valor) return `${campo}: ${valor}`;
        return '—';
      }

      case 'delete_client':
        return 'Cliente excluído';

      case 'force_logout':
        return 'Sessão encerrada';

      default:
        return Object.entries(details)
          .map(([k, v]) => `${fieldLabels[k] || k}: ${v}`)
          .join(', ');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-700 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-900 via-purple-800 to-purple-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center gap-4">
              <img
                src="https://partnerscom.com.br/wp-content/uploads/2022/12/logo.png"
                alt="Partners Comunicação"
                width={160}
                height={40}
                className="h-8 sm:h-10 w-auto brightness-0 invert"
                loading="eager"
              />
              <span className="hidden sm:inline-block px-3 py-1 bg-yellow-400 text-gray-900 text-xs font-bold rounded-full">
                ADMIN
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-transparent border-2 border-white/50 text-white font-medium text-sm hover:bg-white hover:text-purple-700 hover:border-white transition-all duration-200"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex gap-1 bg-white rounded-xl shadow-md p-1 mb-8 overflow-x-auto">
          {[
            { id: 'metrics' as TabType, label: 'Métricas', icon: '📊' },
            { id: 'clients' as TabType, label: 'Clientes', icon: '👥' },
            { id: 'security' as TabType, label: 'Segurança', icon: '🔒' },
            { id: 'audit' as TabType, label: 'Auditoria', icon: '📋' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all
                ${activeTab === tab.id
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">

        {/* ===== TAB: MÉTRICAS ===== */}
        {activeTab === 'metrics' && (
          <>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-8">Painel de Métricas</h1>

            {/* Filtros */}
            <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Filtrar Período</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                <button onClick={() => setQuickFilter(0)} className="px-4 py-2 text-sm font-medium rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors">Hoje</button>
                <button onClick={() => setQuickFilter(7)} className="px-4 py-2 text-sm font-medium rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors">Últimos 7 dias</button>
                <button onClick={() => setQuickFilter(30)} className="px-4 py-2 text-sm font-medium rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors">Últimos 30 dias</button>
                <button onClick={setCurrentMonth} className="px-4 py-2 text-sm font-medium rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors">Este mês</button>
              </div>
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Data Inicial</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Data Final</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                </div>
                <button onClick={fetchStats} disabled={isLoadingStats} className="px-6 py-2 bg-yellow-400 text-gray-900 font-semibold rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50">
                  {isLoadingStats ? 'Carregando...' : 'Atualizar'}
                </button>
              </div>
            </div>

            {stats && (
              <>
                {/* Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="bg-white rounded-2xl shadow-md p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Total de Acessos</p>
                        <p className="text-3xl font-bold text-gray-800">{stats.totalAccesses}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl shadow-md p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Clientes Ativos</p>
                        <p className="text-3xl font-bold text-gray-800">{Object.keys(stats.accessesByClient).length}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl shadow-md p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Acessos ao Drive</p>
                        <p className="text-3xl font-bold text-gray-800">{stats.totalDriveAccesses}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl shadow-md p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Média por Dia</p>
                        <p className="text-3xl font-bold text-gray-800">
                          {Object.keys(stats.accessesByDate).length > 0
                            ? (stats.totalAccesses / Object.keys(stats.accessesByDate).length).toFixed(1)
                            : '0'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Logins por Cliente e por Data */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  <div className="bg-white rounded-2xl shadow-md p-6">
                    <h2 className="text-lg font-semibold text-gray-700 mb-4">Logins por Cliente</h2>
                    {Object.keys(stats.accessesByClient).length > 0 ? (
                      <div className="space-y-4">
                        {Object.entries(stats.accessesByClient).sort(([, a], [, b]) => b - a).map(([client, count]) => (
                          <div key={client}>
                            <div className="flex justify-between mb-1">
                              <span className="font-medium text-gray-700">{client}</span>
                              <span className="text-gray-500">{count} {count === 1 ? 'login' : 'logins'}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-gradient-to-r from-purple-600 to-purple-400 h-2 rounded-full transition-all duration-500" style={{ width: `${(count / stats.totalAccesses) * 100}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">Nenhum acesso no período</p>
                    )}
                  </div>
                  <div className="bg-white rounded-2xl shadow-md p-6">
                    <h2 className="text-lg font-semibold text-gray-700 mb-4">Logins por Data</h2>
                    {Object.keys(stats.accessesByDate).length > 0 ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {Object.entries(stats.accessesByDate).sort(([a], [b]) => b.localeCompare(a)).map(([date, count]) => (
                          <div key={date} className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-gray-600">{formatDate(date)}</span>
                            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">{count} {count === 1 ? 'login' : 'logins'}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">Nenhum acesso no período</p>
                    )}
                  </div>
                </div>

                {/* Acessos ao Drive por Cliente */}
                {stats.totalDriveAccesses > 0 && (
                  <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
                    <h2 className="text-lg font-semibold text-gray-700 mb-4">Acessos ao Drive por Cliente</h2>
                    <div className="space-y-4">
                      {Object.entries(stats.driveByClient).sort(([, a], [, b]) => b - a).map(([client, count]) => (
                        <div key={client}>
                          <div className="flex justify-between mb-1">
                            <span className="font-medium text-gray-700">{client}</span>
                            <span className="text-gray-500">{count} {count === 1 ? 'acesso' : 'acessos'}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-gradient-to-r from-green-600 to-green-400 h-2 rounded-full transition-all duration-500" style={{ width: `${(count / stats.totalDriveAccesses) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Histórico */}
                <div className="bg-white rounded-2xl shadow-md p-6">
                  <h2 className="text-lg font-semibold text-gray-700 mb-4">Histórico de Logins Recentes</h2>
                  {stats.recentLogs.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Cliente</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Usuário</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Data/Hora</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.recentLogs.map((log) => (
                            <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium text-gray-800">{log.client_name}</td>
                              <td className="py-3 px-4 text-gray-600">{log.username}</td>
                              <td className="py-3 px-4 text-gray-500 text-sm">{formatDateTime(log.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">Nenhum acesso registrado no período</p>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* ===== TAB: CLIENTES ===== */}
        {activeTab === 'clients' && (
          <>
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Gerenciar Clientes</h1>
              <button
                onClick={openCreateClient}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Novo Cliente
              </button>
            </div>

            {isLoadingClients ? (
              <div className="flex justify-center py-12">
                <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Nome</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Username</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Status</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Tipo</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Criado em</th>
                        <th className="text-right py-4 px-6 text-sm font-semibold text-gray-600">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map((client) => (
                        <tr key={client.id} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="py-4 px-6 font-medium text-gray-800">{client.name}</td>
                          <td className="py-4 px-6 text-gray-600">{client.username}</td>
                          <td className="py-4 px-6">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${client.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {client.is_active ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${client.is_admin ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                              {client.is_admin ? 'Admin' : 'Cliente'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-gray-500 text-sm">{formatDate(client.created_at)}</td>
                          <td className="py-4 px-6">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => openEditClient(client)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button onClick={() => handleToggleActive(client)} className={`p-2 rounded-lg transition-colors ${client.is_active ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`} title={client.is_active ? 'Desativar' : 'Ativar'}>
                                {client.is_active ? (
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                )}
                              </button>
                              {!client.is_admin && (
                                <button onClick={() => handleDeleteClient(client)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {clients.length === 0 && (
                  <p className="text-gray-500 text-center py-12">Nenhum cliente cadastrado</p>
                )}
              </div>
            )}
          </>
        )}

        {/* ===== TAB: SEGURANÇA ===== */}
        {activeTab === 'security' && (
          <>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-8">Segurança</h1>

            {isLoadingSecurity ? (
              <div className="flex justify-center py-12">
                <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* Sessões Ativas */}
                <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-700">Sessões Ativas ({activeSessions.length})</h2>
                    <button onClick={fetchSecurity} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">Atualizar</button>
                  </div>
                  {activeSessions.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Usuário</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">IP</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Login em</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Expira em</th>
                            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Ação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeSessions.map((session) => (
                            <tr key={session.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium text-gray-800">{session.clients?.name || session.client_id}</td>
                              <td className="py-3 px-4 text-gray-600 font-mono text-sm">{session.ip}</td>
                              <td className="py-3 px-4 text-gray-500 text-sm">{formatDateTime(session.created_at)}</td>
                              <td className="py-3 px-4 text-gray-500 text-sm">{formatDateTime(session.expires_at)}</td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() => handleForceLogout(session.client_id)}
                                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                                >
                                  Forçar Logout
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">Nenhuma sessão ativa</p>
                  )}
                </div>

                {/* Tentativas de Login */}
                <div className="bg-white rounded-2xl shadow-md p-6">
                  <h2 className="text-lg font-semibold text-gray-700 mb-4">Tentativas de Login Recentes</h2>
                  {loginAttempts.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Usuário</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">IP</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Data/Hora</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loginAttempts.slice(0, 50).map((attempt) => (
                            <tr key={attempt.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium text-gray-800">{attempt.username}</td>
                              <td className="py-3 px-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${attempt.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {attempt.success ? 'Sucesso' : 'Falhou'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-gray-600 font-mono text-sm">{attempt.ip}</td>
                              <td className="py-3 px-4 text-gray-500 text-sm">{formatDateTime(attempt.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">Nenhuma tentativa registrada</p>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* ===== TAB: AUDITORIA ===== */}
        {activeTab === 'audit' && (
          <>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-8">Log de Auditoria</h1>

            {isLoadingAudit ? (
              <div className="flex justify-center py-12">
                <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-md p-6">
                {auditLogs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Admin</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Ação</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Alvo</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Detalhes</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Data/Hora</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium text-gray-800">{log.clients?.name || 'Desconhecido'}</td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                {getActionLabel(log.action)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-600">{log.target}</td>
                            <td className="py-3 px-4 text-gray-600 text-sm max-w-xs">{formatAuditDetails(log.action, normalizeDetails(log.details))}</td>
                            <td className="py-3 px-4 text-gray-500 text-sm">{formatDateTime(log.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-12">Nenhum registro de auditoria</p>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal de Cliente */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">
                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  type="text"
                  value={clientForm.name}
                  onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ex: Sebrae Pernambuco"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                <input
                  type="text"
                  value={clientForm.username}
                  onChange={(e) => setClientForm({ ...clientForm, username: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ex: sebrae"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Senha {editingClient ? '(deixe vazio para manter)' : '*'}
                </label>
                <input
                  type="password"
                  value={clientForm.password}
                  onChange={(e) => setClientForm({ ...clientForm, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder={editingClient ? '••••••••' : 'Senha do cliente'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL do Relatório</label>
                <input
                  type="url"
                  value={clientForm.report_url}
                  onChange={(e) => setClientForm({ ...clientForm, report_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="https://app.reportei.com/dashboard/..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL do Google Drive</label>
                <input
                  type="url"
                  value={clientForm.drive_url}
                  onChange={(e) => setClientForm({ ...clientForm, drive_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="https://drive.google.com/drive/folders/..."
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_admin"
                  checked={clientForm.is_admin}
                  onChange={(e) => setClientForm({ ...clientForm, is_admin: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <label htmlFor="is_admin" className="text-sm text-gray-700">Administrador</label>
              </div>

              {clientFormError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{clientFormError}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => setShowClientModal(false)}
                className="px-5 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveClient}
                className="px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                {editingClient ? 'Salvar Alterações' : 'Criar Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
