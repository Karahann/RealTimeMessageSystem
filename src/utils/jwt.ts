import jwt from "jsonwebtoken";
import { IUser } from "../models/User";
import { redisClient } from "../config/redis";

export interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  iat: number;
  exp: number;
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || "15m";
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";

// Validate required environment variables
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}
if (!JWT_REFRESH_SECRET) {
  throw new Error("JWT_REFRESH_SECRET environment variable is required");
}

/**
 * Access ve refresh token üretir
 */
export const generateTokens = (user: IUser) => {
  const payload = {
    userId: user._id.toString(),
    username: user.username,
    email: user.email,
  };

  const accessToken = (jwt.sign as any)(payload, JWT_SECRET as string, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });

  const refreshToken = (jwt.sign as any)(
    payload,
    JWT_REFRESH_SECRET as string,
    {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    }
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  };
};

/**
 * Access token doğrular
 */
export const verifyAccessToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, JWT_SECRET as string) as JWTPayload;
  } catch (error: any) {
    // JWT library'den gelen spesifik hata türlerini handle et
    if (error.name === "TokenExpiredError") {
      throw new Error("Token has expired");
    } else if (error.name === "JsonWebTokenError") {
      throw new Error("Invalid token format");
    } else if (error.name === "NotBeforeError") {
      throw new Error("Token not active yet");
    }

    throw new Error("Invalid access token");
  }
};

/**
 * Refresh token doğrular
 */
export const verifyRefreshToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET as string) as JWTPayload;
  } catch (error) {
    throw new Error("Invalid refresh token");
  }
};

/**
 * Token'ı blacklist'e ekler (logout işlemi için)
 */
export const blacklistToken = async (token: string): Promise<void> => {
  try {
    // Token'ın expire time'ını al
    const decoded = jwt.decode(token) as any;
    if (!decoded || !decoded.exp) {
      throw new Error("Invalid token format");
    }

    // Token'ın kalan süresini hesapla (saniye cinsinden)
    const currentTime = Math.floor(Date.now() / 1000);
    const timeToExpire = decoded.exp - currentTime;

    // Sadece geçerli token'ları blacklist'e ekle
    if (timeToExpire > 0) {
      await redisClient.setEx(`blacklist:${token}`, timeToExpire, "true");
    }
  } catch (error) {
    throw new Error("Failed to blacklist token");
  }
};

/**
 * Token'ın blacklist'te olup olmadığını kontrol eder
 */
export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  try {
    const result = await redisClient.get(`blacklist:${token}`);
    return result !== null;
  } catch (error) {
    // Redis hatası durumunda güvenlik için true döner
    return true;
  }
};

/**
 * JWT token'ı debug etmek için utility fonksiyonu
 */
export const debugToken = (token: string) => {
  try {
    // Token'ı decode et (verify etmeden)
    const decoded = jwt.decode(token, { complete: true });

    if (!decoded) {
      return { error: "Token could not be decoded" };
    }

    const payload = decoded.payload as any;
    const header = decoded.header;

    const now = Math.floor(Date.now() / 1000);
    const isExpired = payload.exp && payload.exp < now;
    const timeUntilExpiry = payload.exp ? payload.exp - now : null;

    return {
      header,
      payload: {
        userId: payload.userId,
        username: payload.username,
        email: payload.email,
        issuedAt: payload.iat
          ? new Date(payload.iat * 1000).toISOString()
          : null,
        expiresAt: payload.exp
          ? new Date(payload.exp * 1000).toISOString()
          : null,
        isExpired,
        timeUntilExpiry: timeUntilExpiry ? `${timeUntilExpiry}s` : null,
      },
      isValid: !isExpired,
    };
  } catch (error: any) {
    return { error: error.message };
  }
};
