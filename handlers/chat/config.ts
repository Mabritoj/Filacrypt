import { requireEnv } from 'env-config';

/**
 * Chat-specific environment, kept out of the shared env-config `config` object.
 * That object resolves every key at module load, so adding these there would
 * make every handler that imports env-config fail at cold start unless it also
 * had these variables set.
 */
export const chatConfig = {
  awsRegion: requireEnv('AWS_REGION'),
};
