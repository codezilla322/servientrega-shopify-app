module.exports = {
  addGuide: (guideData) => {
    var query = "INSERT INTO guides SET ?";
    return new Promise((resolve, reject) => {
      db.query(query, guideData, (err, result) => {
        if(err)
          return reject(err);
        return resolve(result);
      });
    });
  },
  getGuide: (orderId) => {
    var query = "SELECT * FROM guides WHERE ORDER_ID = ?";
    return new Promise(function(resolve, reject) {
      db.query(query, orderId, function(err, result) {
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