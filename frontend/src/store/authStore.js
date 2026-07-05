import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // ── STATE ──────────────────────────────────────────
      token: null,    // JWT string or null
      user: null,     // { id, email, first_name, last_name, user_type, ... }

      // ── ACTIONS ────────────────────────────────────────
      // set() updates state. get() reads current state (like a getter).

      login: (token, user) => set({ token, user }),

      logout: () => set({ token: null, user: null }),

      updateUser: (user) => set({ user }),

      // get() gives us the current state object.
      // !!get().token converts null→false and "token_string"→true.
      isLoggedIn: () => !!get().token,

      // True if the logged-in user is an organization (can create campaigns).
      isOrgUser: () => get().user?.user_type === 'ORGANIZATION',
    }),
    {
      name: 'thanksgiving-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
)
