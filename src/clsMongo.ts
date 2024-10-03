import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import { IntfDBConfigs, IntfKeyVal } from "./interfaces";
import { clsLogger } from "./logger";
import { exConnection } from "./exceptions";
import RJson from "relaxed-json"

interface IntfMongoCollectionIndices {
    keys: string[]
    unique?: boolean
}

interface IntfMongoConfigs {
    conn: IntfDBConfigs
    indices?: IntfMongoCollectionIndices
}

export default class clsMongo {
    private client: MongoClient
    private logger: clsLogger
    private baseCollection: string
    private schema: string

    constructor(conf: IntfMongoConfigs, baseCollection: string, logger: clsLogger) {
        this.logger = logger
        const uri = `mongodb://${conf.conn.user}:${conf.conn.password}@${conf.conn.host}:${conf.conn.port}/?appName=${conf.conn.schema}&retryWrites=true&w=majority`
        this.client = new MongoClient(uri, {
            serverApi: {
                version: ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
            }
        })
        this.baseCollection = baseCollection
        this.schema = conf.conn.schema
        if (conf.indices)
            this.setupIndices(conf.indices.keys, conf.indices.unique)
    }

    async connect(collection?: string) {
        await this.client.connect();
        const mongoClient = this.client.db(this.schema)
        if (!mongoClient)
            throw new exConnection(`Unable to create client on mongo`)
        return mongoClient.collection(collection || this.baseCollection);
    }

    private async _insert(doc: object | object[], ignoreDup: boolean, otherCollection?: string) {
        try {
            const conn = await this.connect(otherCollection)
            if (Array.isArray(doc)) {
                const result = await conn.insertMany(doc, { ordered: ignoreDup ? false : true });
                this.logger.db({ insert2Mongo: { doc, result } });
                return { inserted: result.insertedCount, ids: result.insertedIds }
            }
            else {
                const result = await conn.insertOne(doc);
                this.logger.db({ insert2Mongo: { doc, result } });
                return { inserted: 1, ids: [result.insertedId] }
            }
        } catch (ex: any) {
            if (ex?.errorResponse && ex?.errorResponse.code === 11000) {
                // console.log({ errs: err.errorResponse.writeErrors.map((ex: any) => e.err.errmsg) })
                if (ignoreDup) {
                    if (Array.isArray(doc))
                        return {
                            inserted: ex.result.insertedCount,
                            ids: ex.result.insertedIds,
                            ignored: ex.errorResponse.writeErrors.map((ex: any) => RJson.parse(ex.err.errmsg.substr(ex.err.errmsg.indexOf('dup key:') + 9)))
                        }
                    else
                        return { inserted: 0, ids: [], ignored: [ex.errorResponse.keyValue] }
                }
            }
            throw (ex)
        }
    }

    async getNext(id?: string, otherCollection?: string) {
        const conn = await this.connect(otherCollection)
        const result = conn.find({ _id: { "$gt": new ObjectId(id) } }).limit(1)
    }

    async insert(doc: object | object[], otherCollection?: string) {
        return this._insert(doc, false, otherCollection)
    }

    async insertIgnoreDup(doc: object | object[], otherCollection?: string) {
        return this._insert(doc, true, otherCollection)
    }

    async replace(filter: IntfKeyVal, newDoc: object | object[], otherCollection?: string) {
        const conn = await this.connect(otherCollection)
        const result = await conn.replaceOne(filter, newDoc, { upsert: true });
        this.logger.db({ replace2Mongo: { newDoc, result } });
        return { inserted: result.upsertedCount, ids: [result.upsertedId], updated: result.modifiedCount }
    }

    async setupIndices(indexCols: string[], unique?: boolean) {
        const conn = await this.connect()
        const result = await conn.createIndex(indexCols.reduce((o, i) => (o[i] = 1, o), {}), unique ? { unique: true } : undefined)
        this.logger.db({ indicesSetup: { collection: this.baseCollection, indexCols, unique } });
    }

    async close() {
        await this.client.close()
    }

    async ping() {
        const conn = await this.connect()
        const res = await this.client.db("admin").command({ ping: 1 })
        return res.ok
    }
}

