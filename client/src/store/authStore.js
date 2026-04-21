import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('gym_user') || 'null'),
  session: null,
  isLoading: false,
  initialized: false,   // true once restoreSession() has completed
  error: null,

  // ── Login ──────────────────────────────────────────────
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Fetch full profile (role, gym_id, gym theme)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*, gyms(id, name, theme_color, logo_url, gym_code, owner_name, phone, address, plan, status)')
        .eq('id', data.user.id)
        .single();

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
      set({ user, session: data.session, isLoading: false });
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
          set({ user, session });
        }
      }
    });
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
