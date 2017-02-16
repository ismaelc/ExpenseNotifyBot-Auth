var express = require('express');
var app = express();
var google = require('./google.js');
var tokenizer = require('./expense_tokenizer.js');

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

app.get('/oauth2callback', function(request, response) {
  var code = request.query['code'];
  console.log('Code: ' + code);
  google.retrieveAccessToken(code, function(err, auth) {
    if(!err) {
      /*
      google.listLabels(auth, function(err, data) {
        if(!err) response.send(data);
        else response.send(err);
      });
      */

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
    }
    else response.send("Error: " + err);
  });
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
