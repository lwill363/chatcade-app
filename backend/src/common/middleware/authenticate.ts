import { FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";
import { UnauthorizedError } from "@common/errors";

export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply
) {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or invalid authorization header");
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      sub: string;
      email: string;
      role: string;
    };

    request.user = {
      principalId: decoded.sub,
      email: decoded.email,
      role: decoded.role,
    };
  } catch {
    throw new UnauthorizedError("Invalid or expired token");
  }
}
