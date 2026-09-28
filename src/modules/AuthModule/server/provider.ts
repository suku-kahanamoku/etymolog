import type { CoreClient } from "../../CoreModule/server/php-core";
import { HttpError } from "../../CoreModule/server/errors";
import type { User, LoginResult } from "../types";

export function publicUser(data: User): User {
  if (
    !data ||
    !Number.isInteger(data.id) ||
    typeof data.email !== "string" ||
    typeof data.role !== "string"
  )
    throw new HttpError(502, "invalid_backend_response");
  return {
    id: data.id,
    email: data.email,
    first_name: String(data.first_name ?? ""),
    last_name: String(data.last_name ?? ""),
    role: data.role,
  };
}
export function createAuthProvider(core: CoreClient) {
  return {
    async login(email: string, password: string) {
      const data = await core.request<LoginResult>("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      if (
        !data ||
        typeof data.token !== "string" ||
        !/^[a-f0-9]{64}$/i.test(data.token)
      )
        throw new HttpError(502, "invalid_backend_response");
      return { token: data.token, user: publicUser(data) };
    },
    async me(token: string) {
      return publicUser(await core.request<User>("/auth/me", { token }));
    },
    logout(token: string) {
      return core.request<null>("/auth/logout", { method: "POST", token });
    },
  };
}
export type AuthProvider = ReturnType<typeof createAuthProvider>;
