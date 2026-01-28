const https = require('https');

const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmMjUxMmRkMS0wOTk0LTRjN2YtYWNmMS0wZWY4NDFhZjNhNjYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY3NzQ5Mzg1LCJleHAiOjE3NzI4NTk2MDB9.OhBR-5ck0D1VwhQ21cCjolvIhvEU_P5a6neR-wAGLPs";

// Provide ALL fields to satisfy the broken schema validation
const twilioCredential = {
    name: "Twilio API Credentials",
    type: "twilioApi",
    data: {
        authType: "authToken",
        accountSid: "ACb9a3b7df2dfe607099bd0ce0e6ae47e1",
        authToken: "a5d7bfaa399fae6df2ef2f572e7f06fb",
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
