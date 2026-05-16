import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION ---
// Replace these values with your actual Supabase project details
const SUPABASE_URL = "https://oopbmrkmkhkhfxkdygjs.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_PkOSLSiQAIn_5vfvr6PX9g_t3qRcIup";
// ----------------------

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
