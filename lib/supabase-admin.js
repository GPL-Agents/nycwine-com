// Server-only Supabase client for authenticated admin writes.
// Never import this module from client-side pages/components.
import { createSupabaseClient } from './supabase.js';

export const adminDb = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  () => process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  'SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY)'
);
