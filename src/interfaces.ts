export interface IntfGenericConfigs {
    debugVerbosity: number,
    showInfo: boolean,
    showStatus: boolean,
    showWarnings: boolean,
    debugDB: boolean
    debugAPI: boolean
    debugAPIResult: boolean
    logPath: string
}

export interface IntfDBConfigs {
    host: string
    port: number
    schema: string
    user: string
    password: string
    deepDebug: boolean
}

export interface IntfProxyConfigs {
    host: string,
    ports: number[]
}

export interface IntfKeyVal { [key: string]:unknown }

export interface IntfQueryParams {
    cols?: string[]
    conditions?: string[]
    condVals?:Array<unknown>
    extraJoins?: string[]
    orderBy?: string[]
    limit?: number
    offset?: number
    reportTotal?: boolean
}

