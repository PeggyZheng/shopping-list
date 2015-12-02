var http = require('http');
var url = require('url');
var fs = require('fs');
var zlib = require('zlib');
var Cache = require('./cache');

var Storage = function() {
    this.items = [];
    this.id = 0;
};

Storage.prototype.add = function(name) {
    var item = {name: name, id: this.id};
    this.items.push(item);
    this.id += 1;
};

Storage.prototype.remove = function(id) {
    var index = -1
    for (var i=0; i<this.items.length; i++) {
        if (this.items[i].id === id) {
            index = i;
        }
    }
    if (index > -1) {
        return this.items.splice(index, 1);
    } else {
        return -1
    }
};

Storage.prototype.update = function(id, name) {
    var item = {name: name, id: id};
    var index = -1
    for (var i=0; i<this.items.length; i++) {
        if (this.items[i].id === id) {
            index = i;
        }
    }
    if (index === -1) {
        this.items.push(item);
    } else {
        return this.items.splice(index, 1, item);
    }
};

var storage = new Storage();
storage.add('Broad beans');
storage.add('Tomatoes');
storage.add('Peppers');


var parseId = function(url) {
    var id = url.split('/')[2];
    if (typeof id === 'string') {
        id = Number(id);
    }
    return id
};

var server = http.createServer(function (req, res) {
    var pat = new RegExp(/\/items\/[0-9]+/);
    if (req.method === 'GET' && req.url === '/items') {
        var responseData = JSON.stringify(storage.items);
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(responseData);
    } else if (req.method === 'POST' && req.url === '/items') {
        var item = '';
        req.on('data', function (chunk) {
            item += chunk;
        });
        req.on('end', function () {
            try {
                item = JSON.parse(item);
                storage.add(item.name);
                res.statusCode = 201;
                res.end();
            }
            catch(e) {
                res.statusCode = 400;
                responseData = {'message': 'Invalid JSON'};
                res.end(JSON.stringify(responseData));
            }
        });
    } else if (req.method === 'DELETE' && pat.test(req.url)) {
        var id = parseId(req.url);
        var itemRemoved = storage.remove(id);
        console.log(itemRemoved);
        if (itemRemoved === -1) {
            res.statusCode = 400;
            responseData = {'message': 'Invalid id'};
            res.end(JSON.stringify(responseData));
        } else {
            res.statusCode = 200;
            res.end(JSON.stringify(itemRemoved));
        }
    } else if (req.method === 'PUT' && pat.test(req.url)) {
        id = parseId(req.url);
        item = '';
        req.on('data', function(chunk) {
            item += chunk;
        });
        req.on('end', function() {
            try {
                item = JSON.parse(item);
                storage.update(id, item.name);
                res.statusCode = 200;
                res.end();
            }
            catch(e) {
                res.statusCode = 400;
                responseData = {'message': 'Invalid JSON'};
                res.end(JSON.stringify(responseData));
            }
        });
    } else {
        var pathname = url.parse(req.url).pathname;
        console.log(pathname,  'this is path name');
        var filename = './public' + pathname;
        res.setHeader('content-encoding', 'gzip');
        if (Cache.store[filename] !== undefined) {
            var data = Cache.store[filename];
            res.end(data);
        } else {
            var cache = new Cache({key: filename});
            var source = fs.createReadStream(filename)
                .on('error', function(e) {
                    console.log(e);
                    res.removeHeader('content-encoding');
                    res.statusCode = 404;
                    res.end('Not Found');
                })
                .pipe(zlib.createGzip());
            source.pipe(cache);
            source.pipe(res);

        }
    }
});

server.listen(8080, function() {
    console.log('listening on localhost:8080');
});