var devis=require("../devis")
.client({
  host:'127.0.0.1',
  port:3030,
  id:1
})
.client({
  host:'127.0.0.1',
  port:3030,
  id:2
}).setName('test2');

devis.act({ clientId:1,action: 'game', cmd: 'play' }, function (err, result) {

  console.log(result);

});

devis.act({clientId:1,action: 'game', cmd: 'pause'}, function (err2, result2) {


  console.log(result2);
});


  devis.act({ clientId:2,action: 'gamer', cmd: 'play' }, function (err2, result2) {


  console.log(result2);
});
devis.act({ clientId:2,action: 'gamer', cmd: 'play' }, function (err2, result2) {


console.log(result2);
});
