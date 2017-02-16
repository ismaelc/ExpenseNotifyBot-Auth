// v3 Added pushMessageQFunc ariables to pass storage and queue name
// v2 Added Promise pushMessageFunc

var azure = require('azure-storage');

function pushMessageQFunc(queuedMessage, storage_name, queue_name) {
    var queueSvc = azure.createQueueService(process.env[storage_name]);

    return new Promise((resolve, reject) => {
        queueSvc.createQueueIfNotExists(queue_name, (err, result, response) => {
            if (!err) {
                // Add the message to the queue
                var queueMessageBuffer = new Buffer(JSON.stringify(queuedMessage)).toString('base64');
                queueSvc.createMessage(queue_name, queueMessageBuffer, (err, result, response) => {
                    if (!err) {
                        // Message inserted
                        console.log('Your message (\'' + queuedMessage.message + '\') has been added to a queue, and it will be sent back to you via a Function');
                        resolve(result);
                        //resolve('Your message (\'' + queuedMessage.text + '\') has been added to a queue, and it will be sent back to you via a Function');
                    } else {
                        // this should be a log for the dev, not a message to the user
                        console.log('There was an error inserting your message into queue');
                        //reject('There was an error inserting your message into queue');
                        reject(err);
                    }
                });
            } else {
                // this should be a log for the dev, not a message to the user
                console.log('There was an error creating your queue');
                reject(err);
                //reject('There was an error creating your queue');
            }
        });
    });
}


function pushMessageFunc(queuedMessage) {
    var queueSvc = azure.createQueueService(process.env.AzureWebJobsStorageQ);

    return new Promise((resolve, reject) => {
        queueSvc.createQueueIfNotExists('bot-queue', (err, result, response) => {
            if (!err) {
                // Add the message to the queue
                var queueMessageBuffer = new Buffer(JSON.stringify(queuedMessage)).toString('base64');
                queueSvc.createMessage('bot-queue', queueMessageBuffer, (err, result, response) => {
                    if (!err) {
                        // Message inserted
                        console.log('Your message (\'' + queuedMessage.text + '\') has been added to a queue, and it will be sent back to you via a Function');
                        resolve(result);
                        //resolve('Your message (\'' + queuedMessage.text + '\') has been added to a queue, and it will be sent back to you via a Function');
                    } else {
                        // this should be a log for the dev, not a message to the user
                        console.log('There was an error inserting your message into queue');
                        //reject('There was an error inserting your message into queue');
                        reject(err);
                    }
                });
            } else {
                // this should be a log for the dev, not a message to the user
                console.log('There was an error creating your queue');
                reject(err);
                //reject('There was an error creating your queue');
            }
        });
    });
}

// TEST
/*
var message = { "address": { "id": "c4d38782b11640f1af1c278a426fb057", "channelId": "slack", "user": { "id": "U050C6MM6:T050C0DQU", "name": "ismaelc" }, "bot": { "id": "B40B0J2AV:T050C0DQU", "name": "tripitbot01" }, "serviceUrl": "https://slack.botframework.com", "useAuth": true }, "text": "login 23" };
pushMessage(message, function(err, response) {
    console.log(err + ' ' + response);
});
*/

function pushMessageQ(queuedMessage, storage_name, queue_name, callback) {
    var queueSvc = azure.createQueueService(process.env[storage_name]);
    queueSvc.createQueueIfNotExists(queue_name, function (err, result, response) {
        if (!err) {
            // Add the message to the queue
            var queueMessageBuffer = new Buffer(JSON.stringify(queuedMessage)).toString('base64');
            queueSvc.createMessage(queue_name, queueMessageBuffer, function (err, result, response) {
                if (!err) {
                    // Message inserted
                    //session.send('Your message (\'' + session.message.text + '\') has been added to a queue, and it will be sent back to you via a Function');
                    console.log('Your message (\'' + queuedMessage.message + '\') has been added to a queue, and it will be sent back to you via a Function');
                    //res.redirect('/');
                    callback(null, 'Your message (\'' + queuedMessage.message + '\') has been added to a queue, and it will be sent back to you via a Function');
                } else {
                    // this should be a log for the dev, not a message to the user
                    //session.send('There was an error inserting your message into queue');
                    console.log('There was an error inserting your message into queue');
                    //res.redirect('/');
                    callback(err, null);
                }
            });
        } else {
            // this should be a log for the dev, not a message to the user
            //session.send('There was an error creating your queue');
            console.log('There was an error creating your queue');
            //res.redirect('/');
            callback(err, null);
        }
    });
}

function pushMessage(queuedMessage, callback) {
    var queueSvc = azure.createQueueService(process.env.AzureWebJobsStorageQ);
    queueSvc.createQueueIfNotExists('bot-queue', function (err, result, response) {
        if (!err) {
            // Add the message to the queue
            var queueMessageBuffer = new Buffer(JSON.stringify(queuedMessage)).toString('base64');
            queueSvc.createMessage('bot-queue', queueMessageBuffer, function (err, result, response) {
                if (!err) {
                    // Message inserted
                    //session.send('Your message (\'' + session.message.text + '\') has been added to a queue, and it will be sent back to you via a Function');
                    console.log('Your message (\'' + queuedMessage.text + '\') has been added to a queue, and it will be sent back to you via a Function');
                    //res.redirect('/');
                    callback(null, 'Your message (\'' + queuedMessage.text + '\') has been added to a queue, and it will be sent back to you via a Function');
                } else {
                    // this should be a log for the dev, not a message to the user
                    //session.send('There was an error inserting your message into queue');
                    console.log('There was an error inserting your message into queue');
                    //res.redirect('/');
                    callback(err, null);
                }
            });
        } else {
            // this should be a log for the dev, not a message to the user
            //session.send('There was an error creating your queue');
            console.log('There was an error creating your queue');
            //res.redirect('/');
            callback(err, null);
        }
    });
}

exports.pushMessage = pushMessage;
exports.pushMessageQ = pushMessageQ;
exports.pushMessageFunc = pushMessageFunc;
exports.pushMessageQFunc = pushMessageQFunc;
