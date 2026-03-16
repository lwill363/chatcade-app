import fastify, { FastifyError } from "fastify";
import cors from "@fastify/cors";
import {
  hasZodFastifySchemaValidationErrors,
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { createLogger } from "@common/config/logger";
import { APIError } from "@common/errors";

export function buildApp() {
  const app = fastify({
    logger: createLogger(),
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.register(cors);

  app.setNotFoundHandler((request, reply) => {
    return reply.code(404).send({
      error: "NOT_FOUND",
      code: 404,
      message: `Route ${request.method}:${request.url} not found`,
    });
  });

  // Add global error handler
  app.setErrorHandler(function (error: Error, request, reply) {
    this.log.error(error);

    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.code(400).send({
        error: "VALIDATION_ERROR",
        code: 400,
        message: "Validation Error",
        details: error.validation.map((e) => ({
          field: e.instancePath || "(root)",
          message: e.message,
          keyword: e.keyword,
          params: e.params,
        })),
      });
    } else if (error instanceof APIError) {
      return reply.code(error.code).send({
        error: error.name,
        code: error.code,
        message: error.message,
        ...(error.details && { details: error.details }),
      });
    } else if ("statusCode" in error && typeof (error as FastifyError).statusCode === "number") {
      const fe = error as FastifyError;
      return reply.code(fe.statusCode!).send({
        error: fe.code,
        code: fe.statusCode,
        message: fe.message,
      });
    } else {
      return reply.code(500).send({
        error: "INTERNAL_SERVER_ERROR",
        code: 500,
        message: "Internal Server Error",
      });
    }
  });

  return app;
}
