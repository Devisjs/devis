#include "node.h"
#include "devisPattern.hpp"

namespace devisPattern {
    
    using v8::FunctionCallbackInfo;
    using v8::Isolate;
    using v8::Local;
    using v8::Object;
    using v8::String;
    using v8::Value;
    
    void CreateObject(const FunctionCallbackInfo<Value>& args) {
        devisPattern::NewInstance(args);
    }
    
    void InitAll(Local<Object> exports) {
        devisPattern::Init(exports);
        
            }
    
    NODE_MODULE(addon, InitAll)
    
}