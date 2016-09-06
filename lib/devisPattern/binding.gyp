{
    "targets": [
                {
                "target_name": "addon",
                "sources": [
                            "addon.cpp",
                            "devisPattern.cpp"
                            ],
      "cflags" : [ "-std=c++1", "-stdlib=libc++" ],
      "cflags!": [ '-fno-exceptions' ],
      "cflags_cc!": [ '-fno-exceptions' ],
"conditions": [
[ 'OS!="win"', {
"cflags+": [ "-std=c++11" ],
"cflags_c+": [ "-std=c++11" ],
"cflags_cc+": [ "-std=c++11" ],
}],
[ 'OS=="mac"', {
"xcode_settings": {
"OTHER_CPLUSPLUSFLAGS" : [ "-std=c++11", "-stdlib=libc++" ],
"OTHER_LDFLAGS": [ "-stdlib=libc++" ],
"MACOSX_DEPLOYMENT_TARGET": "10.7"
},
}],
],
    
    }
  ]
}