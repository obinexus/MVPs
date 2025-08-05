/**
 * Common type definitions used across the Zero library
 */

/**
 * Secure binary data representation
 * Used for sensitive cryptographic materials and identifiers
 */
export type SecureBuffer = Buffer;

/**
 * Cryptographic operation flags
 */
export enum CryptoFlags {
  NONE = 0,
  SECURE_MEMORY = 1 << 0,
  CONSTANT_TIME = 1 << 1,
  QUANTUM_RESISTANT = 1 << 2,
  FIPS_COMPLIANT = 1 << 3,
  ALLOW_PARALLEL = 1 << 4,
  HIGH_SECURITY = 1 << 5,
  HIGH_PERFORMANCE = 1 << 6
}

export interface IDisposable {
  dispose(): void;
}

export interface IAsyncInitializable {
  initialize(): Promise<void>;
  isInitialized(): boolean;
}

export interface IResult<T> {
  success: boolean;
  value?: T;
  error?: string;
  errorCode?: number;
}

export interface ICloneOptions {
  secure?: boolean;
  deep?: boolean;
  exclude?: string[];
}

export interface ICloneable<T> {
  clone(options?: ICloneOptions): T;
}

export interface IVersion {
  major: number;
  minor: number;
  patch: number;
  preRelease?: string;
  build?: string;
}

export type Timestamp = number;

// Type guards and utility functions
export function isTimestamp(value: unknown): value is Timestamp {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    Number.isInteger(value)
  );
}

export function isBinaryData(value: unknown): value is Buffer | Uint8Array {
  return value instanceof Buffer || value instanceof Uint8Array;
}
export function hasRequiredProperties<T>(
  value: unknown,
  properties: Array<keyof T>
): value is T {
  if (!value || typeof value !== 'object') {
    return false;
  }
  return properties.every(prop => prop in (value as object));
}

export function versionToString(version: IVersion): string {
  let result = `${version.major}.${version.minor}.${version.patch}`;
  if (version.preRelease) result += `-${version.preRelease}`;
  if (version.build) result += `+${version.build}`;
  return result;
}

export function parseVersion(versionString: string): IVersion | null {
  const regex = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+))?(?:\+([0-9A-Za-z-]+))?$/;
  const match = regex.exec(versionString);
  
  if (!match) return null;
  
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    preRelease: match[4],
    build: match[5]
  };
}
