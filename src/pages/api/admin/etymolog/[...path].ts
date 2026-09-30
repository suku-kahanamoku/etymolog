/**
 * `/api/admin/etymolog/[...path]` – REST API administrace etymologie.
 *
 * Všechny metody obsluhuje jediný `adminHandler` z EtymologModule/server:
 * `GET` (seznam, detail, důkazní podklady, stav synchronizace), `POST`
 * (vytvoření, publikace, spuštění synchronizace, reset úlohy), `PATCH` (úprava)
 * a `DELETE` (smazání, volitelně kaskádově). Autorizaci, allowlist zdrojů,
 * validaci těla a limity velikosti zajišťuje handler, každá odpověď má
 * `Cache-Control: private, no-store`.
 */
export {
  adminHandler as GET,
  adminHandler as POST,
  adminHandler as PATCH,
  adminHandler as DELETE,
} from "../../../../modules/EtymologModule/server/admin";
