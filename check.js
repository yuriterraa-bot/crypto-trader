require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
  console.log("--- SIGNALS ---");
  const { data: signals, error: err1 } = await supabase
    .from('signals')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  console.log(err1 || signals);

  console.log("--- BOT_CONFIG ---");
  const { data: config, error: err2 } = await supabase
    .from('bot_config')
    .select('*')
    .limit(1);
  console.log(err2 || config);
}

check();
