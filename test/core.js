'use strict';
var devis=require("../devis");

devis.add({
  action: 'game',
  cmd:'play'
}, function(args, done) {

  done(null,{ result: 'play' });
});
devis.add({
  action: 'game',
  cmd:'pause'
}, function(args, done) {

  done(null,{ result: 'pause' });
});
devis.add({
  action: 'gamer',
  cmd:'play'
}, function(args, done) {

  done(null,{ result: args.name});
})
