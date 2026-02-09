export interface Client {
  id: string;
  username: string;
  name: string;
  report_url: string;
  drive_url: string;
  is_admin: boolean;
  is_active: boolean;
  logo_url?: string;
  created_at?: string;
  updated_at?: string;
}

// Interface para criação de cliente (sem id)
export interface CreateClientInput {
  username: string;
  password: string;
  name: string;
  report_url: string;
  drive_url: string;
  is_admin?: boolean;
  logo_url?: string;
}

// Interface para atualização de cliente
export interface UpdateClientInput {
  username?: string;
  password?: string;
  name?: string;
  report_url?: string;
  drive_url?: string;
  is_admin?: boolean;
  is_active?: boolean;
  logo_url?: string;
}
