import { SetMetadata } from '@nestjs/common';
import { Permission, PERMISSIONS_KEY } from '../constants';

export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
