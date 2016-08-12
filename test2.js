var devis = require("./devis")
  devis.setName("test2")
  .client({
    host: '127.0.0.1',
    id:2,
    port: 3030
  })
    .use("./test")
  function test(id)
  {
    console.log(id);
  }
devis.act({action: 'ping', cmd: 'play' }, function (err, result) {

  console.log(result);
   devis.act({action: 'ping', cmd: 'game' }, function (err2, result2) {
  
  
  console.log(result2);
});
  
});

  devis.act({ clientId:2,action: 'test1', cmd: 'car' }, function (err2, result2) {
  
  
  console.log(result2);
});
  devis.act({action: 'drive', cmd: 'car' }, function (err2, result2) {
  
  
  console.log(result2);
});
