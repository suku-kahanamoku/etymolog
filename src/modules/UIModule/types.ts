/** Jedna položka navigace webu (odkaz a jeho popisek). */
export interface NavigationItem {
  /** Cílová URL položky. */
  href: string;
  /** Viditelný text odkazu. */
  label: string;
  /** `true`, když položka odpovídá aktuální stránce (přidá `active` a `aria-current`). */
  current?: boolean;
}
