import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente com service_role para uso no backend (API Routes)
// NUNCA exponha este cliente no frontend!
export const supabase = createClient(supabaseUrl, supabaseServiceKey);
