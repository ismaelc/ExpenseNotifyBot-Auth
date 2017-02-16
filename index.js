var express = require('express');
var app = express();
var google = require('./google.js');
var tokenizer = require('./expense_tokenizer.js');
var db = require('./documentdb.js');

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
    response.render('pages/index');
});

app.get('/login', function(request, response) {
    response.send("<a href='" + google.generateAuthURL() + "'>Login</a>");
});

//TODO: Bring documentdb.js to save tokens to DocumentDB
app.get('/oauth2callback', function(request, response) {
    var code = request.query['code'];
    //console.log('Code: ' + code);

    var state = request.query['state'];
    if (!state) {
        //TODO: Fix these passed render data (instead of 'welcome')
        response.render('pages/welcome', {
            'welcome': 'No state passed'
        });
    } else {

        state = JSON.parse(new Buffer(state, 'base64').toString('ascii'));
        //console.log('Retrieved state: ' + JSON.stringify(state));
        //request.session.state = null; // remove state?

        google.retrieveAccessToken(code, function(err, auth) {
            if (!err) {
                /*
                google.listLabels(auth, function(err, data) {
                  if(!err) response.send(data);
                  else response.send(err);
                });
                */

                /*
                var options = {
                  auth: auth,
                  userId: 'me',
                  q: "receipts",
                  maxResults: 10
                }

                google.listMessages(options, function(err, data) {
                  if(!err) {
                    var mail_array = data;


                    for(var i = 0, len = mail_array.length; i < len; i++) {
                      var extract = {};
                      if(mail_array[i] != null) {
                        extract = tokenizer.quickGetDatesAmounts(mail_array[i]['body']);
                        mail_array[i]['extract'] = extract;
                      }
                    }

                    response.send(mail_array);
                  }
                  else response.send(err);
                });
                */

                // Capturing this mapping to be saved in DB
                var auth_doc = {
                    'google_auth': auth,
                    'bot_id': state,
                    'id': db.uuid()
                        //'id': state.address.serviceUrl + state.address.channelId + '/' + state.address.user.id
                }

                // Get/create database
                db.getDatabase()
                    // Get/create collection
                    .then(() => db.getCollection())
                    .then(() => {
                        // Query db based on passed state - token/channelId/serviceUrl
                        console.log('Generated auth_doc: ' + JSON.stringify(auth_doc));
                        return db.queryCollection(
                            //auth_doc.google_auth.credentials.access_token
                            auth_doc.bot_id.address.serviceUrl,
                            auth_doc.bot_id.address.channelId,
                            auth_doc.bot_id.address.user.id
                        );
                    }) // Get matching token/doc
                    .then((doc_arr) => {
                        // If doc match, replace it with new one, specifically with new bot_id/state
                        console.log('Returned from queryCollection: ' + JSON.stringify(doc_arr));
                        if (doc_arr.length > 0) {
                            console.log('Doc to be replaced: ' + JSON.stringify(doc_arr[0]));
                            // Replace doc entry returned by query
                            // New ID is created in replaceAuthDoc
                            db.replaceAuthDocument(doc_arr[0], auth_doc);
                        }
                        // If no match of token/channel, create new doc
                        else {
                            // This looks for documentUrl based on document.id
                            // Since auth_doc is new, no id is passed
                            db.getAuthDocument(auth_doc)
                                .then(() => console.log('Created doc'))
                                .catch((error) => console.log('Error: ' + JSON.stringify(error)));
                        }
                    })
                    .then(() => {

                        var payload = {
                            'origin': 'bot',
                            'intent': 'login'
                        };

                        var message = {
                            'address': state.address,
                            'payload': payload
                        }

                        queue.pushMessageQFunc(message, 'expensenotifybotd3giz3_STORAGE', 'js-queue-items-for-bot')
                            .then(() => {
                                /*
                                session.send('Pushed: ' + JSON.stringify(message));
                                session.endDialog();
                                */
                                console.log('Message pushed to queue');
                                //context.done(null, 'Http trigger done');

                                response.render('pages/welcome', {
                                    'welcome': 'User01'
                                });
                            })
                            .catch((error) => {

                                //session.send('Error: ' + error);
                                //session.endDialog();

                                console.log('Error: ' + error);
                                //context.done(error, null);
                                response.render('pages/welcome', {
                                    'welcome': error
                                });
                            })

                    })
                    //.then(() => db.getAuthDocument(auth_doc)) // get/create doc
                    .then(() => {
                        // send message to bot through queue
                        response.render('pages/welcome', {
                            'welcome': 'User01'
                        });
                    })
                    .catch((error) => {
                        //exit(`Completed with error ${JSON.stringify(error)}`)
                        //session.send('Completed with error ' + JSON.stringify(error));
                        console.log('Completed with error: ' + JSON.stringify(error));
                        //res.redirect('/');
                        response.render('pages/welcome', {
                            'welcome': error
                        });
                    });

            } else response.send("Error: " + err);
        });

    }


});

app.get('/welcome', function(request, response) {
    response.render('pages/welcome');
});

app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
});
