/**
 * Created by peggyzheng on 11/30/15.
 */
var stream = require('stream');

function Cache(options) {
    stream.Writable.call(this, options);
    this._key = options.key;
    this._value = null;
    this.on('finish', function() {
        Cache.store[this._key] = this._value;
    });
}

Cache.store = {};
//here the Cache is a collection of caches and it holds multiple key value pair in the store
Cache.prototype = Object.create(stream.Writable.prototype);
Cache.prototype.constructor = stream.Writable;

Cache.prototype._write = function(chunk, encoding, callback) {
    if (!this._value) {
        this._value = chunk;
    } else {
        this._value = Buffer.concat([this._value, chunk]);
    }
    callback();
};

module.exports = Cache;