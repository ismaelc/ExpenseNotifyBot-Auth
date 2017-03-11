var CONCUR_CLIENT_ID = process.env.CONCUR_CLIENT_ID;
var CONCUR_SECRET = process.env.CONCUR_SECRET;
var CONCUR_HOST = 'https://us-rqa3.api.concursolutions.com/';
var CONCUR_REDIRECT_URI = process.env.CONCUR_REDIRECT_URI;
var SCOPE = 'IMAGE RCTIMG receipts.write';

const oauth2 = require('simple-oauth2').create({
    client: {
        id: CONCUR_CLIENT_ID,
        secret: CONCUR_SECRET
    },
    auth: {
        tokenHost: CONCUR_HOST,
        tokenPath: 'oauth2/v0/token/',
        authorizePath: 'oauth2/v0/authorize/'
    }
});

const redirect_uri = CONCUR_REDIRECT_URI;


function generateAuthURL() {

    // https://us-rqa3.api.concursolutions.com/oauth2/v0/authorize?client_id=2f8cff9f-b5ad-45e4-8a3f-4a0961d6dd9e&redirect_uri=https://expensenotifybot-auth.azurewebsites.net/oauth2callback_concur&scope=IMAGE RCTIMG receipts.write&response_type=code&state

    return CONCUR_HOST + 'oauth2/v0/authorize?' +
        '&client_id=' + CONCUR_CLIENT_ID +
        '&redirect_uri=' + CONCUR_REDIRECT_URI +
        '&scope=' + SCOPE +
        '&response_type=code';

}

function getToken(code, callback) {
    const options = {
        code,
        redirect_uri
    };
    oauth2.authorizationCode.getToken(options, (error, result) => {
        if (error) {
            debug('Access Token Error', error.message);
            callback('Authentication failed, please try again.', null);
        }
        //console.log('The resulting token: ', result);
        const token = oauth2.accessToken.create(result);
        debug('Received token ' + JSON.stringify(token));
        callback(null, token);
    });
}

exports.generateAuthURL = generateAuthURL;
exports.getToken = getToken;
