require('shelljs/global');

var parse = require('csv-parse/lib/sync');
var https = require('https');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var objectPath = require('object-path');

var yaml_array=[];
global.json_allvars = [];

module.exports = {

  fn_json_allvars: function () {
//    function fn_json_allvars() {
    var search = exec('find /etc/puppet/hieradata/ -name \"*.yaml\"', {silent:true,timeout:5000});
    yaml_array = search.toString().split("\n");
    n=0; 
    yaml_array.forEach(function(v) {
      //console.log("Here:" + v);
      if (v) {
        var variablename = grep('^.[a-z]', v).exec('awk -F": " \'{print $1}\'', {silent:true,timeout:5000}).exec('sed \'s/:$//g\'', {silent:true,timeout:5000});
    //.exec('tr "\n" ","', {silent:true,timeout:5000});
        var varstring = variablename.stdout.slice(0, -1).toString().split("\n");
    //    console.log(Array.isArray(varstring));
        n++;
//        json_singlevar = "\"dataset" + n + "\":{\"location\":\"" + v + "\",\"variable\":\"" + varstring + "\"},";
          json_singlevar = "{\"location\": \"" + v + "\", \"variable\":\"" + varstring + "\"},";
    //    console.log(json_singlevar);
        global.json_allvars = global.json_allvars + json_singlevar;

    /*
          varstring.forEach(function(x) {
          console.log(v, x);
        });
    */
  
      }
    });
    pre_global_json_allvars = "[" + global.json_allvars.slice(0, -1) + "]";
    json = JSON.parse(pre_global_json_allvars);
    return json;
//  };
  }
};

//fn_json_allvars();
//console.log("Test: " + global.json_allvars);
