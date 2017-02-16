// v1 Carry over from older projects but significantly modifying so
// don't assume this is similar to the other documentdb.js that you'll see

var documentClient = require("documentdb").DocumentClient;
//var config = require("./config");
var url = require('url');
var uuidV4 = require('uuid/v4');

var config = {};
config.database = {
    "id": "Expense"
};
config.collection = {
    "id": "Auth"
};

config.documents = {
    'auth_doc': {
        'tripit_token': 'bxvzcbzxvczn',
        'tripit_tokenSecret': 'slkflsjdfs',
        'bot_id': 'uweryuwyer'
    }
}

var client = new documentClient(process.env.DB_ENDPOINT, {
    "masterKey": process.env.DB_PRIMARY_KEY
});

var HttpStatusCodes = {
    NOTFOUND: 404
};
var databaseUrl = `dbs/${config.database.id}`;
var collectionUrl = `${databaseUrl}/colls/${config.collection.id}`;

function getDatabase() {
    console.log(`Getting database:\n${config.database.id}\n`);

    return new Promise((resolve, reject) => {
        client.readDatabase(databaseUrl, (err, result) => {
            if (err) {
                if (err.code == HttpStatusCodes.NOTFOUND) {
                    client.createDatabase(config.database, (err, created) => {
                        if (err) reject(err)
                        else resolve(created);
                    });
                } else {
                    reject(err);
                }
            } else {
                resolve(result);
            }
        });
    });
}

function getCollection() {
    console.log(`Getting collection:\n${config.collection.id}\n`);

    return new Promise((resolve, reject) => {
        client.readCollection(collectionUrl, (err, result) => {
            if (err) {
                if (err.code == HttpStatusCodes.NOTFOUND) {
                    client.createCollection(databaseUrl, config.collection, {
                        offerThroughput: 400
                    }, (err, created) => {
                        if (err) reject(err)
                        else resolve(created);
                    });
                } else {
                    reject(err);
                }
            } else {
                resolve(result);
            }
        });
    });
}

// Get or create document ?
function getAuthDocument(document) {
    var documentUrl = `${collectionUrl}/docs/${document.id}`;
    console.log(`Getting document:\n${document.id}\n`);

    return new Promise((resolve, reject) => {
        //client.readDocument(documentUrl, { partitionKey: document.district }, (err, result) => {
        client.readDocument(documentUrl, {}, (err, result) => {
            if (err) {
                if (err.code == HttpStatusCodes.NOTFOUND) {
                    //document.id = uuid();
                    client.createDocument(collectionUrl, document, (err, created) => {
                        if (err) reject(err)
                        else resolve(created);
                    });
                } else {
                    reject(err);
                }
            } else {
                resolve(result);
            }
        });
    });
};

function queryCollection(token, channelId, serviceUrl) {
    console.log(`Querying collection through index:\n${config.collection.id}`);

    return new Promise((resolve, reject) => {
        var query = 'SELECT r.google_auth, r.bot_id, r.id FROM root r WHERE r.google_auth.credentials.access_token = "' + token + '"';
        //if (channelId) query += ' AND r.bot_id.address.channelId = "' + channelId + '"';
        //if (serviceUrl) query += ' AND r.bot_id.address.serviceUrl = "' + serviceUrl + '"';
        client.queryDocuments(
            collectionUrl,
            //'SELECT VALUE r.children FROM root r WHERE r.lastName = "Andersen"'
            query
        ).toArray((err, results) => {
            if (err) reject(err)
            else {
                for (var queryResult of results) {
                    var resultString = JSON.stringify(queryResult);
                    console.log(`\tQuery returned ${resultString}`);
                }
                console.log();
                resolve(results);
            }
        });
    });
};

function replaceAuthDocument(documentOld, document) {
    console.log('Passed documentOld: ' + JSON.stringify(documentOld));
    var documentUrl = `${collectionUrl}/docs/${documentOld.id}`;
    console.log(`Replacing document:\n${documentOld.id}\n`);
    //document.tripit_tokenSecret = 'modified';

    return new Promise((resolve, reject) => {
        client.replaceDocument(documentUrl, document, (err, result) => {
            if (err) reject(err);
            else {
                resolve(result);
            }
        });
    });
};

function getTripItCredsFromUserIdName(id, name, channelId, serviceUrl) {
    console.log(`Querying collection through index:\n${config.collection.id}`);

    return new Promise((resolve, reject) => {
        var query = 'SELECT r.tripit_auth FROM root r WHERE r.bot_id.address.user.id = "' + id + '"';
        if (name) query += ' AND r.bot_id.address.user.name = "' + name + '"';
        if (channelId) query += ' AND r.bot_id.address.channelId = "' + channelId + '"';
        if (serviceUrl) query += ' AND r.bot_id.address.serviceUrl = "' + serviceUrl + '"';
        client.queryDocuments(
            collectionUrl,
            //'SELECT VALUE r.children FROM root r WHERE r.lastName = "Andersen"'
            query
        ).toArray((err, results) => {
            if (err) reject(err)
            else {
                for (var queryResult of results) {
                    var resultString = JSON.stringify(queryResult);
                    console.log(`\tQuery returned ${resultString}`);
                }
                console.log();
                resolve(results);
            }
        });
    });
}

function uuid() {
    return uuidV4(); // random
}

function exit(message) {
    console.log(message);
    console.log('Press any key to exit');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', process.exit.bind(process, 0));
}

exports.getDatabase = getDatabase;
exports.getCollection = getCollection;
exports.getAuthDocument = getAuthDocument;
exports.queryCollection = queryCollection;
exports.replaceAuthDocument = replaceAuthDocument;
exports.getTripItCredsFromUserIdName = getTripItCredsFromUserIdName;
exports.uuid = uuid;

/*
if (process.env.NODE_ENV == 'development') {
    getDatabase() // get/create db
        .then(() => getCollection()) // get/create collection
        .then(() => getAuthDocument(config.documents.auth_doc)) // get/create doc
        //.then(() => replaceAuthDocument(config.documents.auth_doc)) // replace doc
        .then(() => queryCollection('bxvzcbzxvczn'))
        .then(() => {
            exit(`Completed successfully`);
        })
        .catch((error) => {
            exit(`Completed with error ${JSON.stringify(error)}`)
        });
}
*/
