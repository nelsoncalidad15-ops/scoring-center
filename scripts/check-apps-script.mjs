import { readFileSync } from "node:fs";

const files = ["apps-script/Code.gs", "apps-script/SurveyReadBridge.gs"];
for (const file of files) {
  const source = readFileSync(file, "utf8");
  try {
    new Function(source);
  } catch (error) {
    throw new Error(`${file}: ${error.message}`);
  }
}

const bridgeSource = readFileSync("apps-script/SurveyReadBridge.gs", "utf8");
if (/\.(appendRow|setValues|insertSheet|deleteSheet|clear|deleteRow|deleteColumn)\s*\(/.test(bridgeSource)) {
  throw new Error("SurveyReadBridge.gs must remain read-only for Google Sheets.");
}

console.log("Apps Script syntax check passed.");
