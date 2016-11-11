const devis = require("../devis")
  .client({
    host: '127.0.0.1',
    port: 3131,
    id: 1
  }).setName('test2');
devis.add({ test: "test", action: "done" }, (args, done) => {
  done(null, "test done");
})
devis.act({ clientId: 1, action: 'game', cmd: 'play' },{name:"foo"}, function (err, result) {
  if (err) throw err;
  console.log(result);

});

devis.act({ clientId: 1, action: 'game', cmd: 'pause' },{name:"foo"}, function (err, result2) {
  if (err) throw err;

  console.log(result2);
});


devis.act({ clientId: 1, action: 'gamer', cmd: 'play' }, function (err, result2) {

  if (err) throw err;
  console.log(result2);
})
