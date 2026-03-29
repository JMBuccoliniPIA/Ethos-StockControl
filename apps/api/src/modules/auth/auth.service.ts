import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RefreshToken, RefreshTokenDocument } from './schemas/refresh-token.schema';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Role } from '../../common/constants';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectModel(RefreshToken.name)
    private refreshTokenModel: Model<RefreshTokenDocument>,
  ) {}

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create({
      ...registerDto,
      role: Role.USER, // New registrations are always USER role
    });

    return { message: 'Usuario registrado exitosamente', userId: user._id };
  }

  async login(loginDto: LoginDto, deviceInfo?: string) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await (user as any).comparePassword(loginDto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Generate tokens
    const payload = { sub: user._id.toString(), email: user.email, role: user.role };
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = await this.generateRefreshToken(
      user._id.toString(),
      deviceInfo,
    );

    // Update last login
    await this.usersService.updateLastLogin(user._id.toString());

    return {
      accessToken,
      refreshToken,
      user: user.toJSON(),
    };
  }

  async refresh(userId: string, currentRefreshToken: string) {
    // Find the stored refresh token
    const storedTokens = await this.refreshTokenModel.find({ userId });

    // Verify the current refresh token against stored hashes
    let matchedToken: RefreshTokenDocument | null = null;
    for (const stored of storedTokens) {
      const isMatch = await bcrypt.compare(currentRefreshToken, stored.tokenHash);
      if (isMatch) {
        matchedToken = stored;
        break;
      }
    }

    if (!matchedToken) {
      // Possible token reuse detected — revoke all tokens for this user
      await this.refreshTokenModel.deleteMany({ userId });
      throw new ForbiddenException(
        'Refresh token inválido. Todas las sesiones han sido cerradas por seguridad.',
      );
    }

    // Delete the used token (rotation: each refresh token is single-use)
    await this.refreshTokenModel.findByIdAndDelete(matchedToken._id);

    // Get fresh user data
    const user = await this.usersService.findById(userId);
    if (!user.isActive) {
      throw new ForbiddenException('Cuenta desactivada');
    }

    // Generate new token pair
    const payload = { sub: user._id.toString(), email: user.email, role: user.role };
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = await this.generateRefreshToken(userId);

    return { accessToken, refreshToken };
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      // Revoke specific token
      const storedTokens = await this.refreshTokenModel.find({ userId });
      for (const stored of storedTokens) {
        const isMatch = await bcrypt.compare(refreshToken, stored.tokenHash);
        if (isMatch) {
          await this.refreshTokenModel.findByIdAndDelete(stored._id);
          return { message: 'Sesión cerrada' };
        }
      }
    }

    // Fallback: revoke all tokens for the user
    await this.refreshTokenModel.deleteMany({ userId });
    return { message: 'Todas las sesiones cerradas' };
  }

  // --- Private helpers ---

  private generateAccessToken(payload: {
    sub: string;
    email: string;
    role: string;
  }): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION', '15m'),
    });
  }

  private async generateRefreshToken(
    userId: string,
    deviceInfo?: string,
  ): Promise<string> {
    const payload = { sub: userId, type: 'refresh' };
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d'),
    });

    // Hash and store the refresh token
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshTokenModel.create({
      userId,
      tokenHash,
      deviceInfo,
      expiresAt,
    });

    return refreshToken;
  }
}
