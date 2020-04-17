module.exports = {
  isAuthenticated: (req, res, next) => {
    if(!req.session.store || !req.session.accessToken)
      return res.redirect('/auth?shop=compra-puertorico.myshopify.com');
    return next();
  },
  replaceCharacters: (str) => {
    return str.replace(/Á/, 'A')
              .replace(/Ð/, 'D')
              .replace(/É/, 'E')
              .replace(/Í/, 'I')
              .replace(/Ñ/, 'N')
              .replace(/Ó/, 'O')
              .replace(/Ú/, 'U')
              .replace(/Ü/, 'U')
              .replace(/á/, 'a')
              .replace(/é/, 'e')
              .replace(/í/, 'i')
              .replace(/ó/, 'o')
              .replace(/ú/, 'u')
              .replace(/ü/, 'u')
              .replace(/ñ/, 'n')
              .trim();
  }
}