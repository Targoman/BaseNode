import { copyFileSync, writeFileSync } from "fs"
import { IntfKeyVal } from "./interfaces"
import { clsLogger } from "./logger"

let activeconfigFile: string | null = null
export default function initConfigs(args, baseConfigs) {
    let conf : IntfKeyVal= {}
    if (args.configFile) {
        try {
            activeconfigFile = (args.configFile.startsWith("/") ? "" : (process.cwd() + "/")) + args.configFile
            /* eslint-disable */
            conf = require(activeconfigFile)

        } catch (ex: any) {
            throw new Error("Unable to load config file: " + args.configFile)
        }
    } else {
        try {
            console.log("loading: ", process.cwd() + "/.config.json")
            activeconfigFile = process.cwd() + "/.config.json"
            /* eslint-disable */
            conf = require(activeconfigFile)
        } catch (ex) {
            //Intentionaly empty
        }
    }
    if (conf) {
        const setGenericConfigs = (type: string) => {
            baseConfigs.generic[type] = args[type] || (conf.generic && conf.generic[type] != undefined ? conf.generic[type] : baseConfigs.generic[type])
        }
        Object.keys(baseConfigs).forEach(key => {
            if (key === "generic")
                Object.keys(baseConfigs.generic).forEach(setGenericConfigs)
            else
                baseConfigs[key] = conf[key] != undefined ? conf[key] : baseConfigs[key]

        })
    }
    clsLogger.init(baseConfigs.generic)
}

export function updateConfigFile(toBeUpdated: IntfKeyVal) {
    if (activeconfigFile) {
        /* eslint-disable */
        const oldConfigs = require(activeconfigFile)
        const newConfigs = { ...oldConfigs, ...toBeUpdated }
        copyFileSync(activeconfigFile, activeconfigFile + ".back-" + (new Date).toISOString())
        writeFileSync(activeconfigFile, JSON.stringify(newConfigs, null, 2))
    }
}