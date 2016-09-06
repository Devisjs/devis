#ifndef DEVISPATTERN_H
#define DEVISPATTERN_H

#include <stdio.h>
#include <iostream>
#include <map>
#include <string>
#include <algorithm>
#include <vector>
#include "node.h"
#include "node_object_wrap.h"

using namespace std;
using namespace v8;

typedef map<string, int, std::greater<string>> TStrStrMap;
typedef pair<string,int> TStrStrPair;
typedef TStrStrMap::iterator it_type;

namespace devisPattern {

    class devisPattern : public node::ObjectWrap {

    public:
        static void Init(v8::Local<v8::Object> exports);
        static void NewInstance(const v8::FunctionCallbackInfo<v8::Value>& args);

    private:
        explicit devisPattern();
        ~devisPattern();

        static void New(const v8::FunctionCallbackInfo<v8::Value>& args);
        static void list(const v8::FunctionCallbackInfo<v8::Value>& args);
        static void find(const v8::FunctionCallbackInfo<v8::Value>& args);
        static void add(const v8::FunctionCallbackInfo<v8::Value>& args);
        static v8::Persistent<v8::Function> constructor;
         TStrStrMap tMap;

    };

}

#endif
