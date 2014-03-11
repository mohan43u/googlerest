var fs = require('fs');
var os = require('os');
var url = require('url');
var http = require('http');
var path = require('path');
var GoogleRest = require('../lib/googlerest');
var querystring = require('querystring');
var DuplexBufferStream = require('duplexbufferstream');

var dbfilename = 'googlerest.js.db';
try { var google_tokens = JSON.parse(fs.readFileSync(dbfilename)).google_tokens; } catch(e) {}
var googlerest = new GoogleRest({'google_tokens': google_tokens});

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
	    var tokens = JSON.parse(apiresultbuf.toString()).google_tokens;
	    if(tokens) {
		var expire = new Date();
		expire.setSeconds(expire.getSeconds() + (tokens.expires_in - (60 * 5)));
		tokens.expires_in = expire;
		if(google_tokens && google_tokens.refresh_token) tokens.refresh_token = google_tokens.refresh_token;
		fs.writeFile(dbfilename, JSON.stringify({'google_tokens': tokens}));
		res.end(JSON.stringify({'oauth2': 'authorized'}));
	    }
	    else {
		res.end(apiresultbuf.toString());
	    }
	}.bind(this, res, apiresult));
	googlerest.get_access_token(req, apiresult);
    }
    else if(pathname.match("/google")) {
	if(!googlerest.google_tokens) {
	    var redirect_url = new url.Url();
	    redirect_url.pathname = '/google/authorize';
	    redirect_url.query = {'access_type': 'offline'};
	    res.writeHead(303, {
		'Location': url.format(redirect_url)
	    });
	    res.end();
	}
	else if(Date.parse(googlerest.google_tokens.expires_in) < Date.parse(new Date())) {
	    var redirect_url = new url.Url();
	    if(googlerest.google_tokens.refresh_token) {
		redirect_url.pathname = '/google/authorized';
		redirect_url.query = {'refresh_token': googlerest.google_tokens.refresh_token};
	    }
	    else {
		redirect_url.query = {'access_type': 'offline'};
		redirect_url.pathname = '/google/authorize';
	    }
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
		options = url.parse(req.url, true).query;
		googlerest.call_google(req, apiresult, pathname, options);
	    }
	}
    }
    else {
	res.end('nothing here!!');
    }
}).listen(3000);
