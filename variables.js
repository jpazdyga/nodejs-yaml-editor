require('shelljs/global');

var parse = require('csv-parse/lib/sync');
var https = require('https');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var objectPath = require('object-path');

var yaml_array=[];
global.json_allvars = [];

var yaml = require('js-yaml');
var fs = require('fs');

var environment = "production";
var pathtosearch = "/etc/puppet/hieradata/" + environment;

module.exports = {

  fn_json_allvars: function (hg_scope) {
//    function fn_json_allvars() {
    var search = "";
    var scope = hg_scope;
//    console.log("Scope: " + scope);
    pts = pathtosearch + "/" + scope;
//    console.log("PTS: " + pts);
    var search = exec('find ' + pts + ' -name \"*.yaml\"', {silent:true,timeout:5000});
    yaml_array = search.toString().split("\n");
    n=0;
//    console.log("Yaml array: " + yaml_array);
global.json_allvars = [];
    yaml_array.forEach(function(v) {
//      console.log("Here: " + v);
      if (v) {
        var variablename = grep('^.[a-z]', v).exec('awk -F": " \'{print $1}\'', {silent:true,timeout:5000}).exec('sed \'s/:$//g\'', {silent:true,timeout:5000});
        var varstring = variablename.stdout.slice(0, -1).toString().split("\n");
        n++;

        json_singlevar = "{\"location\": \"" + v + "\", \"variable\":\"" + varstring + "\"},";
        //console.log(json_singlevar);
        global.json_allvars = global.json_allvars + json_singlevar;
        
//	console.log("global.json_allvars: " + global.json_allvars);
      }
    });
    pre_global_json_allvars = "[" + global.json_allvars.slice(0, -1) + "]";
    var json = "";
    var json = JSON.parse(pre_global_json_allvars);
    return json;
//  };
  }
};

//fn_json_allvars();
//console.log("Test: " + global.json_allvars);
