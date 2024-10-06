/*import EJWT from "../EJWT"
import { enuTokenActorType } from "../EJWT/interfaces"
*/
enum enuUserApprovalState {
    NotApproved = 'NotApproved',
    MobileOnly = 'MobileOnly',
    EmailOnly = 'EmailOnly',
    All = 'All'
}

enum enuUserStatus {
    Active = "Active",
    Removed = "Removed",
    Banned = "Banned",
    MustChangePass = "MustChangePass",
    Validate = "Validate",
}

export interface IntfJWTPayload {
    iat: string,
    uid: string,
    privs: object,
    usrLogin: string,
    usrName: string,
    usrFamily: string,
    usrApproval: enuUserApprovalState,
    usrStatus: enuUserStatus,
    canChangePass: boolean,
    rolID: number,
    rolName: string
}

/*
function createJWTAndSaveToActiveSession(
    login: string,
    activeAccount: unknown
) {
    const payload: IntfJWTPayload = {
        iat: activeAccount.Privs.issuance,
        uid: activeAccount.Privs.usrID,
        privs: activeAccount.Privs.privs,
        usrLogin: login,
        usrName: activeAccount.Privs.usrName,
        usrFamily: activeAccount.Privs.usrFamily,
        usrApproval: activeAccount.Privs.usrApproval,
        usrStatus: activeAccount.Privs.usrStatus,
        canChangePass: activeAccount.Privs.hasPass,
        rolID: activeAccount.Privs.usr_rolID,
        rolName: activeAccount.Privs.rolName,
    }

    const jwt = EJWT.createSigned(payload, enuTokenActorType.User, {}, activeAccount.ttl, activeAccount.Privs['ssnKey'])
}

export default { 
    createJWTAndSaveToActiveSession
}*/