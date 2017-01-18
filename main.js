require('shelljs/global');

var hierafile = "/etc/puppet/hieradata/production/common.yaml";

var https = require('https');
var express = require('express');
var app = express();
var objectPath = require('object-path');

const yaml = require('js-yaml');
const fs = require('fs');

try {
    var config = yaml.safeLoad(fs.readFileSync(hierafile, 'utf8'));
} catch (e) {
    console.log(e);
}

app.get('/', function(req, res) {
  res.type('text/plain'); // set content-type
  res.send('This a yaml config files update application\n'); // send text response
});

app.get('/:param/:value', function(req, res) {
var p = req.params.param;
var q = req.params.value;
var resp = "Setting parameter \"" + p + "\" with value of \"" + q + "\"\n";

var value = p;
oldvalue = objectPath.get(config, value);
//console.log('Old value: ' + oldvalue);

newvalue = objectPath.set(config, value, q);

//console.log(config);

try {
    const write = yaml.safeDump(config);
//    console.log(write);
    fs.writeFile(hierafile, write, function(err) {
      if(err) {
        return console.log(err);
      }
    console.log("The file was saved!");
    });
} catch (e) {
    console.log(e);
}

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

res.send(resp);

});

https.createServer({
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
}, app).listen(4433);

//app.listen(process.env.PORT || 8088);
