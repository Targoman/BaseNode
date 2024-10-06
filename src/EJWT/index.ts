import { SHA256, SHA384, SHA512, AES , enc } from 'crypto-js'; 
import { DAY } from "../constants";
import { enuJWTHashAlgs, enuTokenActorType, exJWTExpired, IntfEJWTConfigs } from "./interfaces";
import { Base64 } from 'js-base64';
import { gLogger } from "../logger";
import { exAccessForbidden, exExpectationFailed, exNotAuthenticated } from "../REST/exceptions";
import { exMsg } from "../functions";


let EJWTConf: IntfEJWTConfigs = {
    secret: "~5KHeTc7.C^Ln^<X~4<Kr",
    hashAlgorithm: enuJWTHashAlgs.HS256,
    simpleCryptKey: "zfsde 321r w4 23 43",
    ttl: 300,
    normalLoginTTL: 1 * DAY,
    rememberLoginTTL: 7 * DAY
}

function hashAsSign(data: string): string {
    switch (EJWTConf.hashAlgorithm) {
        case enuJWTHashAlgs.HS384:
            return SHA384(data + EJWTConf.secret).toString()
        case enuJWTHashAlgs.HS512:
            return SHA512(data + EJWTConf.secret).toString()
        default:
            return SHA256(data + EJWTConf.secret).toString()
    }
}

function encryptAndSigned(payload: object): string {
    if (Object.hasOwn(payload, "prv"))
        payload["prv"] = AES.encrypt(JSON.stringify(payload["prv"]), EJWTConf.simpleCryptKey as string).toString()

    const head = { typ: "JWT", alg: EJWTConf.hashAlgorithm, }
    const data = Base64.encode(JSON.stringify(head),true) + '.' + Base64.encode(JSON.stringify(payload), true)
    const sign = hashAsSign(data)
    console.log({sign: sign.toString()})
    return data + '.' + sign
}

function createSigned(
    payload: object,
    tokenType: enuTokenActorType,
    privatePayload?: object,
    expiry: number = Infinity,
    sessionID?: string,
    remoteIP?: string
): string {
    payload["typ"] = tokenType
    if (Object.hasOwn(payload, "iat") === false)
        payload['iat'] = (new Date).getTime()
    payload["exp"] = payload['iat'] + (expiry < 0 || expiry === Infinity ? EJWTConf.ttl : expiry)
    const ssnRemember = true;
    if (tokenType == enuTokenActorType.User) {
        if (Object.hasOwn(payload, "ssnexp") == false)
            payload["ssnexp"] = payload["iat"] + (ssnRemember ? EJWTConf.rememberLoginTTL : EJWTConf.normalLoginTTL);
    } else
        delete payload["ssnexp"]

    if (sessionID?.length)
        payload["jti"] = sessionID;
    else
        delete payload["jti"];

    if (remoteIP?.length) {
        if (!privatePayload) privatePayload = {}
        privatePayload["cip"] = remoteIP;
    } else if (privatePayload)
        delete privatePayload["cip"];

    if (privatePayload && Object.keys(privatePayload).length)
        payload["prv"] = privatePayload;
    else
        delete payload["prv"];

    return encryptAndSigned(payload);
}


function extractAndDecryptPayload(jwt: string): object {
    const jwtParts = jwt.split(".")
    if (jwtParts.length != 3)
        throw new exAccessForbidden("Invalid JWT Token")
    const sign = hashAsSign(jwtParts[0] + '.' + jwtParts[1])
    if (sign != jwtParts[2])
        throw new exAccessForbidden("JWT signature verification failed")

    try {
        const payload = JSON.parse(Base64.decode(jwtParts[1]))
        if (typeof payload !== 'object' || Object.keys(payload).length === 0)
            throw new exExpectationFailed("Invalid JWT payload: empty object")

        if (Object.hasOwn(payload, 'prv')) {
            try {
                const decrypted = AES.decrypt(payload['prv'], EJWTConf.simpleCryptKey as string).toString(enc.Utf8)
                if (decrypted.length === 0)
                    throw new exExpectationFailed("empty string decoding private payload")
                payload['prv'] = JSON.parse(decrypted)
                if (Object.keys(payload['prv']).length === 0)
                    throw new exExpectationFailed("Invalid empty private JWT payload")
            } catch (ex: unknown) {
                gLogger.debug(ex)
                throw new exExpectationFailed("Invalid private part: " + (ex instanceof Error ? ex.message : "Unk"))
            }
        }
        return payload
    } catch (ex) {
        gLogger.debug(ex)
        throw new exAccessForbidden(exMsg(ex))
    }
}

function verifyJWT(
    jwt: string,
    remoteIP: string,
    tokenAllowUSER: boolean,
    tokenAllowAPI: boolean,
) {
    const jwtPayload = extractAndDecryptPayload(jwt)
    let jwtTokenActorType = enuTokenActorType.User;

    if (Object.hasOwn(jwtPayload, "typ"))
        jwtTokenActorType = jwtPayload["typ"] as enuTokenActorType;

    if ((jwtTokenActorType === enuTokenActorType.User) && (tokenAllowUSER == false))
        throw new exAccessForbidden("Token type `USER` not acceptable by this module. expected: API");

    if ((jwtTokenActorType == enuTokenActorType.API) && (tokenAllowAPI == false))
        throw new exAccessForbidden("Token type `API` not acceptable by this module. expected: USER");

    //-- check client ip -----
    //    if (_jWTPayload.contains("prv")) {
    //        QJsonObject PrivateObject = _jWTPayload["prv"].toObject();

    //        if (PrivateObject.contains("cip") && (PrivateObject["cip"].toString() != _remoteIP))
    //            throw new exHTTPForbidden("Invalid client IP");
    //    }

    const currentDateTime = (new Date).getTime()

    //-- check large expiration -----
    if (jwtTokenActorType == enuTokenActorType.User) {
        if (Object.hasOwn(jwtPayload, "ssnexp") === false)
            throw new exAccessForbidden("Invalid ssnexp in JWT");

        if (jwtPayload["ssnexp"] <= currentDateTime)
            throw new exNotAuthenticated("Session expired");
    }

    //-- check small expiration -----
    if (Object.hasOwn(jwtPayload, "exp") == false)
        throw new exAccessForbidden("Invalid exp in JWT");

    if (jwtPayload["exp"] <= currentDateTime)
        throw new exJWTExpired("JWT expired");

    /*    const tokenBanType = TokenHelper.GetTokenBanType(_jwt);
        if (TokenBanType == enuTokenBanType.Block)
            throw new exAccessForbidden("Token is blocked");
        else if (TokenBanType == enuTokenBanType.Pause)
            throw new exAccessForbidden("Token is paused");
        */
}


export default {
    encryptAndSigned,
    createSigned,
    extractAndDecryptPayload,
    verifyJWT,
    init(configs?: IntfEJWTConfigs) {
        EJWTConf = { ...EJWTConf, ...configs }
    }
}