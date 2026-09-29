import http from "node:http";
const baseUser = {
  id: 7,
  email: "user@example.test",
  first_name: "Test",
  last_name: "Account",
  role: "user",
};
const tokens = new Map();
let counter = 0;
function parseFilter(raw) {
  if (!raw) return null;
  let decoded;
  try {
    decoded = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!decoded || typeof decoded !== "object" || Array.isArray(decoded))
    return null;
  const [key, spec] = Object.entries(decoded)[0] ?? [];
  if (key === undefined) return null;
  if (spec && typeof spec === "object" && !Array.isArray(spec))
    return { key, value: spec.$regex ?? spec.value ?? "" };
  return { key, value: spec };
}
const name = {
  id: 1,
  name: "Novák",
  kind: "surname",
  language: "cs",
  country_code: "CZ",
  summary: "Testovací heslo pro ověření rozhraní.",
  private_field: "should-not-leak",
};
const dossier = {
  name,
  entries: [
    "etymology",
    "history",
    "clerical_error",
    "legend",
    "mythology",
    "fiction",
    "tradition",
    "proverb",
  ].map((type, i) => ({
    id: i + 1,
    type,
    title: `Test ${type}`,
    body: "Testovací citovaný text <script>alert('unsafe')</script>",
    source_url: "https://example.org/source",
    certainty: i < 3 ? "documented" : "fiction",
    language: "cs",
    region: "Čechy",
    year_from: 1900,
    year_to: null,
    notes: "should-not-leak",
  })),
  citations: [
    {
      id: 1,
      entry_id: 1,
      source_id: 1,
      url: "https://example.org/source",
      locator: "s. 12",
      quotation: "Test",
    },
  ],
  variants: [
    {
      id: 1,
      variant: "Novak",
      relation: "spelling",
      language: "cs",
      region: null,
      year_from: null,
      year_to: null,
      source_id: 1,
      target_name_id: null,
    },
  ],
  occurrences: [
    {
      id: 1,
      source_id: 1,
      country_code: "CZ",
      region: null,
      observed_year: 2025,
      observed_on: null,
      sex: "all",
      measure: "living_persons",
      count: 0,
      original_spelling: null,
      locator: null,
    },
  ],
  calendar_days: [
    {
      id: 1,
      source_id: 1,
      title: "Testovací kalendářní den",
      kind: "name_day",
      date_kind: "fixed",
      month: 1,
      day: 1,
      date_rule: null,
      source_url: "https://example.org/calendar",
      locator: null,
      calendar_title: "Testovací kalendář",
      country_code: "CZ",
      system: "julian",
      tradition: "Test",
      region: null,
      year_from: null,
      year_to: null,
    },
  ],
  sources: [
    {
      id: 1,
      title: "Testovací pramen",
      author: "Test Author",
      url: "https://example.org/source",
      license: "CC0",
      license_url: "https://creativecommons.org/publicdomain/zero/1.0/",
      attribution: "Test attribution",
      notes: "should-not-leak",
    },
  ],
  imports: [{ payload: "should-not-leak" }],
};
http
  .createServer(async (req, res) => {
    const send = (status, data) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: status >= 200 && status < 300, data }));
    };
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/health") return send(200, null);
    if (
      req.headers["x-internal-key"] !== "test-only-secret" ||
      req.headers["x-forwarded-host"] !== "localhost"
    )
      return send(403, null);
    let body = "";
    for await (const chunk of req) body += chunk;
    if (url.pathname === "/auth/login" && req.method === "POST") {
      const data = JSON.parse(body);
      if (
        ![baseUser.email, "admin@example.test"].includes(data.email) ||
        data.password !== "test-password"
      )
        return send(401, null);
      const token = (++counter).toString(16).padStart(64, "0");
      const user = {
        ...baseUser,
        email: data.email,
        role: data.email.startsWith("admin") ? "admin" : "user",
      };
      tokens.set(token, {
        user,
        records: { names: [{ ...name, published: 0 }] },
        next: 100,
      });
      return send(200, { ...user, token, expires_at: "2026-12-01 12:00:00" });
    }
    if (url.pathname === "/etymolog/public/names") {
      const filter = parseFilter(url.searchParams.get("q"));
      if (filter?.value === "error") return send(503, null);
      const needle = String(filter?.value ?? "").toLowerCase();
      const items = needle.includes("nov")
        ? [name]
        : needle === "anna"
          ? [
              { ...name, id: 1162, name: "Anna", kind: "given" },
              { ...name, id: 1164, name: "Anna", kind: "surname" },
            ]
          : [];
      return send(200, { items, total: items.length, page: 1, limit: 20 });
    }
    if (
      url.pathname === "/etymolog/public/names/864" ||
      url.pathname === "/etymolog/public/names/1162"
    )
      return send(200, {
        ...dossier,
        name: { ...name, id: 1162, name: "Anna", kind: "given", summary: null },
        entries: [],
        citations: [],
        variants: [],
        calendar_days: [],
      });
    if (url.pathname === "/etymolog/public/names/1164")
      return send(200, {
        ...dossier,
        name: { ...name, id: 1164, name: "Anna", kind: "surname" },
      });
    if (url.pathname === "/etymolog/public/names/1163")
      return send(200, {
        ...dossier,
        name: { ...name, id: 1163, name: "Shared name", kind: "given" },
        entries: [
          dossier.entries[0],
          {
            ...dossier.entries[0],
            id: 20,
            title: "Another source interpretation",
          },
          dossier.entries[4],
        ],
      });
    if (url.pathname === "/etymolog/public/names/1") return send(200, dossier);
    if (url.pathname.startsWith("/etymolog/public/names/"))
      return send(404, null);
    const session = tokens.get(
      req.headers.authorization?.replace("Bearer ", ""),
    );
    if (!session) return send(401, null);
    if (url.pathname === "/auth/me")
      return send(200, { ...session.user, private_field: "should-not-leak" });
    if (url.pathname === "/auth/logout") {
      tokens.delete(req.headers.authorization.replace("Bearer ", ""));
      return send(200, null);
    }
    if (url.pathname === "/etymolog/publish-all" && req.method === "POST") {
      if (session.user.role !== "admin") return send(403, null);
      let published = 0;
      for (const resource of ["names", "entries", "calendar-days"])
        for (const row of session.records[resource] ?? [])
          if (!row.published) {
            row.published = 1;
            published++;
          }
      return send(200, {
        published,
        skipped: 0,
        resources: {},
        skipped_records: [],
      });
    }
    if (url.pathname.startsWith("/etymolog/sync/")) {
      if (session.user.role !== "admin") return send(403, null);
      if (url.pathname === "/etymolog/sync/start" && req.method === "POST") {
        if (!session.batch || session.batch.status === "complete") {
          session.batch = {
            status: "queued",
            total: 2,
            completed: 0,
            failed: 0,
            processed: 0,
          };
          session.batchPolls = 0;
        }
        return send(202, session.batch);
      }
      if (url.pathname === "/etymolog/sync/status" && req.method === "GET") {
        if (session.batch && ++session.batchPolls > 1)
          session.batch = {
            status: "complete",
            total: 2,
            completed: 2,
            failed: 0,
            processed: 5,
          };
        return send(200, session.batch ?? null);
      }
      return send(405, null);
    }
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "etymolog") {
      const [, resource, rawId, action] = parts;
      const id = Number(rawId);
      if (resource === "sync-jobs" && session.user.role !== "admin")
        return send(403, null);
      const list =
        session.records[resource] ?? (session.records[resource] = []);
      if (action) return send(200, action === "reset" ? { id } : []);
      const found = list.find((row) => row.id === id);
      if (req.method === "GET") {
        if (rawId) return send(found ? 200 : 404, found);
        let filtered = list;
        const filter = parseFilter(url.searchParams.get("q"));
        if (filter) {
          filtered = list.filter((row) =>
            String(row[filter.key] ?? "").includes(String(filter.value)),
          );
        }
        const offset = (Number(url.searchParams.get("page") ?? 1) - 1) * 20;
        return send(200, filtered.slice(offset, offset + 20));
      }
      if (req.method === "POST") {
        const record = { id: session.next++, ...JSON.parse(body) };
        list.push(record);
        return send(201, record);
      }
      if (!found) return send(404, null);
      if (req.method === "PATCH") {
        Object.assign(found, JSON.parse(body));
        return send(200, found);
      }
      if (req.method === "DELETE") {
        list.splice(list.indexOf(found), 1);
        return send(200, null);
      }
    }
    send(404, null);
  })
  .listen(4409, "127.0.0.1");
