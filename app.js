require('dotenv').config();
require('module-alias/register');
const express = require('express');
const app = express();
const mysql = require('mysql');
const expressSession = require('express-session');

const conn = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});
conn.connect(function(err) {
  if (err) throw err;
  console.log("Mysql Connected");
});
global.db = conn;

app.set('view engine', 'pug');

const session = expressSession({ secret: 'servientrega', resave: true, saveUninitialized: true });
app.use(session);
app.use(express.json());

const authRouter = require('@routes/auth')();
const shppingRouter = require('@routes/shipping')();
const guideRouter = require('@routes/guide')();

app.get('/', (req, res) => {
  res.send('Has iniciado sesión en la tienda. Inténtalo de nuevo.');
});
app.use('/auth', authRouter);
app.use('/shipping', shppingRouter);
app.use('/guide', guideRouter);

const port = process.env.PORT || '3000';
app.listen(port);