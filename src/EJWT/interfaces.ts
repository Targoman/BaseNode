export enum enuJWTHashAlgs {
    HS256 = "HS256",
    HS384 = "HS384",
    HS512 = "HS512",
}

export enum enuTokenActorType {
    Anonymus = "Anonymus",
    User = "User",
    API = "API"
}

export interface IntfEJWTConfigs {
    secret?: string
    hashAlgorithm?: string
    ttl?: number
    normalLoginTTL?: number
    rememberLoginTTL?: number
    simpleCryptKey?: string
}

export class exJWTExpired extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'exJWTExpired';
    }
}
