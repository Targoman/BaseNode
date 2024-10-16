import { Request } from "express"
import { IntfQueryParams } from "#BaseNode/interfaces"
import { parseBool, simplifyByJSON } from "#BaseNode/functions"

export function request2SQL(req: Request) {
    const params: IntfQueryParams = {}

    params.cols = simplifyByJSON(req.query?.cols, true)
    params.conditions = simplifyByJSON(req.query.filters, true)
    params.limit = parseInt(simplifyByJSON(req.query?.max || req.query?.limit) || "10")
    params.offset = parseInt(simplifyByJSON(req.query.offset) || "0")
    params.reportTotal = parseBool(req.query.reportTotal)
    params.orderBy = simplifyByJSON(req.query?.orderBy, true)

    return params
}


