type LogLevel = "debug" | "info" | "warn" | "error";

function write(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  const entry = {
    level,
    message,
    service: process.env.DD_SERVICE ?? "commerce-mesh",
    env: process.env.DD_ENV ?? "local",
    time: new Date().toISOString(),
    ...meta,
  };
  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => write("debug", message, meta),
  info: (message: string, meta?: Record<string, unknown>) => write("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => write("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => write("error", message, meta),
};
