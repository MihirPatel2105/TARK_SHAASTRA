const { execSync } = require("child_process");

const port = process.argv[2] || "3000";

function getListeningPids(targetPort) {
  const output = execSync("netstat -ano", { encoding: "utf8" });
  return [...new Set(
    output
      .split(/\r?\n/)
      .filter((line) => line.includes(`:${targetPort}`) && line.includes("LISTENING"))
      .map((line) => line.trim().split(/\s+/).pop())
      .filter(Boolean)
  )];
}

function killPid(pid) {
  try {
    execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
    return true;
  } catch (_error) {
    return false;
  }
}

try {
  const pids = getListeningPids(port);
  if (!pids.length) {
    console.log(`No process is listening on port ${port}.`);
    process.exit(0);
  }

  const killed = pids.filter(killPid);
  console.log(`Killed PIDs on port ${port}: ${killed.join(", ") || "none"}`);
  process.exit(0);
} catch (error) {
  console.error(`Failed to clear port ${port}: ${error.message}`);
  process.exit(1);
}
