/**
 * Veřejně bezpečná reprezentace uživatele.
 *
 * Odpovídá tomu, co backend vrátí i po vyčištění; hesla ani další interní
 * políčka se nikdy nepropagují do odpovědí API.
 */
export interface User {
  /** Primární klíč uživatele. */
  id: number;
  /** Přihlašovací e-mail. */
  email: string;
  /** Křestní jméno (může být prázdné). */
  first_name: string;
  /** Příjmení (může být prázdné). */
  last_name: string;
  /** Role, např. `admin` nebo `user`; rozhoduje o přístupu v administraci. */
  role: string;
}

/** Výsledek přihlášení: profil uživatele plus krátkodobý Bearer token. */
export interface LoginResult extends User {
  /** Bearer token relace pro další požadavky. */
  token: string;
  /** Čas vypršení relace ve formátu backendu (neparsuje se v prohlížeči). */
  expires_at: string;
}
