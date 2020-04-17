const express = require('express');
const router = express.Router();
const request = require('request-promise');
const config = require('@config/config');
const basefunc = require('@libs/basefunc');
const shippingModel = require('@models/shipping');
const storeModel = require('@models/store');

module.exports = function() {
  router.get('/install', basefunc.isAuthenticated, (req, res) => {
    storeModel.isStoreInstalled(req.session.store)
    .then((result) => {
      if(result)
        return res.redirect('/');

      const requestOptions = {
        method: 'POST',
        uri: 'https://' + req.session.store + '/admin/api/2020-01/carrier_services.json',
        headers: {
          'X-Shopify-Access-Token': req.session.accessToken
        },
        body: {
          'carrier_service': {
            'name': 'Servientrega',
            'callback_url': 'http://' + process.env.SERVER_URL + '/shipping/rates',
            'service_discovery': true
          }
        },
        json: true
      };

      request(requestOptions)
      .then((storeResponse) => {
        console.log(storeResponse);
        storeModel.addStore({
          STORE_NAME: req.session.store,
          CARRIER_SERVICE_ID: storeResponse.carrier_service.id
        });
        res.redirect('https://' + req.session.store + '/admin/apps');
      })
      .catch((error) => {
        console.log('Error while installing carrier: ' + error);
        res.status(error.statusCode).send(error.error.error_description);
      });
    })
    .catch(function(error) {
      console.log('Error while checking store: ' + error);
      res.status(500).send('Server error');
    });
  });

  router.post('/rates', (req, res) => {
    console.log(req.body);
    const dest = req.body.rate.destination;
    const items = req.body.rate.items;
    shippingModel.getShippingRate(dest.province, basefunc.replaceCharacters(dest.city))
    .then((result) => {
      if(!result)
        return res.json({});

      var totalPrice = 0;
      var totalGrams = 0;
      items.forEach((item) => {
        totalPrice = totalPrice + parseInt(item.price) * parseInt(item.quantity);
        totalGrams = totalGrams + parseInt(item.grams) * parseInt(item.quantity);
      });

      var normalCost = 0;
      if(totalGrams <= 3000) {
        normalCost = parseInt(result['COST1']) * 100;
      } else if(totalGrams <= 12000) {
        normalCost = parseInt(result['COST2']) * 100;
      } else {
        normalCost = parseInt(result['COST2']) * 100 + parseInt(totalGrams - 12000) * parseInt(result['COST3_FACTOR']) * 100;
      }
      const podCost = parseInt(totalPrice * 7 / 100) + parseInt(normalCost);
      
      res.json({
        'rates':
          [{
            'service_name': 'Valor envío',
            'service_code': 'servientrega',
            'total_price': normalCost,
            'description': 'Te ofrecemos la opción de enviar el producto por Servientrega, el tiempo de transporte es de 24 a 48 horas',
            'currency': 'COP'
          },
          {
            'service_name': 'Valor envío si pagas al recibir',
            'service_code': 'servientrega_pod',
            'total_price': podCost,
            'description': 'Si estas en Bogota podemos enviarte el producto con un equipo de mensajeros muy profesionales que en un horario de 2pm a 7pm estarán realizando la entrega y la recolección del dinero. Si estás fuera de Bogotá te enviamos por Servientrega, ellos recibirán el dinero y el tiempo de transporte será de 24 a 48 horas.',
            'currency': 'COP'
          }]
      });
    })
  });

  return router;
}