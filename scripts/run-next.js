/**
 * 始终在项目根目录（api-test-ai）下运行 Next，避免从父目录 D:\AutoTest 启动时
 * process.cwd() 错误导致 webpack 在 D:\AutoTest 解析 tailwindcss 失败。
 */
const path = require("path");
const { spawnSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
process.chdir(projectRoot);

const [command, ...args] = process.argv.slice(2);
const result = spawnSync(
  "npx",
  ["next", command || "dev", ...args],
  { stdio: "inherit", shell: true, cwd: projectRoot }
);
process.exit(result.status ?? 1);
