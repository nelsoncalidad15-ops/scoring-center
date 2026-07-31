import catalogs from "../netlify/functions/catalogs.mjs";
import records from "../netlify/functions/records.mjs";
import surveyResults from "../netlify/functions/survey-results.mjs";

async function expectUnauthorized(name, handler) {
  const response = await handler(new Request(`https://localhost/.netlify/functions/${name}`, { method: "GET" }));
  if (response.status !== 401) throw new Error(`${name} should fail closed with 401, received ${response.status}`);
  if (!String(response.headers.get("cache-control") || "").includes("no-store")) {
    throw new Error(`${name} must return no-store headers`);
  }
  if (response.headers.has("access-control-allow-origin")) throw new Error(`${name} must not expose CORS access headers`);
}

await expectUnauthorized("records", records);
await expectUnauthorized("catalogs", catalogs);
await expectUnauthorized("survey-results", surveyResults);
console.log("Security smoke test passed: protected functions fail closed without a Netlify Identity session.");
