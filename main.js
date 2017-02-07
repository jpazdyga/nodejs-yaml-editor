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
Construct response for an empty request
*/

app.get('/', function(req, res) {
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

global.hierafile = "/etc/puppet/hieradata/production/" + h + ".yaml";
try {
    var config = yaml.safeLoad(fs.readFileSync(global.hierafile, 'utf8'));
} catch (e) {
    console.log(e);
};

if (p.split('.').length - 1 > 1){

  var result = exec('echo ' + p, {silent:true}).exec('awk -F. \'{print $1, substr($2,2)}\' FPAT=\'(^[^.]+)|([.].*)\'', {silent:true}).exec('sed \'s/\\(.*\\)\\./\\1 /\'', {silent:true}).exec('tr -d "\n"', {silent:true});
  var result1 = exec('echo ' + result, {silent:true}).exec('awk \'{print $1}\'', {silent:true}).exec('tr -d "\n"', {silent:true});
  var result2 = exec('echo ' + result, {silent:true}).exec('awk \'{print $2}\'', {silent:true}).exec('tr -d "\n"', {silent:true});
  var result3 = exec('echo ' + result, {silent:true}).exec('awk \'{print $3}\'', {silent:true}).exec('tr -d "\n"', {silent:true});

  oldvalue = objectPath.get(config, [result1, result2, result3]);
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
    var search = exec('find /etc/puppet/hieradata/ -name \"*.yaml\" -exec grep -H \"' + pattern + '\" {} \\;', {silent:true,timeout:5000}).exec('awk -F: \'{print $1}\'', {silent:true,timeout:5000}).exec('tail -1', {silent:true,timeout:5000}).exec('tr -d "\n"', {silent:true,timeout:5000});
    if (search) {
      oldvalue="No such parameter found.";
    };

    hierafile = search.stdout;
    console.log("Hierafile: " + hierafile);
    try {
      var config = yaml.safeLoad(fs.readFileSync(hierafile, 'utf8'));
    } catch (e) {
      console.log(e);
    };
    oldvalue = objectPath.get(config, [result1, result2, result3]);
    var h = search.stdout;
  }
}
else
{
  var result = p;
  oldvalue = objectPath.get(config, [result]);
  
  var h = hierafile
  console.log("hierafile: " + h);

  console.log("Oldvalue:" + oldvalue );

  if ( oldvalue == null || typeof oldvalue == 'undefined' ) {
    var owner = 0;
    var search = exec('find /etc/puppet/hieradata/ -name \"*.yaml\" -exec grep -H \"' + result + '\" {} \\;', {silent:true,timeout:5000}).exec('awk -F: \'{print $1}\'', {silent:true,timeout:5000}).exec('tr -d "\n"', {silent:true,timeout:5000});
    if (search) {
      oldvalue="No such parameter found.";
    };
    var h = search.stdout;
    console.log("search.stdout: " + h);
    try {
      var config = yaml.safeLoad(fs.readFileSync(h, 'utf8'));
    } catch (e) {
      console.log(e);
    };
    oldvalue = objectPath.get(config, [result]);
    var h = search.stdout;
  }
}

console.log("Responding with the existing value '" + oldvalue + "' for variable '" + p + "'" + " in path " + h + ".");
if (pattern) {
  p = pattern;
}
console.log("H: " + h);
console.log("P: " + p);
try {
  var predesc = exec('grep -B1 \"' + p + '\" ' + h, {silent:true,timeout:5000}).exec('grep \"^#\"', {silent:true,timeout:5000}).exec('egrep -v \"^' + p + '*:*\"', {silent:true,timeout:5000});
} catch(e) {
  console.log(e);
};
console.log("Predesc:" + predesc);
if (predesc) {
  var predescription = predesc.split("#");
  var description = predescription[1];
};

if ( description == null || typeof description == 'undefined' ) {
  var description = "No description available.";
};

var j = {dependency:[], found:[{"backend":"YAML","path":h,"url":""}],"variable":p,"value":oldvalue,"description":description,"owner":owner};
//console.log("J: " + JSON.stringify(j));
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
content = JSON.parse(stringify);
console.log("content: " + content);

var hostgroup = data.hostgroup;

var filtered_keys = function(obj, filter) {
  var key, keys = [];
  for (key in obj) {
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

console.log("to_send: " + to_send + " length: " + to_send.length);
a=0;
for (var a = 0, len = to_send.length; a < len; a++) {
  var fixedvariable = exec('echo ' + to_send[a], {silent:true}).exec('sed "s/hostgroup_value_//g"', {silent:true}).exec('cut -d: -f1', {silent:true}).exec('tr -d "\n"', {silent:true});
  var fixedvalue = exec('echo ' + to_send[a], {silent:true}).exec('sed "s/hostgroup_value_//g"', {silent:true}).exec('cut -d: -f2', {silent:true}).exec('tr -d "\n"', {silent:true});
//  console.log("Fvar: " + fixedvariable + " Fval: " + fixedvalue + " HG: " + hostgroup);
  updateval.fn_change_values(fixedvariable, fixedvalue, hostgroup);
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

global.hierafile = "/etc/puppet/hieradata/production/" + preh + ".yaml";

var h = global.hierafile

console.log("Hierafile: " + h);

  if (h) {
    h = global.hierafile;
  }
  try {
    var config = yaml.safeLoad(fs.readFileSync(h, 'utf8'));
  } catch (e) {
    console.log(e);
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
      console.log("There are comments to inject.");
      try {
          var close = fs.writeFileSync(global.hierafile, file_contents);
        } catch(e) {
          console.log(e);
        };
    }
  
    console.log("The file was saved! Changed value '" + oldvalue + "' to '" + q + "' for variable '" + p + "'.");
  });
} catch(e) {
    console.log(e);
}

var resp = oldvalue;

res.send(resp);

});

var json_vlist = vlist.fn_json_allvars();

app.get('/list_hiera', function(req, res) {
  console.log("Getting the list of existing hiera variables.");
  console.log("Data returned: " + json_vlist);
  res.send(json_vlist);
});

console.log("Starting http server...");

https.createServer({
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
}, app).listen(4433);

console.log("Up and running.");
