const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const cookie = require('cookie');
const nonce = require('nonce')();
const querystring = require('querystring');
const request = require('request-promise');
const config = require('@config/config');

module.exports = function() {
  router.get('/', (req, res) => {
    const store = req.query.shop;
    if (store) {
      const state = nonce();
      const redirectUri = 'http://' + process.env.SERVER_URL + '/auth/callback';
      const installUrl = 'https://' + store +
        '/admin/oauth/authorize?client_id=' + config.apiKey +
        '&scope=' + config.scopes +
        '&state=' + state +
        '&redirect_uri=' + redirectUri;
      res.cookie('state', state);
      res.redirect(installUrl);
    } else {
      return res.status(400).send('Missing shop parameter. Please add ?shop=your-store.myshopify.com to your request');
    }
  });
  
  router.get('/callback', (req, res) => {
    const { shop, hmac, code, state } = req.query;
    const stateCookie = cookie.parse(req.headers.cookie).state;
  
    if (state !== stateCookie) {
      return res.status(403).send('Request origin cannot be verified');
    }
  
    if (shop && hmac && code) {
      const map = Object.assign({}, req.query);
      delete map['signature'];
      delete map['hmac'];
      const message = querystring.stringify(map);
      const providedHmac = Buffer.from(hmac, 'utf-8');
      const generatedHash = Buffer.from(
        crypto
          .createHmac('sha256', config.apiSecret)
          .update(message)
          .digest('hex'),
          'utf-8'
        );
      let hashEquals = false;
  
      try {
        hashEquals = crypto.timingSafeEqual(generatedHash, providedHmac)
      } catch (e) {
        hashEquals = false;
      };
  
      if (!hashEquals) {
        return res.status(400).send('HMAC validation failed');
      }

      const accessTokenRequestUrl = 'https://' + shop + '/admin/oauth/access_token';
      const accessTokenPayload = {
        client_id: config.apiKey,
        client_secret: config.apiSecret,
        code
      };

      request.post(accessTokenRequestUrl, { json: accessTokenPayload })
      .then((accessTokenResponse) => {
        const accessToken = accessTokenResponse.access_token;
        req.session.accessToken = accessToken;
        req.session.store = shop;
        res.redirect('/shipping/install');
      })
      .catch((error) => {
        res.status(error.statusCode).send(error.error.error_description);
      });
    } else {
      res.status(400).send('Required parameters missing');
    }
  });

  return router;
};