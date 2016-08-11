var devis = require("./devis")

  .client({
    host: '127.0.0.1',
    port: 3000,
    timeout: 400
  })
devis.act({ action: 'ping', cmd: 'play' }, function (err, result) {

  console.log(result);
});
  devis.act({ action: 'ping', cmd: 'game' }, function (err2, result2) {
  
  
  console.log(result2);
});
  devis.act({ action: 'drive', cmd: 'car' }, function (err2, result2) {
  
  
  console.log(result2);
});
  