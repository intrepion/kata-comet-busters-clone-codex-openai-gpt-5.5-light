import { mkdir, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fileDistDir = resolve(root, "file-dist");
const rootIndex = resolve(root, "index.html");

await run("npx", ["vite", "build"]);
await rm(fileDistDir, { recursive: true, force: true });
await mkdir(fileDistDir, { recursive: true });
await run("npx", [
  "esbuild",
  "src/main.ts",
  "--bundle",
  "--format=iife",
  "--target=es2020",
  "--outfile=file-dist/game.js"
]);

const rootHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Meteor Breakers Direct Launch</title>
    <link rel="stylesheet" href="./file-dist/game.css" />
  </head>
  <body>
    <div id="app"></div>
    <script src="./file-dist/game.js"></script>
  </body>
</html>
`;
await writeFile(rootIndex, rootHtml);

function run(command, args) {
  return new Promise((resolveProcess, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: "inherit" });
    child.on("exit", (code) => {
      if (code === 0) {
        resolveProcess();
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
      }
    });
    child.on("error", reject);
  });
}
