var devis=require("./devis")

.client({
  host: '127.0.0.1',
  port: 3000,
  timeout:400 
})
devis.act({
    action: 'ping',
    cmd:'play'
  }, function(err, result) {
    if(err) console.log(err);
      console.log(result);
});
devis.act({
    action: 'ping',
    cmd:'game'
  }, function(err, result) {
    if(err) console.log(err);
      console.log(result);
});
