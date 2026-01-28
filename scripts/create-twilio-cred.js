const https = require('https');

const apiKey = "***SCRUBBED_N8N_API_KEY***";

// Provide ALL fields to satisfy the broken schema validation
const twilioCredential = {
    name: "Twilio API Credentials",
    type: "twilioApi",
    data: {
        authType: "authToken",
        accountSid: "***SCRUBBED_TWILIO_SID***",
        authToken: "***SCRUBBED_TWILIO_AUTH_TOKEN***",
        apiKeySid: "",
        apiKeySecret: ""
    }
};

const postData = JSON.stringify(twilioCredential);
console.log('Sending:', postData);

const options = {
    hostname: 'n8n.wranngle.com',
    port: 443,
    path: '/api/v1/credentials',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': apiKey,
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response: ${data}`);
        if (res.statusCode === 200 || res.statusCode === 201) {
            const result = JSON.parse(data);
            console.log(`\nSUCCESS! Twilio Credential ID: ${result.id}`);
        }
    });
});

req.on('error', (e) => {
    console.error(`Error: ${e.message}`);
});

req.write(postData);
req.end();
