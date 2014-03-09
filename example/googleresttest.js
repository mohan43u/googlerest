var fs = require('fs');
var os = require('os');
var url = require('url');
var http = require('http');
var path = require('path');
var GoogleRest = require('../lib/googlerest');
var querystring = require('querystring');
var DuplexBufferStream = require('duplexbufferstream');

var dbfilename = 'googlerest.js.db';
try { var google_access_token = JSON.parse(fs.readFileSync(dbfilename)).google_access_token; } catch(e) {}
var googlerest = new GoogleRest({'google_access_token': google_access_token});

var server = http.createServer(function(req, res) {
    var pathname = url.parse(req.url).pathname;
    var apiresult = new DuplexBufferStream();

    console.log(pathname);

    if(pathname.match("/google/authorize$")) {
	apiresult.pipe(res);
	googlerest.authorize(req, apiresult);
    }
    else if(pathname.match("/google/authorized$")) {
	apiresult.on('finish', function(res, apiresult) {
	    var apiresultbuf = apiresult.read();
	    google_access_token = JSON.parse(apiresultbuf.toString()).google_access_token;
	    if(google_access_token) {
		fs.writeFileSync(dbfilename, JSON.stringify({'google_access_token': google_access_token}));
		res.end(JSON.stringify({'oauth2': 'authorized'}));
	    }
	    else {
		res.end(apiresultbuf.toString());
	    }
	}.bind(this, res, apiresult));
	googlerest.get_access_token(req, apiresult);
    }
    else if(pathname.match("/google")) {
	if(!googlerest.google_access_token) {
	    var redirect_url = new url.Url();
	    redirect_url.pathname = '/google/authorize';
	    res.writeHead(303, {
		'Location': url.format(redirect_url)
	    });
	    res.end();
	}
	else {
	    pathname = pathname.substring(pathname.indexOf('/', 1));
	    apiresult.pipe(res);
	    if(req.method == 'POST') {
		var data = new DuplexBufferStream();
		req.pipe(data);
		data.on('finish', function(data, req, apiresult, pathname) {
		    options = querystring.parse(data.read().toString());
		    googlerest.call_google(req, apiresult, pathname, options);
		}.bind(this, data, req, apiresult, pathname));
	    }
	    else {
		options = querystring.parse(url.parse(req.url).query);
		googlerest.call_google(req, apiresult, pathname, options);
	    }
	}
    }
    else {
	res.end('nothing here!!');
    }
}).listen(3000);
