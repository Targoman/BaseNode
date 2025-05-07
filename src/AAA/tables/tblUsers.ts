import Joi from "joi"
import { clsColumn, clsORM } from "../../clsORM"
import { enuUserApprovalState, enuUserGender, enuUserStatus } from "../Auth"
import clsMySQL from "../../clsMySQL"

export class tblUser extends clsORM {
    usrID = new clsColumn(() => Joi.number().min(1), { isReadonly: true, isPrimary: true })
    usrEmail = new clsColumn(() => Joi.string())
    usrName = new clsColumn(() => Joi.string())
    usrFamily = new clsColumn(() => Joi.string())
    usrGender = new clsColumn(() => Joi.string().optional().valid(...Object.values(enuUserGender)))
    usrMobile = new clsColumn(() => Joi.number())
    usrApprovalState = new clsColumn(() => Joi.string().valid(...Object.values(enuUserApprovalState)))
    usr_rolID = new clsColumn(() => Joi.number().min(1))
    usrSpecialPrivs = new clsColumn(() => Joi.object().allow(null),)
    usrLanguage = new clsColumn(() => Joi.string().allow(null))
    usrMaxSessions = new clsColumn(() => Joi.number())
    usrActiveSessions = new clsColumn(() => Joi.number())
    usrLastLogin = new clsColumn(() => Joi.date().iso().optional())
    usrStatus = new clsColumn(() => Joi.string().optional().valid(...Object.values(enuUserStatus)), { isStatus: true })
    usrCreatedBy_usrID = new clsColumn(() => Joi.number().allow(null).optional().min(1), { isReadonly: true })
    usrCreationDateTime = new clsColumn(() => Joi.date().iso().optional().min(1), { isReadonly: true })
    usrUpdatedBy_usrID = new clsColumn(() => Joi.number().optional().min(1), { isReadonly: true })

    constructor(db: clsMySQL) { super(db, 'tblUser'); this.setInstance(this) }
}