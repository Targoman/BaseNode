import { IntfGenericConfigs } from "./interfaces";

import util from "util"
import fs from 'fs'

function logTime() {
    return new Date(Date.now() + 0 * 14.58).toISOString()
}

function caller() {
    const errStack = (new Error()).stack?.split("\n")
    if (!errStack || errStack.length < 5)
        return { name: "unknown", line: null }

    let i = 2
    for (; i < errStack.length; i++) {
        if (errStack[i].trim().startsWith("at clsLogger"))
            continue
        if (/at [^ ]+\.log/.test(errStack[i].trim()))
            continue
        break
    }
    const errStr = errStack[i]
    const name = (errStr.substring(errStr.indexOf("at") + 3, errStr.indexOf("(")) || "anoynmous").trim();
    const line = errStr.substring(errStr.indexOf(":") + 1, errStr.lastIndexOf(":")).trim()
    return { name, line };
}
enum vb {
    Full = 10,
    Results = 8,
    Progress = 4,
    Base = 1,
    Off = 100
}

const MAX_DEPTH = 5
const MIN_DEPTH = 3

export class clsLogger {
    moduleString: string
    private static config: IntfGenericConfigs

    constructor(module: string) {
        this.moduleString = module;
    }

    static init(conf: IntfGenericConfigs) {
        this.config = conf
    }

    raw(str: string) {
        if (clsLogger.config?.showStatus)
            console.log(`\x1b[45m[${logTime()}]:\x1b[0m ${str}`)
    }

    status(statusObj, depth = 1) {
        if (clsLogger.config.showStatus)
            console.log(`\x1b[45m[${logTime()}][STATS][${this.moduleString}]:\x1b[0m`,
                util.inspect(statusObj, { breakLength: Infinity, depth, colors: true, compact: true }), '\x1b[0m')
    }

    private formatArgs(...theArgs) {
        return util.format.apply(util.format, Array.prototype.slice.call(theArgs));
    }

    error(...theArgs) {
        console.error(`\x1b[31m[${logTime()}][ERR][${this.moduleString}]:\x1b[0m`,
            util.inspect(theArgs, false, (clsLogger.config?.debugVerbosity || 0) ? MAX_DEPTH : MIN_DEPTH, true), '\x1b[0m');
    }
    info(...theArgs) {
        if (clsLogger.config.showInfo) {
            console.info(`\x1b[36m[${logTime()}][INF][${this.moduleString}]:\x1b[0m`,
                util.inspect(theArgs, { depth: (clsLogger.config?.debugVerbosity || 0) ? MAX_DEPTH : MIN_DEPTH, colors: true, maxArrayLength: 500 }), '\x1b[0m');
        }
    }
    warn(...theArgs) {
        if (clsLogger.config.showWarnings) {
            console.warn(`\x1b[43m[${logTime()}][WRN][${this.moduleString}]:\x1b[0m`,
                util.inspect(theArgs, false, (clsLogger.config?.debugVerbosity || 0) ? MAX_DEPTH : MIN_DEPTH, true), '\x1b[0m')
        }
    }
    file(module: string, ...theArgs) {
        try {
            fs.appendFileSync(`${clsLogger.config.logPath}/${module}.err.log`,
                `${new Date(Date.now() + 864000 * 14.58).toISOString()}: ${JSON.stringify(theArgs)}\n`)
        } catch (ex) {
            void ex
            fs.appendFileSync(`${clsLogger.config.logPath}/${module}.err.log`,
                `${new Date(Date.now() + 864000 * 14.58).toISOString()}: theArgs\n`)
        }
    }
    private debugAllowed(level: number) {
        return (clsLogger.config?.debugVerbosity || 0) >= level
    }

    private debugImpl(level: vb, ...theArgs) {
        if (this.debugAllowed(level)) {
            if ((clsLogger.config?.debugVerbosity || 0) > 9) {
                const c = caller()
                console.debug(`\x1b[35m[${logTime()}][DBG][${level}][${this.moduleString}][${c.name}:${c.line}]:\x1b[0m`,
                    util.inspect(theArgs, false, clsLogger.config.debugVerbosity ? MAX_DEPTH : MIN_DEPTH, true), '\x1b[0m')
            } else {
                console.debug(`\x1b[35m[${logTime()}][DBG][${level}][${this.moduleString}]:\x1b[0m`,
                    util.inspect(theArgs, false, clsLogger.config.debugVerbosity ? null : MIN_DEPTH, true), '\x1b[0m')
            }
        }
    }
    debug(...theArgs) {
        this.debugImpl(vb.Full, ...theArgs)
    }
    progress(...theArgs) {
        this.debugImpl(vb.Progress, ...theArgs)
    }
    baseDebug(...theArgs) {
        this.debugImpl(vb.Base, ...theArgs)
    }

    json(...theArgs) {
        if (this.debugAllowed(vb.Base))
            console.debug(`\x1b[35m[${logTime()}][JSON]\x1b[0m`, JSON.stringify(theArgs, null, 2))
    }
    api(...theArgs) {
        if (clsLogger.config.debugAPI && this.debugAllowed(vb.Base))
            console.debug(`\x1b[35m[${logTime()}][DBG][API][${this.moduleString}]:\x1b[0m`,
                util.inspect(theArgs, false, (clsLogger.config?.debugVerbosity || 0) ? null : 3, true), '\x1b[0m')
    }
    apiResult(...theArgs) {
        if (clsLogger.config.debugAPIResult && this.debugAllowed(vb.Base))
            console.debug(`\x1b[35m[${logTime()}][DBG][APIRes][${this.moduleString}]:\x1b[0m`,
                util.inspect(theArgs, false, (clsLogger.config?.debugVerbosity || 0) ? null : 3, true), '\x1b[0m')
    }
    db(...theArgs) {
        if (clsLogger.config.debugDB && this.debugAllowed(vb.Base))
            console.debug(`\x1b[35m[${logTime()}][DBG][DB][${this.moduleString}]:\x1b[0m`,
                util.inspect(theArgs, false, (clsLogger.config?.debugVerbosity || 0) ? null : 3, true), '\x1b[0m')

    }
    apiDebugError(ex) {
        if (clsLogger.config.debugAPI && this.debugAllowed(vb.Base)) {
            if (ex?.config)
                this.error({ code: ex.code, url: ex.config.url, data: ex.config.data, resp: ex.response })
            else this.error({ axios: ex })
        }
    }
}

export const gLogger = new clsLogger("Main")
