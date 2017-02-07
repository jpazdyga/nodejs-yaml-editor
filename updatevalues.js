require('shelljs/global');

var parse = require('csv-parse/lib/sync');
var https = require('https');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var objectPath = require('object-path');

var yaml = require('js-yaml');
var fs = require('fs');

module.exports = {

  fn_change_values: function (variable, value, hostgroup) {
    var preh = hostgroup;
    var p = variable;
    var q = value;

    //console.log("Module: variable:" + p + ", Value: " + q + ", Hostgroup: " + preh);

    global.hierafile = "/etc/puppet/hieradata/production/" + preh + ".yaml";

    var h = global.hierafile

    //console.log("Hierafile: " + h);

    if (h) {
      h = global.hierafile;
    }
    try {
      var config = yaml.safeLoad(fs.readFileSync(h, 'utf8'));
      console.log(config);
    } catch (e) {
      console.log(e);
    };
  
    var get_comments = exec('grep -in \"^#\" ' + global.hierafile, {silent:true,timeout:5000}).exec('grep .', {silent:true,timeout:5000});
    //console.log('get_comments_1:' + get_comments);
  
    if (p.split('.').length - 1 > 1){
      var result = exec('echo ' + p, {silent:true}).exec('awk -F. \'{print $1, substr($2,2)}\' FPAT=\'(^[^.]+)|([.].*)\'', {silent:true}).exec('sed \'s/\\(.*\\)\\./\\1 /\'', {silent:true}).exec('tr -d "\n"', {silent:true});
  
      var result1 = exec('echo ' + result, {silent:true}).exec('awk \'{print $1}\'', {silent:true}).exec('tr -d "\n"', {silent:true});
      var result2 = exec('echo ' + result, {silent:true}).exec('awk \'{print $2}\'', {silent:true}).exec('tr -d "\n"', {silent:true});
      var result3 = exec('echo ' + result, {silent:true}).exec('awk \'{print $3}\'', {silent:true}).exec('tr -d "\n"', {silent:true});
  
      oldvalue = objectPath.get(config, [result1, result2, result3]);
      newvalue = objectPath.set(config, [result1, result2, result3], q);
    }
    else if (p.split('.').length - 1 == 1) 
    {
      var result = exec('echo ' + p, {silent:true}).exec('awk -F. \'{print $1, substr($2,2)}\' FPAT=\'(^[^.]+)|([.].*)\'', {silent:true}).exec('sed \'s/\\(.*\\)\\./\\1 /\'', {silent:true}).exec('tr -d "\n"', {silent:true});

      var result1 = exec('echo ' + result.stdout, {silent:true}).exec('awk \'{print $1}\'', {silent:true}).exec('tr -d "\n"', {silent:true});
      var result2 = exec('echo ' + result.stdout, {silent:true}).exec('awk \'{print $2}\'', {silent:true}).exec('tr -d "\n"', {silent:true});

      var tree1 = result1.stdout; 
      var tree2 = result2.stdout;
  
      var modifies = tree1 + "." + tree2;
      oldvalue = objectPath.get(config, [modifies]);
      newvalue = objectPath.set(config, [modifies], q);
    }
    else
    {
      //console.log("w ogole: " + p.split('.').length + "Config: " + JSON.stringify(config));
      var result = p;
      oldvalue = objectPath.get(config, [result]);
      newvalue = objectPath.set(config, [result], q);
      //console.log("OLD: " + oldvalue + " NEW: " + newvalue);
    }

    var desc_array = [];
    var prerecords;
    //console.log("Config: " + JSON.stringify(config));
    var write = yaml.safeDump(config);
    //console.log("Data to write: " + write);
    var data = fs.readFileSync(global.hierafile);
    //console.log("Old file content: " + data);
    if (get_comments) {
      var comments = get_comments.toString().split("\n");
      //var data = comments;
      for (i in comments) {
        var line = comments[i];
        //console.log("Comments Line:" + line);
        if (line) {
          var preproc = exec('echo ' + line, {silent:true}).exec('sed \'s\/^\/"\/g\' ', {silent:true}).exec('sed \'s\/$/\"\/g\'', {silent:true}).exec('sed \'s\/:#\/\":\"#/g\'', {silent:true});
          desc_array.push(preproc);
        };
      };
    };
    var prerecords = desc_array.join("");

    var records = parse(prerecords, {delimiter:':', rowDelimiter: '\n', columns:['linenr', 'text']});
    //console.log("Records: " + JSON.stringify(records));
    fs.writeFileSync(global.hierafile, write);
/*    fs.writeFile(global.hierafile, write, function(err) {
      if(err) {
        return console.log(err);
      }
    })
*/    

    newdata = fs.readFileSync(global.hierafile).toString().split("\n");
    //console.log("New data: " + newdata);

    for (var i = 0, len = records.length; i < len; i++) {
      linenr = (records[i].linenr - 1);
      //console.log("Linenr: " + linenr);
      text = (records[i].text);
      //console.log("Text: " + text);
      newdata.splice(linenr, 0, text);
      var file_contents = newdata.join("\n");
    }
 
    //console.log("file_contents: " + file_contents);
    if ( get_comments.indexOf('#') > -1 ) {
      console.log("There are comments to inject.");
      try {
          var close = fs.writeFileSync(global.hierafile, file_contents);
        } catch(e) {
          console.log(e);
        };
    }
    console.log("The file was saved! Changed value '" + oldvalue + "' to '" + q + "' for variable '" + p + "'.");
  }
};
