import { describe, it, expect, vi, beforeEach } from "vitest";
import * as AuthService from "./auth-service";
import * as AuthRepository from "./auth-repository";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { APIError, ConflictError, NotFoundError, UnauthorizedError } from "@common/errors";
import { IDS, mockPrisma, makeDbUser } from "@test/factories";

vi.mock("./auth-repository");
vi.mock("bcryptjs");
vi.mock("jsonwebtoken");

const JWT_SECRET = "test-secret";
const USER_ID = IDS.USER;

const mockDbUser = makeDbUser({ passwordHash: "hashed-pw" });

beforeEach(() => {
  vi.resetAllMocks();
});

describe("register", () => {
  it("throws ConflictError when email or username is already in use", async () => {
    vi.mocked(AuthRepository.findConflicting).mockResolvedValue({ id: "existing" } as any);

    await expect(
      AuthService.register({ email: "alice@example.com", username: "alice", password: "pw" }, mockPrisma)
    ).rejects.toThrow(ConflictError);
  });

  it("throws APIError when the default role is not configured", async () => {
    vi.mocked(AuthRepository.findConflicting).mockResolvedValue(null);
    vi.mocked(AuthRepository.findRoleByName).mockResolvedValue(null);

    await expect(
      AuthService.register({ email: "alice@example.com", username: "alice", password: "pw" }, mockPrisma)
    ).rejects.toThrow(APIError);
  });

  it("hashes the password and creates the user", async () => {
    vi.mocked(AuthRepository.findConflicting).mockResolvedValue(null);
    vi.mocked(AuthRepository.findRoleByName).mockResolvedValue({ id: "role-1" } as any);
    vi.mocked(bcrypt.hash).mockResolvedValue("hashed-pw" as any);
    vi.mocked(AuthRepository.createUser).mockResolvedValue(mockDbUser as any);

    const result = await AuthService.register(
      { email: "alice@example.com", username: "alice", password: "secret" },
      mockPrisma
    );

    expect(bcrypt.hash).toHaveBeenCalledWith("secret", 12);
    expect(AuthRepository.createUser).toHaveBeenCalledWith(mockPrisma, expect.objectContaining({
      emailAddress: "alice@example.com",
      username: "alice",
      passwordHash: "hashed-pw",
      roleId: "role-1",
    }));
    expect(result.username).toBe("alice");
    expect(result.email).toBe("alice@example.com");
  });
});

describe("login", () => {
  it("looks up by email when identifier contains @", async () => {
    vi.mocked(AuthRepository.findByEmail).mockResolvedValue(null);

    await expect(
      AuthService.login("alice@example.com", "pw", mockPrisma, JWT_SECRET)
    ).rejects.toThrow(UnauthorizedError);

    expect(AuthRepository.findByEmail).toHaveBeenCalledWith(mockPrisma, "alice@example.com");
    expect(AuthRepository.findByUsername).not.toHaveBeenCalled();
  });

  it("looks up by username when identifier has no @", async () => {
    vi.mocked(AuthRepository.findByUsername).mockResolvedValue(null);

    await expect(
      AuthService.login("alice", "pw", mockPrisma, JWT_SECRET)
    ).rejects.toThrow(UnauthorizedError);

    expect(AuthRepository.findByUsername).toHaveBeenCalledWith(mockPrisma, "alice");
  });

  it("throws UnauthorizedError when user is not found", async () => {
    vi.mocked(AuthRepository.findByEmail).mockResolvedValue(null);

    await expect(
      AuthService.login("alice@example.com", "pw", mockPrisma, JWT_SECRET)
    ).rejects.toThrow(UnauthorizedError);
  });

  it("throws UnauthorizedError when password is wrong", async () => {
    vi.mocked(AuthRepository.findByEmail).mockResolvedValue(mockDbUser as any);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as any);

    await expect(
      AuthService.login("alice@example.com", "wrong", mockPrisma, JWT_SECRET)
    ).rejects.toThrow(UnauthorizedError);
  });

  it("returns access and refresh tokens on success", async () => {
    vi.mocked(AuthRepository.findByEmail).mockResolvedValue(mockDbUser as any);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as any);
    vi.mocked(jwt.sign).mockReturnValue("signed-token" as any);
    vi.mocked(AuthRepository.createRefreshToken).mockResolvedValue(undefined as any);

    const result = await AuthService.login("alice@example.com", "pw", mockPrisma, JWT_SECRET);

    expect(result.accessToken).toBe("signed-token");
    expect(result.refreshToken).toBe("signed-token");
    expect(result.user.username).toBe("alice");
    expect(AuthRepository.createRefreshToken).toHaveBeenCalled();
  });
});

describe("refresh", () => {
  it("throws UnauthorizedError when the JWT signature is invalid", async () => {
    vi.mocked(jwt.verify).mockImplementation(() => { throw new Error("invalid signature"); });

    await expect(
      AuthService.refresh("bad-token", mockPrisma, JWT_SECRET)
    ).rejects.toThrow(UnauthorizedError);
  });

  it("throws UnauthorizedError when token is not found in the database", async () => {
    vi.mocked(jwt.verify).mockReturnValue({} as any);
    vi.mocked(AuthRepository.findRefreshToken).mockResolvedValue(null);

    await expect(
      AuthService.refresh("unknown-token", mockPrisma, JWT_SECRET)
    ).rejects.toThrow(UnauthorizedError);
  });

  it("throws UnauthorizedError and deletes the token when it is expired", async () => {
    vi.mocked(jwt.verify).mockReturnValue({} as any);
    vi.mocked(AuthRepository.findRefreshToken).mockResolvedValue({
      id: "rt-1",
      expiresAt: new Date(Date.now() - 1000),
      user: mockDbUser,
    } as any);
    vi.mocked(AuthRepository.deleteRefreshToken).mockResolvedValue(undefined as any);

    await expect(
      AuthService.refresh("expired-token", mockPrisma, JWT_SECRET)
    ).rejects.toThrow(UnauthorizedError);

    expect(AuthRepository.deleteRefreshToken).toHaveBeenCalledWith(mockPrisma, "rt-1");
  });

  it("rotates the token and returns a new pair on success", async () => {
    vi.mocked(jwt.verify).mockReturnValue({} as any);
    vi.mocked(AuthRepository.findRefreshToken).mockResolvedValue({
      id: "rt-1",
      expiresAt: new Date(Date.now() + 100_000),
      user: mockDbUser,
    } as any);
    vi.mocked(AuthRepository.deleteRefreshToken).mockResolvedValue(undefined as any);
    vi.mocked(jwt.sign).mockReturnValue("new-token" as any);
    vi.mocked(AuthRepository.createRefreshToken).mockResolvedValue(undefined as any);

    const result = await AuthService.refresh("valid-token", mockPrisma, JWT_SECRET);

    expect(AuthRepository.deleteRefreshToken).toHaveBeenCalledWith(mockPrisma, "rt-1");
    expect(result.accessToken).toBe("new-token");
    expect(result.refreshToken).toBe("new-token");
  });
});

describe("logout", () => {
  it("deletes the refresh token", async () => {
    vi.mocked(jwt.verify).mockReturnValue({} as any);
    vi.mocked(AuthRepository.deleteRefreshTokenByValue).mockResolvedValue(undefined as any);

    await AuthService.logout("valid-token", mockPrisma, JWT_SECRET);

    expect(AuthRepository.deleteRefreshTokenByValue).toHaveBeenCalledWith(mockPrisma, "valid-token");
  });

  it("still deletes the token even when the JWT is expired", async () => {
    vi.mocked(jwt.verify).mockImplementation(() => { throw new Error("expired"); });
    vi.mocked(AuthRepository.deleteRefreshTokenByValue).mockResolvedValue(undefined as any);

    await AuthService.logout("expired-token", mockPrisma, JWT_SECRET);

    expect(AuthRepository.deleteRefreshTokenByValue).toHaveBeenCalledWith(mockPrisma, "expired-token");
  });
});

describe("getMe", () => {
  it("returns the formatted user", async () => {
    vi.mocked(AuthRepository.findById).mockResolvedValue(mockDbUser as any);

    const result = await AuthService.getMe(USER_ID, mockPrisma);

    expect(AuthRepository.findById).toHaveBeenCalledWith(mockPrisma, USER_ID);
    expect(result.id).toBe(USER_ID);
    expect(result.username).toBe("alice");
    expect(result.email).toBe("alice@example.com");
    expect(result.role).toBe("user");
  });

  it("throws NotFoundError when user does not exist", async () => {
    vi.mocked(AuthRepository.findById).mockResolvedValue(null);

    await expect(AuthService.getMe(USER_ID, mockPrisma)).rejects.toThrow(NotFoundError);
  });
});
