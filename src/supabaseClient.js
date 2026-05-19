import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION ---
// Replace these values with your actual Supabase project details
const SUPABASE_URL = "https://oopbmrkmkhkhfxkdygjs.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_PkOSLSiQAIn_5vfvr6PX9g_t3qRcIup";
// ----------------------

const client = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);

const isMockActive = () => {
  if (typeof window !== 'undefined') {
    const hasParam = window.location.search.includes('mock_session=true');
    if (hasParam) {
      localStorage.setItem('mock_session', 'true');
    }
    return (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
      localStorage.getItem('mock_session') === 'true';
  }
  return false;
};

const mockUser = {
  id: 'da39a3ee-5e6b-4b0d-9b1e-123456789abc',
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test Developer'
  }
};

const mockSession = {
  access_token: 'mock-token',
  refresh_token: 'mock-token',
  user: mockUser
};

const authWrapper = {
  ...client.auth,
  getUser: async () => {
    if (isMockActive()) {
      return { data: { user: mockUser }, error: null };
    }
    return client.auth.getUser();
  },
  getSession: async () => {
    if (isMockActive()) {
      return { data: { session: mockSession }, error: null };
    }
    return client.auth.getSession();
  },
  onAuthStateChange: (callback) => {
    if (isMockActive()) {
      // Trigger callback with mock session in next tick
      setTimeout(() => callback('SIGNED_IN', mockSession), 0);
      return {
        data: {
          subscription: {
            unsubscribe: () => {}
          }
        }
      };
    }
    return client.auth.onAuthStateChange(callback);
  },
  signOut: async () => {
    if (isMockActive()) {
      localStorage.removeItem('mock_session');
      return { error: null };
    }
    return client.auth.signOut();
  }
};

export const supabase = new Proxy(client, {
  get(target, prop) {
    if (prop === 'auth') {
      return authWrapper;
    }
    return target[prop];
  }
});

