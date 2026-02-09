import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAdminFromRequest } from '@/lib/adminAuth';
import { supabase } from '@/lib/supabase';
import { recordAuditLog } from '@/lib/auditLog';

const CLIENT_FIELDS = 'id, username, name, report_url, drive_url, is_admin, is_active, logo_url, created_at, updated_at';

const FIELD_LABELS: Record<string, string> = {
  username: 'Usuário',
  name: 'Nome',
  report_url: 'URL do Relatório',
  drive_url: 'URL do Drive',
  is_admin: 'Permissão Admin',
  is_active: 'Status',
  logo_url: 'Logo',
  password_hash: 'Senha',
};

export async function GET(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { data, error } = await supabase
      .from('clients')
      .select(CLIENT_FIELDS)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao listar clientes:', error);
      return NextResponse.json({ error: 'Erro ao listar clientes' }, { status: 500 });
    }
    return NextResponse.json(data || []);
  } catch (err) {
    console.error('Erro ao listar clientes:', err);
    return NextResponse.json({ error: 'Erro ao listar clientes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { username, password, name, report_url, drive_url, is_admin } = body;

    if (!username || !password || !name) {
      return NextResponse.json(
        { error: 'Username, senha e nome são obrigatórios.' },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('clients')
      .insert({
        username: username.trim(),
        password_hash: passwordHash,
        name: name.trim(),
        report_url: report_url?.trim() || '',
        drive_url: drive_url?.trim() || '',
        is_admin: !!is_admin,
        is_active: true,
      })
      .select(CLIENT_FIELDS)
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Este username já está em uso.' }, { status: 400 });
      }
      console.error('Erro ao criar cliente:', error);
      return NextResponse.json({ error: error.message || 'Erro ao criar cliente' }, { status: 500 });
    }

    await recordAuditLog(admin.id, 'create_client', data.name, {
      tipo: data.is_admin ? 'Administrador' : 'Cliente',
    });

    return NextResponse.json(data);
  } catch (err) {
    console.error('Erro ao criar cliente:', err);
    return NextResponse.json({ error: 'Erro ao criar cliente' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, is_active, username, password, name, report_url, drive_url, is_admin } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do cliente é obrigatório.' }, { status: 400 });
    }

    // Atualização apenas de status ativo/inativo
    if (typeof is_active === 'boolean' && Object.keys(body).length <= 2) {
      const { data: clientBefore } = await supabase
        .from('clients')
        .select('name')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('clients')
        .update({ is_active })
        .eq('id', id);

      if (error) {
        console.error('Erro ao atualizar status:', error);
        return NextResponse.json({ error: 'Erro ao atualizar status' }, { status: 500 });
      }

      await recordAuditLog(admin.id, 'update_client', clientBefore?.name ?? id, {
        campo_alterado: 'Status',
        valor: is_active ? 'Ativo' : 'Inativo',
      });
      return NextResponse.json({ ok: true });
    }

    // Busca o cliente atual para comparar e registrar só o que mudou
    const { data: clientAtual, error: errFetch } = await supabase
      .from('clients')
      .select(CLIENT_FIELDS)
      .eq('id', id)
      .single();

    if (errFetch || !clientAtual) {
      return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (username !== undefined) {
      const v = username.trim();
      if (v !== (clientAtual.username ?? '')) updates.username = v;
    }
    if (name !== undefined) {
      const v = name.trim();
      if (v !== (clientAtual.name ?? '')) updates.name = v;
    }
    if (report_url !== undefined) {
      const v = report_url?.trim() ?? '';
      if (v !== (clientAtual.report_url ?? '')) updates.report_url = v;
    }
    if (drive_url !== undefined) {
      const v = drive_url?.trim() ?? '';
      if (v !== (clientAtual.drive_url ?? '')) updates.drive_url = v;
    }
    if (is_admin !== undefined) {
      const v = !!is_admin;
      if (v !== (clientAtual.is_admin ?? false)) updates.is_admin = v;
    }
    if (password && String(password).length > 0) {
      updates.password_hash = await bcrypt.hash(String(password), 10);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select(CLIENT_FIELDS)
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Este username já está em uso.' }, { status: 400 });
      }
      console.error('Erro ao atualizar cliente:', error);
      return NextResponse.json({ error: error.message || 'Erro ao atualizar cliente' }, { status: 500 });
    }

    // Só os campos que realmente mudaram (em português)
    const fieldsUpdated = Object.keys(updates).filter(k => k !== 'password_hash');
    const camposAlterados: string[] = fieldsUpdated.map(f => FIELD_LABELS[f] ?? f);
    if (updates.password_hash) camposAlterados.push(FIELD_LABELS.password_hash);

    await recordAuditLog(admin.id, 'update_client', data.name, {
      campos_alterados: camposAlterados,
    });

    return NextResponse.json(data);
  } catch (err) {
    console.error('Erro ao atualizar cliente:', err);
    return NextResponse.json({ error: 'Erro ao atualizar cliente' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'ID do cliente é obrigatório.' }, { status: 400 });
  }

  // Não permitir que o admin exclua a si mesmo (por id)
  if (id === admin.id) {
    return NextResponse.json({ error: 'Você não pode excluir seu próprio usuário.' }, { status: 400 });
  }

  try {
    const { data: client } = await supabase
      .from('clients')
      .select('username, name')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir cliente:', error);
      return NextResponse.json({ error: 'Erro ao excluir cliente' }, { status: 500 });
    }

    await recordAuditLog(admin.id, 'delete_client', client?.name ?? 'Cliente excluído', {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Erro ao excluir cliente:', err);
    return NextResponse.json({ error: 'Erro ao excluir cliente' }, { status: 500 });
  }
}
