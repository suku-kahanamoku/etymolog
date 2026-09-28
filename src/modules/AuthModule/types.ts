export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}
export interface LoginResult extends User {
  token: string;
  expires_at: string;
}
