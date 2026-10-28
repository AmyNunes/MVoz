import type { Migration } from '../types';

import { migration001 } from './001_foundation';
import { migration002 } from './002_recordings';
import { migration003 } from './003_training';
import { migration004 } from './004_guide';
import { migration005 } from './005_coach';
import { migration006 } from './006_notifications';

/** Todas as migrations, em ordem. Para mudar o banco, acrescente uma nova no fim. */
export const migrations: readonly Migration[] = [migration001, migration002, migration003, migration004, migration005, migration006];
