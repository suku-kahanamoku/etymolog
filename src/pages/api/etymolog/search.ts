/**
 * `GET /api/etymolog/search/` – veřejné hledání jmen.
 *
 * Obsluhuje `searchHandler` z EtymologModule/server; vstup je dotaz `q`
 * s volitelným `page`, návrat je obálka `{ success, data }` s projektovanými
 * výsledky a hlavičkou `Cache-Control: no-store`.
 */
export { searchHandler as GET } from "../../../modules/EtymologModule/server/search";
