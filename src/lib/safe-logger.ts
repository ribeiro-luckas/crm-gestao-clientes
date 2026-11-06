type LogLevel = "error" | "warn" | "info";
type LogCategory = "internal-error" | "authorization-check" | "data-load" | "authentication-error";
type LogOperation = "workspace.request" | "team.role.update" | "team.responsibilities.load" | "member.role.authorization" | "auth.api";

export type SafeLogInput = {
  category: LogCategory;
  operation: LogOperation;
  code?: string;
  correlationId?: string;
  error?: unknown;
};
type BetterAuthLogLevel = "debug" | "info" | "success" | "warn" | "error";

type LogSink = Pick<Console, LogLevel>;

const categories = new Set<LogCategory>(["internal-error", "authorization-check", "data-load", "authentication-error"]);
const operations = new Set<LogOperation>([
  "workspace.request",
  "team.role.update",
  "team.responsibilities.load",
  "member.role.authorization",
  "auth.api",
]);
const sensitiveTerms = /password|passwd|secret|token|cookie|authorization|credential|connection|string|email|phone|address/i;
const knownErrorCodes = new Set([
  "INTERNAL_SERVER_ERROR",
  "MEMBER_REMOVAL_CONTEXT_INVALID",
  "MEMBER_HAS_ASSIGNMENTS",
  "OWNER_ROLE_PROTECTED",
  "INVALID_MEMBER_ROLE_CHANGE",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "ROLE_CHANGE_FORBIDDEN",
  "BETTER_AUTH_LOG_EVENT",
]);
const sqlStatePattern = /^[0-9A-Z]{5}$/;
const errorNames = new Set([
  "Error",
  "TypeError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "URIError",
  "EvalError",
  "AggregateError",
  "APIError",
  "BetterAuthError",
]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeCode(value: unknown): string | undefined {
  
  if (typeof value !== "string" || sensitiveTerms.test(value)) return undefined;

  return sqlStatePattern.test(value) || knownErrorCodes.has(value) ? value : undefined;
}

function errorSummary(error: unknown): Record<string, string> | undefined {

  if (error === undefined) return undefined;

  try {

    if (!(error instanceof Error)) return { kind: error === null ? "null" : typeof error };

    const summary: Record<string, string> = { kind: "Error" };
    const candidateName = error.name;
    const name = errorNames.has(candidateName) ? candidateName : undefined;
    const code = safeCode((error as Error & { code?: unknown }).code);

    if (name) summary.name = name;

    if (code) summary.code = code;

    return summary;
  } catch {

    return { kind: "uninspectable" };
  }
}

export function createSafeLogger(sink: LogSink = console) {

  const write = (level: LogLevel, input: SafeLogInput) => {

    try {

      const inputCategory = input.category;
      const inputOperation = input.operation;
      const inputCode = input.code;
      const inputCorrelationId = input.correlationId;
      const inputError = input.error;
      const event: Record<string, unknown> = {
        timestamp: new Date().toISOString(),
        level,
        category: categories.has(inputCategory) ? inputCategory : "internal-error",
        operation: operations.has(inputOperation) ? inputOperation : "workspace.request",
      };
      const code = safeCode(inputCode);

      if (code) event.code = code;

      if (typeof inputCorrelationId === "string" && uuidPattern.test(inputCorrelationId)) {

        event.correlationId = inputCorrelationId;

      }

      const error = errorSummary(inputError);

      if (error) event.error = error;

      sink[level](JSON.stringify(event));

    } catch {
      // Logging must not replace the application result or leak a fallback object.
    }
  };

  return {
    error: (input: SafeLogInput) => write("error", input),
    warn: (input: SafeLogInput) => write("warn", input),
    info: (input: SafeLogInput) => write("info", input),
  };
}

export const safeLogger = createSafeLogger();

export function createBetterAuthLogAdapter(logger: ReturnType<typeof createSafeLogger> = safeLogger) {

  return {
    // Better Auth's default logger threshold is warn; preserve that threshold.
    level: "warn" as const,
    disableColors: true,
    log(level: BetterAuthLogLevel, message: unknown, ...args: unknown[]) {

      let error: Error | undefined;

      try {

        if (message instanceof Error) error = message;
        else error = args.find((argument): argument is Error => argument instanceof Error);

      } catch {
        // Preserve the event but do not inspect arbitrary logger arguments further.
      }

      const safeLevel: LogLevel = level === "error" ? "error" : level === "warn" ? "warn" : "info";
      logger[safeLevel]({
        category: "authentication-error",
        operation: "auth.api",
        code: "BETTER_AUTH_LOG_EVENT",
        error,
      });
    },
  };
}
