var devis = require("./devis")
.client({
  host:'127.0.0.1',
  port:3030,
  id:1
}).setName('test2');
  
devis.act({ clientId:1,action: 'pig', cmd: 'play' }, function (err, result) {

  console.log(result);
   
});

devis.act({clientId:1,action: 'ping', cmd: 'game' }, function (err2, result2) {
  
  
  console.log(result2);
});
  
  
  devis.act({ clientId:1,action: 'drive', cmd: 'car' }, function (err2, result2) {
  
  
  console.log(result2);
});
