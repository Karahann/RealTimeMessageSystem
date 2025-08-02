import { User, IUser } from "../../models/User";
import { generateTokens, verifyRefreshToken } from "../../utils/jwt";
import { UpdateProfileInput } from "./auth.validation";
import { RegisterInput, LoginInput } from "./auth.validation";

export class AuthService {
  static async register(userData: RegisterInput) {
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: userData.email }, { username: userData.username }],
    });

    if (existingUser) {
      throw new Error("User already exists with this email or username");
    }

    // Create new user
    const user = new User(userData);
    await user.save();

    // Generate tokens
    const tokens = generateTokens(user);

    return {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
      ...tokens,
    };
  }

  static async login(loginData: LoginInput) {
    // Find user by email
    const user = await User.findOne({ email: loginData.email });

    if (!user || !user.isActive) {
      throw new Error("Invalid credentials");
    }

    // Check password
    const isPasswordValid = await user.comparePassword(loginData.password);

    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

    // Update last seen
    user.lastSeen = new Date();
    await user.save();

    // Generate tokens
    const tokens = generateTokens(user);

    return {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isActive: user.isActive,
        lastSeen: user.lastSeen,
      },
      ...tokens,
    };
  }

  static async refreshToken(refreshToken: string) {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      const user = await User.findById(decoded.userId);

      if (!user || !user.isActive) {
        throw new Error("User not found or inactive");
      }

      // Generate new tokens
      const tokens = generateTokens(user);

      return {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          isActive: user.isActive,
          lastSeen: user.lastSeen,
        },
        ...tokens,
      };
    } catch (error) {
      throw new Error("Invalid refresh token");
    }
  }

  static async getProfile(userId: string) {
    const user = await User.findById(userId).select("-password");

    if (!user) {
      throw new Error("User not found");
    }

    return {
      id: user._id,
      username: user.username,
      email: user.email,
      isActive: user.isActive,
      lastSeen: user.lastSeen,
      createdAt: user.createdAt,
    };
  }

  static async updateProfile(userId: string, updateData: UpdateProfileInput) {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    // Check if username or email already exists (if being updated)
    if (updateData.username || updateData.email) {
      const existingUser = await User.findOne({
        $and: [
          { _id: { $ne: userId } }, // Exclude current user
          {
            $or: [
              updateData.username ? { username: updateData.username } : {},
              updateData.email ? { email: updateData.email } : {},
            ].filter((obj) => Object.keys(obj).length > 0),
          },
        ],
      });

      if (existingUser) {
        throw new Error("Username or email already exists");
      }
    }

    // Update password if provided
    if (updateData.newPassword && updateData.currentPassword) {
      const isCurrentPasswordValid = await user.comparePassword(
        updateData.currentPassword
      );

      if (!isCurrentPasswordValid) {
        throw new Error("Current password is incorrect");
      }

      user.password = updateData.newPassword;
    }

    // Update other fields
    if (updateData.username) {
      user.username = updateData.username;
    }

    if (updateData.email) {
      user.email = updateData.email;
    }

    await user.save();

    return {
      id: user._id,
      username: user.username,
      email: user.email,
      isActive: user.isActive,
      lastSeen: user.lastSeen,
      createdAt: user.createdAt,
    };
  }
}
