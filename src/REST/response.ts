import { Request, Response } from "express"
import { StatusCodes } from "http-status-codes"
import { exDuplicatedItem, exItemNotfound, exNoChangesApplied } from "#Base/exceptions"
import { gLogger } from "#Base/logger"
import { exBadRequest } from "./exceptions"

export async function resOnGetAll(req: Request, res: Response, callback: () => Promise<any>) {
    const result = await callback()
    return returnResponse(res, StatusCodes.OK, { tc: result.tc || result.rows?.length, rows: result.rows })
}

export async function resOnGetOne(req: Request, res: Response, callback: () => Promise<any>, message?: string) {
    const result = await callback()
    return returnResponse(res, StatusCodes.OK, result)
}

async function _resOnCreate(req: Request, res: Response, callback: () => Promise<any>, allowDup = true) {
    try {
        const result = await callback()
        if (typeof result === "object" && result.firstInsertedId === undefined)
            return returnResponse(res, StatusCodes.CREATED, result)
        if (result.firstInsertedId !== undefined)
            return returnResponse(res, StatusCodes.CREATED, { id: result.firstInsertedId, inserted: result.insertedRows, updated: result.updatedRows })
        else return returnResponse(res, StatusCodes.CREATED, { id: result })
    } catch (ex: any) {
        if (ex?.sqlState) {
            if (ex.errno === 1062) {
                if (allowDup) return returnResponse(res, StatusCodes.ACCEPTED, { "id": "Was created before" })
                else throw new exDuplicatedItem("Was created before")
            }
        }
        throw ex
    }
}

export async function resOnCreateNoDup(req: Request, res: Response, callback: () => Promise<any>) {
    return _resOnCreate(req, res, callback, false)
}

export async function resOnCreateIgnoreDup(req: Request, res: Response, callback: () => Promise<any>) {
    return _resOnCreate(req, res, callback, true)
}

export async function resOnUpdate(req: Request, res: Response, callback: () => Promise<any>, message?: string) {
    try {
        const affected = await callback()
        if (affected === 0)
            throw new exNoChangesApplied()
        return returnResponse(res, StatusCodes.OK, { affected: affected })
    } catch (ex: any) {
        if (ex?.sqlState && ex?.errno === 1062)
            throw new exDuplicatedItem("Update conflicts with other records")
        throw ex
    }
}

export async function resOnDelete(req: Request, res: Response, callback: () => Promise<any>, message?: string) {
    return resOnUpdate(req, res, callback, message)
}

export async function returnResponse(res: Response, code: StatusCodes, value: object) {
    gLogger.apiResult({ code, value })
    if (code >= 400) value = { error: { code, ...value } }
    return res.status(code).json(value)
}