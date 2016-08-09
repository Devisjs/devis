var devis=require("./devis");

devis.add({
  action: 'ping',
  cmd:'game'
}, function(args, done) {
  
  done(null, { yeld: 'ping' });
});
devis.add({
  action: 'drive',
  cmd:'car'
}, function(args, done) {
  
  done(null, { car: 'car' });
});
devis.add({
  action: 'ping',
  cmd:'play'
}, function(args, done) {
   
  done(null, { yeld: 'pong' });
});
devis.listen({
  host: '127.0.0.1',
  port: 3000
});