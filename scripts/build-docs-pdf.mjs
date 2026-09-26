// Renders docs/documentation.html to docs/HeAIth-Documentation.pdf with a
// locally installed Chrome or Edge in headless mode.
//   npm run docs:pdf            (set CHROME_PATH to use a specific browser)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const input = path.join(root, "docs", "documentation.html");
const output = path.join(root, "docs", "HeAIth-Documentation.pdf");

const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
].filter(Boolean);

const browser = candidates.find((candidate) => fs.existsSync(candidate));
if (!browser) {
    console.error("No Chrome/Edge found. Set CHROME_PATH to a Chromium-based browser.");
    process.exit(1);
}

execFileSync(browser, [
    "--headless=new",
    "--disable-gpu",
    "--no-pdf-header-footer",
    `--print-to-pdf=${output}`,
    pathToFileURL(input).href,
], { stdio: "inherit" });

console.log(`Wrote ${path.relative(root, output)} (${(fs.statSync(output).size / 1024).toFixed(0)} KB)`);
