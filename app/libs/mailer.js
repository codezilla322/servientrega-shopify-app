const Email = require('email-templates');
const nodemailer = require('nodemailer');
const nodemailerSendgrid = require('nodemailer-sendgrid');
const transport = nodemailer.createTransport(
  nodemailerSendgrid({
    apiKey: process.env.SENDGRID_APIKEY
  })
);
const mailer = new Email({
  send: true,
  preview: false,
  message: {
    from: '"Compra Puerto Rico" <hola@comprapuertorico.com>'
  },
  transport: transport
});

module.exports = function(template, email, vars) {
  mailer
    .send({
      template: template,
      message: {
        to: email
      },
      locals: vars
    })
    .then()
    .catch(console.error);
}