const addon = require('./build/Release/addon');
const jsonSort = require("sort-json");
const obj = new addon.devisPattern();

class devisPattern {

    constructor() {
        this.path = [];
        this.id = 0;
    }

    add(path, handle) {
        this.path[this.id] = handle;
        path = jsonSort(path);
        obj.add(JSON.stringify(path), this.id);
        this.id++;
        return this;
    }

    find(path) {
        path = jsonSort(path);
        let id = obj.find(JSON.stringify(path));

        if (id != -1) return this.path[id];
        else return null;
    }
    call(path,args,callback)
    {
      let res=this.find(path);
      if(res) res.call(this,args,callback);
    }

    list() {
        return obj.list();
    }

}
module.exports = new devisPattern();
