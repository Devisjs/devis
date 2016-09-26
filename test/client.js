const devis=require("../devis")
.client({
  host:'127.0.0.1',
  port:3030,
  id:1
}).setName('test2');
devis.add({test:"test",action:"done"},(args,done)=>{
  done("test done");
})
devis.act({ clientId:1,action: 'game', cmd: 'play' }, function (result) {

  console.log(result);

});

devis.act({clientId:1,action: 'game', cmd: 'pause' }, function (result2) {


  console.log(result2);
});


  devis.act({ clientId:1,action: 'gamer', cmd: 'play' }, function (result2) {


  console.log(result2);
})
