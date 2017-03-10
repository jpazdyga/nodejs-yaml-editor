require('shelljs/global');

var https_port = 4433;
var logfile = "/var/log/foreman-hiera.log";

var findInFiles = require('find-in-files');
var complexvals = require('./complexvals.js');
var updateval = require('./updatevalues.js');
var vlist = require('./variables.js');
var parse = require('csv-parse/lib/sync');
var https = require('https');
var express = require('express');
var app = express();
var bodyParser = require('body-parser')
var objectPath = require('object-path');

var desc_array  = [];
var array = false;
var presearch = [];
var environment = "production";
var pts = "/etc/puppet/hieradata/" + environment;
global.hierafile;
global.user;

app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

var yaml = require('js-yaml');
var fs = require('fs');

app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

/*
List existing variables
*/

app.post('/list_hiera', function(req, res) {
  var data = req.body;

//  console.log("Body: " + JSON.stringify(data));
  h = data.hostgroup;
  global.user = data.user;
  hg = h.split('/',2);
  hg_str = hg.toString();
  var hg_scope = hg_str.replace(/,/g, "/");
//  console.log("Hostgroup: " + hg_scope);
  //console.log("json_vlist that should be empty: " + JSON.stringify(json_vlist));
  var json_vlist = vlist.fn_json_allvars(hg_scope);

  logmsg = Date().toString() + ": " + user + ": Getting the list of existing hiera variables\n";
  fs.appendFile(logfile, logmsg, function(err) {
    if(err) {
      return console.log(err);
    }
  });
  //console.log(Date().toString() + ": " + user + ": Getting the list of existing hiera variables.");
  //console.log("Data returned: " + json_vlist);
  res.send(json_vlist);
});

/*
Construct response for an empty request
*/

app.post('/', function(req, res) {
  res.type('text/plain'); // set content-type
  res.send('This a yaml config files update application\n'); // send text response
});

/*
Construct response for existing value request
*/

app.post('/:param', function(req, res) {

//var lockfile = exec('touch /tmp/foreman_hiera_plugin_nodejs.lock', {silent:true});


var h = req.body.hostgroup;
var p = req.params.param;
var owner = 1;

global.hierafile = "/etc/puppet/hieradata/" + environment + "/" + h + ".yaml";
//console.log("Global hierafile: " + global.hierafile);

hg = h.split('/',2);
hg_str = hg.toString();
var hg_scope = hg_str.replace(/,/g, "/");
//console.log("Hostgroup: " + hg_scope);

var pathtosearch = pts + "/" + hg_scope;

try {
    var config = yaml.safeLoad(fs.readFileSync(global.hierafile, 'utf8'));
} catch (e) {
    console.log("First file open error: " +e);
};

if (p.split('.').length - 1 > 999){

  var result = exec('echo ' + p, {silent:true}).exec('awk -F. \'{print $1, substr($2,2)}\' FPAT=\'(^[^.]+)|([.].*)\'', {silent:true}).exec('sed \'s/\\(.*\\)\\./\\1 /\'', {silent:true}).exec('tr -d "\n"', {silent:true});
  var result1 = exec('echo ' + result, {silent:true}).exec('awk \'{print $1}\'', {silent:true}).exec('tr -d "\n"', {silent:true});
  var result2 = exec('echo ' + result, {silent:true}).exec('awk \'{print $2}\'', {silent:true}).exec('tr -d "\n"', {silent:true});
  var result3 = exec('echo ' + result, {silent:true}).exec('awk \'{print $3}\'', {silent:true}).exec('tr -d "\n"', {silent:true});

//  console.log("Parts. Result:" + result + "Result1: " + result1 + "Result2: " + result2 + "Result3: " + result3);

  try {
    oldvalue = objectPath.get(config, [result1, result2, result3]);
  } catch(e) {
    console.log(e);
};

//  console.log("With multiple dots: " + oldvalue);
//  oldvalue = "Test!";
  //var h = global.hierafile
  if ( oldvalue == null || typeof oldvalue == 'undefined' ) {
    var owner = 0;
    dots = p.indexOf('.') !== -1;
    if ( dots == true ) {
      //var pattern = exec('echo ' + p, {silent:true}).exec('awk -F\'.\' \"{print $1}\"', {silent:true});
      var splitted = p.split(".");
      var pattern = splitted[0];
    }
    else
    {
      var pattern = p;
    }
//    var search = exec('find /etc/puppet/hieradata/' + environment + ' -type f -name \"*.yaml\" -exec grep -H -w \"' + pattern + '\" {} \\;', {silent:true,timeout:5000}).exec('awk -F: \'{print $1}\'', {silent:true,timeout:5000}).exec('tail -1', {silent:true,timeout:5000}).exec('sort', {silent:true,timeout:5000}).exec('head -1', {silent:true,timeout:5000}).exec('tr -d "\n"', {silent:true,timeout:5000});


    findInFiles.find(result, pathtosearch, '.yaml$')
      .then(function(returned) {
        var presearch = [];
        for (var onereturned in returned) {
            var res = returned[onereturned];
            console.log(
                'found "' + res.matches[0] + '" ' + res.count
                + ' times in "' + onereturned + '"'
            );
            presearch.push(onereturned);
        }
      });

    var search = presearch.slice(-1)[0];
//    console.log("Searched: " + search);


    if (search) {
      oldvalue="No such parameter found.";
    };

//    hierafile = search.stdout;
    hierafile = newsearch;
//    console.log("Hierafile: " + hierafile);
    try {
      var config = yaml.safeLoad(fs.readFileSync(hierafile, 'utf8'));
    } catch (e) {
      console.log("Second file open error: " + e);
    };
    oldvalue = objectPath.get(config, [result1, result2, result3]);
    var h = search.stdout;
    var h = newsearch;
  }
}
else
{
  var result = p;
//  console.log("config: " + JSON.stringify(config));
//  console.log("result: " + result);
  oldvalue = objectPath.get(config, [result]);
//  console.log("Oldvalue: " + oldvalue);
//  console.log("Typeof oldvalue: " + typeof oldvalue);
  var h = hierafile
//  console.log("hierafile: " + h);

//  console.log("Not searched value (simplevariable): " + oldvalue );

  if ( oldvalue === null || typeof oldvalue === 'undefined' ) {
    var owner = 0;
    //var search = exec('find /etc/puppet/hieradata/' + environment + ' -type f -name \"*.yaml\" -exec grep -H -w \"' + result + '\" {} \\;', {silent:true,timeout:5000}).exec('awk -F: \'{print $1}\'', {silent:true,timeout:5000}).exec('sort', {silent:true,timeout:5000}).exec('head -1', {silent:true,timeout:5000}).exec('tr -d "\n"', {silent:true,timeout:5000});

//    console.log("Regexp: " + result + ", pathtosearch: " + pathtosearch);


    findInFiles.find(result, pathtosearch, '.yaml$')
      .then(function(sereturned) {
//      presearch.length = 0;
        for (var onereturned in sereturned) {
            var res = sereturned[onereturned];
//            console.log(
//                'found "' + res.matches[0] + '" ' + res.count
//                + ' times in "' + onereturned + '"'
//            );
            //console.log("New Presearch: " + presearch);
            presearch.push(onereturned);
        }
      });
    
    if(presearch) {
      var newsearch = presearch.slice(-1)[0];
    }

    if(typeof newsearch === 'undefined') {
//      console.log("Newsearch returned nothing valuable. Using grep method.");
//      console.log("Pathtosearch: " + pathtosearch + ", Result: " + result);
      var presearch = exec('find ' + pathtosearch + ' -type f -name \"*.yaml\" -exec grep -H -w \"' + result + '\" {} \\;', {silent:true});
//      console.log("Presearch: " + presearch);
//.exec('awk -F: \'{print $1}\'', {silent:true,timeout:100});
//.exec('sort', {silent:true,timeout:100});
//.exec('head -1', {silent:true,timeout:100})
//.exec('tr -d "\n"', {silent:true,timeout:100});
      var apresearch = presearch.replace(/^\n/, "")
//      console.log("apresearch result: " + apresearch);
      var searcharr = apresearch.split("\n");
      var element = searcharr.length - 2;
//      console.log("Array length: " + element);
      var search = searcharr[element].split(":")[0];
//      console.log("search result: " + search);
      var newsearch = search;
    }

    if (search) {
      oldvalue="No such parameter found.";
    };
//    var h = search.stdout;
    var h = newsearch;
//    console.log("H newsearch: " + h);
//.exec('sort', {silent:true,timeout:5000}).exec('head -1', {silent:true,timeout:5000});
//    console.log("Type of h (before conversion): " + typeof h);
    if(h instanceof Object) {
      h = h.toString();
    }
//    console.log("This, search path: " + h);
//    console.log("Type of h (after conversion): " + typeof h);
  }

//console.log("H before problematic open: " + h);
    try {
      var config = yaml.safeLoad(fs.readFileSync(h, 'utf8'));
//      console.log("Json dump of configfile: " + JSON.stringify(config));
    } catch (e) {
      console.log("Third file open error: " + e);
    };
//    console.log("Config: " + JSON.stringify(config));
    oldvalue = objectPath.get(config, [result]);
//    console.log("From search oldvalue: " + oldvalue);
//    console.log("From search oldvalue type: " + typeof oldvalue);
    if(oldvalue instanceof Object) {
      oldvalue = "Value is an object!";
//      console.log("Old value: " + oldvalue);
      var complexvar = complexvals.fn_json_complexvars(h, p);
      if(Array.isArray(complexvar)) {
        var array = true;
//        console.log("This is an array " + typeof complexvar);
//        for(g=0,len=complexvar.length;g<len;g++) {
//          console.log("Responding with the existing value '" + complexvar[g] + "' for variable '" + p + "'" + " in path " + h + ".");
//        }
      }
      if(complexvar instanceof Object) {
        lkeys = Object.keys(complexvar);
//        console.log("all complexvar's keys: " + lkeys);
//        if(lkeys instanceof Object) {
//          console.log("complexvar object's dump: " + JSON.stringify(complexvar));
//          console.log("lkeys object's dump: " + JSON.stringify(lkeys));
//        }
        for(z=0,len=lkeys.length;z<len;z++) {
          lkey = lkeys[z];
//          console.log("Json dump of complexvar: " + JSON.stringify(complexvar));
//          console.log("Typeof response: " + typeof complexvar[lkey]);
          if(!(complexvar[lkey] instanceof Object)) {

          logmsg = Date().toString() + ": " + global.user + ": Responding (for object) with the existing value: '" + complexvar[lkey] + "' for variable: '" + lkey + "'" + " in path: " + h + "\n";

          fs.appendFile(logfile, logmsg, function(err) {
            if(err) {
              return console.log(err);
            } 
          });
            var h = h;
          } else {
//            console.log("Typeof response: " + typeof complexvar[lkey]);
          }
        }
      }
    } else {
//      console.log("Value is not an object");
      var complexvar = oldvalue;
      oldvalue = complexvar;
    }
    oldvalue = complexvar;
    //var h = search.stdout;
    //var h = newsearch;
  //}
}

logmsg = Date().toString() + ": " + global.user + ": Responding (without searching) with the existing value: '" + oldvalue + "' for variable: '" + p + "'" + " in path: " + h + "\n";

fs.appendFile(logfile, logmsg, function(err) {
  if(err) {
    return console.log(err);
  }
});
//console.log(Date().toString() + ": " + global.user + ": Responding (without searching) with the existing value '" + oldvalue + "' for variable '" + p + "'" + " in path " + h + ".");
if (pattern) {
  p = pattern;
}
//console.log("H: " + h);
//console.log("P: " + p);
//var predesc = exec('grep -B1 \"' + p + '\" ' + h, {silent:true,timeout:100});
var predesc = exec('grep -B1 \"' + p + '\" ' + h, {silent:true});
//.exec('grep \"^#\"', {silent:true,timeout:100}).exec('egrep -v \"^' + p + '*:*\"', {silent:true,timeout:100});

//console.log("Typeof predesc: " + typeof predesc + ", predesc content: " + predesc);



//var predesc = "#Test.";
if (predesc) {
//  console.log("Predesc is defined");
  var bpredesc = predesc.match(/^#.*$/gm);
  if(bpredesc) {
    var apredesc = bpredesc.toString();
//    console.log("Apredesc: " + typeof apredesc);
    var predescription = apredesc.split("#");
    var description = predescription[1];
  }
};

if ( description == null || typeof description == 'undefined' ) {
  var description = "No description available.";
};

//console.log("Predescription: " + description);

//console.log("Type of complexvar: " + typeof complexvar + ", Type of oldvalue: " + typeof oldvalue + ", Oldvalue dump: " + JSON.stringify(oldvalue) + array);

if(array === true) {
//  console.log("Array's true");
  var j = {"array":true,"object":true,dependency:[], found:[{"backend":"YAML","path":h,"url":""}],"variable":p,"value":oldvalue,"description":description,"owner":owner};
} else if(oldvalue instanceof Object) {
//  console.log("Object's true , location: " + h);
  var j = {"object":true,dependency:[], found:[{"path":h,"backend":"YAML","url":""}],"variable":p,"value":oldvalue,"description":description,"owner":owner};
} else {
//  console.log("Not an array nor Object");
  var j = {dependency:[], found:[{"backend":"YAML","path":h,"url":""}],"variable":p,"value":oldvalue,"description":description,"owner":owner};
}
//console.log("Sent JSON: " + JSON.stringify(j));
global.hierafile = h;

res.send(j);
//delete pattern;
//delete h;
});


/*
Construct response for value change request - post_variables
*/

app.post('/post/the/variables', function(req, res) {

// Debug the whole request:
var data = req.body;

var stringify = JSON.stringify(data)
//content = JSON.parse(stringify);
content = stringify;
//console.log("content: " + content);

var hostgroup = data.hostgroup;

var filtered_keys = function(obj, filter) {
  var key, keys = [];
  for (key in obj) {
//    console.log("Key to be pushed: " + key);
    if (obj.hasOwnProperty(key) && filter.test(key)) {
      keys.push(key);
    }
  }
  return keys;
}

var filteredNames = filtered_keys(data, /value/);
var to_send = [];

for(var i in filteredNames) {
  var variable = filteredNames[i];
  var value = data[variable];
  to_send.push(variable + ":\"" + value + "\"");
}

//console.log("to_send: " + to_send + " length: " + to_send.length);
a=0;
for (var a = 0, len = to_send.length; a < len; a++) {
  var fixedvariable = exec('echo ' + to_send[a], {silent:true}).exec('sed "s/hostgroup_value_//g"', {silent:true}).exec('awk -F: \'{$NF=""; print $0}\'', {silent:true}).exec('sed \'s/ *$//\'', {silent:true}).exec('sed \'s/ /:/g\'', {silent:true}).exec('tr -d "\n"', {silent:true});
  var fixedvalue = exec('echo ' + to_send[a], {silent:true}).exec('sed "s/hostgroup_value_//g"', {silent:true}).exec('awk -F: \'{print $NF}\'', {silent:true}).exec('tr -d "\n"', {silent:true});
//  console.log("Main.js module: Before fixed variable: " + to_send[a] + ", Fvar: " + fixedvariable + " Fval: " + fixedvalue + " HG: " + hostgroup);
  updateval.fn_change_values(fixedvariable, fixedvalue, hostgroup, global.user);
  }

var resp = "200 OK";

res.send(resp);

});

/*
Construct response for value change request
*/

app.post('/:param/:value', function(req, res) {

// Debug the whole request:
// console.log(res.send(JSON.stringify(req.body, null, 4)));

var preh = req.body.hostgroup;
var p = req.params.param;
var q = req.params.value;

global.hierafile = "/etc/puppet/hieradata/' + environment + '/" + preh + ".yaml";

var h = global.hierafile

//console.log("Hierafile: " + h);

  if (h) {
    h = global.hierafile;
  }
  try {
    var config = yaml.safeLoad(fs.readFileSync(h, 'utf8'));
  } catch (e) {
    console.log("Fourth file open error" + e);
  };

var get_comments = exec('grep -in \"^#\" ' + global.hierafile, {silent:true,timeout:5000}).exec('grep .', {silent:true,timeout:5000});
console.log('get_comments_1:' + get_comments);

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
  var result = p;
  oldvalue = objectPath.get(config, result);
  newvalue = objectPath.set(config, result, q);
}

try {
  var desc_array = [];
  var prerecords;
  var write = yaml.safeDump(config);
  //console.log("Data to write: " + write);
  fs.writeFile(global.hierafile, write, function(err) {
    if(err) {
      return console.log(err);
    }
    
    var data = fs.readFileSync(global.hierafile).toString().split("\n");
    //console.log("Data:" + data);
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
    //console.log("Is array: " + Array.isArray(desc_array));
 
    var prerecords = desc_array.join("");

    //console.log("Prerecords: " + prerecords);

    var records = parse(prerecords, {delimiter:':', rowDelimiter: '\n', columns:['linenr', 'text']});

    //console.log("Records: " + records);

    for (var i = 0, len = records.length; i < len; i++) {
      linenr = (records[i].linenr - 1);
      //console.log("Linenr: " + linenr);
      text = (records[i].text);
      //console.log("Text: " + text);
      data.splice(linenr, 0, text);
      //console.log("Test: " + test);
      var file_contents = data.join("\n");
    }

    //console.log("file_contents: " + file_contents);

    if ( get_comments.indexOf('#') > -1 ) {
      //console.log("There are comments to inject.");
      try {
          var close = fs.writeFileSync(global.hierafile, file_contents);
        } catch(e) {
          console.log(e);
        };
    }
    logmsg = Date().toString() + ": " + global.user + ": The file was saved! Changed value: '" + oldvalue + "' to: '" + q + "' for variable: '" + p + "' in: " + global.hierafile  + "\n";
    fs.appendFile(logfile, logmsg, function(err) {
      if(err) {
        return console.log(err);
      }
    });
    //console.log(Date().toString() + ": " + global.user + ": The file was saved! Changed value '" + oldvalue + "' to '" + q + "' for variable '" + p + "'.");
  });
} catch(e) {
    console.log(e);
}

var resp = oldvalue;

res.send(resp);

});

//var json_vlist = vlist.fn_json_allvars();
/*
app.get('/list_hiera', function(req, res) {
  var json_vlist = vlist.fn_json_allvars();
  console.log("Getting the list of existing hiera variables.");
  //console.log("Data returned: " + json_vlist);
  res.send(json_vlist);
});
*/

console.log("Starting http server...");

https.createServer({
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
}, app).listen(https_port);

var d = new Date();

logmsg = d.toString() + ": Up and listening on tcp/" + https_port + "\n";

fs.appendFile(logfile, logmsg, function(err) {
  if(err) {
    return console.log(err);
  }
});

console.log(d.toString() + ": Up and listening on tcp/" + https_port);

process.on('SIGINT', function() {
  var d = new Date();
  logmsg = d.toString() + ": Caught interrupt signal, exiting...\n---\n";
  fs.appendFileSync(logfile, logmsg);
  process.exit();
});
