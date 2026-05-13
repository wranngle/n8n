const env = require('./lib/env');
const api = require('./lib/n8n-api');

const twilioCredential = {
    name: "Twilio API Credentials",
    type: "twilioApi",
    data: {
        authType: "authToken",
        accountSid: env.require('TWILIO_ACCOUNT_SID'),
        authToken: env.require('TWILIO_AUTH_TOKEN'),
        apiKeySid: "",
        apiKeySecret: ""
    }
};

(async () => {
    console.log('Creating Twilio credential in n8n...');
    const res = await api.request('POST', '/api/v1/credentials', twilioCredential);
    console.log(`Status: ${res.status}`);

    if (res.status === 200 || res.status === 201) {
        console.log(`SUCCESS: Twilio Credential ID: ${res.body.id}`);
        return;
    }

    console.error('Response:', typeof res.body === 'string' ? res.body : JSON.stringify(res.body, null, 2));
    process.exit(1);
})().catch(error => {
    console.error(`Error: ${error.message}`);
    process.exit(1);
});
