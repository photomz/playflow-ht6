import fetch from "node-fetch";
import querystring from "query-string";
import config from "./config";

const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env;

const tryCatch = async <T>(func: Promise<T>, callback: (e) => any): T => {
  try {
    return await func;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error: ${error}`);
    callback(error);
    return Promise.reject();
  }
};

export const access = async (event, context, callback) => {
  const code = event?.queryStringParameters?.code ?? null;
  // TODO: Implement recommended state: https://developer.spotify.com/documentation/general/guides/authorization-guide/#authorization-code-flow-with-proof-key-for-code-exchange-pkce

  const tokenResponse = await tryCatch(
    fetch(`https://accounts.spotify.com/api/token/`, {
      method: "post",
      body: querystring.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: config.redirect_uri,
      }),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        // eslint-disable-next-line new-cap
        Authorization: `Basic ${new Buffer.from(
          `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
        ).toString("base64")}`,
      },
    }),
    callback
  );
  const tokenData = await tokenResponse.json();

  if (!token || !refresh_token) {
    console.log(tokenData);
  }
  const token = tokenData!.access_token; // This must exist. Throw an error if it doesn't
  const refresh_token = tokenData!.refresh_token; // Never expires - can always be used to get new access token

  const userInfoResponse = await tryCatch(
    fetch("https://api.spotify.com/v1/me", {
      method: "GET",
      headers: {
        Accept: "application/json, text/plain, */*",
        "User-Agent": "*",
        Authorization: `Bearer ${token}`,
      },
    }),
    callback
  );

  if (userInfoResponse.status != 200) {
    console.log(userInfoResponse.status, userInfoResponse.headers);
    const reason = await userInfoResponse.text();
    console.log(reason);
    callback(null, {
      statusCode: 400,
      body: reason,
    });
  }

  const userData = await userInfoResponse.json();

  const userId = userData!.id;

  callback(null, {
    statusCode: 301,
    headers: {
      Location: `${
        config.dev ? config.callback_uri_dev : config.callback_uri_prod
      }?token=${token}&id=${userId}&refresh=${refresh_token}`,
    },
  });
};

export const refresh = async (event, context, callback) => {
  const refresh_token = event?.queryStringParameters?.refresh_token ?? null;

  const newTokenResponse = await tryCatch(
    fetch(`https://accounts.spotify.com/api/token/`, {
      method: "post",
      body: querystring.stringify({
        grant_type: "refresh_token",
        refresh_token,
        redirect_uri: config.redirect_uri,
      }),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        // eslint-disable-next-line new-cap
        Authorization: `Basic ${new Buffer.from(
          `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
        ).toString("base64")}`,
      },
    }),
    callback
  );

  const newTokenData = await newTokenResponse.json();

  callback(null, {
    body: JSON.stringify({ token: newTokenData!.access_token }),
  });
};

// TODO: Use the easier Passport.js integration next time....
