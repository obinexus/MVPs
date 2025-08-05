import crypto from "crypto";
export interface TokenInfo {
  token: string;
  revoked: boolean;
  created: number;
}

export class TokenManager {
  private tokens: Map<string, TokenInfo> = new Map();
  private tokensByZid: Map<string, Set<string>> = new Map();

  createToken(zid: string): TokenInfo {
    const token = Buffer.from(crypto.randomBytes(32)).toString('base64');
    const info: TokenInfo = { token, revoked: false, created: Date.now() };
    this.tokens.set(token, info);
    if (!this.tokensByZid.has(zid)) {
      this.tokensByZid.set(zid, new Set());
    }
    this.tokensByZid.get(zid)!.add(token);
    return info;
  }

  revokeToken(token: string): boolean {
    const info = this.tokens.get(token);
    if (!info || info.revoked) return false;
    info.revoked = true;
    return true;
  }

  rotateToken(token: string, zid: string): TokenInfo | null {
    const info = this.tokens.get(token);
    if (!info || info.revoked) return null;
    this.revokeToken(token);
    return this.createToken(zid);
  }

  listTokens(zid: string): TokenInfo[] {
    const tokens = this.tokensByZid.get(zid);
    if (!tokens) return [];
    return Array.from(tokens).map(t => this.tokens.get(t)!).filter(Boolean);
  }

  removeZid(zid: string): void {
    const tokens = this.tokensByZid.get(zid);
    if (!tokens) return;
    for (const token of tokens) {
      this.revokeToken(token);
    }
    this.tokensByZid.delete(zid);
  }
}
