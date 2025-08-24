import Joi from "joi"
import { clsColumn, clsORM } from "../../clsORM"
import clsMySQL from "../../clsMySQL"
import { enuBannedStatus } from "../Auth"

export class tblRoles extends clsORM {
    rolID = new clsColumn(() => Joi.number().min(1), { isReadonly: true, isPrimary: true })
    rolName = new clsColumn(() => Joi.string())
    rolParent_rolID = new clsColumn(() => Joi.number().min(1).allow(null).optional())
    rolPrivileges = new clsColumn(() => Joi.object().allow(null),)
    rolSignupAllowedIPs = new clsColumn(() => Joi.string().allow(null))
    rolStatus = new clsColumn(() => Joi.string().optional().valid(...Object.values(enuBannedStatus)), { isStatus: true })
    rolCreatedBy_usrID = new clsColumn(() => Joi.number().allow(null).optional().min(1), { isReadonly: true })
    rolCreationDateTime = new clsColumn(() => Joi.date().iso().optional().min(1), { isReadonly: true })
    rolUpdatedBy_usrID = new clsColumn(() => Joi.number().optional().min(1), { isReadonly: true })

    constructor(db: clsMySQL) { super(db, 'tblRoles'); this.setInstance(this) }
}