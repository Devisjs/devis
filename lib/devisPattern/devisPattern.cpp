#include "node.h"
#include "devisPattern.hpp"

//TStrStrMap devisPattern::devisPattern::tMap;

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
      TStrStrMap::const_iterator i = map.find(path);
                     return i;
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
        if (i != map.end()) return i->second;

        return -1 ;
    }

    void devisPattern::find(const v8::FunctionCallbackInfo<v8::Value>& args)
    {
        int data;
        v8::String::Utf8Value _path(args[0]->ToString());
        auto ptr = Unwrap<devisPattern>(args.Holder());

        data=TFind(ptr->tMap, *_path);
        args.GetReturnValue().Set(data);
    }

    void devisPattern::list(const v8::FunctionCallbackInfo<v8::Value>& args)
    {
        Isolate* isolate=Isolate::GetCurrent();
        auto ptr = Unwrap<devisPattern>(args.Holder());
        string s=liste(ptr->tMap);
        args.GetReturnValue().Set(String::NewFromUtf8(isolate, liste(ptr->tMap).c_str()));
    }

    void devisPattern::add(const FunctionCallbackInfo<Value>& args) {
        auto id=args[1]->Int32Value();
        auto ptr = Unwrap<devisPattern>(args.Holder());
        v8::String::Utf8Value _path(args[0]->ToString());
        ptr->tMap.insert(TStrStrPair(*_path,id));
    }

}
