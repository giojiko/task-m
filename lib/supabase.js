import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'SUPABASE_URL ან SUPABASE_SERVICE_ROLE_KEY/SUPABASE_KEY environment variable არ არის დაყენებული. ' +
    'Vercel Dashboard → Settings → Environment Variables → დაამატე ორივე ' +
    '(Production environment-ზეც!) და redeploy გააკეთე.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
