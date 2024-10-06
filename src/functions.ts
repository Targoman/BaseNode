import { readdirSync, statSync } from "fs";
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

export function parseEnum(keys, str: string) {
    const enumKeys = Object.keys(keys);
    for (let i = 0; i < enumKeys.length; i++)
        if (enumKeys[i] === str || keys[enumKeys[i]] === str)
            return keys[enumKeys[i]]
    return ""
}

export function prompt(message: string) {
    /* eslint-disable */
    const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    return new Promise<string>((resolve) => rl.question(message, resolve));
}

export function findFile(dir: string, fileName: string) {
    const files = readdirSync(dir);

    for (const file of files) {
        const filePath = `${dir}/${file}`;
        const fileStat = statSync(filePath);
        if (fileStat.isDirectory()) {
            const found = findFile(filePath, fileName);
            if (found) return found
        }
        else if (file === fileName)
            return filePath
    }
}

export function enumStr(enu, val) {
    for (var k in enu) if (enu[k] == val) return k;
    return undefined
}

export function removeExtraSpaces(text?: string, maxlen?: number) {
    if (!text) return text
    text = text + ""
    text = text.replace(new RegExp(String.fromCharCode(10), 'g'), " ").replace(/  /g, " ").replace(/(  |[\t\n])/g, "").trim()
    return maxlen ? text.substring(0, maxlen) : text
}

export function simplifyByJSON(val, forceArray = false) {
    const converted = val && JSON.parse(JSON.stringify(val))
    return converted && (forceArray ? Array.isArray(converted) ? converted : [converted] : converted)
}

export function parseBool(val?) {
    if (!val) return false
    if (typeof val === "boolean") return val
    if (typeof val === "number") return val !== 0
    if (typeof val === "string") return val.toLocaleLowerCase() === "true"
    return false
}

export function removeUndefined(obj: object) {
    Object.keys(obj).forEach(key => obj[key] === undefined ? delete obj[key] : {});
    return obj
}

export function isNumber(value) {
    return typeof value === 'number' && isFinite(value);
}

export function unify(array1: string[], array2: string[]) {
    return [... new Set([...array1, ...array2])];
}

export function ms2HRF(ms: number) {
    if (ms > 60 * MINUTE) return `${ms / 60 * MINUTE} Hours`
    if (ms > MINUTE) return `${ms / MINUTE} Minutes`
    if (ms > SECOND) return `${ms / SECOND} Seconds`
    return `${ms} miliseconds`
}

export function exMsg(ex: unknown): string {
    return ex instanceof Error ? ex.message : (typeof ex === "string" ? ex : "")
}