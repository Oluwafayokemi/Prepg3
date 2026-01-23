// lambda/shared/utils/logger.ts
export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, data?: any) {
    console.log(
      JSON.stringify({
        level: "INFO",
        context: this.context,
        message,
        data,
        timestamp: new Date().toISOString(),
      }),
    );
  }

  warn(message: string, data?: any) {
    console.warn(
      JSON.stringify({
        level: "WARN",
        context: this.context,
        message,
        data,
        timestamp: new Date().toISOString(),
      }),
    );
  }

  error(message: string, error?: any) {
    console.error(
      JSON.stringify({
        level: "ERROR",
        context: this.context,
        message,
        error: error?.message || error,
        stack: error?.stack,
        timestamp: new Date().toISOString(),
      }),
    );
  }

  debug(message: string, data?: any) {
    if (process.env.ENVIRONMENT === "dev") {
      console.debug(
        JSON.stringify({
          level: "DEBUG",
          context: this.context,
          message,
          data,
          timestamp: new Date().toISOString(),
        }),
      );
    }
  }
}
