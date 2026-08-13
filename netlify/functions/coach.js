// Netlify serverless function: proxies solve-coach requests to Anthropic's API
// using a server-side key, so nobody needs to type a personal key into the app.
//
// Setup:
// 1. In your Netlify site, go to Site configuration -> Environment variables.
// 2. Add a variable named ANTHROPIC_API_KEY with your key as the value.
// 3. Deploy this file at netlify/functions/coach.js in your site's repo/folder.
// 4. Redeploy the site. The app will automatically start using this instead of
//    asking for a personal key.

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: 'ANTHROPIC_API_KEY is not set in this site\'s environment variables.'
    };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: event.body
    });

    const text = await response.text();
    return {
      statusCode: response.status,
      headers: { 'Content-Type': 'application/json' },
      body: text
    };
  } catch (err) {
    return {
      statusCode: 502,
      body: 'Error reaching Anthropic API: ' + err.message
    };
  }
};
