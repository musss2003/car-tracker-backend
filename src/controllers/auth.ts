import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import * as bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { AppDataSource } from "../config/db";
import { User, UserRole } from "../models/User";
import { RefreshToken } from "../models/RefreshToken";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const ACCESS_TOKEN_DURATION = process.env.ACCESS_TOKEN_DURATION;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const REFRESH_TOKEN_DURATION = process.env.REFRESH_TOKEN_DURATION;

interface JwtPayload {
  id: string;
}

// REGISTER
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { username, email, password, name, citizenshipId, profilePhotoUrl } =
      req.body;

    const userRepository = AppDataSource.getRepository(User);

    // 1. Check if user already exists
    const existingUser = await userRepository.findOne({
      where: [{ email }, { username }],
    });

    if (existingUser) {
      res.status(400).json({ message: "User already exists" });
      return;
    }

    // 2. Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Create and save user
    const newUser = userRepository.create({
      username,
      email,
      password: hashedPassword,
      name: name || undefined,
      citizenshipId: citizenshipId || undefined,
      profilePhotoUrl: profilePhotoUrl || undefined,
      lastLogin: new Date(),
      role: UserRole.USER, // Default role
    });

    // 4. Generate refresh token

    const refreshToken = generateRefreshToken(newUser);

    const savedUser = await userRepository.save(newUser);

    await storeRefreshToken(savedUser.id, refreshToken);

    // 5. Generate access token
    const accessToken = generateAccessToken(savedUser);

    // 6. Send refresh token as HTTP-only cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      id: savedUser.id,
      username: savedUser.username,
      email: savedUser.email,
      role: savedUser.role,
      accessToken,
    });
  } catch (error: any) {
    console.error("Register error:", error);
    next(error);
  }
};

// LOGIN
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { username, password } = req.body;

  try {
    const userRepository = AppDataSource.getRepository(User);

    // 1. Find user by username
    const user = await userRepository.findOne({ where: { username } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // 2. Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    // 3. Generate access token
    const accessToken = generateAccessToken(user);

    // 4. Generate refresh token
    const refreshToken = generateRefreshToken(user);

    // 5. Update user with new refresh token and last login
    await userRepository.update(user.id, {
      lastLogin: new Date(),
    });

    await storeRefreshToken(user.id, refreshToken);

    // 6. Send refresh token as HTTP-only cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // 7. Send access token and user info in response
    res.status(200).json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      accessToken,
    });
  } catch (error: any) {
    console.error("Login error:", error);
    next(error);
  }
};

// UPDATE USER ROLE
export const updateUserRole = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { userId, newRole } = req.body;

  try {
    const userRepository = AppDataSource.getRepository(User);

    const updateResult = await userRepository.update(userId, { role: newRole });

    if (updateResult.affected === 0) {
      return res.status(404).send("User not found");
    }

    return res.send("User role updated successfully");
  } catch (error: any) {
    return res.status(500).send(error.message);
  }
};

// Session check function
export const sessionCheck = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  const accessToken = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  const refreshToken = req.cookies?.refreshToken;

  if (!accessToken && !refreshToken) {
    res
      .status(401)
      .json({ authenticated: false, message: "No token provided" });
    return;
  }

  // Step 1: Try to verify access token (if provided)
  if (accessToken) {
    try {
      const decoded = jwt.verify(
        accessToken,
        ACCESS_TOKEN_SECRET || ""
      ) as JwtPayload;

      const user = await getUserById(decoded.id);

      if (!user) {
        console.log("User not found for decoded token ID:", decoded.id);
        // Don't return here - fall through to refresh token check
      } else {
        // Access token is valid and user exists
        res.status(200).json({
          authenticated: true,
          username: user.username,
          email: user.email,
          id: user.id,
          role: user.role,
        });
        return;
      }
    } catch (accessTokenError: any) {
      console.log(
        "Access token verification failed:",
        accessTokenError.message
      );

      // Log the specific error type for debugging
      if (accessTokenError instanceof jwt.TokenExpiredError) {
        console.log("Access token expired, trying refresh token...");
      } else if (accessTokenError instanceof jwt.JsonWebTokenError) {
        console.log("Access token invalid, trying refresh token...");
      }
    }
  }

  // Step 2: Try to use refresh token (if access token failed or wasn't provided)
  if (refreshToken) {
    try {
      const refreshTokenRepository = AppDataSource.getRepository(RefreshToken);

      const decoded = jwt.verify(
        refreshToken,
        REFRESH_TOKEN_SECRET || ""
      ) as JwtPayload;

      const userId = decoded.id;

      const user = await getUserById(userId);

      const refreshTokens = await refreshTokenRepository.find({
        where: { userId },
      });

      let valid = false;
      for (const t of refreshTokens) {
        const match = await bcrypt.compare(refreshToken, t.tokenHash);
        if (match && new Date(t.expiresAt) > new Date()) {
          valid = true;
          break;
        }
      }

      if (!valid)
        res
          .status(403)
          .json({ authenticated: false, message: "Invalid refresh token" });

      const newAccessToken = generateAccessToken(user);
      const newRefreshToken = generateRefreshToken(user);

      await storeRefreshToken(userId, newRefreshToken);
      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        authenticated: true,
        username: user.username,
        email: user.email,
        id: user.id,
        role: user.role,
        accessToken: newAccessToken,
      });
    } catch (refreshTokenError: any) {
      console.error(
        "Error during refresh token validation:",
        refreshTokenError.message
      );
      res.status(500).json({
        authenticated: false,
        message: "Internal server error during refresh",
      });
    }
  }

  // Step 3: If we get here, both tokens failed or were missing
  res.status(401).json({
    authenticated: false,
    message:
      "Authentication failed - both access and refresh tokens are invalid or missing",
  });
};

// LOGOUT
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const refreshToken = req.cookies?.refreshToken;

  try {
    if (!refreshToken) {
      res.status(401).json({ message: "Refresh token not found" });
      return;
    }

    const refreshTokenRepository = AppDataSource.getRepository(RefreshToken);

    const decoded = jwt.verify(
      refreshToken,
      REFRESH_TOKEN_SECRET || ""
    ) as JwtPayload;

    const userId = decoded.id;

    // Delete refresh tokens
    await refreshTokenRepository.delete({ userId });

    // Clear the cookie (must match the same settings as when it was set)
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.sendStatus(204); // Successfully logged out
  } catch (error: any) {
    console.error("Logout error:", error);
    next(error); // Pass error to the error-handling middleware
  }
};

// Helper to get user by ID
const getUserById = async (id: string): Promise<User> => {
  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOne({ where: { id } });
  if (!user) {
    throw new Error("User not found");
  }
  return user;
};

export function generateAccessToken(user: User) {
  return jwt.sign(
    { id: user.id, username: user.username },
    ACCESS_TOKEN_SECRET || "",
    { expiresIn: ACCESS_TOKEN_DURATION || "15m" }
  );
}

export function generateRefreshToken(user: User) {
  return jwt.sign({ id: user.id }, REFRESH_TOKEN_SECRET || "", {
    expiresIn: REFRESH_TOKEN_DURATION || "7d",
  });
}

export async function storeRefreshToken(userId: string, refreshToken: string) {
  const tokenHash = await bcrypt.hash(refreshToken, 10);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const refreshTokenRepository = AppDataSource.getRepository(RefreshToken);
  await refreshTokenRepository.save({
    userId,
    tokenHash,
    expiresAt,
  });
}
