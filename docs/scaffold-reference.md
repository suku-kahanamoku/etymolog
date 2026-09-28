# Astro scaffold

Univerzální základ běžného obsahového webu s vlastní serverovou vrstvou před php-core. Inspirace: `astro-prasentace` (společné šablony, JSON překlady, centrální značka) a `astro-sorry-jako` (malé komponenty a jednoduchý routing). Žádná závislost na souborech sousedních projektů.

Obsahuje Astro 7, Node SSR, nativní file routing/API/middleware, češtinu/angličtinu/němčinu, Tailwind 4, daisyUI 5, `astro:assets`, `astro-seo`, sitemap, robots, přihlášení přes php-core, modulové providery, lifecycle hooks, WebSocket klienta a reklamní rám s horní a dvěma bočními pozicemi. Veřejné stránky mají společný layout a fungují bez backendu; přihlašovací formulář funguje i bez JavaScriptu.

## Spuštění

Node >= 22.12.0, npm. Verze závislostí jsou uzamčené v `package-lock.json`.

```sh
npm ci
cp .env.example .env
npm run dev
```

Výchozí adresa: `http://localhost:4321`. Pro první náhled nejsou potřeba tajné údaje. Přihlášení bez nastaveného backendu zobrazí lokalizovanou chybu.

```sh
npm test
npm run build
npm run start
```

`start` načte lokální `.env`, pokud existuje. V hostingu nastavujte serverové proměnné přímo v prostředí. `PUBLIC_SITE_URL` se používá při sestavení (canonical, sitemap, očekávaný origin formulářů); po změně web znovu sestavte. Build nevolá php-core. `HOST` a `PORT` nastavují naslouchání standalone serveru.

## Nový projekt

1. Zkopírujte tento adresář bez `node_modules`, `dist`, `.astro`, `.env`, testových výstupů a případného `.git`. Ponechte lockfile a `.env.example`.
2. Změňte název balíčku v `package.json` (poté `npm install --package-lock-only`), značku/kontakt/moduly v `src/config/site.ts` a barvy v `src/modules/UIModule/styles/theme.css`.
3. Nastavte `PUBLIC_SITE_URL`, `PHP_CORE_URL`, `PHP_CORE_API_KEY` a `PHP_CORE_TENANT_HOST`. Skutečné hodnoty klíčů necommitujte.
4. Zajistěte backendové mapování hostu, například `novy-web.cz:tenant_code` v `FRANCHISE_CODES` php-core. Frontend toto mapování nevytváří. Backend URL může obsahovat `/api` prefix.
5. Nahraďte ukázkový obsah, `src/modules/ContentModule/assets/hero.svg`, `public/social.png` a favicon. Pro rastrové obrázky používejte `Image`/`Picture` z `astro:assets`; lokální SVG ukázka se záměrně nerasterizuje a nepotřebuje vzdálený image host.
6. Nastavte případné reklamní jednotky, CMP a veřejnou WebSocket URL. Bez této konfigurace žádné externí reklamní ani WebSocket spojení nevzniká.

## Struktura a rozšiřování

```text
src/
  config/                 projektová značka, zapnutí modulů, trasy a reklamní jednotky
  pages/                  jediný routing, skládání sekcí a exporty API handlerů
  layouts/                kompozice HTML dokumentu, SEO, hlavičky, rámu a patičky
  modules/
    UIModule/             společné sekce, menu, disclosure, DOM hooks, styly a theme
    LangModule/           jazyky, typ Locale, dictionary helper, přepínač a vlajky
    SiteModule/           hlavička, patička, značka, sloganový pruh, chyby a SEO
    ContentModule/        HeroSection, FeaturesSection, FeatureCard, AboutSection
    AuthModule/           přihlášení, účet, session hook, API handlery a providery
    AdsModule/            reklamní rám/sloty, parallax, consent a reklamní adaptéry
    RealtimeModule/       WebSocket provider a useRealtime
    CoreModule/           browser API klient a serverový HTTP/request základ
  server/providers.ts     serverová kompozice providerů pro konkrétní aplikaci
  middleware.ts           kompozice request hooku, providerů a session hooku
  styles/global.css       vstup Tailwindu a společných stylů UIModule
```

Každý modul vlastní své `components`, `hooks`, `providers`, `server`, `assets`, `locales`, `styles`, případně `config` a `types.ts`, pokud je skutečně potřebuje. Prázdné složky se nezakládají. Moduly nikdy nemají složku `pages`; stránka se skládá výhradně v hlavním `src/pages`. Úvodní stránka zde přímo skládá `HeroSection`, `BrandStrip` a `FeaturesSection`. Přihlášení, účet, chybová stránka a představení projektu mají každý vlastní sekční komponentu. Sdílená `Section` z UIModule řeší roztažení pozadí a responzivní vnitřní sloupec.

Závislosti směřují ke společným modulům:

| Modul                                | Přímé závislosti na modulech         |
| ------------------------------------ | ------------------------------------ |
| UIModule, CoreModule, RealtimeModule | žádné                                |
| LangModule                           | UIModule (chevron a disclosure hook) |
| SiteModule, ContentModule, AdsModule | UIModule, LangModule                 |
| AuthModule                           | CoreModule, UIModule, LangModule     |

Doménové moduly čtou pouze potřebnou projektovou konfiguraci `config/site`, `config/routes` nebo `config/ads`; neimportují `pages`, layout ani serverovou kompozici providerů. Konfigurace značky používá výchozí theme z UIModule a routy typy jazyků z LangModule. UIModule nezná jazyky, autentizaci ani reklamy; texty a odkazy v menu dostává přes props. LangModule nezná konkrétní stránky ani slovníky jiných modulů; přepínač dostává tvorbu URL přes prop `href`. RealtimeModule dostává URL a zapnutí přes parametry hooku. Mezi funkčními moduly nejsou vzájemné importy ani cykly.

Překlady patří do `modules/<Name>Module/locales/{cs,en,de}.json`. Každý modul má vlastní `providers/translations.ts` s typovaným `createDictionary()` z LangModule. Při přidání jazyka upravte `LangModule/config.ts`, jeho vlajku v `assets/flags` a slovníky všech modulů. `npm run check` automaticky kontroluje shodnou strukturu a neprázdné překlady každého modulu. Globální agregátor slovníků se nepoužívá, takže například AuthModule nenačítá obsah homepage.

Novou stránku přidejte do `src/config/routes.ts`, její sekce do příslušného modulu a poskládejte je v `[...path].astro` nebo samostatné routě v `src/pages`. Veřejné stránky přidejte do `publicPages`, ze kterého vzniká sitemap. CZ je bez prefixu, EN/DE s prefixem; `url(locale, page)` používají odkazy i hreflang. Neznámé cesty vracejí skutečnou 404.

Novou doménovou funkci přidejte jako `modules/<Name>Module`. Serverový provider dostane `CoreClient` z `server/providers.ts`, vlastní pevné endpointy a mapování odpovědí. API handler s validací patří do `server/` modulu; `pages/api/...` ho pouze exportuje. Browser provider používá `CoreModule/providers/api.ts`. Klientské komponenty, hooky a providery nesmějí importovat serverový kód; klient/server se nespojují do společného barrel exportu. Nesestavujte PHP cestu z libovolného browserového vstupu a nevytvářejte catch-all proxy.

`CoreModule/server/requestHook.ts` spravuje request ID, ochranu mutací a hlavičky odpovědí. `AuthModule/server/sessionHook.ts` poskytuje lazy `locals.getUser()`, které v jednom požadavku ověří uživatele nejvýše jednou. Veřejné stránky uživatele nenačítají. Při nové chráněné stránce nastavte `locals.privatePage = true`, ověřte `getUser()` a až poté načítejte soukromá data.

`npm test` kontroluje také povolené závislosti, cykly včetně cest přes projektovou konfiguraci, umístění rout a tranzitivní oddělení klientského a serverového kódu. Při přidání modulu deklarujte jeho povolené závislosti v `tests/architecture.test.ts`. Styly patří vlastníkovi: UIModule drží theme/layout/primitiva, ostatní moduly importují vlastní styly z komponent. Hooky UI vracejí cleanup; `onDocumentDispose()` ho zavolá při zániku dokumentu a zachovává obsluhu při uložení do bfcache.

## php-core a autentizace

Každý upstream požadavek přidává serverový `X-Internal-Key` a pevný `X-Forwarded-Host` z prostředí. Hodnoty z příchozího browserového požadavku se nepřebírají. Client má desetisekundový timeout, zakazuje redirecty a překládá upstream chyby do obecných kódů bez výpisu výjimek/tajemství. API root a klíč se importují přes `astro:env/server`.

| Astro endpoint           | php-core endpoint   | Chování                                                               |
| ------------------------ | ------------------- | --------------------------------------------------------------------- |
| POST `/api/auth/login/`  | POST `/auth/login`  | JSON nebo URL-encoded formulář, uloží token, vrací jen veřejný profil |
| GET `/api/auth/me/`      | GET `/auth/me`      | Ověřený profil, bez tokenu a dalších backendových polí                |
| POST `/api/auth/logout/` | POST `/auth/logout` | Odvolá token v backendu a smaže cookie                                |
| GET `/api/health/`       | žádný               | Liveness Astro serveru; není to kontrola php-core/DB                  |

User Bearer se přenáší v host-only `HttpOnly`, `SameSite=Lax` cookie, v produkci se `Secure`, bez localStorage. Cookie je relační; platnost a odvolání tokenu určuje php-core, backendový čas bez timezone se nepřepočítává. Není potřeba session databáze na jednotlivých Astro instancích. Pro souběžné instance stačí stejná konfigurace a backend. Při 401 z `/auth/me` se cookie zahodí; výpadek backendu se ukáže jako 503, nikoli jako falešné odhlášení. Při neúspěšném odvolání tokenu logout zobrazí chybu a zachová cookie pro opakování.

Všechny `/api` mutace kontrolují `Origin` proti nakonfigurovanému veřejnému originu (včetně portu). JSON i formuláře mají limit 16 KiB. API a soukromé stránky vracejí `Cache-Control: private, no-store`; validace a rate limiting přihlášení v php-core zůstávají zachované. Role v profilu slouží UI, nikdy nenahrazují backendovou autorizaci. Pro produkci nastavte HTTPS a případné edge rate limiting podle hostingu. Za reverse proxy musí `PUBLIC_SITE_URL` odpovídat veřejné adrese.

## Layout a reklama

Společný rám má minimální výšku `100dvh` (fallback `100vh`). Řádek hlavního obsahu vyplní volné místo, takže patička krátké stránky končí na spodním okraji viewportu; na dlouhé stránce je až za obsahem a nic nepřekrývá. Funguje také při vypnutých reklamách.

Hlavní sekce používají společnou komponentu `modules/UIModule/components/Section.astro`: vnější `<section>` i její pozadí sahají od levého po pravý okraj viewportu, vnitřní `.section-inner` zachovává šířku obsahového sloupce pro sm/md/lg/xl/2xl. Šířky se sdílejí přes CSS Grid `subgrid`, bez výpočtů `100vw` a vodorovného přetékání. Pozadí lze nastavit propem `background` (barva nebo gradient); rozložení obsahu přes `contentClass`. Boční sticky reklamy jsou v samostatné vyšší vrstvě nad pozadími sekcí, obsah zůstává mezi nimi.

```astro
<Section contentClass="content-section" background="var(--color-base-200)">
  <h1>Obsah nové sekce</h1>
</Section>
```

Tailwind breakpointy: sm 640, md 768, lg 1024, xl 1280, 2xl 1536 px. Mobil má jednořádkovou hlavičku s rozbalovacím menu a skládaný obsah. Od md je hero dvousloupcové. Horní reklamní pozice je dostupná všude, spodní reklamní banner se nevykresluje. Horní banner používá parallax: při scrollování se kreativa pohybuje poloviční rychlostí oproti obsahu stránky a postupně mizí za okrajem své reklamní plochy. Posun se počítá přes `requestAnimationFrame` v `src/modules/AdsModule/hooks/useTopAdReveal.ts`. Výška rezervovaného prostoru se nemění, iframe se znovu nevytváří a při návratu nahoru se reklama opět odkryje. Při `prefers-reduced-motion` nebo bez JavaScriptu banner přirozeně odscrolluje. Boční pozice se zobrazují až od xl (160 px, od 2xl 200 px); šířka hlavního obsahu zůstává čitelná. Při scrollování se oba boční panely zachytí 16 px pod spodním okrajem hlavního menu (`position: sticky`) a zůstávají omezené výškou obsahové řady rámu. Sloty rezervují rozměry; reklama nepřekrývá obsah.

Jednotky se konfigurují samostatně v `src/config/ads.ts`:

```ts
top: { provider: "google", client: "ca-pub-SKUTECNE_CISLO", slot: "SKUTECNE_CISLO" },
left: { provider: "seznam", zoneId: 12345, width: 160, height: 600 },
```

Výchozí `placeholder` nikam nevolá. Produkční ID a rozměry získáte od provozovatele reklam. Google se inicializuje přes `adsbygoogle`, Seznam přes `sssp.getAds`; načítají se jen viditelné sloty poblíž viewportu a skript dodavatele nejvýše jednou. Skryté boční sloty na mobilu nevyvolávají reklamní požadavky. Po blokaci reklamy zůstane rezervovaný prostor; není zde automatické obnovování impresí.

Projektová CMP musí po vyhodnocení skutečného souhlasu zavolat v klientském modulu:

```ts
import { consentProvider } from "@/modules/AdsModule/providers/consent";
consentProvider.setAdvertising(true); // pouze podle výsledku CMP
// při odvolání souhlasu:
consentProvider.setAdvertising(false);
```

Bridge není vlastní CMP a nevytváří souhlas za uživatele. Výchozí hodnota je false, nic se samo neukládá. Při odvolání po načtení reklamy se dokument obnoví, aby v něm neběžel starý reklamní skript; CMP musí změnu souhlasu uložit před zavoláním bridge. Konkrétní vendor consent, produkční reklamní účet a případný `ads.txt` doplňte podle projektu.

## WebSocket

`modules/RealtimeModule/providers/client.ts` nabízí `connect`, `send`, `close`, stav připojení, JSON příjem, omezení send bufferu a exponenciální reconnect s jitterem a limitem pokusů. Policy/auth uzavření se automaticky neopakují. HTTPS stránka přijímá pouze WSS URL. `modules/RealtimeModule/hooks/useRealtime.ts` přijímá explicitní `url` a volitelné `enabled`; volající předá projektovou konfiguraci; vrácený `cleanup()` zavolejte při unmountu komponenty (pagehide ho zavolá také).

```ts
import { useRealtime } from "@/modules/RealtimeModule/hooks/useRealtime";
import { site } from "@/config/site";
const realtime = useRealtime({
  url: import.meta.env.PUBLIC_WEBSOCKET_URL ?? "",
  enabled: site.modules.realtime,
  onMessage(data) {
    /* validate the domain payload */
  },
});
// Odesílejte po stavu "open"; send() vrací false, dokud socket není připraven.
realtime.send({ type: "subscribe", channel: "public-news" });
// On component unmount:
realtime.cleanup();
```

Scaffold neobsahuje fiktivní php-core WebSocket endpoint. Pro konkrétní projekt nastavte existující gateway a její zprávový kontrakt; privátní kanály potřebují skutečný ticket/auth endpoint a autorizaci na gateway. PHP API klíč ani uživatelský Bearer nevkládejte do veřejné URL nebo websocket protokolu. Serverový HTTP runtime sám o sobě nezaručuje podporu dlouhých WSS spojení v hostingu.

## Testování a nasazení

```sh
npm test
npm run build
npm exec playwright install chromium
npm run test:browser
npm run format:check
```

Jednotkové testy ověřují modulové hranice i serverové hlavičky, pevný tenant, sanitizaci odpovědí, chyby/timeout, CSRF, limity těla a routy. Browser testy spouští vlastní php-core mock na 4399 a Astro na 4328; ověřují login/logout, HttpOnly cookie, 404, jazyky, SEO, menu a šířky 360–1920 px. Nepoužívají sdílenou DB ani skutečné účty. Mock kontraktu není důkaz živého přihlášení do produkčního php-core nebo živého výdeje reklamy.

Výchozí deployment je samostatný Node proces `dist/server/entry.mjs` za HTTPS reverse proxy. Build vytváří `dist/client` a `dist/server`; nasaďte obě části a runtime závislosti. Netlify/Vercel/Cloudflare vyžadují záměnu oficiálního Astro adaptéru a ověření serverových proměnných a runtime daného hostingu. Formuláře/auth se nesmí převést na čistý statický hosting.

Odkazy ke konvencím: [Astro Node adapter](https://docs.astro.build/en/guides/integrations-guide/node/), [Astro i18n](https://docs.astro.build/en/guides/internationalization/), [daisyUI pro Astro](https://daisyui.com/docs/install/astro/), [astro-seo](https://github.com/jonasmerlin/astro-seo), [Seznam SSP](https://partner.seznam.cz/napoveda/seznam-partner-program/postup-nasazeni-reklamy/), [Google responsive ads](https://support.google.com/adsense/answer/9183460?hl=en).

Přepínač jazyků v `modules/LangModule/components/LanguagePicker.astro` přebírá vlajky, kulatý obal aktuálního jazyka a rozbalovací nabídku z astro-prasentace. Zachovává aktuální stránku při změně jazyka; nabídka funguje i bez JavaScriptu, se skriptem se navíc zavírá kliknutím mimo a klávesou Escape s návratem focusu.

Hamburger menu přebírá z astro-prasentace dvě animované čárky měnící se na křížek, styl rozbalovacího panelu, Escape, kliknutí mimo a zavření po odjetí myši (180 ms). Zobrazuje se pod md (768 px), aby odpovídalo breakpointům scaffoldu. Bez JavaScriptu jsou mobilní odkazy rozbalené. `modules/SiteModule/components/BrandStrip.astro` je sloganový pruh značky (brand strip / statement banner), vložený mezi hero a obsah; přebírá typografii a barvy reference, ale používá vlastní slogan scaffoldu v CS/EN/DE. Uprostřed je stejná značka jako v menu díky společné komponentě `modules/SiteModule/components/BrandMark.astro`. Texty pro nový projekt změňte v `brandStrip` ve slovnících. Pozadí pruhu zůstává přes celý viewport pod bočními reklamami.

Hlavní hlavička sahá přes celý viewport, její `.header-inner` drží obsah v responzivním sloupci. Je sticky (`top: 0`) s průsvitným pozadím `rgb(250 247 239 / 88%)`, rozostřením 8 px a stínem podle astro-prasentace. Zůstává nad hlavním obsahem při scrollování.

Scaffold zatím obsahuje pouze vlastní světlé daisyUI téma `scaffold` (`src/config/site.ts`, `data-theme` na `<html>` a definice barev v `UIModule/styles/theme.css`). Přepínání light/dark/system ani ukládání uživatelské preference nejsou implementované.

Výšku hlavičky měří `modules/UIModule/hooks/useHeaderOffset.ts` přes `ResizeObserver` včetně změn breakpointu či zalomení. Společné CSS proměnné `--site-header-height` a `--sticky-top` řídí horní odstup bočních reklam i `scroll-padding-top` pro nativní kotvy a odkaz „Přejít k obsahu“. Další sticky prvky obsahu používají třídu `sticky-below-header` nebo `top: var(--sticky-top)`; jen hlavní menu má `top: 0`. Reklamy jsou nad pozadími sekcí, hlavička je nad reklamami.
