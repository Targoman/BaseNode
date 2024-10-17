import { clsORM } from "../clsORM"
import EJWT from "../EJWT"
import { enuTokenActorType } from "../EJWT/interfaces"

/*import EJWT from "../EJWT"
import { enuTokenActorType } from "../EJWT/interfaces"
*/
export enum enuUserApprovalState {
    NotApproved = 'NotApproved',
    MobileOnly = 'MobileOnly',
    EmailOnly = 'EmailOnly',
    All = 'All'
}

export enum enuUserStatus {
    Active = "Active",
    Removed = "Removed",
    Banned = "Banned",
    MustChangePass = "MustChangePass",
    Validate = "Validate",
}

export enum enuUserGender {
    Female ='Female',
    Male ='Male',
    NotExpressed ='NotExpressed'
}

export interface IntfJWTPayload {
    iat: string,
    uid: string,
    privs: object,
    usrLogin: string,
    usrName: string,
    usrFamily: string,
    usrGender: enuUserGender
    //usrApproval: enuUserApprovalState,
    usrStatus: enuUserStatus,
    //canChangePass: boolean,
    rolID: number,
    rolName: string
}


function createJWTAndSaveToActiveSession(
    db:clsORM,
    login: string,
    activeAccount: object
) {
    const payload: IntfJWTPayload = {
        iat: activeAccount['Issuance'],
        uid: activeAccount['usrID'],
        privs: activeAccount['privs'],
        usrLogin: login,
        usrName: activeAccount['usrName'],
        usrFamily: activeAccount['usrFamily'],
        usrGender: activeAccount['usrGender'],
        //usrApproval: activeAccount['usrApproval'],
        usrStatus: activeAccount['usrStatus'],
        //canChangePass: activeAccount['hasPass'],
        rolID: activeAccount['usr_rolID'],
        rolName: activeAccount['rolName'],
    }

    const jwt = EJWT.createSigned(payload, enuTokenActorType.User, {}, activeAccount['ttl'], activeAccount['ssnKey'])

    db.call("spSession_UpdateJWT", [activeAccount['ssnKey'], jwt, activeAccount['Issuance']])

    return jwt
}

export default { 
    createJWTAndSaveToActiveSession
}