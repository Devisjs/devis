const addon = require('./build/Release/addon');

var obj = new addon.devisPattern();
let tes={tes:"test",tes2:"test2"};
let tes2={1:1,2:2};
class test{
    constructor() {
      this.path=[];
      this.id=0;
    }
    add(path,handle) {

        this.path[this.id]=handle;
      obj.add(JSON.stringify(path),this.id);
      this.id++;
      return this;
    }
    find(path,args,callback)
    {
      let id=this.find(path);
      if(id!=-1)
      this.path[id].call(this,args,callback);
      else console.log("error");
      return this;
    }
    find(path)
    {
      return obj.find(JSON.stringify(path));
    }
};
let test1=new test();
test1.add(tes,(args,done)=>{
  let id=args['id'];
  done(id);
});
test1.add(tes2,(args,done)=>{
  let id=args['l'];
  done(id);
});
test1.act(tes2,{id:5,l:2},(res)=>{
  //console.log(obj.list());
  console.log(res);
});
