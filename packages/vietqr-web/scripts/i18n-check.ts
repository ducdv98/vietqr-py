// Fails (exit 1) when any messages/<locale>.json has different keys than messages/en.json.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { compareMessages, type Messages } from "../src/i18n/parity";

const dir = join(import.meta.dirname, "..", "messages");
const read = (f: string) =>
  JSON.parse(readFileSync(join(dir, f), "utf8")) as Messages;

const base = read("en.json");
let failed = false;
for (const file of readdirSync(dir).filter(
  (f) => f.endsWith(".json") && f !== "en.json",
)) {
  for (const p of compareMessages(base, read(file))) {
    failed = true;
    console.error(`${file}: ${p.kind} key "${p.key}"`);
  }
}
if (failed) process.exit(1);
console.log("i18n: all locales match en.json");
