require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testSupabase() {
  console.log("1. Buscando config existente...");
  const { data: existingRows } = await supabase.from('bot_config').select('*').limit(1);
  const existing = existingRows[0];
  console.log("Existing id:", existing?.id, "is_running:", existing?.is_running);

  console.log("2. Atualizando...");
  const updatePayload = { updated_at: new Date().toISOString(), is_running: true };
  const { data: resultData, error: resultError } = await supabase.from('bot_config').update(updatePayload).eq('id', existing.id).select().single();
  
  console.log("Update Data:", resultData);
  console.log("Update Error:", resultError);

  console.log("3. Buscando de novo...");
  const { data: afterUpdate } = await supabase.from('bot_config').select('*').eq('id', existing.id).single();
  console.log("After update is_running:", afterUpdate?.is_running);
}

testSupabase();
