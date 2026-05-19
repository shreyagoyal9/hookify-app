// lib/supabase.ts
// This file creates our Supabase client
// We import this wherever we need to talk to the database

import { createClient } from "@supabase/supabase-js";

// These come from .env.local — never hardcode these!
const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create and export the Supabase client
// We use this to read/write to the database from anywhere in the app
export const supabase = createClient(supabaseUrl, supabaseKey);