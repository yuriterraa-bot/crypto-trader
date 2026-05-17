require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://vckcnhksqchovbmbylzi.supabase.co", 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZja2NuaGtzcWNob3ZibWJ5bHppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTEyMjAxMjcsImV4cCI6MjAyNjc5NjEyN30.Z_WjP8_a8yB-8B_8_8_8_8_8_8_8_8_8_8_8" // I will extract the correct ones from lib/supabase.ts
);
// I can't read .env because it's not present or I used wrong command. I'll read lib/supabase.ts first.
