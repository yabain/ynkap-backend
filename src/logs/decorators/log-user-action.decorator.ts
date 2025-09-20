import { SetMetadata } from '@nestjs/common';

export interface LogUserActionOptions {
  action: string;
  target: string;
  includeBody?: boolean;
  includeResult?: boolean;
}

export const LOG_USER_ACTION_KEY = 'log_user_action';

export const LogUserAction = (options: LogUserActionOptions) =>
  SetMetadata(LOG_USER_ACTION_KEY, options);