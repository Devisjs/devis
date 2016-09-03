#include "node.h"
#include "devisPattern.hpp"

TStrStrMap devisPattern::devisPattern::tMap;

namespace devisPattern {
    
    using v8::Context;
    using v8::Function;
    using v8::FunctionCallbackInfo;
    using v8::FunctionTemplate;
    using v8::Isolate;
    using v8::Local;
    using v8::Number;
    using v8::Object;
    using v8::Persistent;
    using v8::String;
    using v8::Value;
    
    Persistent<Function> devisPattern::constructor;
    
    devisPattern::devisPattern(){
    }
    
    devisPattern::~devisPattern() {
    }
    
    void devisPattern::Init(Local<Object> exports) {
         Isolate* isolate = exports->GetIsolate();
        
        Local<FunctionTemplate> tpl = FunctionTemplate::New(isolate, New);
        tpl->SetClassName(String::NewFromUtf8(isolate, "devisPattern"));
        tpl->InstanceTemplate()->SetInternalFieldCount(1);
        
        NODE_SET_PROTOTYPE_METHOD(tpl, "add", add);
        NODE_SET_PROTOTYPE_METHOD(tpl, "list", list);
        NODE_SET_PROTOTYPE_METHOD(tpl, "find", find);
        
        constructor.Reset(isolate, tpl->GetFunction());
        exports->Set(String::NewFromUtf8(isolate, "devisPattern"),
                     tpl->GetFunction());
    }
    
    void devisPattern::New(const FunctionCallbackInfo<Value>& args) {
        Isolate* isolate = args.GetIsolate();
        
        if (args.IsConstructCall()) {
            devisPattern* obj = new devisPattern();
            obj->Wrap(args.This());
            args.GetReturnValue().Set(args.This());
        } else {
            const int argc = 1;
            Local<Value> argv[argc] = { args[0] };
            Local<Function> cons = Local<Function>::New(isolate, constructor);
            Local<Context> context = isolate->GetCurrentContext();
            Local<Object> instance =
            cons->NewInstance(context, argc, argv).ToLocalChecked();
            args.GetReturnValue().Set(instance);
        }
    }
    
    void devisPattern::NewInstance(const FunctionCallbackInfo<Value>& args) {
        Isolate* isolate = args.GetIsolate();
        
        const unsigned argc = 1;
        Local<Value> argv[argc] = { args[0] };
        Local<Function> cons = Local<Function>::New(isolate, constructor);
        Local<Context> context = isolate->GetCurrentContext();
        Local<Object> instance =
        cons->NewInstance(context, argc, argv).ToLocalChecked();
        
        args.GetReturnValue().Set(instance);
    }
    
    TStrStrMap::const_iterator FindPath(const TStrStrMap& map, const string& path) {
        TStrStrMap::const_iterator i = map.lower_bound(path);
        if (i != map.end()) {
            const string& key = i->first;
            if (path.compare(0, path.size(), key) == 0)
                return i;
        }
        return map.end();
    }
    
    string liste(TStrStrMap& tMap)
    {
        string res="";
        for(it_type iterator = tMap.begin(); iterator != tMap.end(); iterator++) {
            if(iterator!=tMap.begin()) res+=",";
            res+="match:"+iterator->first;
        }
        return res;
    }
    
    int TFind(const TStrStrMap& map, const string& path) {
        auto i = FindPath(map, path);
        if (i != map.end())
        {
           
            return i->second;
        }
        return -1 ;
    }
    
    void devisPattern::find(const v8::FunctionCallbackInfo<v8::Value>& args)
    {
        int data;
        v8::String::Utf8Value _path(args[0]->ToString());
        data=TFind(tMap, *_path);
        /*Local< Function > res;
        res=Local<Function>::New(Isolate::GetCurrent(),data);*/
        args.GetReturnValue().Set(data);
    }
    
    void devisPattern::list(const v8::FunctionCallbackInfo<v8::Value>& args)
    {
        Isolate* isolate=Isolate::GetCurrent();
        string s=liste(tMap);
        args.GetReturnValue().Set(String::NewFromUtf8(isolate, liste(tMap).c_str()));
    }
    
    void devisPattern::add(const FunctionCallbackInfo<Value>& args) {
        auto id=args[1]->Int32Value();
        v8::String::Utf8Value _path(args[0]->ToString());
        //cout<<obj->IsFunction()<<endl;
        tMap.insert(TStrStrPair(*_path,id));
        //args.GetReturnValue().Set(obj);
    }
    
}  