require('shelljs/global');

var logfile = "/var/log/foreman-hiera.log";

var parse = require('csv-parse/lib/sync');
var https = require('https');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var objectPath = require('object-path');

var yaml = require('js-yaml');
var fs = require('fs');
var p;

module.exports = {

  fn_change_values: function (variable, value, hostgroup, user) {
    var preh = hostgroup;
    var p = variable;
    var q = value;

    global.hierafile = "/etc/puppet/hieradata/production/" + preh + ".yaml";
//    console.log("Global hierafile: " + global.hierafile);

    if(p instanceof Object) {
      p = JSON.stringify(p);
//      console.log("P after conversion to string: " + p);
      var prevariablename = exec('grep -w \"' + p + '\" ' + global.hierafile, {silent:true});
//      console.log("Prevariablename: " + prevariablename.stdout + " type of prevariablename: " + typeof prevariablename.stdout);
      if(prevariablename.stdout) {
        var variablename = exec('echo ' + prevariablename.stdout, {silent:true}).exec('awk -F: \'{print $1}\'', {silent:true}).exec('tr -d "\n"', {silent:true});
//        console.log("Dotted variablename found: " + variablename + ", Value: " + q);
        var p = variablename;
      }
    }

//    console.log("Module has variables:" + p + ", Type of 'p': " + typeof p + ", Value: " + q + ", Hostgroup: " + preh);

    var h = global.hierafile

    //console.log("Hierafile: " + h);

    if (h) {
      h = global.hierafile;
    }
    try {
      var config = yaml.safeLoad(fs.readFileSync(h, 'utf8'));
      //console.log(config);
    } catch (e) {
      console.log(e);
    };
  
    if(global.hierafile.indexOf('#') > -1) {
      var get_comments = exec('grep -in \"^#\" ' + global.hierafile, {silent:true}).exec('grep .', {silent:true});
    }
//    console.log('get_comments_1:' + get_comments + "Typeof getcomments: " + typeof get_comments);
//    console.log("variablename: " + variablename + "type of variablename: " + typeof variablename);
    if (p.split('.').length - 1 > 1 && !(variablename)){
//      console.log("Multidotted variable detected");
      var result = exec('echo ' + p, {silent:true}).exec('awk -F. \'{print $1, substr($2,2)}\' FPAT=\'(^[^.]+)|([.].*)\'', {silent:true}).exec('sed \'s/\\(.*\\)\\./\\1 /\'', {silent:true}).exec('tr -d "\n"', {silent:true});
  
      var result1 = exec('echo ' + result, {silent:true}).exec('awk \'{print $1}\'', {silent:true}).exec('tr -d "\n"', {silent:true});
      var result2 = exec('echo ' + result, {silent:true}).exec('awk \'{print $2}\'', {silent:true}).exec('tr -d "\n"', {silent:true});
      var result3 = exec('echo ' + result, {silent:true}).exec('awk \'{print $3}\'', {silent:true}).exec('tr -d "\n"', {silent:true});
  
//      console.log("Result1: " + result1 + ", Result 2: " + result2 + ", Result 3: " + result3);

      oldvalue = objectPath.get(config, [result1, result2, result3]);
      newvalue = objectPath.set(config, [result1, result2, result3], q);
    }
    else if (p.split('.').length - 1 == 1 && !(variablename)) 
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
//      console.log("w ogole: " + p.split('.').length + "Config: " + JSON.stringify(config));
      var result = p;
      oldvalue = objectPath.get(config, [result]);
      newvalue = objectPath.set(config, [result], q);
      //console.log("OLD: " + oldvalue + " NEW: " + newvalue);
    }

    var desc_array = [];
    var prerecords;
    //console.log("Config: " + JSON.stringify(config));
    var write = yaml.safeDump(config);
//    console.log("Data to write: " + write);
    var data = fs.readFileSync(global.hierafile);
//    console.log("Old file content: " + data);
    if (get_comments) {
      var comments = get_comments.toString().split("\n");
      //var data = comments;
      for (i in comments) {
        var line = comments[i];
        console.log("Comments Line:" + line);
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
//    console.log("New data: " + newdata);

    for (var i = 0, len = records.length; i < len; i++) {
      linenr = (records[i].linenr - 1);
      //console.log("Linenr: " + linenr);
      text = (records[i].text);
      //console.log("Text: " + text);
      newdata.splice(linenr, 0, text);
      var file_contents = newdata.join("\n");
    }
 
    //console.log("file_contents: " + file_contents);
//    if ( get_comments.indexOf('#') > -1 || get_comments instanceof null ) {
    if (get_comments) {
      if (get_comments.indexOf('#') > -1 ) {
//      console.log("There are comments to inject.");
      try {
          var close = fs.writeFileSync(global.hierafile, file_contents);
        } catch(e) {
          console.log(e);
        };
      }
    }

    logmsg = Date().toString() + ": " + user + ": The file was saved! Changed value: '" + oldvalue + "' to: '" + q + "' for variable: '" + p + "' in: '" + global.hierafile + "'\n";

    fs.appendFile(logfile, logmsg, function(err) {
      if(err) {
        return console.log(err);
      }
    });
  }
};
