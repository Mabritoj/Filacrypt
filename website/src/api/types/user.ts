export interface UserPreferences {
  weightUnit: 'g' | 'kg';
  temperatureUnit: 'C' | 'F';
  lengthUnit: 'm' | 'ft';
  currency: string;
  theme: 'dark' | 'light';
  defaultEntryMode: 'nfc' | 'manual';
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  emailVerified: boolean;
  avatarUrl?: string;
  preferences: UserPreferences;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  lowStockThresholdG: number;
  defaultDiameterMm: number;
  defaultEmptySpoolWeightG: number;
  defaultPrinterId?: string;
  createdAt: string;
  callerRole: WorkspaceRole;
  callerFilamentPermissions?: FilamentPermissions;
}

export type WorkspaceRole = 'owner' | 'admin' | 'member';

export interface WorkspaceMembership {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
}

export interface FilamentPermissions {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

export interface WorkspaceMember {
  userId: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  filamentPermissions?: FilamentPermissions;
  joinedAt: string;
}
