import type {
  MaterialCertification,
  MaterialTag,
  MaterialType,
  NfcWriteProtection,
} from './openPrintTag';

export type SpoolStatus = 'in_use' | 'stored' | 'empty' | 'archived';

export interface SpoolNfcTagStatus {
  uid: string;
  standard: string;
  writeProtection: NfcWriteProtection;
  healthy: boolean;
  lastScannedAt?: string;
  lastWrittenAt?: string;
  memoryUsedBytes?: number;
  memoryTotalBytes?: number;
}

export interface Spool {
  id: string;
  workspaceId: string;

  brand: string;
  materialType: MaterialType;
  materialName: string;
  tags: MaterialTag[];
  certifications?: MaterialCertification[];
  colorHex?: string;

  netWeightG: number;
  actualNetWeightG?: number;
  emptyContainerWeightG?: number;
  remainingWeightG: number;

  filamentDiameterMm: number;
  densityGCm3?: number;
  totalLengthMm?: number;

  minNozzleTempC?: number;
  maxNozzleTempC?: number;
  preheatTempC?: number;
  minBedTempC?: number;
  maxBedTempC?: number;
  minChamberTempC?: number;
  maxChamberTempC?: number;
  idealChamberTempC?: number;
  maxVolumetricFlowMm3s?: number;
  partCoolingFanPct?: number;

  dryingTempC?: number;
  dryingTimeMin?: number;

  purchasePriceCents?: number;
  purchaseCurrency?: string;
  purchasedAt?: string;
  vendor?: string;

  storageLocation?: string;
  status: SpoolStatus;
  loadedInPrinterId?: string;
  openedAt?: string;

  brandUuid?: string;
  materialUuid?: string;
  packageUuid?: string;
  instanceUuid?: string;
  gtin?: string;
  batchLot?: string;
  serial?: string;
  manufacturedAt?: string;
  countryOfOrigin?: string;

  tag?: SpoolNfcTagStatus;

  addedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface UsageEvent {
  id: string;
  spoolId: string;
  workspaceId: string;
  printJobName: string;
  usedWeightG: number;
  durationMin?: number;
  printerId?: string;
  loggedBy: string;
  occurredAt: string;
}

export interface Printer {
  id: string;
  workspaceId: string;
  name: string;
  model: string;
  createdAt: string;
  updatedAt: string;
}
