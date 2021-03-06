var express = require('express');
var app = express();
var google = require('./google.js');
var tokenizer = require('./expense_tokenizer.js');
var db = require('./documentdb.js');
var queue = require('./queue.js');

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

//TODO: User's are unable to login to multiple channels using same Gmail account
// because previous connection's tokens are invalidated (grant) when logged in
// to new channel
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
        //request.session.state = null; // remove state?

        //google.retrieveAccessToken(code, function(err, auth) {
        google.returnAccessTokens(code, function(err, tokens) {
            if (!err) {

                var oauth2client = google.getOauth2Client();
                oauth2client.setCredentials(tokens);

                var options = {
                    auth: oauth2client, //auth,
                    userId: 'me'
                }

                google.getUser(options, function(err, data) {
                    if (err) {
                        console.log('Err: ' + JSON.stringify(err));
                        response.render('pages/welcome', {
                            'welcome': err
                        });
                    } else {

                        var email_address = data.emailAddress;

                        // TODO:
                        // Check DB if this email already exists in DB (regardless of channel)
                        // PROBLEM: If new login, old refresh token becomes invalid, and no new refresh tokens are created
                        // If yes, copy new tokens over to these existing entries

                        // Capturing this mapping to be saved in DB
                        var auth_doc = {
                            'google_id': email_address,
                            'google_auth': tokens,
                            'bot_id': state,
                            'id': db.uuid()
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

                                    // Preserve refresh token
                                    /*
                                    if (!auth_doc.google_auth.hasOwnProperty('refresh_token')) {
                                        auth_doc.google_auth.refresh_token = doc_arr[0].google_auth.refresh_token;
                                    }
                                    */
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
                                        /*
                                        response.render('pages/welcome', {
                                            'welcome': 'User01'
                                        });
                                        */
                                    })
                                    .catch((error) => {

                                        //session.send('Error: ' + error);
                                        //session.endDialog();

                                        console.log('Error: ' + error);
                                        //context.done(error, null);
                                        /*
                                        response.render('pages/welcome', {
                                            'welcome': error
                                        });
                                        */
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


                    }
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
