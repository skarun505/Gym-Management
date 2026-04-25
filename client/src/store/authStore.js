import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// ── Helper: build user object from profile + session ──────────────
function buildUser(profile, sessionOrEmail) {
  const email = typeof sessionOrEmail === 'string'
    ? sessionOrEmail
    : sessionOrEmail?.user?.email || sessionOrEmail?.email || '';
  return {
    id:        profile.id,
    name:      profile.full_name,
    email,
    role:      profile.role,
    sub_role:  profile.sub_role,
    photo_url: profile.photo_url,
    gym_id:    profile.gym_id,
    gym:       profile.gyms || null,
  };
}

// ── Apply white-label theme ────────────────────────────────────────
function applyTheme(profile) {
  const color = profile?.gyms?.theme_color || '#a21cce';
  document.documentElement.style.setProperty('--color-brand', color);
}

// ── Fetch profile + gym in one query ─────────────────────────────
async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, gyms(id, name, theme_color, logo_url, gym_code, owner_name, phone, address, plan, status)')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

const useAuthStore = create((set, get) => ({
  user:        JSON.parse(localStorage.getItem('gym_user') || 'null'),
  session:     null,
  isLoading:   false,
  initialized: false,
  error:       null,

  // ── Login ──────────────────────────────────────────────────────
  login: async (identifier, password) => {
    set({ isLoading: true, error: null });
    try {
      // Resolve phone → email if needed
      let email = identifier.trim();
      if (!email.includes('@')) {
        const { data: resolved, error: rpcError } = await supabase
          .rpc('get_email_by_phone', { phone_input: email });
        if (rpcError || !resolved)
          throw new Error('No account found for this mobile number.');
        email = resolved;
      }

      // ── Round-trip 1: Supabase Auth sign-in ───────────────────
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // ── OPTIMISTIC: build a minimal user instantly from auth data ──
      // We know id, email, and user_metadata right now without another DB call.
      // Check if we have this user already cached in localStorage (returning user).
      const cached = JSON.parse(localStorage.getItem('gym_user') || 'null');
      const isReturnUser = cached?.id === data.user.id;

      if (isReturnUser) {
        // Returning user → use cached data instantly, navigate now, refresh in BG
        const themeColor = cached.gym?.theme_color || '#a21cce';
        document.documentElement.style.setProperty('--color-brand', themeColor);
        set({ user: cached, session: data.session, isLoading: false, initialized: true });

        // Silently refresh profile in background (no await — don't block)
        fetchProfile(data.user.id).then(profile => {
          const fresh = buildUser(profile, data.user.email);
          applyTheme(profile);
          localStorage.setItem('gym_user', JSON.stringify(fresh));
          set({ user: fresh });
        }).catch(() => { /* ignore background refresh errors */ });

        return { success: true, role: cached.role };
      }

      // ── First-time / new device: must fetch profile (need role for routing) ──
      const TIMEOUT = 8000;
      const profilePromise = fetchProfile(data.user.id);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Login timed out. Please try again.')), TIMEOUT)
      );
      const profile = await Promise.race([profilePromise, timeoutPromise]);

      applyTheme(profile);
      const user = buildUser(profile, data.user.email);
      localStorage.setItem('gym_user', JSON.stringify(user));
      set({ user, session: data.session, isLoading: false, initialized: true });
      return { success: true, role: user.role };

    } catch (err) {
      const message = err.message || 'Login failed';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  // ── Logout ─────────────────────────────────────────────────────
  logout: async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('gym_user');
    document.documentElement.style.removeProperty('--color-brand');
    set({ user: null, session: null });
  },

  // ── Restore session on app load ────────────────────────────────
  // Fast path: if user is cached AND session is still valid, use cache immediately.
  // Slow path: only fetch from DB if cache is missing.
  restoreSession: async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      localStorage.removeItem('gym_user');
      set({ user: null, session: null, initialized: true });
      return;
    }

    // Check cache first — avoids a DB round-trip on every page load
    const cached = JSON.parse(localStorage.getItem('gym_user') || 'null');
    if (cached?.id === session.user.id) {
      // Apply theme from cache immediately — no flicker
      const themeColor = cached.gym?.theme_color || '#a21cce';
      document.documentElement.style.setProperty('--color-brand', themeColor);
      set({ user: cached, session, initialized: true });

      // Silently refresh profile in background to keep data fresh
      fetchProfile(session.user.id).then(profile => {
        const fresh = buildUser(profile, session.user.email);
        applyTheme(profile);
        localStorage.setItem('gym_user', JSON.stringify(fresh));
        set({ user: fresh });
      }).catch(() => { /* ignore — cached data is good enough */ });
      return;
    }

    // No valid cache — must fetch from DB (fresh login on new device)
    try {
      const profile = await fetchProfile(session.user.id);
      applyTheme(profile);
      const user = buildUser(profile, session.user.email);
      localStorage.setItem('gym_user', JSON.stringify(user));
      set({ user, session, initialized: true });
    } catch {
      localStorage.removeItem('gym_user');
      set({ user: null, session: null, initialized: true });
    }
  },

  // ── Listen for auth changes (token refresh, sign-out from another tab) ──
  listenToAuthChanges: () => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        if (get().user) {
          localStorage.removeItem('gym_user');
          set({ user: null, session: null });
        }
        return;
      }

      // SIGNED_IN: login() already handled this — skip to avoid duplicate fetch
      if (event === 'SIGNED_IN') return;

      // TOKEN_REFRESHED: update session object quietly, no profile re-fetch needed
      if (event === 'TOKEN_REFRESHED') {
        set({ session });
      }
    });
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
