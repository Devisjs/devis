'use strict';
var devis=require("../devis");

devis.define({
  action: 'game',
  cmd:'play'
}, function(args, done) {

  done({ result: 'play' });
});
devis.define({
  action: 'game',
  cmd:'pause'
}, function(args, done) {

  done({ result: 'pause' });
});
devis.define({
  action: 'gamer',
  cmd:'play'
}, function(args, done) {

  done({ result: args.name});
})
