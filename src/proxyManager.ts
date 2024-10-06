import axios, { AxiosResponse } from "axios";
import { SocksProxyAgent } from "socks-proxy-agent";
import { exMsg, sleep } from "./functions";
import Cache from './timed-cache';
import { ALWAYS, LOCAL_PROXY, MINUTE, SECOND } from "./constants";
import { IntfProxyConfigs } from "./interfaces";
import { clsLogger, gLogger } from "./logger";

export interface IntfProxy {
    agent: SocksProxyAgent | null
    port: string
    ip: string,
    failed: boolean,
}

export interface IntfAllocatedProxy {
    proxy: IntfProxy,
    tag: string,
    fingerprint: string,

    item: IntfProxyItemObject
}

export interface IntfProxySettings {
    maxReuse?: number,
    logger?: clsLogger
}

export interface IntfProxyItemObject {
    err?: string
    settings: IntfProxySettings
    object
}

interface IntfProxyCacheItem {
    proxy: IntfProxy
    inUseBy: { [tag: string]: { [fingerprint: string]: IntfProxyItemObject } }
}

const PROXY_FAILED = "FAILED"
const PROXY_NOTFOUND = "NOTFOUND"

const proxyCache = new Cache<IntfProxyCacheItem>({ defaultTtl: 1 * MINUTE })
function updateCache(proxy: IntfProxy, tag: string, fingerprint: string, item: IntfProxyItemObject): IntfAllocatedProxy {
    const cachedItem: IntfProxyCacheItem = proxyCache.get(proxy.port) || { proxy, inUseBy: {} }
    cachedItem.proxy = proxy
    if (proxy.failed) {
        cachedItem.inUseBy = {}
    } else {
        if (!cachedItem.inUseBy[tag])
            cachedItem.inUseBy[tag] = {}
        if (!Object.keys(cachedItem.inUseBy[tag]).includes(fingerprint))
            cachedItem.inUseBy[tag][fingerprint] = item
    }
    proxyCache.put(proxy.port, cachedItem)
    return { proxy, tag, fingerprint, item }
}

export async function releaseProxy(port: string, tag: string, fingerprint: string) {
    const item: IntfProxyCacheItem | undefined = proxyCache.get(port)
    if (!item) return
    if (!item.inUseBy[tag]) return
    if (!Object.keys(item.inUseBy[tag]).includes(fingerprint)) return
    delete item.inUseBy[tag][fingerprint]
    if (Object.keys(item.inUseBy[tag]).length === 0)
        delete item.inUseBy[tag]
    if (Object.keys(item.inUseBy).length)
        proxyCache.put(port, item)
    else
        proxyCache.remove(port)
}

let nextProxyIndex = -1
export async function allocateProxy(
    conf: IntfProxyConfigs | undefined,
    tag: string,
    fingerprint: string,
    settings: IntfProxySettings = { maxReuse: 0, logger: new clsLogger("Proxy") },
    object?,
    forcedChange = false
): Promise<IntfAllocatedProxy> {
    let oldAllocatedPort: string | undefined
    for (const port of proxyCache.keys()) {
        const cacheItem = proxyCache.get(port)
        if (cacheItem) {
            if (forcedChange)
                oldAllocatedPort = cacheItem.proxy.port
            else if (!cacheItem.proxy.failed && cacheItem.inUseBy[tag] && cacheItem.inUseBy[tag][fingerprint]) {
                return updateCache(cacheItem.proxy, tag, fingerprint, { settings, object })
            }
        }
    }

    let useProxies = false
    if (conf?.host && conf?.ports && conf?.ports.length)
        useProxies = true

    let allProxyPorts: string[] | undefined = conf?.ports.map(port => `${port}`)
    if (!allProxyPorts || allProxyPorts.length === 0)
        allProxyPorts = [`${LOCAL_PROXY}`]

    let checkedPortsCount = 0
    while (ALWAYS) {
        if (checkedPortsCount >= allProxyPorts.length) {
            settings.logger?.debug("No proxies are available. Sleeping")
            await sleep(3 * MINUTE)
            nextProxyIndex = -1
        }

        if (nextProxyIndex === -1)
            nextProxyIndex = Math.floor(Math.random() * allProxyPorts.length)
        if (nextProxyIndex >= allProxyPorts.length)
            nextProxyIndex = 0

        const candidatePort = allProxyPorts.at(nextProxyIndex) || "0"
        const cacheItem: IntfProxyCacheItem | undefined = proxyCache.get(candidatePort)
        checkedPortsCount++
        nextProxyIndex++
        if (cacheItem) {
            if (cacheItem.proxy.failed) {
                settings.logger?.debug("Ignoring failed agent")
                await sleep(500)
                continue
            }
            if (cacheItem.inUseBy[tag] && Object.keys(cacheItem.inUseBy[tag]).length > (settings.maxReuse || 0)) {
                settings.logger?.debug("Ignoring as maximum proxies has been used")
                await sleep(5 * SECOND)
                continue
            }
        }

        let ip: string
        let agent: SocksProxyAgent | null
        if (useProxies) {
            settings.logger?.debug("Tryig socks port:", candidatePort)
            agent = new SocksProxyAgent(`socks5://${conf?.host}:${candidatePort}`);
            ip = await axios
                .get("https://api.ipify.org", { httpsAgent: agent, httpAgent: agent })
                .then((res: AxiosResponse) => res.data)
                .catch((ex) => exMsg(ex) === "getaddrinfo ENOTFOUND api.ipify.org" ? PROXY_NOTFOUND : PROXY_FAILED)
        } else {
            ip = "localhost"
            agent = null
            return updateCache({ failed: false, agent, ip, port: `${candidatePort}` }, tag, fingerprint, { settings, object })
        }

        if (ip && ip != PROXY_FAILED && ip != PROXY_NOTFOUND) {
            settings.logger?.debug(`${fingerprint} will use ${candidatePort}:${ip} as proxy`)
            if (oldAllocatedPort) releaseProxy(oldAllocatedPort, tag, fingerprint)
            return updateCache({ failed: false, agent, ip, port: `${candidatePort}` }, tag, fingerprint, { settings, object })
        } else if (ip === PROXY_FAILED) {
            gLogger.debug(`${fingerprint} FAILED port: ${candidatePort}`)
            updateCache({ failed: true, agent: null, ip, port: `${candidatePort}` }, "", "", { settings, object })
        } else
            proxyCache.remove(`${candidatePort}`)
        await sleep(500)
    }
    throw new Error("Will never happen")
}

export async function renewProxy(conf: IntfProxyConfigs, oldProxy: IntfAllocatedProxy, cause: string) {
    updateCache(oldProxy.proxy, oldProxy.tag, oldProxy.fingerprint, { ...oldProxy.item, err: cause })
    const newProxy = await allocateProxy(conf, oldProxy.tag, oldProxy.fingerprint, oldProxy.item.settings, oldProxy.item.object, true)
    return newProxy
}

export function proxyState(port: string) {
    const cacheItem: IntfProxyCacheItem | undefined = proxyCache.get(port)

    if (cacheItem) {
        if (cacheItem.proxy.failed) return "FAILED"
        else return cacheItem
    } else
        return undefined
}

