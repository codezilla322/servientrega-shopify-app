module.exports = {
  getShippingRate: (provCode, city) => {
    var query = "SELECT * FROM shipping_rates WHERE PROV_CODE = ? AND CITY_ALT = ?";
    return new Promise((resolve, reject) => {
      db.query(query, [provCode, city.toUpperCase()], (err, result) => {
        if(err)
          return reject(err);
        if(result.length > 0)
          return resolve(result[0]);
        else
          return resolve(null);
      });
    });
  }
}