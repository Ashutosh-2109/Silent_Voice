import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Supabase Configuration Placeholders
export const SUPABASE_URL = "https://eobsoxujwgtaxegadinp.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_1L7aeuRIZq2K1ojolT1Q4g_bzgUAN_a";

// Check if credentials are valid
const hasValidCredentials = 
  SUPABASE_URL && 
  SUPABASE_URL !== "PASTE_YOUR_SUPABASE_URL_HERE" && 
  SUPABASE_ANON_KEY && 
  SUPABASE_ANON_KEY !== "PASTE_YOUR_SUPABASE_ANON_KEY_HERE";

let supabaseInstance = null;

if (hasValidCredentials) {
  try {
    // Configure auth options dynamically based on Platform
    const authConfig = {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
    };

    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: authConfig,
    });

  } catch (e) {
    console.error("Failed to initialize Supabase client:", e);
  }
}

export const supabase = supabaseInstance;
export const isMockMode = !hasValidCredentials;

// Mock Authentication Services for development/demo when credentials are not configured
const mockUser = {
  id: 'mock-user-123',
  email: 'user@silentvoice.ai',
  user_metadata: {
    username: 'SilentVoiceUser'
  }
};

let currentMockSession = null;
const authChangeCallbacks = [];

export const authService = {
  // Sign Up with Email and Password
  signUp: async (username, email, password) => {
    if (isMockMode) {
      console.log("[Mock Auth] Registering user:", username, email);
      // Simulate network lag
      await new Promise(resolve => setTimeout(resolve, 800));
      
      currentMockSession = {
        user: {
          id: 'mock-user-' + Math.random().toString(36).substr(2, 9),
          email,
          user_metadata: { username }
        },
        session: { access_token: 'mock-token-abc-123' }
      };
      
      // Trigger session update
      triggerAuthChange('SIGNED_IN', currentMockSession);
      return { data: currentMockSession, error: null };
    }
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
          }
        }
      });
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Sign In with Email and Password
  signIn: async (email, password) => {
    if (isMockMode) {
      console.log("[Mock Auth] Logging in user:", email);
      await new Promise(resolve => setTimeout(resolve, 800));
      
      if (password.length < 6) {
        return { data: null, error: { message: "Invalid credentials. Password must be at least 6 characters." } };
      }
      
      currentMockSession = {
        user: {
          ...mockUser,
          email
        },
        session: { access_token: 'mock-token-abc-123' }
      };
      
      triggerAuthChange('SIGNED_IN', currentMockSession);
      return { data: currentMockSession, error: null };
    }
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Google OAuth Placeholder Action
  signInWithGoogle: async () => {
    if (isMockMode) {
      console.log("[Mock Auth] Starting Google Sign-In Flow...");
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      currentMockSession = {
        user: {
          id: 'mock-google-user-999',
          email: 'google.user@gmail.com',
          user_metadata: { username: 'GoogleUser' }
        },
        session: { access_token: 'mock-google-token-xyz' }
      };
      
      triggerAuthChange('SIGNED_IN', currentMockSession);
      return { data: currentMockSession, error: null };
    }
    
    try {
      const redirectUri = Platform.OS === 'web' 
        ? window.location.origin 
        : 'silentvoice://google-auth';

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline',
          },
          redirectTo: redirectUri
        }
      });
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Log Out
  signOut: async () => {
    if (isMockMode) {
      console.log("[Mock Auth] Logging out...");
      currentMockSession = null;
      triggerAuthChange('SIGNED_OUT', null);
      return { error: null };
    }
    
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      return { error };
    }
  },

  // Get Current Session
  getSession: async () => {
    if (isMockMode) {
      return { data: currentMockSession, error: null };
    }
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      return { data: session, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Set Session manually (for deep linking)
  setSession: async (accessToken, refreshToken) => {
    if (isMockMode) {
      return { data: currentMockSession, error: null };
    }
    try {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Listen to Auth State Changes
  onAuthStateChange: (callback) => {
    if (isMockMode) {
      authChangeCallbacks.push(callback);
      // Immediately invoke callback with current mock state
      callback(currentMockSession ? 'SIGNED_IN' : 'SIGNED_OUT', currentMockSession);
      
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              const index = authChangeCallbacks.indexOf(callback);
              if (index > -1) {
                authChangeCallbacks.splice(index, 1);
              }
            }
          }
        }
      };
    }
    
    return supabase.auth.onAuthStateChange(callback);
  }
};

const triggerAuthChange = (event, session) => {
  authChangeCallbacks.forEach(cb => {
    try {
      cb(event, session);
    } catch (e) {
      console.error("Error running auth state change callback:", e);
    }
  });
};
