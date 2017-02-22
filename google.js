// v3 Added getOauth2Client
// v2 Added returnAccessTokens that returns tokens only, not oauthclient

var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;
var async = require('async');
var htmlToText = require('html-to-text');

var client_id = process.env['GOOGLE_CLIENT_ID'];
var client_secret = process.env['GOOGLE_CLIENT_SECRET'];
var redirect_url = process.env['AUTH_REDIRECT_URL']; //'http://localhost:5000/oauth2callback';

var oauth2Client = new OAuth2(
  client_id,
  client_secret,
  redirect_url
);

//console.log(generateAuthURL());

function getOauth2Client() {
  var client_id = process.env['GOOGLE_CLIENT_ID'];
  var client_secret = process.env['GOOGLE_CLIENT_SECRET'];
  var redirect_url = process.env['AUTH_REDIRECT_URL']; //'http://localhost:5000/oauth2callback';

  var oauth2Client = new OAuth2(
    client_id,
    client_secret,
    redirect_url
  );

  return oauth2Client;
}

function generateAuthURL() {

  // generate a url that asks permissions for Google+ and Google Calendar scopes
  var scopes = [
    'https://www.googleapis.com/auth/plus.me',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/gmail.readonly'
  ];

  var url = oauth2Client.generateAuthUrl({
    // 'online' (default) or 'offline' (gets refresh_token)
    access_type: 'offline',
    // If you only need one scope you can pass it as string
    scope: scopes
  });

  console.log(url);
  return url;
}

function retrieveAccessToken(code, callback) {
  oauth2Client.getToken(code, function (err, tokens) {
    // Now tokens contains an access_token and an optional refresh_token. Save them.
    if (!err) {
      oauth2Client.setCredentials(tokens);
      console.log('Tokens: ' + JSON.stringify(tokens));
      callback(null, oauth2Client);
    } else callback(err, null);
  });
}

function returnAccessTokens(code, callback) {
  oauth2Client.getToken(code, function (err, tokens) {
    // Now tokens contains an access_token and an optional refresh_token. Save them.
    if (!err) {
      /*
      oauth2Client.setCredentials(tokens);
      console.log('Tokens: ' + JSON.stringify(tokens));
      callback(null, oauth2Client);
      */
      callback(null, tokens);
    } else callback(err, null);
  });
}

function getUser(options, callback) {
    var gmail = google.gmail('v1');
    gmail.users.getProfile(options, function(err, response) {
        if(err) callback(err, 'Error: ' + response);
        else {
            callback(null, response);
        }
    });
}

function listMessages(options, callback) {
  var gmail = google.gmail('v1');
  gmail.users.messages.list(options, function (err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      callback(err, 'The API returned an error: ' + response);
    } else {
      var messages = response.messages;
      //var output = [];
      console.log('Type: ' + JSON.stringify(response));
      if (messages.length == 0) {
        //console.log('No messages found.');
      } else {

        /*
        console.log('Messages:');
        for (var i = 0; i < messages.length; i++) {
          var message = messages[i];
          console.log(message);
          output.push(message);
        }
        */

        async.mapLimit(messages, 10, function (message, _callback) {
          //_callback(null, message['id']);
          getMessage(options['auth'], 'me', message['id'], function (err, data) {

            if (err) _callback(err, data);
            else {

              //console.log('Payload: ' + JSON.stringify(data.payload));

              var type = data.payload.mimeType.split('/');
              var parts = data.payload.parts;
              if (type[0] == "multipart" && type[1] == "related") parts = data.payload.parts[0].parts;


              //console.log('Payload: ' + JSON.stringify(parts));

              var html_parts = parts.filter(function (part) {
                return part.mimeType == 'text/html';
              });

              //console.log("Part: " + JSON.stringify(html_parts));

              if (html_parts.length > 0) {

                var date = extractField(data, "Date");
                var subject = extractField(data, "Subject")

                var b64string = html_parts[0].body.data.replace(/-/g, '+').replace(/_/g, '/');
                var htmlfromText = htmlToText.fromString(
                  new Buffer(b64string, 'base64')
                    .toString('ascii')
                    .replace(/(\r\n|\n|\r)/gm, " "), {
                    ignoreHref: true,
                    ignoreImage: true
                  }
                )
                  .replace(/(\r\n|\n|\r)/gm, " "); //.replace(/\r?\n|\r/g, " "))

                var mail = {
                  'id': data['id'],
                  'date': extractField(data, "Date"),
                  'snippet': data['snippet'],
                  'subject': extractField(data, "Subject"),
                  'body': htmlfromText
                }

                _callback(null, mail);

                //_callback(null, html_parts[0]);
                //_callback(null, subject);

              } else _callback(null, null);

              //_callback(null, data.payload);
            }
          })
        }, function (err, results) {
          if (err) callback(err, results);
          else callback(null, results);
        });

      }
      //callback(null, output);
    }
  });
}

function getMessage(auth, userId, messageId, callback) {

  var options = {
    'auth': auth,
    'userId': userId,
    'id': messageId
  }

  var gmail = google.gmail('v1');
  gmail.users.messages.get(options, function (err, response) {
    if (err) callback(err, response);
    else callback(null, response);
  });
}

var extractField = function (json, fieldName) {
  return json.payload.headers.filter(function (header) {
    return header.name === fieldName;
  })[0].value;
};

function listLabels(auth, callback) {
  var gmail = google.gmail('v1');
  gmail.users.labels.list({
    auth: auth,
    userId: 'me',
  }, function (err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      callback(err, 'The API returned an error: ' + response);
    }
    var labels = response.labels;
    var output;
    if (labels.length == 0) {
      //console.log('No labels found.');
      output = 'No labels found';
    } else {
      //console.log('Labels:');
      output = 'Labels:';
      for (var i = 0; i < labels.length; i++) {
        var label = labels[i];
        //console.log('- %s', label.name);
        output += '- ' + label.name;
      }
    }
    console.log(output);
    callback(null, output);
  });
}

exports.generateAuthURL = generateAuthURL;
exports.retrieveAccessToken = retrieveAccessToken;
exports.listMessages = listMessages;
exports.listLabels = listLabels;
exports.returnAccessTokens = returnAccessTokens;
exports.getOauth2Client = getOauth2Client;
exports.getUser = getUser;
