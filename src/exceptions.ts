export class exDB extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'exDB';
    }
}

export class exConnection extends exDB {
    constructor(message?: string) {
        super(message || "Unable to connect");
        this.name = 'exConnection';
    }
}

export class exItemNotfound extends exDB {
    constructor(message?: string) {
        super(message || "Record not found according to conditions");
        this.name = 'exItemNotfound';
    }
}

export class exInvalidQuery extends exDB {
    constructor(message?: string) {
        super(message || "Invalid Query");
        this.name = 'exInvalidQuery';
    }
}

export class exDuplicatedItem extends exDB {
    constructor(message?: string) {
        super(message || "Insertion/update conflicts according to primary and foreign keys");
        this.name = 'exDuplicatedItem';
    }
}

export class exNoChangesApplied extends exDB {
    constructor(message?: string) {
        super(message || "Nothing updated according to condition and values");
        this.name = 'exNoChangesApplied';
    }
}