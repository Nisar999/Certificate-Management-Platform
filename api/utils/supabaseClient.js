
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
// These environment variables must be set in Vercel project settings
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase credentials missing (SUPABASE_URL or SUPABASE_KEY)');
}

const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder');

module.exports = { supabase };
