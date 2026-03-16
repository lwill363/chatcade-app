export function createLogger() {
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    return {
      level: "info",
    };
  }

  return {
    level: "debug",
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    },
  };
}
