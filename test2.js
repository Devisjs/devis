var devis=require("./devis");

devis.client({
  host: '127.0.0.1',
  port: 3000
});
devis.act({
    action: 'ping',
    cmd:'play',
  }, function(err, result) {
      console.log(result);
});



