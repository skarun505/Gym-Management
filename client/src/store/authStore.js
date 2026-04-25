import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('gym_user') || 'null'),
  session: null,
  isLoading: false,
  initialized: false,   // true once restoreSession() has completed
  error: null,

  // ── Login ──────────────────────────────────────────────
  // identifier may be an email OR a phone number
  login: async (identifier, password) => {
    set({ isLoading: true, error: null });
    try {
      // Detect phone: no '@' sign → treat as mobile number
      let email = identifier.trim();
      const isPhone = !email.includes('@');
      if (isPhone) {
        const { data: resolved, error: rpcError } = await supabase
          .rpc('get_email_by_phone', { phone_input: email });
        if (rpcError || !resolved)
          throw new Error('No account found for this mobile number.');
        email = resolved;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Fetch full profile with timeout guard (prevents infinite hang from RLS loops)
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Login timed out. Please try again.')), 10000)
      );

      const profileFetch = supabase
        .from('profiles')
        .select('*, gyms(id, name, theme_color, logo_url, gym_code, owner_name, phone, address, plan, status)')
        .eq('id', data.user.id)
        .single();

      const { data: profile, error: profileError } = await Promise.race([profileFetch, timeout]);

      if (profileError) throw profileError;

      // Apply white-label theme color if gym has one
      const themeColor = profile.gyms?.theme_color || '#a21cce';
      document.documentElement.style.setProperty('--color-brand', themeColor);

      const user = {
        id: profile.id,
        name: profile.full_name,
        email: data.user.email,
        role: profile.role,
        sub_role: profile.sub_role,
        photo_url: profile.photo_url,
        gym_id: profile.gym_id,
        gym: profile.gyms || null,
      };

      localStorage.setItem('gym_user', JSON.stringify(user));
      set({ user, session: data.session, isLoading: false, initialized: true });
      return { success: true, role: user.role };
    } catch (err) {
      const message = err.message || 'Login failed';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  // ── Logout ─────────────────────────────────────────────
  logout: async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('gym_user');
    document.documentElement.style.removeProperty('--color-brand');
    set({ user: null, session: null });
  },

  // ── Restore session on app load ────────────────────────
  restoreSession: async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*, gyms(id, name, theme_color, logo_url, gym_code, owner_name, phone, address, plan, status)')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        const themeColor = profile.gyms?.theme_color || '#a21cce';
        document.documentElement.style.setProperty('--color-brand', themeColor);

        const user = {
          id: profile.id,
          name: profile.full_name,
          email: session.user.email,
          role: profile.role,
          sub_role: profile.sub_role,
          photo_url: profile.photo_url,
          gym_id: profile.gym_id,
          gym: profile.gyms || null,
        };
        localStorage.setItem('gym_user', JSON.stringify(user));
        set({ user, session, initialized: true });
        return;
      }
    }

    // No valid session — clear any stale cache
    localStorage.removeItem('gym_user');
    set({ user: null, session: null, initialized: true });
  },

  // ── Listen for Supabase auth changes (token refresh, sign-out) ──
  listenToAuthChanges: () => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        // Only clear if this wasn't triggered by our own logout()
        if (get().user) {
          localStorage.removeItem('gym_user');
          set({ user: null, session: null });
        }
        return;
      }
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        // If login() already hydrated the user, skip re-fetching to avoid race condition
        if (event === 'SIGNED_IN' && get().user) return;

        // Re-hydrate profile so user object stays fresh after token refresh
        const { data: profile } = await supabase
          .from('profiles')
          .select('*, gyms(id, name, theme_color, logo_url, gym_code, owner_name, phone, address, plan, status)')
          .eq('id', session.user.id)
          .single();
        if (profile) {
          const themeColor = profile.gyms?.theme_color || '#a21cce';
          document.documentElement.style.setProperty('--color-brand', themeColor);
          const user = {
            id: profile.id,
            name: profile.full_name,
            email: session.user.email,
            role: profile.role,
            sub_role: profile.sub_role,
            photo_url: profile.photo_url,
            gym_id: profile.gym_id,
            gym: profile.gyms || null,
          };
          localStorage.setItem('gym_user', JSON.stringify(user));
          set({ user, session, initialized: true });
        }
      }
    });
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
