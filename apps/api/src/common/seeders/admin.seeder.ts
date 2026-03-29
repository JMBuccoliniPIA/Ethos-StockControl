import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { UsersService } from '../../modules/users/users.service';
import { Role } from '../constants';

@Injectable()
export class AdminSeeder implements OnModuleInit {
  private readonly logger = new Logger(AdminSeeder.name);

  constructor(private readonly usersService: UsersService) {}

  async onModuleInit() {
    const adminEmail = 'admin@ethos.com';
    const existing = await this.usersService.findByEmail(adminEmail);

    if (!existing) {
      await this.usersService.create({
        email: adminEmail,
        password: 'admin123',
        firstName: 'Super',
        lastName: 'Admin',
        role: Role.SUPER_ADMIN,
      });
      this.logger.log(
        `Super admin created: ${adminEmail} / admin123 — CHANGE THIS PASSWORD`,
      );
    }
  }
}
