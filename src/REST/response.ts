import { Request, Response } from "express"
import { StatusCodes } from "http-status-codes"
import { exDuplicatedItem, exNoChangesApplied } from "/@BaseNode/exceptions"
import { gLogger } from "/@BaseNode/logger"
import { MysqlError } from "promise-mysql"
import { IntfMultiRow } from "../clsORM"
import { IntfKeyVal } from "../interfaces"
import { IntfCreateResponse } from "../clsMySQL"

export async function resOnGetAll(req: Request, res: Response, callback: () => Promise<IntfMultiRow>) {
    void req
    const result = await callback()
    return returnResponse(res, StatusCodes.OK, { tc: result.tc || result.rows?.length, rows: result.rows })
}

export async function resOnGetOne(req: Request, res: Response, callback: () => Promise<IntfKeyVal>) {
    void req
    const result = await callback()
    return returnResponse(res, StatusCodes.OK, result)
}

async function _resOnCreate(req: Request, res: Response, callback: () => Promise<IntfCreateResponse>, allowDup = true) {
    void req
    try {
        const result = await callback()
        if (typeof result === "object" && result.firstInsertedId === undefined)
            return returnResponse(res, StatusCodes.CREATED, result)
        if (result.firstInsertedId !== undefined)
            return returnResponse(res, StatusCodes.CREATED, { id: result.firstInsertedId, inserted: result.insertedRows, updated: result.updatedRows })
        else return returnResponse(res, StatusCodes.CREATED, { id: result })
    } catch (ex) {
        if ((ex as MysqlError)?.sqlState) {
            if ((ex as MysqlError).errno === 1062) {
                if (allowDup) return returnResponse(res, StatusCodes.ACCEPTED, { "id": "Was created before" })
                else throw new exDuplicatedItem("Was created before")
            }
        }
        throw ex
    }
}

export async function resOnCreateNoDup(req: Request, res: Response, callback: () => Promise<IntfCreateResponse>) {
    return _resOnCreate(req, res, callback, false)
}

export async function resOnCreateIgnoreDup(req: Request, res: Response, callback: () => Promise<IntfCreateResponse>) {
    return _resOnCreate(req, res, callback, true)
}

export async function resOnUpdate(req: Request, res: Response, callback: () => Promise<number>) {
    void req
    try {
        const affected = await callback()
        if (affected === 0)
            throw new exNoChangesApplied()
        return returnResponse(res, StatusCodes.OK, { affected })
    } catch (ex) {
        if ((ex as MysqlError).sqlState && (ex as MysqlError)?.errno === 1062)
            throw new exDuplicatedItem("Update conflicts with other records")
        throw ex
    }
}

export async function resOnDelete(req: Request, res: Response, callback: () => Promise<number>) {
    return resOnUpdate(req, res, callback)
}

export async function returnResponse(res: Response, code: StatusCodes, value: object | boolean | number | string) {
    gLogger.apiResult({ code, value })
    if (code >= 400) value = { error: { code, ...(typeof value == "object" ? value : { value }) } }
    return res.status(code).json(value)
}