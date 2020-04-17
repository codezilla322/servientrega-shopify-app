const express = require('express');
const router = express.Router();
const basefunc = require('@libs/basefunc');
const sendmail = require('@libs/mailer');
const guideModel = require('@models/guide');
const shippingModel = require('@models/shipping');
const request = require('request-promise');
const fs = require('fs');
const xml2js = require('xml2js');
const parser = new xml2js.Parser({explicitArray: false, trim: true});

module.exports = function() {
  router.get('/download', basefunc.isAuthenticated, (req, res) => {
    const orderId = req.query.id;
    guideModel.getGuide(orderId)
    .then((resultGuide) => {
      if(resultGuide) {
        let filepath = '/home/servientrega_guides/' + guideNum + '.pdf';
        let filename = 'GuiaVirtualBond_' + resultGuide.GUIDE_NUMBER + '.pdf';
        res.setHeader('Content-disposition', 'attachment; filename=' + filename);
        res.setHeader('Content-type', 'application/pdf');
        let filestream = fs.createReadStream(filepath);
        filestream.pipe(res);
        return;
      }

      var servientregaLogin = process.env.SERVIENTREGA_LOGIN_POD;
      const servientregaPass = process.env.SERVIENTREGA_PASS;
      var servientregaCodFacturacion = process.env.SERVIENTREGA_COD_FACTURACION_POD;
      const servientregaNombreCargue = process.env.SERVIENTREGA_NOMBRE_CARGUE;
      
      var guideNum = '';
      var orderData = null;

      const orderRequestOptions = {
        uri: 'https://' + req.session.store + '/admin/api/2020-01/orders/' + orderId + '.json',
        headers: {
          'X-Shopify-Access-Token': req.session.accessToken
        },
        json: true
      };
      request(orderRequestOptions)
      .then((orderResponse) => {
        console.log(orderResponse);
        orderData = orderResponse.order;
        return shippingModel.getShippingRate(
          orderData.shipping_address.province_code,
          basefunc.replaceCharacters(orderData.shipping_address.city)
        );
      })
      .then((shippingRate) => {
        console.log(shippingRate);

        var shippingCost = 0;
        if(orderData.total_weight <= 3000) {
          shippingCost = parseInt(shippingRate['COST1']);
        } else if(orderData.total_weight <= 12000) {
          shippingCost = parseInt(shippingRate['COST2']);
        } else {
          shippingCost = parseInt(shippingRate['COST2']) + parseInt(orderData.total_weight - 12000) * parseInt(shippingRate['COST3_FACTOR']);
        }
        var totalCost = parseInt(orderData.subtotal_price * 107 / 100) + parseInt(shippingCost);
        var totalItemCount = 0;
        orderData.line_items.forEach((item) => {
          totalItemCount += item.quantity;
        });
        var totalItemWeight = Math.ceil(orderData.total_weight / 1000);
        if(totalItemWeight < 3)
          totalItemWeight = 3;
        orderData.subtotal_price = Math.ceil(orderData.subtotal_price);
        if(orderData.financial_status == 'paid') {
          servientregaLogin = process.env.SERVIENTREGA_LOGIN_NORMAL;
          servientregaCodFacturacion = process.env.SERVIENTREGA_COD_FACTURACION_NORMAL;
          totalCost = 0;
          totalItemWeight = Math.ceil(orderData.total_weight / 1000);
        }

        if(!orderData.phone)
          orderData.phone = orderData.billing_address.phone;
        if(orderData.phone) {
          orderData.phone = orderData.phone.replace('+57', '');
          orderData.phone = orderData.phone.replace(/ /, '');
        }
        const customerName = basefunc.replaceCharacters(orderData.shipping_address.first_name + ' ' + orderData.shipping_address.last_name);
        const customerAddress = basefunc.replaceCharacters(orderData.shipping_address.address1 + ', ' + orderData.shipping_address.address2);

        const xmlGuideGen =
          `<?xml version="1.0"?>
          <SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <SOAP-ENV:Header>
              <tem:AuthHeader>
                <tem:login>` + servientregaLogin + `</tem:login>
                <tem:pwd>` + servientregaPass + `</tem:pwd>
                <tem:Id_CodFacturacion>` + servientregaCodFacturacion + `</tem:Id_CodFacturacion>
                <tem:Nombre_Cargue>` + servientregaNombreCargue + `</tem:Nombre_Cargue>
              </tem:AuthHeader>
            </SOAP-ENV:Header>
            <SOAP-ENV:Body>
              <tem:CargueMasivoExterno>
                <tem:envios>
                  <tem:CargueMasivoExternoDTO>
                    <tem:objEnvios>
                      <tem:EnviosExterno>
                        <tem:Num_Guia>0</tem:Num_Guia>
                        <tem:Num_Sobreporte>0</tem:Num_Sobreporte>
                        <tem:Doc_Relacionado/>
                        <tem:Num_Piezas>` + totalItemCount + `</tem:Num_Piezas>
                        <tem:Des_TipoTrayecto>1</tem:Des_TipoTrayecto>
                        <tem:Ide_Producto>2</tem:Ide_Producto>
                        <tem:Ide_Destinatarios>00000000-0000-0000-0000-000000000000</tem:Ide_Destinatarios>
                        <tem:Ide_Manifiesto>00000000-0000-0000-0000-000000000000</tem:Ide_Manifiesto>
                        <tem:Des_FormaPago>2</tem:Des_FormaPago>
                        <tem:Des_MedioTransporte>1</tem:Des_MedioTransporte>
                        <tem:Num_PesoTotal>` + totalItemWeight + `</tem:Num_PesoTotal>
                        <tem:Num_ValorDeclaradoTotal>` + orderData.subtotal_price + `</tem:Num_ValorDeclaradoTotal>
                        <tem:Num_VolumenTotal>0</tem:Num_VolumenTotal>
                        <tem:Num_BolsaSeguridad>0</tem:Num_BolsaSeguridad>
                        <tem:Num_Precinto>0</tem:Num_Precinto>
                        <tem:Des_TipoDuracionTrayecto>1</tem:Des_TipoDuracionTrayecto>
                        <tem:Des_Telefono>` + orderData.phone + `</tem:Des_Telefono>
                        <tem:Des_Ciudad>` + shippingRate.CITY + `</tem:Des_Ciudad>
                        <tem:Des_Direccion>` + customerAddress + `</tem:Des_Direccion>
                        <tem:Nom_Contacto>` + customerName + `</tem:Nom_Contacto>
                        <tem:Des_VlrCampoPersonalizado1/>
                        <tem:Num_ValorLiquidado>0</tem:Num_ValorLiquidado>
                        <tem:Des_DiceContener>Accesorios</tem:Des_DiceContener>
                        <tem:Des_TipoGuia>1</tem:Des_TipoGuia>
                        <tem:Num_VlrSobreflete>0</tem:Num_VlrSobreflete>
                        <tem:Num_VlrFlete>0</tem:Num_VlrFlete>
                        <tem:Num_Descuento>0</tem:Num_Descuento>
                        <tem:idePaisOrigen>1</tem:idePaisOrigen>
                        <tem:idePaisDestino>1</tem:idePaisDestino>
                        <tem:Des_IdArchivoOrigen>0</tem:Des_IdArchivoOrigen>
                        <tem:Des_DireccionRemitente>Calle 13 con Carrera 20 Bogota DC</tem:Des_DireccionRemitente>
                        <tem:Num_PesoFacturado>0</tem:Num_PesoFacturado>
                        <tem:Est_CanalMayorista>false</tem:Est_CanalMayorista>
                        <tem:Num_IdentiRemitente>901166579</tem:Num_IdentiRemitente>
                        <tem:Num_TelefonoRemitente>3507988222</tem:Num_TelefonoRemitente>
                        <tem:Num_Alto>15</tem:Num_Alto>
                        <tem:Num_Ancho>15</tem:Num_Ancho>
                        <tem:Num_Largo>15</tem:Num_Largo>
                        <tem:Des_DepartamentoDestino>` + shippingRate.PROVINCE + `</tem:Des_DepartamentoDestino>
                        <tem:Des_DepartamentoOrigen/>
                        <tem:Gen_Cajaporte>false</tem:Gen_Cajaporte>
                        <tem:Gen_Sobreporte>false</tem:Gen_Sobreporte>
                        <tem:Nom_UnidadEmpaque>GENERICA</tem:Nom_UnidadEmpaque>
                        <tem:Nom_RemitenteCanal/>
                        <tem:Des_UnidadLongitud>cm</tem:Des_UnidadLongitud>
                        <tem:Des_UnidadPeso>kg</tem:Des_UnidadPeso>
                        <tem:Num_ValorDeclaradoSobreTotal>0</tem:Num_ValorDeclaradoSobreTotal>
                        <tem:Num_Factura>` + orderData.name + `</tem:Num_Factura>
                        <tem:Des_CorreoElectronico>` + orderData.email + `</tem:Des_CorreoElectronico>
                        <tem:Num_Recaudo>` + totalCost + `</tem:Num_Recaudo>
                        <tem:Est_EnviarCorreo>false</tem:Est_EnviarCorreo>
                        <tem:Tipo_Doc_Destinatario>CC</tem:Tipo_Doc_Destinatario>
                        <tem:Ide_Num_Identific_Dest>` + orderData.order_number + `</tem:Ide_Num_Identific_Dest>
                      </tem:EnviosExterno>
                    </tem:objEnvios>
                  </tem:CargueMasivoExternoDTO>
                </tem:envios>
              </tem:CargueMasivoExterno>
            </SOAP-ENV:Body>
          </SOAP-ENV:Envelope>`;

        const guideGenRequestOptions = {
          url: 'http://web.servientrega.com:8081/GeneracionGuias.asmx',
          method: 'POST',
          body: xmlGuideGen,
          headers: {
            'Content-Type': 'text/xml;charset=utf-8',
            'Accept-Encoding': 'gzip,deflate',
            'Content-Length': xmlGuideGen.length,
            'SOAPAction': 'http://tempuri.org/CargueMasivoExterno'
          }
        };
        return request(guideGenRequestOptions);
      })
      .then((guideGenResponse) => {
        console.log(guideGenResponse);
        return parser.parseStringPromise(guideGenResponse);
      })
      .then((guideGenParseResult) => {
        guideNum = guideGenParseResult['soap:Envelope']['soap:Body']['CargueMasivoExternoResponse']['arrayGuias']['string'];
        const xmlGuideDown =
          `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
            <soapenv:Header>
              <tem:AuthHeader>
                <tem:login>` + servientregaLogin + `</tem:login>
                <tem:pwd>` + servientregaPass + `</tem:pwd>
                <tem:Id_CodFacturacion>` + servientregaCodFacturacion + `</tem:Id_CodFacturacion>
                <tem:Nombre_Cargue>` + servientregaNombreCargue + `</tem:Nombre_Cargue>
              </tem:AuthHeader>
            </soapenv:Header>
            <soapenv:Body>
              <tem:GenerarGuiaSticker>
                <tem:num_Guia>` + guideNum + `</tem:num_Guia>
                <tem:num_GuiaFinal>` + guideNum + `</tem:num_GuiaFinal>
                <tem:ide_CodFacturacion>` + servientregaCodFacturacion + `</tem:ide_CodFacturacion>
                <tem:sFormatoImpresionGuia>2</tem:sFormatoImpresionGuia>
                <tem:Id_ArchivoCargar>0</tem:Id_ArchivoCargar>
                <tem:interno>false</tem:interno>
                <tem:bytesReport></tem:bytesReport>
              </tem:GenerarGuiaSticker>
            </soapenv:Body>
          </soapenv:Envelope>`;

        const guideDownRequestOptions = {
          url: 'http://web.servientrega.com:8081/GeneracionGuias.asmx',
          method: 'POST',
          body: xmlGuideDown,
          headers: {
            'Content-Type': 'text/xml;charset=utf-8',
            'Accept-Encoding': 'gzip,deflate',
            'Content-Length': xmlGuideDown.length,
            'SOAPAction': 'http://tempuri.org/GenerarGuiaSticker'
          }
        };
        return request(guideDownRequestOptions);
      })
      .then((guideDownResponse) => {
        console.log(guideDownResponse);
        return parser.parseStringPromise(guideDownResponse);
      })
      .then((guideGenParseResult) => {
        let buffer = Buffer.from(guideGenParseResult['soap:Envelope']['soap:Body']['GenerarGuiaStickerResponse']['bytesReport'], 'base64');
        let filepath = '/home/servientrega_guides/' + guideNum + '.pdf';
        fs.writeFile(filepath, buffer, (fileWriteError) => {
          let filename = 'GuiaVirtualBond_' + guideNum + '.pdf';
          res.setHeader('Content-disposition', 'attachment; filename=' + filename);
          res.setHeader('Content-type', 'application/pdf');
          let filestream = fs.createReadStream(filepath);
          filestream.pipe(res);
          guideModel.addGuide({
            ORDER_ID: orderId,
            ORDER_NAME: orderData.name,
            GUIDE_NUMBER: guideNum,
            GUIDE_FILENAME: filename,
            CUSTOMER_EMAIL: orderData.email
          });
        });
      })
      .catch((error) => {
        console.log('Error while generating guide: ' + error.message);
        res.status(error.statusCode).send('Error while generating guide: ' + error.message);
      });
    });
  });

  router.get('/send-mail', basefunc.isAuthenticated, (req, res) => {
    const orderId = req.query.id;
    guideModel.getGuide(orderId)
    .then((resultGuide) => {
      if(!resultGuide) {
        res.send('La guía no existe');
        return;
      }
      if(resultGuide.CUSTOMER_EMAIL == '') {
        res.send('El correo electrónico del cliente no existe');
        return;
      }
      sendmail('guide', resultGuide.CUSTOMER_EMAIL, {
        orderName: resultGuide.ORDER_NAME,
        guideNum: resultGuide.GUIDE_NUMBER
      });
      res.send('El correo fue enviado con éxito');
    });
  });

  return router;
}