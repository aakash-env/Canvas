import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/user.model';
import { RegisterInput, LoginInput } from '../validation/auth.validation';
import { AppError } from '../middleware/error.middleware';
import { config } from '../config/env';

export interface AuthUserResponse {
  id: string;
  email: string;
  name: string;
}

export interface AuthResult {
  user: AuthUserResponse;
  token: string;
}

export class AuthService {
  generateToken(user: IUser): string {
    return jwt.sign(
      { id: user._id.toString(), email: user.email },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
    );
  }

  async register(input: RegisterInput): Promise<AuthResult> {
    const existing = await User.findOne({ email: input.email });
    if (existing) {
      throw new AppError(409, 'A user with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(input.password, 10);
    const user = new User({
      email: input.email,
      password: hashedPassword,
      name: input.name,
    });
    await user.save();

    const token = this.generateToken(user);
    return {
      user: { id: user._id.toString(), email: user.email, name: user.name },
      token,
    };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await User.findOne({ email: input.email });
    if (!user) {
      throw new AppError(401, 'Invalid email or password');
    }

    const isMatch = await bcrypt.compare(input.password, user.password);
    if (!isMatch) {
      throw new AppError(401, 'Invalid email or password');
    }

    const token = this.generateToken(user);
    return {
      user: { id: user._id.toString(), email: user.email, name: user.name },
      token,
    };
  }

  async findById(id: string): Promise<AuthUserResponse | null> {
    const user = await User.findById(id).lean<IUser>();
    if (!user) return null;
    return { id: user._id.toString(), email: user.email, name: user.name };
  }
}

export const authService = new AuthService();
