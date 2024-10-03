import { StatusCodes } from "http-status-codes";
import { ValidationErrors } from "validator-fluent";

export class exHTTP extends Error {
    readonly http: number
    readonly msg: string
    readonly errors: { [key: string]: string[]; };

    constructor(code: number, message: string, errors?: any) {
        super(message);
        this.name = 'exHTTP';
        this.errors = errors
        this.http = code
        this.msg = message
    }
}

export class exNotAuthenticated extends exHTTP {
    constructor(message?: string) {
        super(StatusCodes.UNAUTHORIZED, message || "");
        this.name = 'exNotAuthenticated';
    }
}

export class exAccessForbidden extends exHTTP {
    constructor(message?: string) {
        super(StatusCodes.FORBIDDEN, message || "");
        this.name = 'exAccessForbidden';
    }
}

export class exMethodNotAllowed extends exHTTP {
    constructor(message?: string) {
        super(StatusCodes.METHOD_NOT_ALLOWED, message || "");
        this.name = 'exMethodNotAllowed';
    }
}

export class exBadRequest extends exHTTP {
    constructor(errors?: ValidationErrors<any> | string) {
        super(StatusCodes.BAD_REQUEST, "", typeof errors === "string" ? errors : { "Invalid parameters": { ...errors } });
        this.name = 'exBadRequest';
    }
}

export class exBadResponse extends exHTTP {
    constructor(err: string) {
        super(StatusCodes.EXPECTATION_FAILED, err);
        this.name = 'exBadResponse';
    }
}
