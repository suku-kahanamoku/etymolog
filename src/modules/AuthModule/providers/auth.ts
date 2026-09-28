import { api } from "../../CoreModule/providers/api";
import type { User } from "../types";
export const authProvider = {
  me: (signal?: AbortSignal) => api<User>("/api/auth/me/", { signal }),
  login: (email: string, password: string) =>
    api<User>("/api/auth/login/", {
      method: "POST",
      body: { email, password },
    }),
  logout: () => api<null>("/api/auth/logout/", { method: "POST", body: {} }),
};
