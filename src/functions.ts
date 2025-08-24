import { exDB } from "./exceptions";
import { IntfDBConfigs } from "./interfaces";
import { MINUTE, SECOND } from "./constants";

export async function sleep(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

export function sameString(str1?: string, str2?: string) {
    return str1 && str2 && str1?.replace(/ /g, "").toUpperCase() === str2?.replace(/ /g, "").toUpperCase()
}

export function pascalCase(str: string) {
    return str.split(" ").map(s => s[0].toUpperCase() + s.substring(1).toLowerCase()).join("")
}
export function cammelCase(str: string) {
    return str.split(" ").map(s => s[0].toLowerCase() + s.substring(1).toLowerCase()).join("")
}
export function snakeCase(str: string) {
    return str.split(" ").map(s => s.toLowerCase()).join("-")
}

export function getDBconfigs(baseConfigs?: IntfDBConfigs | { [key: string]: IntfDBConfigs }, nameOrSchema?: string): IntfDBConfigs {
    if (!baseConfigs)
        throw new exDB("No DB specified")
    if (nameOrSchema && baseConfigs[nameOrSchema])
        return baseConfigs[nameOrSchema]

    let conf: IntfDBConfigs
    if (baseConfigs['default'])
        conf = { ...baseConfigs['default'] }
    else if (baseConfigs['host'])
        conf = { ...baseConfigs as IntfDBConfigs }
    else
        throw new exDB("No DBSpecs found")

    if (nameOrSchema)
        conf.schema = nameOrSchema
    return conf
}

export function parseEnum<T extends Record<string, string | number>>(keys: T, str: string): T[keyof T] | "" {
    const enumKeys = Object.keys(keys);
    for (let i = 0; i < enumKeys.length; i++) {
        const key = enumKeys[i] as keyof T;
        if (key === str || keys[key] === str) {
            return keys[key];
        }
    }
    return "";
}

export function prompt(message: string) {
    /* eslint-disable */
    const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    return new Promise<string>((resolve) => rl.question(message, resolve));
}

export function enumStr<T extends Record<string, string | number>>(enu: T, val: string | number): keyof T | undefined {
    for (const k in enu) {
        if (enu[k] === val) return k;
    }
    return undefined;
}

export function removeExtraSpaces(text?: string, maxlen?: number) {
    if (!text) return text
    text = text + ""
    text = text.replace(new RegExp(String.fromCharCode(10), 'g'), " ").replace(/  /g, " ").replace(/(  |[\t\n])/g, "").trim()
    return maxlen ? text.substring(0, maxlen) : text
}

export function simplifyByJSON<T>(val: T, forceArray = false): T | T[] | null {
    if (!val) return null;
    try {
        const converted = JSON.parse(JSON.stringify(val));
        if (forceArray) {
            return Array.isArray(converted) ? converted : [converted];
        }
        return converted;
    } catch {
        return null;
    }
}

export function parseBool(val?: unknown): boolean {
    if (!val) return false;
    if (typeof val === "boolean") return val;
    if (typeof val === "number") return val !== 0;
    if (typeof val === "string") return val.toLowerCase() === "true";
    return false;
}

export function removeUndefined<T extends Record<string, unknown>>(obj: T): T {
    const result = { ...obj };
    Object.keys(result).forEach(key => {
        if (result[key] === undefined) {
            delete result[key];
        }
    });
    return result;
}

export function isNumber(value) {
    return typeof value === 'number' && isFinite(value);
}

export function unify(array1: string[], array2: string[]) {
    return [... new Set([...array1, ...array2])];
}

export function ms2HRF(ms: number) {
    if (ms > 60 * MINUTE) return `${Math.floor(ms / (60 * MINUTE))} Hours`
    if (ms > MINUTE) return `${Math.floor(ms / MINUTE)} Minutes`
    if (ms > SECOND) return `${Math.floor(ms / SECOND)} Seconds`
    return `${ms} milliseconds`
}

export function exMsg(ex: unknown): string {
    return ex instanceof Error ? ex.message : (typeof ex === "string" ? ex : "")
}

export function hasOwnProp(obj: unknown, prop: string) {
    return typeof obj === "object" && obj && Object.hasOwn(obj, prop)
}

export function concatPath(base: string, path: string) { return base + (base.endsWith("/") ? "" : "/") + (path.startsWith("/") ? path.substring(1) : path) }

export function addMonths(date: string, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
}