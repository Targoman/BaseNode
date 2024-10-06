/**
 * ///////////////////////////////////////
 * //////////// Cache module /////////////
 * ///////////////////////////////////////
 *
 * This module offers object caching mechanisms for
 * third-party modules. It allows to manage the lifecycle
 * of cached objects by associating them with a time-to-live.
 */

/**
 * Shortcut function for checking if an object has
 * a given property directly on itself.
 */
const has = (obj, key: string) => obj !== null && Object.prototype.hasOwnProperty.call(obj, key);

/**
 * A prefix used to forbid access to internal properties
 * of the object storage.
 */
const prefix = '__cache__';

/**
 * If the key is an object, we serialize it, so it
 * can be cached transparently.
 */
const serialize = function (key) {
    if (typeof key !== 'string') {
        return (prefix + JSON.stringify(key));
    }
    return (prefix + key);
};

interface IntfOptions {
    ttl?: number
    callback?: () => unknown
}

/**
 * The `timed-cache` implementation.
 */
class Cache<itmplType> {
    private cache: { [key: string]: { handle: NodeJS.Timeout, time: Date, data: itmplType, callback?: (key: string, val: itmplType) => void } }
    private defaultTtl: number
    constructor(options = { defaultTtl: 60 * 1000 }) {
        // The cache storage.
        this.cache = {};
        // The default cached objects expiration
        // delay is expressed in milliseconds and
        // is defined by an internal default value
        // or a user value if it is passed to the
        // constructor.
        this.defaultTtl = options.defaultTtl || 60 * 1000;
    }

    /**
     * Puts a key/value pair into the cache storage.
     */
    put(key: string, value: itmplType, options?: IntfOptions) {
        const ttl = options?.ttl || this.defaultTtl;
        const callback = options?.callback || undefined
        const key_ = serialize(key);

        // Checking whether the given key already
        // has a value.
        const v = this.cache[key_];

        if (v) {
            // We clear the timeout associated with
            // the existing value.
            clearTimeout(v.handle);
        }

        // We then create a new timeout function for
        // the new value.
        const handle = setTimeout(() => this.remove(key), ttl);

        // And we save the value into the cache storage
        // with the handle.
        this.cache[key_] = { handle, time: new Date(), data: value, callback };
    }

    /**
     * Returns a cached value associated with the
     * given key if it exists, returns an undefined
     * value otherwise.
     */
    get(key: string) : itmplType | undefined{
        const value = this.cache[serialize(key)];
        return (value && value.data);
    }

    time(key: string) {
        const value = this.cache[serialize(key)];
        return (value && value.time);
    }

    /**
     * Clears the cache entry associated
     * with the given `key`.
     */
    remove(key) {
        const key_ = serialize(key);
        const value = this.cache[key_];

        if (value) {
            clearTimeout(value.handle);
            delete this.cache[key_];
            if (value.callback)
                value.callback(key, value.data);
        }
    }

    /**
     * Clears the internal cache.
     */
    clear() {
        for (const entry in this.cache) {
            if (has(this.cache, entry)) {
                clearTimeout(this.cache[entry].handle);
            }
        }
        this.cache = {};
    }

    /**
     * Returns the size of the cache object in
     * terms of referenced elements.
     */
    size() {
        return (Object.keys(this.cache).length);
    }

    keys() {
        return Object.keys(this.cache).map(key => key.substring(prefix.length))
    }
}

export default Cache;