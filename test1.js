var devis=require("./devis");

devis.add({
  action: 'test1',
  cmd:'game'
}, function(args, done) {
  
  done(null, { yeld: 'test1' });
});
devis.add({
  action: 'test1',
  cmd:'car'
}, function(args, done) {
    
  done(null, { car: 'lll' });
});
devis.add({
  action: 'test1',
  cmd:'play'
}, function(args, done) {
   
  done(null, { yeld: 'kkk' });
});
devis.listen({
  host: 'localhost',
  port: 3030
});