import axios, { AxiosError, AxiosResponse, AxiosRequestConfig } from "axios";
import { sleep } from "./functions";
import { IntfKeyVal, IntfProxyConfigs } from "./interfaces"
import { clsLogger, gLogger } from "./logger";
import { IntfAllocatedProxy, IntfProxy, releaseProxy, renewProxy } from "./proxyManager";

export interface IntfReqChangeParams {
    allocatedProxy?: IntfAllocatedProxy
    cookie?: string
}

const defaultUA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36"
export function configWithUA(reqParams: IntfRequestParams) {
    if (!reqParams.conf)
        reqParams.conf = { headers: { 'User-Agent': reqParams.ua || defaultUA } }
    else if (!reqParams.conf.headers)
        reqParams.conf.headers = { 'User-Agent': reqParams.ua || defaultUA }
    else
        reqParams.conf.headers['User-Agent'] = reqParams.ua || defaultUA

    if (reqParams.conf.headers) {
        reqParams.conf.headers['Connection'] = "Close"
        reqParams.conf.headers['Accept'] = "text/html"
        reqParams.conf.headers["Accept-Encoding"] = "gzip, deflate, br"
        if (reqParams.cookie)
            reqParams.conf.headers['Cookie'] = reqParams.cookie
    }
    if (reqParams.extraHeaders && reqParams.conf) {
        Object.keys(reqParams.extraHeaders).forEach(key => {
            if (reqParams.conf && reqParams.extraHeaders)
                reqParams.conf.headers = { ...reqParams.conf?.headers, [key]: reqParams.extraHeaders[key] }
        })
    }

    if (reqParams.allocatedProxy.proxy.failed)
        throw new Error("Invalid failed proxy!!!!")

    if (reqParams.allocatedProxy.proxy.agent) {
        reqParams.conf.httpAgent = reqParams.allocatedProxy?.proxy.agent
        reqParams.conf.httpsAgent = reqParams.allocatedProxy?.proxy.agent
    }

    if (reqParams.conf.maxRedirects === undefined)
        reqParams.conf.maxRedirects = 3

    if (reqParams.conf.timeout === undefined)
        reqParams.conf.timeout = 30000

    return reqParams.conf;
}

function requestError(error: AxiosError, retries: number, oErrorMessage = "") {
    if (error.response)
        return { err: { message: oErrorMessage + error.message, code: -error.response.status || -621 }, retries }
    else if (error.request)
        return { err: { message: oErrorMessage + error.message, code: -622 }, retries }
    else
        return { err: { message: oErrorMessage + error.message, code: -623 }, retries }
}

axios.interceptors.request.use(request => {
    void gLogger
    //log.debug('Starting Request', JSON.stringify(request, null, 2))
    return request
})
axios.interceptors.response.use(response => {
    //log.debug('Response', JSON.stringify(response, null, 2))
    return response
})

export interface IntfSuccessExtraParams {
    url: string,
    axiosRes: AxiosResponse,
    updatedCookie?: string
}

export interface IntfRequestParams {
    url: string,
    ua?: string,
    conf?: AxiosRequestConfig,
    extraHeaders?: IntfKeyVal,
    onSuccess: (res: any, retries: number, extra: IntfSuccessExtraParams) => Promise<any>,
    onFail?: (ex: AxiosError, retries: number) => Promise<any>,
    onReqChange?: (changes: IntfReqChangeParams) => void
    oErrorMessage?: string,
    allocatedProxy: IntfAllocatedProxy,
    cookie?: string
}

const DEFAULT_RETRIES = 3

export async function axiosGet(logger: clsLogger, proxyConf: IntfProxyConfigs, params: IntfRequestParams, retries = DEFAULT_RETRIES) {
    logger.api(`GET(${retries}): ` + params.url, params.conf?.params, params.allocatedProxy.proxy.port, params.cookie)

    return await axios
        .get(params.url, configWithUA(params))
        .then(async (res:any) => {
            const data = res.data
            if (typeof data === "string" && res.data.length < 5000 && res.data.includes("arvancloud")) {
                const cookie = await getArvanCookie(logger, params.url, (new URL(params.url).hostname), params.allocatedProxy.proxy)
                await sleep(3100)
                return await axiosGet(logger, proxyConf, { ...params, cookie }, retries)
            }
            logger.apiResult(res.data)
            logger.apiDebugError(res)
            return params.onSuccess(res, DEFAULT_RETRIES - retries, { url: res.request.res.responseUrl, updatedCookie: params.cookie, axiosRes: res });
        })
        .catch(async (ex: AxiosError) => {
            return await onAxiosError(logger, proxyConf, ex, params, retries, (cookie: string) => axiosGet(logger, proxyConf, { ...params, cookie }, retries - 1))
        });
}

export async function axiosPost(logger: clsLogger, proxyConf: IntfProxyConfigs, params: IntfRequestParams, data: any, retries = 1) {
    const conf = configWithUA(params)
    logger.api(`POST(${retries}): ` + params.url, data, params.conf?.params, params.conf?.headers, params.allocatedProxy.proxy.port, params.cookie)

    return await axios
        .post(params.url, data, conf)
        .then(async (res:any) => {
            const data = res.data
            if (typeof data === "string" && res.data.length < 5000 && res.data.includes("arvancloud")) {
                const cookie = await getArvanCookie(logger, params.url, (new URL(params.url).hostname), params.allocatedProxy.proxy)
                await sleep(3100)
                return await axiosPost(logger, proxyConf, { ...params, cookie }, data, retries)
            }
            logger.apiResult(res.data)
            logger.apiDebugError(res)
            return params.onSuccess(res, DEFAULT_RETRIES - retries, { url: res.request.res.responseUrl, updatedCookie: params.cookie, axiosRes: res });
        })
        .catch(async (ex: AxiosError) => {
            return await onAxiosError(logger, proxyConf, ex, params, retries, (cookie: string,) => axiosPost(logger, proxyConf, { ...params, cookie }, data, retries - 1))
        });
}

export async function getArvanCookie(logger: clsLogger, url: string, domain: string, proxy?: IntfProxy) {
    try {
        logger.progress("Retrieving Arvan CDN cookie")
        const res = await axios.get(url, { httpAgent: proxy?.agent, httpsAgent: proxy?.agent })
        const arvanPage = res.data
        let evalStr = arvanPage.substring(arvanPage.indexOf("eval") + 6)
        evalStr = evalStr.substring(0, evalStr.indexOf("exports") - 5)
        const hash = eval(evalStr)
        void domain
        const cookie = `__arcsjs=${hash}`//; Max-Age=9000; Path=/; Domain=${encodeURIComponent(domain.startsWith("www") ? domain.substring(4) : domain)}; SameSite=None; Secure`
        return cookie
    } catch (ex) {
        logger.debug(ex)
        throw ex
    }
}

/********************************************/
async function onAxiosError(logger: clsLogger, proxyConf: IntfProxyConfigs, err: AxiosError, params: IntfRequestParams, retries: number, callback: any) {
    const onProxyFailed = async (ex: string) => {
        logger.error(err)
        params.onReqChange && params.onReqChange({ allocatedProxy: { ...params.allocatedProxy, proxy: { failed: true, agent: null, port: params.allocatedProxy.proxy.port, ip: `${err}` } } })
        params.allocatedProxy = await renewProxy(proxyConf, params.allocatedProxy, err.message)
        params.onReqChange && params.onReqChange({ allocatedProxy: params.allocatedProxy })
        await sleep(1000)
        return await callback(params.cookie);
    }

    /*if (false && err.response) {
        if (err.response.status == 429 || err.response.status == 405 || err.response.status == 403 || err.response.status == 400)
            return await onProxyFailed("E-" + err.response.status)
    } else*/ if (err?.request?._currentRequest?.res?.rawHeaders?.includes("Set-Cookie")) {
        const cookie = err.request._currentRequest.res.rawHeaders[err.request._currentRequest.res.rawHeaders.indexOf("Set-Cookie") + 1]
        await sleep(1000)
        return await callback(cookie)
    }

    if (err.response?.data && err.response?.data['errorDetails'])
        return { err: { message: err.response.data['errorDetails'][0]['code'], code: -429 }, retries }

    await releaseProxy(params.allocatedProxy.proxy.port, params.allocatedProxy.tag, params.allocatedProxy.fingerprint)

    if (params.onFail)
        return params.onFail(err, retries)
    else if (retries > 0) {
        logger.apiDebugError(err)
        logger.warn(`Retrying: ${params.url}, r:${retries}`);
        return await onProxyFailed(`E-NETWORK ${err.message}`)
    } else {
        logger.apiDebugError(err);
        return requestError(err, DEFAULT_RETRIES - retries, params.oErrorMessage);
    }
}

