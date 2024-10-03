import clsMySQL from "#Base/clsMySQL"
import { exInvalidQuery } from "#Base/exceptions"
import { IntfKeyVal, IntfQueryParams } from "#Base/interfaces"
import { removeUndefined } from "./functions"
import Joi from "joi"

export enum enuJoinType {
    Left = "LEFT",
    Right = "Right",
    Inner = "Inner"
}
interface IntfFK {
    col: string
    fkCol: string
    type?: enuJoinType
}
interface IntfJoin {
    targetTable: clsORM
    fk: IntfFK
    alias?: string
    ignore?: boolean
}

interface IntfColumn {
    selector: string
    alias: string
    join?: IntfJoin
    specs: clsColumn
}

interface IntfTblConf {
    joins?: IntfJoin[],
}

interface IntfColconfigs {
    isPrimary?: boolean
    isStatus?: boolean
    isReadonly?: boolean
    nullable?: boolean
    defaultValue?: any
    fromDB?: (val: any) => any
    toDB?: (val: any) => any
}

export interface IntfMultiORM {
    [key: string]: clsORM
}

export class clsColumn {
    private conf: IntfColconfigs
    get isPrimary() { return this.conf.isPrimary || false }
    get isStatus() { return this.conf.isStatus || false }
    get isReadonly() { return this.conf.isReadonly || false }
    get nullable() { return this.conf.nullable || false }
    get defaultValue() { return this.conf.defaultValue }
    get toDB() { return this.conf.toDB || (val => val) }
    get fromDB() { return this.conf.fromDB || (val => val) }

    private _validator: () => Joi.AnySchema
    get validator() { return this._validator }
    get isObject() { return this._validator().type === 'object' }
    get isString() { return this._validator().type === 'string' }

    constructor(validator: () => Joi.AnySchema, conf?: IntfColconfigs) {
        this._validator = validator
        this.conf = conf || {}
    }
}

export function date2DB(val: any) {
    return val && (new Date(val).toISOString()).replace("T", " ").replace("Z", "")
}

export abstract class clsORM {
    protected db: clsMySQL
    protected table: string
    private cols: IntfColumn[]
    protected conf: IntfTblConf
    private instance: clsORM

    constructor(db: clsMySQL, table: string, conf?: IntfTblConf) {
        this.db = db
        this.table = table
        this.conf = conf || {}
    }

    private getCols(instance: clsORM) {
        const colNames = Object.getOwnPropertyNames(instance)
        const cols: IntfColumn[] = []
        for (let i = 0; i < colNames.length; i++) {
            if (['db', 'table', 'cols', 'conf', 'instance'].includes(colNames[i]))
                continue
            const specs: clsColumn = instance[colNames[i]]
            cols.push({ selector: colNames[i], alias: colNames[i], specs })
        }
        return cols
    }

    setInstance(instance: clsORM) {
        this.instance = instance
        this.cols = this.getCols(instance)
        if (this.conf.joins) {
            for (let i = 0; i < this.conf.joins.length; i++) {
                const join = this.conf.joins[i]
                if (join.ignore) continue
                const joinedCols = this.getCols(join.targetTable)
                for (let i = 0; i < joinedCols.length; i++) {
                    const jCol = joinedCols[i]
                    this.cols.push({
                        selector: (join.alias || join.targetTable.table) + "." + jCol.alias,
                        alias: (join.alias ? join.alias + "_" : "") + jCol.alias,
                        join,
                        specs: join.targetTable[jCol.alias]
                    })
                }
            }
        }
    }

    private isComplexChange(colSpec: clsColumn, val: any) {
        return colSpec.isObject === false && val?.hasOwnProperty && (
            val.hasOwnProperty('min')
            || val.hasOwnProperty('max')
            || val.hasOwnProperty('fmin')
            || val.hasOwnProperty('fmax')
            || val.hasOwnProperty('ifnull')
            || val.hasOwnProperty('ifnullKeep')
        )
    }

    private valToStringIfNeeded(colSpec: clsColumn, val: any) {
        if (colSpec.isString) {
            if (val !== null && val !== undefined && typeof val === 'number')
                return `${val}`
        }
        return val
    }

    private toPlainValue(colSpec: clsColumn, val: any) {
        if (!this.isComplexChange(colSpec, val))
            return this.valToStringIfNeeded(colSpec, val)
        else {
            if (val.hasOwnProperty('fmin')) return this.valToStringIfNeeded(colSpec, val.fmin)
            if (val.hasOwnProperty('fmax')) return this.valToStringIfNeeded(colSpec, val.fmax)
            if (val.hasOwnProperty('min')) return this.valToStringIfNeeded(colSpec, val.min)
            if (val.hasOwnProperty('max')) return this.valToStringIfNeeded(colSpec, val.max)
            if (val.hasOwnProperty('ifnull')) return this.valToStringIfNeeded(colSpec, val.ifnull)
            if (val.hasOwnProperty('ifnullKeep')) return this.valToStringIfNeeded(colSpec, val.ifnullKeep)
        }
    }

    createChanges(colMap: IntfKeyVal) {
        const schema: { [key: string]: Joi.AnySchema } = {}
        const plainColMap: IntfKeyVal = {}
        Object.keys(colMap).forEach(colName => {
            schema[colName] = this[colName].validator().label(colName)
            plainColMap[colName] = this.toPlainValue(this[colName], colMap[colName])
        })

        const changes = removeUndefined(Joi.attempt(plainColMap, Joi.object(schema).or(...Object.keys(plainColMap))))
        Object.keys(changes).forEach(colName => {
            changes[colName] = this[colName].toDB(changes[colName])
            if (this.isComplexChange(this[colName], colMap[colName])) {
                if (colMap[colName].hasOwnProperty('fmin')) changes[colName] = { fmin: changes[colName] }
                if (colMap[colName].hasOwnProperty('fmax')) changes[colName] = { fmax: changes[colName] }
                if (colMap[colName].hasOwnProperty('min')) changes[colName] = { min: changes[colName] }
                if (colMap[colName].hasOwnProperty('max')) changes[colName] = { max: changes[colName] }
                if (colMap[colName].hasOwnProperty('ifnull')) changes[colName] = { ifnull: changes[colName] }
                if (colMap[colName].hasOwnProperty('ifnullKeep')) changes[colName] = { ifnullKeep: changes[colName] }
            }
        })
        return changes
    }

    private validateCols(cols?: string[]) {
        const usedCols: IntfColumn[] = []
        const selectors: string[] = []
        const addCol = (col: IntfColumn) => {
            usedCols.push(col)
            selectors.push(col.selector + (col.alias != col.selector ? ` AS ${col.alias}` : ""))
        }

        if (!cols || cols.length === 0)
            this.cols.forEach(addCol)
        else
            for (const colIndex in cols) {
                const col = this.cols.find(el => el.alias === cols[colIndex])
                if (col) addCol(col)
                else throw new exInvalidQuery(`Col {${col}} not found`)
            }

        return { selectors, usedCols }
    }

    private parseConditions(conditions?: string[]) {
        const usedCols: IntfColumn[] = []
        if (!conditions) conditions = []
        const condKeys: string[] = []
        const clauseValues: any[] = []
        let requiredValsCount = 0
        let openPars = 0
        let canJunction = false
        let mustJunction = false
        let allowRemovedOn: string[] = []

        for (let i = 0; i < conditions.length; ++i) {
            const cond = conditions[i]
            if (cond === "(") {
                if (mustJunction) throw new exInvalidQuery("Junction needed but parenthesis found")
                openPars++
                condKeys.push("(")
            } else if (cond === ")") {
                if (openPars === 0) throw new exInvalidQuery("closed parenthesis before opening")
                openPars--
                canJunction = true
                mustJunction = true
                condKeys.push(")")
            } else if (["TRUE", "FALSE"].includes(cond.toUpperCase())) {
                if (mustJunction) throw new exInvalidQuery(`Junction needed but boolean provided {${cond}}`)
                canJunction = true
                mustJunction = true
                condKeys.push(cond.toUpperCase())
            } else if (["OR", "AND", "XOR"].includes(cond.toUpperCase())) {
                if (canJunction) {
                    canJunction = false
                    mustJunction = false
                    condKeys.push(cond.toUpperCase())
                } else
                    throw new exInvalidQuery(`Check query condition seems to have invalid condition: ${cond}`)
            } else {
                if (mustJunction) throw new exInvalidQuery(`Junction needed but condition provided {${cond}}`)
                const condParts = cond.split(" ").map(c => c.trim())
                if (condParts.length < 2)
                    throw new exInvalidQuery(`Condition must have at least two parts: {${cond}}`)
                const col = this.cols.find(el => el.alias === condParts[0])
                if (!col)
                    throw new exInvalidQuery(`Invalid condition column: {${cond}}`)

                if (condParts[1]! in [">", "<", "=", "LIKE", "!="])
                    throw new exInvalidQuery(`Invalid condition comparator: {${cond}}`)

                if (condParts.length === 2) {
                    condKeys.push(cond)
                    requiredValsCount--
                } else if (condParts.length > 2 && condParts[2] !== "?" && condParts[2].startsWith(":") === false) {
                    const value = condParts.slice(2).join(" ").trim()
                    if (value.toLowerCase() === "null") {
                        if (condParts[1] === "=") condKeys.push(`${condParts[0]} IS NULL`)
                        else if (condParts[1] === "!=") condKeys.push(`${condParts[0]} IS NOT NULL`)
                        else throw new exInvalidQuery(`Invalid condition (condParts[1] ) with null value`)
                        requiredValsCount--
                    } else {
                        condKeys.push(`${condParts[0]} ${condParts[1]} ? `)
                        clauseValues.push(value)
                    }
                } else
                    condKeys.push(cond)


                requiredValsCount++
                canJunction = true
                mustJunction = true
                usedCols.push(col)
                if (col.specs.isStatus) allowRemovedOn.push(col.alias)
            }
        }
        if (openPars !== 0)
            throw new exInvalidQuery("Not all opened parenthesis were closed")
        // if (condCount != (condVals?.length || 0))
        //     throw new exInvalidQuery("Count of conditions and condition values mismatch")
        if (!condKeys.length) condKeys.push("TRUE")
        for (let i = 0; i < this.cols.length; ++i) {
            const col = this.cols[i]
            if (col.specs.isStatus && allowRemovedOn.includes(col.alias) === false)
                /*if (col.join) condKeys.push(`AND (${col.alias} IS NULL OR ${col.alias} != 'Removed')`)
                else condKeys.push(`AND ${col.alias} != 'Removed'`)*/
                if (!col.join) condKeys.push(`AND ${col.alias} != 'Removed'`)
        }

        return {
            whereClause: condKeys.join("\n"),
            clauseValues,
            requiredValsCount,
            usedCols
        }
    }

    private validateOrderBy(orderBys?: string[]) {
        const usedCols: IntfColumn[] = []
        if (!orderBys || orderBys.length === 0) return { orderClause: [], usedCols }
        for (let i = 0; i < orderBys.length; ++i) {
            const ord = orderBys[i]
            const ordParts = ord.split(" ")
            const col = this.cols.find(el => el.alias === ordParts[0])
            if (!col)
                throw new exInvalidQuery(`Invalid order by column: ${ord}`)
            if (ordParts.length > 1 && ordParts[1].toUpperCase()! in ["ASC", "DESC"])
                throw new exInvalidQuery(`Invalid order by type: ${ord}`)
            usedCols.push(col)
        }

        return { orderClause: orderBys, usedCols }
    }

    private createJoins(usedCols: IntfColumn[]) {
        const joinClauses: string[] = []
        const usedJoins: string[] = []

        for (let i = 0; i < usedCols.length; i++) {
            const join = usedCols[i].join
            if (join && usedJoins.includes(join.fk.col) === false) {
                joinClauses.push(`${join.fk.type || ""} JOIN ${join.targetTable.table} ${join.alias || ""} ON ${join.alias || ""}${join.alias ? "." : ""}${join.fk.fkCol} = ${join.fk.col}`)
                usedJoins.push(join.fk.col)
            }
        }
        return joinClauses
    }

    private makeSelectQuery(params: IntfQueryParams, limit?: number) {
        const columns = this.validateCols(params.cols)
        const conditions = this.parseConditions(params.conditions)
        const orderBys = this.validateOrderBy(params.orderBy)
        const joins = this.createJoins([...columns.usedCols, ...conditions.usedCols, ...orderBys.usedCols])

        let query = `
SELECT ${columns.selectors.join(",\n")} 
  FROM ${this.table}${joins.length ? "\n " + joins.join("\n") : ""} 
 WHERE ${conditions.whereClause}${orderBys.orderClause.length ? `\n ORDER BY ${orderBys.orderClause.join(",\n")}` : ""}
  LIMIT ${params.offset ? params.offset + ", " : ""} ${limit || params.limit || 10}
`
        const condValues = [...params.condVals || [], ...conditions.clauseValues]
        if (condValues.length != conditions.requiredValsCount)
            throw new exInvalidQuery(`Count of where clause parameters and values must be equal (${condValues.length} vs ${conditions.requiredValsCount})`)

        conditions.usedCols.forEach((col, index) => condValues[index] = col.specs.toDB(condValues[index]))
        return { query, condValues }
    }

    private rowToObject(row: any) {
        const r = { ...row }
        const placeHolder = {}
        this.cols.forEach(key => placeHolder[key.alias] = r[key.alias])
        Object.keys(placeHolder).forEach(key => placeHolder[key] === undefined ? delete placeHolder[key] : {});
        return placeHolder
    }

    public async selectOne(params: IntfQueryParams) {
        const preparedQuery = this.makeSelectQuery(params, 1)
        const result = await this.db.getOne(preparedQuery.query, preparedQuery.condValues)
        return this.rowToObject(result)
    }

    public async rawQuery(query: string, vars?: any[]) {
        return this.db.execute(query, vars)
    }

    public async call(sp: string, invars?: any[], outVars?: string[]) {
        const placeHolders = invars?.length ? Array(invars.length).fill('?') : []
        outVars = outVars?.length ? outVars : []
        const query = `CALL ${sp}(${[...placeHolders, ...outVars].join(',')})`
        const result = await this.db.execute(query, invars)
        const direct = outVars.length ? { ...await this.db.getOne(`SELECT ${outVars.join(",")}`) } : undefined
        return { direct, rows: result[0], info: result[1] }
    }

    public async selectAll(params: IntfQueryParams) {
        const preparedQuery = this.makeSelectQuery(params)
        const queryResult = await this.db.getAll(preparedQuery.query, preparedQuery.condValues)
        const rows: any[] = []
        for (let i = 0; i < queryResult.rows.length; i++)
            rows.push(this.rowToObject(queryResult.rows[i]))
        return { rows, tc: queryResult.tc }
    }

    public async create(params: IntfKeyVal, onDuplicateKey: string = "") {
        const keys: string[] = []
        const values: any[] = []
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined) {
                const col = this.cols.find(el => el.alias === key)
                if (!col) throw new exInvalidQuery(`Invalid column: {${key}}`)

                keys.push(key)
                Joi.assert(params[key], col.specs.validator().label(key))
                const value = col.specs.toDB(params[key])
                values.push(typeof value === "object" && value != null ? JSON.stringify(value) : value)
            }
        })
        return await this.db.insert(`INSERT INTO ${this.table} (
            ${keys.join(",")}) VALUES (
            ${keys.map(() => "?").join(",")} 
            ) ${onDuplicateKey ? "ON DUPLICATE KEY UPDATE " + onDuplicateKey : ""}`, values)
    }

    public async createMulti(cols: string[], valMatrix: any[][], onDuplicateKey: string = "") {
        const insertingCols: IntfColumn[] = []
        cols.forEach(colName => {
            const col = this.cols.find(el => el.alias === colName)
            if (!col) throw new exInvalidQuery(`Invalid column: {${colName}}`)
            insertingCols.push(col)
        })
        const insertingValues = valMatrix.map((valArray) => {
            if (!Array.isArray(valArray))
                throw new exInvalidQuery("provided value is not an array")
            if (valArray.length != insertingCols.length)
                throw new exInvalidQuery(`count of value mismatch count of columns: ${valArray.length} vs ${insertingCols.length}`)

            valArray = valArray.map((val, index) => {
                const col = insertingCols[index]
                Joi.assert(val, col.specs.validator().label(col.alias))
                const value = col.specs.toDB(val)
                return typeof value === "object" ? JSON.stringify(value) : value
            })

            return valArray
        })

        if (insertingValues.length === 0)
            return { firstInsertedId: 0, insertedRows: 0, updatedRows: 0 }

        return await this.db.insert(`INSERT INTO ${this.table} (
            ${cols.join(",")}) VALUES ? ${onDuplicateKey ? "ON DUPLICATE KEY UPDATE " + onDuplicateKey : ""}`,
            [insertingValues]
        )
    }

    public async update(selectorConditions: string[], condVals: any[], params: IntfKeyVal) {
        const changes: string[] = []
        let values: any[] = []
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined) {
                const col = this.cols.find(el => el.alias === key)
                if (!col) throw new exInvalidQuery(`Invalid column: {${key}}`)

                const plainVal: any = this.toPlainValue(col.specs, params[key])
                Joi.assert(plainVal, col.specs.validator().label(col.alias))
                const value = col.specs.toDB(plainVal)
                if (col.specs.isObject) {
                    changes.push(`${key}=?`)
                    values.push(JSON.stringify(value))
                } else if (this.isComplexChange(col.specs, params[key])) {

                    if (params[key].hasOwnProperty('fmin')) changes.push(`${key}=LEAST(COALESCE(${key},0), ?)`)
                    if (params[key].hasOwnProperty('fmax')) changes.push(`${key}=GREATEST(COALESCE(${key},0), ?)`)
                    if (params[key].hasOwnProperty('min')) changes.push(`${key}=LEAST(${key}, ?)`)
                    if (params[key].hasOwnProperty('max')) changes.push(`${key}=GREATEST(${key}, ?)`)
                    if (params[key].hasOwnProperty('ifnull')) changes.push(`${key}=IFNULL(${key}, ?)`)
                    if (params[key].hasOwnProperty('ifnullKeep')) changes.push(`${key}=IFNULL(?, ${key})`)
                    values.push(plainVal)
                } else {
                    changes.push(`${key}=?`)
                    values.push(value)
                }
            }
        })
        const preparedQuery = this.makeSelectQuery({ cols: [this.cols[0].alias], conditions: selectorConditions, condVals })
        values = [...values, ...preparedQuery.condValues]

        return await this.db.update(`UPDATE ${this.table} SET
            ${changes.join(",")}
            WHERE ${selectorConditions.join("\n")}
            `, values)
    }

    public async updateIfAvailable(selectorConditions: string[], condVals: any[], changes: IntfKeyVal) {
        const a = await this.selectOne({ cols: [this.cols[0].alias], conditions: selectorConditions, condVals })
        return await this.update(selectorConditions, condVals, changes)
    }
}

export class clsDummy extends clsORM {

}
