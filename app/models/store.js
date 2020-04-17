module.exports = {
  addStore: (storeData) => {
    var query = "INSERT INTO stores SET ?";
    return new Promise((resolve, reject) => {
      db.query(query, storeData, (err, result) => {
        if(err)
          return reject(err);
        return resolve(result);
      });
    });
  },
  isStoreInstalled: (storeName) => {
    var query = "SELECT * FROM stores WHERE STORE_NAME = ?";
    return new Promise((resolve, reject) => {
      db.query(query, storeName, (err, result) => {
        if(err)
          return reject(err);
        if(result.length > 0)
          return resolve(true);
        else
          return resolve(false);
      });
    });
  }
}