require('shelljs/global');

var updateval = require('./updatevalues.js');
var vlist = require('./variables.js');
var parse = require('csv-parse/lib/sync');
var https = require('https');
var express = require('express');
var app = express();
var bodyParser = require('body-parser')
var objectPath = require('object-path');

var desc_array  = [];

global.hierafile;
global.resp2;

app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

var yaml = require('js-yaml');
var fs = require('fs');
var parsed;
var moren = 0;

module.exports = {

  fn_json_complexvars: function (hostgroup, variable) {

    var h = hostgroup;
    var p = variable;
    var owner = 1;

//    global.hierafile = "/etc/puppet/hieradata/production/" + h + ".yaml";
    global.hierafile = h;
    try {
        var config = yaml.safeLoad(fs.readFileSync(global.hierafile, 'utf8'));
    } catch (e) {
        console.log(e);
    };

    var object_names = [];
    var objects = {};
    var result_obj = {};
    var result_arr = [];

    function isObject(tocheck, callback) {
      for(var i in tocheck) {
        if(tocheck[i] instanceof Object) {
          var keyname = i;
    //      console.log(keyname);
    //      parseObject(i, tocheck[i]);
            //return callback(keyname);
    //      object_names.push(keyname);
    //      objects.push(tocheck[i]);
            objects[keyname]=tocheck[i];
        }
        else {
          objects[i]=tocheck[i];
        }
      }
      return callback(objects);
    }

//    function digmore(more, parent, callback) {
    function digmore(more, parent) {
      var isarray = false;
      var origparent = parent;
      if(Array.isArray(more)) {
        var isarray = true;
        for(arr=0, len=more.length; arr<len; arr++) {
          var parent = parent;
          var value = more[arr];
//          console.log("Parent: " + parent + ", Array elements: " + more[arr]);
          result_arr.push(value);
        }
      }
//      console.log("More " + moren + ": " + JSON.stringify(more));
      moren = moren++;
      if(more instanceof Object && isarray == false) {
        lkeys = Object.keys(more);
//        console.log("all keys: " + lkeys);
        for(z=0, len=lkeys.length; z<len; z++) {
          lkey = lkeys[z];
          var parent_dig1 = parent;
          var parent = origparent + "." + lkey;
//          console.log("Parent after dig 1: " + parent);
          
          for(ix in more[lkey]) {
//            console.log("Typeof ix: " + typeof ix);
            var dig2 = parent + "." + ix;
            var parent = dig2;
            var value = objectPath.get(config, [origparent, lkey, ix]);
            result_obj[parent]=value;
//            console.log("Dig2:" +  dig2);
            var dig3 = objectPath.get(config, dig2);
//            console.log("Type of dig3: " + typeof dig3);
            if(dig3 instanceof Object){
              lkeys = Object.keys(dig3);
//              console.log("all keys: " + lkeys);
              lastparent=dig2;
              for(z=0, len=lkeys.length; z<len; z++) {
                lkey = lkeys[z];
		var parent = lastparent + "." + lkey;
                var value = dig3[lkey];
                result_obj[parent]=value;
              }
            }
          }
        }
        global.resp2 = result_obj;
      } else {
        global.resp2 = more;
      }
    }

    isObject(config, function(response) {
      keys = Object.keys(response);
//      console.log("keys.length: " + keys.length);
      
      for(x=0, len=keys.length; x<len ; x++) {
        if(keys[x]==p) {
//        console.log("Response: " + response);
          response = digmore(response[p],p);
//          console.log("Resp1: " + JSON.stringify(global.resp2));
        }
      }
   })
    if(Object.keys(result_obj).length === 0 ) {
//      console.log("Object not set");
      var j = result_arr;
    } else if (result_arr.length === 0) {
//      console.log("Array not set");
      var j = result_obj;
    }
    //console.log("J: " + JSON.stringify(j));
    return j;
  }
}
