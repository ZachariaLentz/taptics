import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://aozdpvlgmlwtlodhzite.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvemRwdmxnbWx3dGxvZGh6aXRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzMTI2MzYsImV4cCI6MjA1ODg4ODYzNn0.oF-Gyi9KhgKNDABT2KOMIo71dIU543tHeRSJWY-tV8E';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
