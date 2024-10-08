import { StatusCodes } from "http-status-codes";
import { ValidationErrors } from "validator-fluent";

export class exHTTP extends Error {
    readonly http: number
    readonly msg: string
    readonly errors: unknown | { [key: string]: string[]; };

    constructor(code: number, message: string, ex?: unknown | { [key: string]: string[]; }) {
        super(message);
        this.name = 'exHTTP';
        this.errors = ex
        this.http = code
        this.msg = message
    }
}

export class exNotAuthenticated extends exHTTP {
    constructor(err: string, ex?: unknown) {
        super(StatusCodes.UNAUTHORIZED, err, ex);
        this.name = 'exNotAuthenticated';
    }
}

export class exAccessForbidden extends exHTTP {
    constructor(err: string, ex?: unknown) {
        super(StatusCodes.FORBIDDEN, err, ex);
        this.name = 'exAccessForbidden';
    }
}

export class exMethodNotAllowed extends exHTTP {
    constructor(err: string, ex?: unknown) {
        super(StatusCodes.METHOD_NOT_ALLOWED, err, ex);
        this.name = 'exMethodNotAllowed';
    }
}

export class exBadRequest extends exHTTP {
    constructor(errors?: ValidationErrors<unknown> | string) {
        super(StatusCodes.BAD_REQUEST, "", typeof errors === "string" ? errors : { "Invalid parameters": { ...errors } });
        this.name = 'exBadRequest';
    }
}

export class exBadResponse extends exHTTP {
    constructor(err: string, ex?: unknown) {
        super(StatusCodes.EXPECTATION_FAILED, err, ex);
        this.name = 'exBadResponse';
    }
}

export class exExpectationFailed extends exHTTP {
    constructor(err: string, ex?: unknown) {
        super(StatusCodes.EXPECTATION_FAILED, err, ex);
        this.name = 'exExpectationFailed';
    }
}

