import Joi from "joi"
import { clsColumn, clsORM } from "../../clsORM"
import clsMySQL from "../../clsMySQL"
import { tblUser } from "./tblUsers"

export enum enuSessionStatus {
    Active = "Active",
    LoggedOut = "LoggedOut",
    ForciblyLoggedOut = "ForciblyLoggedOut",
    Expired = "Expired"
}

export class tblActiveSessions extends clsORM {
    ssnID = new clsColumn(() => Joi.number().min(1), { isReadonly: true, isPrimary: true })
    ssnKey = new clsColumn(() => Joi.string(), { isReadonly: true })
    ssn_usrID = new clsColumn(() => Joi.number().optional().min(1), { isReadonly: true })
    ssnCreateTime = new clsColumn(() => Joi.date().iso().optional(), { isReadonly: true })
    ssnIPReadable = new clsColumn(() => Joi.string(), { isReadonly: true })
    ssnInfo = new clsColumn(() => Joi.object(), { isReadonly: true })
    ssnFingerPrint = new clsColumn(() => Joi.string(), { isReadonly: true })
    ssnLastActivity = new clsColumn(() => Joi.date().iso().optional(), { isReadonly: true })
    ssnLastRenew = new clsColumn(() => Joi.date().iso().optional(), { isReadonly: true })
    ssnRemember = new clsColumn(() => Joi.boolean())
    ssnStatus = new clsColumn(() => Joi.string().optional().valid(...Object.values(enuSessionStatus)), { isStatus: true })
    ssnCreatedBy_usrID = new clsColumn(() => Joi.number().allow(null).optional().min(1), { isReadonly: true })
    ssnCreationDateTime = new clsColumn(() => Joi.date().iso().optional().min(1), { isReadonly: true })
    ssnUpdatedBy_usrID = new clsColumn(() => Joi.number().optional().min(1), { isReadonly: true })

    constructor(db: clsMySQL) {
        super(db, 'tblActiveSessions', {
            joins: [{
                targetTable: new tblUser(db),
                fk: { col: "ssn_usrID", fkCol: "usrID" }
            }]
        }
        ); this.setInstance(this)
    }
}