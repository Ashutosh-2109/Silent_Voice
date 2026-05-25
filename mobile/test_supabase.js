const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://eobsoxujwgtaxegadinp.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_1L7aeuRIZq2K1ojolT1Q4g_bzgUAN_a";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConn() {
  console.log("Testing Supabase connection...");
  try {
    const { data, error } = await supabase.auth.getSession();
    console.log("getSession data:", data);
    console.log("getSession error:", error);
    
    // Try to sign in with dummy email to see what error the API returns
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'password123'
    });
    console.log("signInData:", signInData);
    console.log("signInError:", signInError);
  } catch (e) {
    console.error("Caught exception:", e);
  }
}

testConn();
