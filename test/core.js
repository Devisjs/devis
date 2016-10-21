'use strict';
var devis=require("../devis");

devis.add({
  action: 'game',
  cmd:'play'
}, function(args,done) {

  done(null,args.name+" is playing game now");
});
devis.add({
  action: 'game',
  cmd:'pause'
}, function(args, done) {

  done(null,args.name+" pause the game");
});

devis.add({
  action: 'gamer',
  cmd:'play'
}, function(args, done) {

  done(null,{ result: args.name});
})
