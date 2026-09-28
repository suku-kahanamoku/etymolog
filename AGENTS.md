# Astro Etymolog

- Měňte pouze tento projekt, pokud není výslovně zadáno jinak.
- Značka a zapnutí modulů patří do `src/config/site.ts`, reklamní jednotky do `src/config/ads.ts`, trasy do `src/config/routes.ts`.
- Texty UI udržujte v `src/modules/<Name>Module/locales/{cs,en,de}.json`; všechny jazyky používají stejné komponenty a helper `url()`.
- Backendové kontrakty nejprve ověřte v `../../php/php-core/API.md` a skutečné implementaci. Nepředpokládejte dostupnost nového endpointu ani WebSocket serveru.
- Veškeré HTTP požadavky na php-core vedou přes `src/modules/CoreModule/server/php-core.ts` a modulový serverový provider. Žádný otevřený proxy endpoint.
- `INTERNAL_API_KEY`, pevný tenant a uživatelský Bearer patří pouze do serverové vrstvy. Nikdy nepřebírejte klientské `X-Forwarded-Host`, API klíč či role jako důvěryhodné údaje.
- Provider mapuje odpověď backendu; veřejná API vrstva vrací jen záměrně vybraná pole. Autorizaci nad daty vždy ověřuje php-core.
- Nové mutace musí projít kontrolou originu, validací vstupu a limity velikosti. Soukromé odpovědi nejsou cacheovatelné.
- Reklamní skripty načítejte až po signálu projektové CMP a pouze pro viditelné sloty.
- Pro klientské interakce preferujte malé TypeScript moduly a Astro islands jen tam, kde dávají smysl.
- Spusťte `npm test`, `npm run build`, `npm run format:check`; při změně layoutu nebo auth také `npm run test:browser`.
- Oddělujte ověření mockem, prohlížečem a skutečným backendem. Aktualizujte README při změně kontraktu nebo konfigurace.

- Moduly používají název `<Name>Module` a vlastní potřebné `assets`, `locales`, `hooks`, `components`, `providers`, `server`, `styles` a `config`. Nezakládejte prázdné složky ani modulové `pages`; sekce se skládají v hlavním `src/pages`.
- UIModule, CoreModule a RealtimeModule jsou nezávislé základy. LangModule může používat UI; ostatní moduly sdílejí UI, Lang a případně Core bez vzájemných importů doménových modulů. Povolené hranice a cykly hlídá `tests/architecture.test.ts`.
- UIModule vlastní theme. LangModule vlastní výčet jazyků, vlajky a locale helpery; modulové slovníky se neslévají do globálního registru. Menu dostává texty/odkazy přes props, jazykový přepínač tvorbu URL přes `href`.
- Browser hooky a providery nesmějí tranzitivně importovat serverovou logiku. Kompozice serverových providerů zůstává v `src/server/providers.ts`; API routy exportují handlery z `server/` příslušného modulu.
