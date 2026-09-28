# Etymolog

Samostatný frontend z `astro-scaffold`: Astro 7, Node SSR, TypeScript, Tailwind 4 a daisyUI 5. Vzhled připomíná prvorepublikové noviny: knižní typografie, tiskařské linky, barevné podklady sekcí a nové dekorativní ilustrace. Původní projekty scaffold a Prasentace nejsou upravené.

## Spuštění

Node >= 22.12.0, npm. Závislosti jsou uzamčené v `package-lock.json`.

```sh
npm ci
# Pouze pokud .env ještě neexistuje:
cp .env.example .env
npm run dev
```

Frontend vyžaduje volný port 4321; při obsazení skončí chybou místo tichého přechodu na jiný port.

Web: `http://etymolog.localhost:4321`, redakce: `/administrace/`. Přihlášení používá existující účty tenantu Etymolog v php-core. Nové účty ani hesla frontend nevytváří.

Konfigurace používá stejné názvy a princip jako `nuxt/fann`. Lokální `.env` odkazuje na již běžící PHP API `http://127.0.0.1/php/php-core/api`; samostatný PHP server na portu 8000 ani npm příkaz pro backend nejsou potřeba. Klíč zůstal stávající platný klíč php-core a je pouze na serveru.

| Proměnná               | Význam                                                                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PHP_API_BASE_URL`     | URL existujícího PHP API včetně `/api`, lokálně `http://127.0.0.1/php/php-core/api`.                                                                                            |
| `INTERNAL_API_KEY`     | Stejný serverový klíč jako v php-core. Nesmí být ve veřejném bundle.                                                                                                            |
| `FRONTEND_HOST`        | Veřejná adresa webu, lokálně `http://etymolog.localhost:4321`; používá se pro canonical, sitemap, origin formulářů a hostname tenantu. Po změně přestavět a restartovat server. |
| `PUBLIC_WEBSOCKET_URL` | Volitelná skutečná veřejná WebSocket gateway. Výchozí prázdná.                                                                                                                  |
| `HOST`, `PORT`         | Naslouchání produkčního Node serveru.                                                                                                                                           |

Tenant se odvozuje výhradně z `new URL(FRONTEND_HOST).hostname`, stejně jako ve FAnn. V php-core musí existovat mapování `etymolog.localhost:etymolog` v `FRANCHISE_CODES`. Host nikdy nepřebíráme z klientského požadavku. V prohlížeči používejte adresu z `FRONTEND_HOST`, aby souhlasila i kontrola originu při přihlášení. `PHP_FILE_ROOT` není potřeba: tento frontend pracuje přes HTTP API a nečte backendové soubory.

Bez backendu se zobrazí veřejná kostra, O nás a Kontakt; hledání oznámí nedostupnost. Nevkládá falešné výsledky. Na následný pokyn byla hromadně zveřejněna všechna tehdejší aktivní hesla (1 314 jmen a příjmení). Texty a příběhy mají vlastní stav publikace. Hláška „Archiv je dočasně nedostupný“ označuje chybu komunikace/API, nikoli prázdný výsledek hledání; ověřte dostupnost existujícího PHP serveru na `PHP_API_BASE_URL` a platnost serverové konfigurace.

## Stránky a funkce

- `/`: hledání jména/příjmení, filtr druhu, výsledky pod formulářem a stránkování. Formulář funguje i bez JavaScriptu přes GET; JS doplňuje výsledky bez přechodu na jinou stránku a brání závodům starých odpovědí.
- `/jmeno/:id/`: publikovaný detail. Etymologie, historie, úřední změny, pověsti, mytologie, literární příběhy, tradice, pranostiky, varianty, výskyty, kalendáře a prameny. Prázdné oddíly se nevykreslují.
- `/o-nas/`: smysl projektu, práce s prameny a omezení výkladu.
- `/kontakt/`: provozovatel Süchceren Cecegé, fyzická osoba podnikající dle živnostenského zákona, zapsaná v živnostenském rejstříku; `info@prasentace.cz`, `+420 722 767 646`, IČO `04473442`, Eleonory Voračické 2167/29, 616 00 Brno – Žabovřesky. E-mail a telefon mají funkční odkazy; stránka nepředstírá odesílání pošty.
- `/prihlaseni/`, `/ucet/`, `/administrace/`: přihlášení, účet/odhlášení a chráněná redakce. Po přihlášení se otevře redakce.
- CS bez prefixu, EN `/en/`, DE `/de/`. Změna jazyka zachovává detail stejného ID. UI se překládá, historické texty se automaticky nepřekládají ani nedoplňují.
- Světlé/tmavé téma, systémová preference při první návštěvě, uložení volby, klávesnice, hamburger a funkční navigace bez JS.

Pověsti a literární fikce jsou označené jako vyprávění, nikoli doklad původu. Citace, licence a atribuce pocházejí z backendu. Datum je zobrazené ve svém kalendáři; aplikace nepřevádí juliánská data na gregoriánská. Četnosti rozlišují rok, zemi, měření a pohlaví; nula není zaměněna za chybějící údaj. Texty se escapují, nespouští se jako HTML. Odkazy na prameny povolují pouze HTTP(S).

## Moduly

Všech osm původních modulů scaffoldu je zachováno: `CoreModule`, `UIModule`, `LangModule`, `SiteModule`, `ContentModule`, `AuthModule`, `AdsModule`, `RealtimeModule`.

| Modul            | Vlastněná odpovědnost                                                                                    |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| `EtymologModule` | Hledání, detaily, všechny redakční CRUD formuláře, jejich konfigurace, hooky, serverové providery a API. |
| `AdminModule`    | Nezávislý obal chráněné redakce a slot pro jednotlivé doménové administrace. Neimportuje Etymolog.       |
| `ContactModule`  | Kontaktní stránka a lokalizace. Údaje čte z `config/site.ts`.                                            |
| `UIModule`       | Obě témata, přepínač, sdílené UI, navigace, ikony a barvy pozadí.                                        |
| `ContentModule`  | O projektu, stručné vysvětlení na homepage a dekorativní archivní ilustrace.                             |
| `SiteModule`     | Hlavička, patička, nové logo a SEO.                                                                      |

Routy pouze skládají moduly. Serverová kompozice zůstává v `src/server/providers.ts`; `src/pages/api` pouze exportuje modulové handlery. Doménové moduly se navzájem neimportují. Modulové slovníky CS/EN/DE mají kontrolovanou stejnou strukturu. Původní demonstrační komponenty scaffoldu zůstaly k dispozici, nejsou vložené do homepage Etymologu.

## Redakce a CRUD

V `EtymologModule/config/resources.json` je explicitní snapshot polí skutečného `php-core/src/Modules/Etymolog/ResourceRegistry.php`. Při změně backendového registru aktualizujte snapshot i překlady. Formuláře podporují typy, enumy, povinné hodnoty, nullable pole, data a referenční ID.

| Zdroj API       | Redakční část                                  |
| --------------- | ---------------------------------------------- |
| `names`         | Jména a příjmení, shrnutí, publikace           |
| `sources`       | Prameny, autoři, URL, licence, atribuce        |
| `entries`       | Výklady a příběhy všech osmi typů              |
| `entry-names`   | Sdílené vazby textů ke jménům, jejich kontrola |
| `variants`      | Pravopisné a historické varianty               |
| `occurrences`   | Výskyty, statistiky, historická doložení       |
| `citations`     | Citace textů a pramenů                         |
| `calendars`     | Kalendáře, systémy a tradice                   |
| `calendar-days` | Jmeniny, svátky, významné dny a lidové tradice |
| `sync-jobs`     | Konfigurace synchronizací, pouze správce       |

Každá část má seznam, filtr názvu nebo ID, stránkování po 20, vytvoření, načtení, úpravu a smazání. Odkazy mezi daty se zadávají referenčními ID z odpovídajících seznamů. Změny ukládá PATCH. Běžné smazání je backendový soft delete; správce má také potvrzované trvalé smazání, které backend odmítne při závislostech. Importní podklady jsou pouze pro čtení. Správce vidí historii běhů a může resetovat postup úlohy. U synchronizačních úloh je vedle „Nový záznam“ tlačítko „Spustit synchronizaci“. Přes chráněné API spustí PHP worker na pozadí a zobrazuje jeho průběh. Worker používá stejnou službu jako cron: jednu dávku všech zapnutých splatných úloh, bez resetu kurzorů a bez automatického publikování. Opakovaný klik nevytvoří souběžný běh.

Publikační pravidla, ověřování vazeb a licence vynucuje php-core. Kulturní texty potřebují doložený webový pramen a citaci. Editor se nepovýší na správce skrytím/změnou HTML: API vždy ověřuje aktuální uživatele a backend znovu kontroluje oprávnění.

## Backendový kontrakt a bezpečnost

Nové úzce vymezené GET endpointy php-core:

```text
GET /api/etymolog/public/names?q=Novak&kind=surname&page=1
GET /api/etymolog/public/names/123
```

Vyžadují interní klíč a známý tenant, nikoli uživatelský token. Pevná veřejná projekce nezahrnuje redakční poznámky, importní payloady, auditní uživatele ani tenant sloupce. Hledání obsahuje `items,total,page,limit`. Detail obsahuje `name,entries,citations,variants,occurrences,calendar_days,sources`. Zobrazuje jen aktivní publikovaná jména a texty, ověřené sdílené vazby, publikované kalendářní dny a aktivní zdroje. Varianty neodkazují na neveřejné cílové jméno. Chybějící/smazané/nepublikované/cizí heslo vrací 404. Nová migrace není potřeba.

Browser používá pouze Astro `/api/etymolog/search/` a chráněné `/api/admin/etymolog/:resource/[:id/[:action/]]`. Nemůže volit upstream URL, tenant, klíč ani důvěryhodnou roli. API nefunguje jako otevřená proxy. Všechny HTTP požadavky vedou přes CoreClient a provider modulu. Uživatelský token je jen v HttpOnly, SameSite=Lax cookie `etymolog_session`, v produkci Secure. Mutace kontrolují origin, typ a velikost těla; administrace dovoluje pouze známá pole. Soukromé stránky i API mají `private, no-store`; redakce není indexovatelná. Chyby upstreamu se nevracejí v syrovém znění.

## Zachovaná infrastruktura

Reklamní rám má horní a dvě boční pozice, původní parallax/sticky chování a načítání až po consent signálu z projektové CMP. `config/ads.ts` nyní používá nevolající placeholdery. Boční reklamy se načítají pouze při viditelnosti; soukromé stránky jsou bez reklam. Při aktivaci skutečných vendorů nastavte jejich ID a napojte `AdsModule/providers/consent.ts` na skutečnou CMP. Modul sám souhlas neuděluje.

Realtime klient, reconnect a hooky jsou zachované; neexistující backendový WebSocket endpoint se nevymýšlí. Veřejná URL nesmí obsahovat API klíč ani uživatelský bearer. Detaily původní infrastruktury jsou v [referenční dokumentaci scaffoldu](docs/scaffold-reference.md); aktuální odlišnosti Etymologu popisuje tento soubor.

Sitemap obsahuje statické veřejné stránky všech jazyků. Dynamická hesla mají vlastní canonical, do sitemap se zatím neenumerují. Přihlašovací a redakční stránky mají noindex. Sdílení používá nový `public/social.webp`.

## Ověření a nasazení

```sh
npm test
npm run build
npm run format:check
npm run test:browser
```

Prohlížečové testy spouštějí izolovaný mock na 4409 a Astro na 4338. Ověřují všech deset CRUD částí, hledání, detail, zdroje, escapování textů, role, CSRF, auth cookie, jazyky, reklamy, bez-JS formulář, theme, menu a šířky 360–1920 px. Testovací příběhy existují pouze v `tests/mock-core.mjs`.

Ověřeno: frontendové jednotkové testy, Astro check/build, Chromium a PHP integrační testy na jednorázové MySQL (`scripts/test-etymolog.sh`, 340 kontrol; též HTTP a Transport suite). Živě prošel read-only dotaz Astro → lokální php-core → aktuální databáze. Přihlášení a CRUD s reálným redakčním účtem ani produkční nasazení v tomto kroku neproběhly; browser testy auth/CRUD používají mock a backend má vlastní databázové integrační testy.

Produkce používá Node SSR: `npm run build`, `npm run start` za HTTPS proxy. Nasazuje se `dist/client`, `dist/server` a runtime závislosti. Produkční prostředí musí mít správný tenant, klíč, origin a nasazené nové php-core veřejné endpointy. Formuláře a auth nelze provozovat na čistě statickém hostingu.

### Netlify

Na Netlify konfigurace automaticky vybere `@astrojs/netlify` podle systémové proměnné `NETLIFY=true`. Adaptér vytvoří serverovou funkci a směrování pro SSR stránky i API. Mimo Netlify zůstává samostatný Node server s `npm run start`.

Soubor `netlify.toml` nastavuje build `npm run build`, publish directory `dist` a Node 22. Base directory musí odpovídat kořeni tohoto projektu. Nenasazujte samotný `dist/client` z Node buildu ani nepřidávejte SPA přepis na `index.html`; aplikace vyžaduje serverové vykreslování. Netlify sestavení lze lokálně ověřit pomocí `NETLIFY=true npm run build`.

V projektu Etymolog na Netlify přidejte doménu `etymolog.prasentace.cz` a nastavte `FRONTEND_HOST=https://etymolog.prasentace.cz` pro build i Functions. `PHP_API_BASE_URL` musí vést na veřejně dostupné produkční PHP API včetně `/api`; `INTERNAL_API_KEY` nastavte jako serverové tajemství dostupné Functions. V backendovém `FRANCHISE_CODES` musí být mapování `etymolog.prasentace.cz:etymolog`. Hodnoty z lokálního `.env` s localhostem nejsou produkční konfigurace. Po změně konfigurace spusťte nový produkční deploy.

Nové obrázky, původní prompty a jejich použití: [docs/brand-assets.md](docs/brand-assets.md). Historická data se jejich generováním nijak nedoplňují.

## Světlé a tmavé téma

- `UIModule/config/theme.ts` definuje názvy obou témat, barvu prohlížeče a vlastní klíč úložiště projektu.
- `UIModule/components/ThemeInit.astro` nastavuje téma v hlavičce před vykreslením obsahu. `ThemeToggle.astro` je přístupné tlačítko se sluncem/měsícem bez rámečku, pozadí nebo stínu; při ovládání klávesnicí má viditelný focus.
- `UIModule/hooks/useTheme.ts` ukládá ruční volbu a synchronizuje záložky. Bez platné uložené volby sleduje `prefers-color-scheme` včetně změn za běhu. Chyba úložiště přepnutí nezablokuje; bez JavaScriptu zůstává výchozí světlá stránka a tlačítko je skryté.
- Každý modul vlastní styly svých komponent. Sdílené proměnné `--theme-*` a případné daisyUI tokeny dodává UIModule; modul si může přidat vlastní proměnné a tmavé varianty pod `[data-theme-mode="dark"]`. Původní světlé barvy zůstávají ve fallback hodnotách. Nepoužívejte plošné invertování obrázků ani barev.
- Automatický režim se obnoví smazáním projektového klíče z `localStorage`; přepínač v menu nabízí ruční světlou/tmavou volbu.
- `tests/browser/theme.spec.ts` ověřuje systémovou i uloženou volbu, synchronizaci záložek, zakázané úložiště, klávesnici, jazyky, responzivitu a podobu tlačítka. Backendové scénáře browser testů používají mock, nikoli produkční služby.

## Společné hlavní menu

Rozložení hlavičky vlastní `src/modules/UIModule/components/MainMenu.astro`, styly `UIModule/styles/main-menu.css` a chování `useMainMenu`, `useNavigation` a `useHeaderOffset`. Tato komponenta a její rozložení jsou shodné v projektech astro-scaffold, astro-etymolog, astro-prasentace a astro-sorry-jako. Repozitáře zůstávají samostatné a neimportují soubory sousedních projektů.

`SiteModule/components/Header.astro` je pouze projektová kompozice:

- `items` definuje hlavní odkazy (`href`, `label`, volitelně `current`); `mobileItems` navíc obsahuje přihlášení nebo hlavní akci.
- Slot `brand` obsahuje logo, slot `language` jazykový přepínač a slot `action` přihlášení nebo výrazné CTA. `locale` předává jazyk přepínači tématu z UIModule, `label` pojmenovává navigaci. Volitelné `openLabel`/`closeLabel` pojmenovávají hamburger.
- Desktop od 1280 px používá tři sloupce: logo vlevo, navigace přesně uprostřed, akce vpravo v pořadí téma → jazyk → hlavní akce. Mezi tématem a jazykem je 8 px.
- Pod 1280 px přechází navigace do hamburgeru. Pod 768 px se hlavní akce přesune do mobilních odkazů. Funguje Escape, kliknutí mimo, zavření po výběru odkazu, změna šířky i navigace bez JavaScriptu.
- `framed` zapojuje hlavičku do existujícího subgridu stránky (Scaffold/Etymolog); nezapíná reklamy. `showAction={false}` skryje volitelnou akci i její prostor.
- Projektové barvy se upravují pomocí `--menu-background`, `--menu-panel`, `--menu-link`, `--menu-accent` a `--menu-border` ve stylech SiteModule. Logo si zachovává vlastní brand styly. Rozložení se v SiteModule znovu nedefinuje.

Při založení dalšího projektu použijte Scaffold jako šablonu a zachovejte MainMenu i jeho UI závislosti. Měňte pouze značku, data odkazů, překlady a slot hlavní akce v projektové hlavičce. Při změně společného rozložení přeneste stejné soubory UIModule do ostatních samostatných projektů. `tests/browser/main-menu.spec.ts` hlídá centrování, pořadí, rozestupy, překryvy a přechod mezi desktopem a hamburgerem.

## Lokalizované URL

URL slugy jsou v `src/config/locales/{cs,en,de}.json`; stabilní ID a tvorbu odkazů spravuje `src/config/routes.ts`. Nové odkazy skládejte helpery, nikoli ručně. Překlady textů zůstávají v jednotlivých modulech.

Například `about` má adresy `/o-nas/`, `/en/about/` a `/de/ueber-uns/`. Menu, přepínač jazyků, canonical, hreflang a sitemap používají stejný `url()`. Staré nepřeložené cesty se pro GET/HEAD přesměrují stavem 308 se zachováním query; API cesty se nepřekládají. Robots vylučuje nové i původní soukromé adresy.

Detaily používají `nameUrl(locale, id)`: `/jmeno/123/`, `/en/name/123/`, `/de/name/123/`. Přepnutí jazyka zachová ID záznamu a detail obsahuje odpovídající hreflang.

Pro běh na pozadí aplikujte v php-core migrace `2026-09-28-etymolog-background.sql` a `2026-09-28-etymolog-dictionaries-tenant.sql`. Druhá připravuje 10 dalších úloh pro český a francouzský Wikislovník a prioritní česká hesla v anglickém Wiktionary. Podrobnosti licencí a požadavků na PHP worker jsou v `../../php/php-core/src/Modules/Etymolog/README.md`. Tlačítko i polling vlastní EtymologModule; AdminModule pouze poskytuje rámec administrace.

Veřejné vyhledávání slučuje stejné znění jména bez ohledu na jeho druh napříč importními zdroji, jazyky a zeměmi (ignoruje velikost písmen a krajní mezery, zachovává diakritiku). `ANNA` a `Anna` tvoří jedno heslo s předností běžného zápisu. Detail sdružuje pouze zveřejněné podklady zveřejněných členů; původní URL vede přes dočasné přesměrování na aktuální společné heslo. Databázové záznamy a původ jednotlivých zdrojů zůstávají zachované. Etymologie a mytologie mají přednost i s vysvětlením chybějících podkladů; statistiky jsou poslední sekcí.

Stejný zápis vedený jako křestní jméno i příjmení má také jen jeden veřejný výsledek a jeden detail. Filtr druhu zachovává stejné ID; veřejný štítek `both` se zobrazuje jako „Křestní jméno i příjmení“. Jednotlivé etymologie a kulturní texty se v detailu neslučují do jednoho výkladu.
