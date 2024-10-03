import mysql from "promise-mysql"
import { IntfDBConfigs } from "./interfaces";
import { clsLogger } from "./logger";
import Bluebird from 'bluebird';
import { sleep } from "./functions";
import { exDB, exItemNotfound } from "./exceptions";

export class exMySQL extends exDB {
    constructor(message: string) {
        super(message);
        this.name = 'exMySQL';
    }
}

export interface IntfCreateResponse {
    firstInsertedId: string
    insertedRows: number
    updatedRows: number
}

export default class clsMySQL {
    private pool: Bluebird<mysql.Pool>;
    private logger: clsLogger
    private _schema: string

    constructor(configs: IntfDBConfigs, logger: clsLogger) {
        this.pool = mysql.createPool({
            connectionLimit: 100,
            host: configs.host,
            user: configs.user,
            port: configs.port,
            password: configs.password,
            database: configs.schema,
            charset: "utf8mb4",
            debug: configs.deepDebug
        })
        this.logger = logger
        this._schema = configs.schema
    }

    get schema() { return this._schema }

    private async runQuery(queryStr: string, vars?: string[] | { [key: string]: any }, maxTries = 3) {
        try {
            const conn = await (await this.pool).getConnection();
            try {
                const Result = await conn.query(queryStr, vars);
                this.logger.db({ queryStr, vars, Result });
                return Result;
            } finally {
                await conn.release();
            }
        } catch (ex: any) {
            if (ex?.code == "ER_DUP_ENTRY") throw ex;

            if (--maxTries > 0) {
                this.logger.db("Retrying query ...");
                await sleep(500);
                return this.runQuery(queryStr, vars, maxTries);
            } else {
                if (ex?.code === "ECONNREFUSED") {
                    this.logger.error({ errMessage: ex?.message });
                } else {
                    this.logger.error({ err: ex, queryStr, vars });
                }
                throw ex;
            }
        }
    }

    public async ping() {
        return (await this.getOne("SELECT 1 AS ping")).ping === 1
    }

    public async execute(queryStr: string, vars?: any[] | { [key: string]: any }, maxTries = 3) {
        return await this.runQuery(queryStr, vars, maxTries)
    }

    public async insert(queryStr: string, vars?: any[] | { [key: string]: any }, maxTries = 3) {
        const res = await this.runQuery(queryStr, vars, maxTries)
        const totalRows = res.message.includes(" ") && parseInt(res.message.split(" ").at(1)) || 0
        return { firstInsertedId: res.insertId, insertedRows: totalRows - res.changedRows, updatedRows: res.changedRows }
    }

    public async update(queryStr: string, vars?: any[] | { [key: string]: any }, maxTries = 3) {
        const res = await this.runQuery(queryStr, vars, maxTries)
        return { updatedRows: res.changedRows}
    }

    public async getOne(queryStr: string, vars?: any[] | { [key: string]: any }, maxTries = 3) {
        const result = await this.runQuery(queryStr, vars, maxTries)
        if (!result || result.length === 0)
            throw new exItemNotfound()
        return result[0]
    }

    public async getAll(queryStr: string, vars?: any[] | { [key: string]: any }, maxTries = 3) {
        const rows = await this.runQuery(queryStr, vars, maxTries)
        const countQuery = queryStr.replace(/SELECT[\s\S]+FROM/m, "SELECT COUNT(*) AS tc FROM").replace(/LIMIT.*$/m, "")
        const tc = await this.runQuery(countQuery, vars)
        return { rows, tc: tc[0].tc }
    }
}
