import { NextFunction, Request, Response } from "express"
import { gLogger } from "../logger";

const asyncHandler = fn => (req: Request, res: Response, next: NextFunction) => {
    const debugObject = {[req.method.toUpperCase()]:req.url}
    if(Object.keys(req.body).length) debugObject['body'] = req.body
    gLogger.api(debugObject)
    return Promise
        .resolve(fn(req, res, next))
        .catch(next);
};



export default asyncHandler