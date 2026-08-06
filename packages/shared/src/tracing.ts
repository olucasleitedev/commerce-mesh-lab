/**
 * Datadog APM bootstrap.
 * Must be imported before other application modules when enabled.
 */
export async function initTracing(serviceName: string): Promise<void> {
  const enabled = process.env.DD_TRACE_ENABLED === "true";
  if (!enabled) {
    return;
  }

  const tracer = await import("dd-trace");
  tracer.default.init({
    service: serviceName,
    env: process.env.DD_ENV ?? "local",
    logInjection: true,
    runtimeMetrics: true,
  });
}
