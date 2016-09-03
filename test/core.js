var devis=require("../devis");

devis.add({
  action: 'game',
  cmd:'play'
}, function(args, done) {

  done({ result: 'play' });
});
devis.add({
  action: 'game',
  cmd:'pause'
}, function(args, done) {

  done({ result: 'pause' });
});
devis.add({
  action: 'gamer',
  cmd:'play'
}, function(args, done) {

  done({ result: args.name});
})
