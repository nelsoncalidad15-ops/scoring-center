# Secure setup: Scoring Center

This deployment has two separate Google Sheets roles:

1. The existing survey Sheet is a read-only source. Do not change its tabs, headers, forms, or bound scripts.
2. The Scoring Center operational Sheet is a different private Sheet used by `apps-script/Code.gs`.

The source Sheet ID must never be committed, embedded in the browser, or added to Netlify variables. It belongs only in the Script Properties of the standalone read bridge.

## Access roles

Enable Netlify Identity and use **Invite only** registration. Assign one of these exact roles to every user:

- `scoring_operator`: operational panel access.
- `scoring_supervisor`: operational panel plus linked-survey reading and indicators.
- `scoring_admin`: same supervisor access, intended for administrators.

The Functions check these roles server-side. Hiding a tab in the browser is not the permission control.

The operational panel is currently a shared queue: a `scoring_operator` can see the operational fields of all cases. If each operator must see only assigned cases, do not invite that role until an assignment scope has been defined and implemented.

## Netlify variables

Create the following environment variables in Netlify. Generate long random values locally or in a password manager; never paste them in chat, the repository, or a browser field.

| Variable | Used for |
| --- | --- |
| `APPS_SCRIPT_URL` | `/exec` URL of the operational Apps Script web app |
| `BACKEND_SECRET` | Additional shared secret for the operational Script |
| `APPS_SCRIPT_HMAC_SECRET` | HMAC signature for Netlify to operational Apps Script |
| `SURVEY_BRIDGE_URL` | `/exec` URL of the standalone survey read bridge |
| `SURVEY_BRIDGE_HMAC_SECRET` | HMAC signature for Netlify to survey bridge |
| `CASE_REFERENCE_SALT` | Shared salt used only to match opaque case keys |

Use different random values for the three secret/salt entries. Restrict variables to the intended production/deploy contexts.

## Operational Apps Script

Deploy `apps-script/Code.gs` only in the operational Apps Script project. Its Script Properties are:

| Property | Value |
| --- | --- |
| `SHEET_ID` | ID of the private operational Scoring Center Sheet |
| `BACKEND_SECRET` | Same value as Netlify |
| `APPS_SCRIPT_HMAC_SECRET` | Same value as Netlify |
| `READONLY_SOURCE_SHEET_ID` | ID of the existing survey Sheet, used only as a safety guard |

`READONLY_SOURCE_SHEET_ID` is required. The guard makes the Script stop before any write if `SHEET_ID` is accidentally configured as the read-only survey Sheet. The script validates HMAC, timestamp, nonce, input size, formula injection, and uses a lock plus an audit tab for writes.

## Standalone survey read bridge

Create a **new standalone Apps Script project**, not a project bound to the survey Sheet. Copy only `apps-script/SurveyReadBridge.gs` into it and deploy it as a web app `/exec`. Run it as the bridge account. Because Netlify is the caller, the web-app endpoint must be reachable by it; the HMAC, short expiration, nonce, and no-data-on-error controls protect that endpoint.

Give the account that runs this bridge only viewer access to the existing survey Sheet whenever possible. Set these Script Properties in the bridge project:

| Property | Value |
| --- | --- |
| `SURVEY_SOURCE_SHEET_ID` | ID of the existing survey Sheet |
| `SURVEY_SOURCE_TAB` | `Respuestas_Scoring`, or the exact responses tab name |
| `SURVEY_BRIDGE_HMAC_SECRET` | Same value as Netlify |
| `CASE_REFERENCE_SALT` | Same value as Netlify |

The bridge exposes only normalized entries: a one-way event id, an opaque case key, date, mapped result, recontact flag, and approved signal codes. It never sends raw source identifiers, DNI, phone, email, address, survey token/link, or free-text comments. It contains no Google Sheets write operation.

Before production, verify the bridge header aliases against the real first row. It intentionally fails closed if it cannot find a request-number or scoring-result column. Initial mappings are:

- `Paso scoring` -> `Paso`
- `Requiere revision` -> `Revisar`
- `No paso scoring` -> `No paso`
- `q9` -> recontact flag
- `q10` -> only a sensitive-comment flag, never text
- `q8` is not treated as an advisor rating for imported responses

Survey links are deliberately disabled in this first phase: the existing survey system is read-only, and this panel does not send, copy, open, or store its links. A separate future survey workflow can be designed without changing the source Sheet.

## Deployment order

1. Enable Netlify Identity, set Invite only, and create at least one `scoring_admin` user.
2. Configure and deploy the operational Apps Script with its new properties.
3. Create and deploy the separate read-only bridge with its properties.
4. Add all Netlify variables.
5. Deploy this branch and test with a fictitious record first.
6. Check an unauthenticated request to each Function returns `401`, a user without a role returns `403`, and a supervisor can see only normalized linked-survey signals.

Until every required secret and Script deployment is configured, the new Functions fail closed. Do not merge or promote this branch to production before that checklist is complete.

## Local verification

```bash
npm run check
npm run build
```

`npm run dev` is a static UI preview. Test Identity and Functions through a Netlify deploy preview or `netlify dev` after Identity has been enabled.
