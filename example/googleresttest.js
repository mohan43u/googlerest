var fs = require('fs');
var url = require('url');
var http = require('http');
var GoogleRest = require('../lib/googlerest');

var dbfilename = 'googlerest.js.db';
try { var google_tokens = JSON.parse(fs.readFileSync(dbfilename)).google_tokens; } catch(e) {}
var googlerest = new GoogleRest({'google_tokens': google_tokens});

var server = http.createServer(function(req, res) {
    var pathname = url.parse(req.url).pathname;

    console.log(pathname);

    if(pathname.match("/google/authorize$")) {
	googlerest.authorize(req, function(response){
	    this.writeHead(response.statusCode, response.headers);
	    response.pipe(this);
	}.bind(res));
    }
    else if(pathname.match("/google/authorized$")) {
	delete req.headers['accept-encoding'];
	googlerest.get_access_token(req, function(res, dbfilename, response) {
	    if(response.error) {
		res.end(JSON.stringify(response));
	    }
	    else if(response.statusCode != 200) {
		res.writeHead(response.statusCode, response.headers);
		response.pipe(res);
	    }
	    else {
		var body = [];
		response.on('data', function(chunk) {
		    this.push(chunk);
		}.bind(body));
		response.on('end', function(res, body, dbfilename) {
		    var tokens = JSON.parse(Buffer.concat(body).toString());
		    if(this.google_tokens) {
			for(var k in tokens) {
			    this.google_tokens[k] = tokens[k]
			}
		    }
		    else {
			this.google_tokens = tokens;
		    }
		    fs.writeFile(dbfilename, JSON.stringify({'google_tokens': this.google_tokens}));
		    res.end(JSON.stringify({'oauth2': 'authorized'}));
		}.bind(this, res, body, dbfilename));
	    }
	}.bind(googlerest, res, dbfilename));
    }
    else if(pathname.match("/google")) {
	if(!googlerest.google_tokens) {
	    var redirect_url = new url.Url();
	    redirect_url.pathname = '/google/authorize';
	    res.writeHead(303, {
		'Location': url.format(redirect_url)
	    });
	    res.end();
	}
	else {
	    var gurl = url.parse(req.url, true);
	    gurl.pathname = pathname.substring(pathname.indexOf('/', 1));
	    delete gurl.protocol;
	    delete gurl.host;
	    req.url = url.format(gurl);
	    googlerest.call_google(req, null, function(response){
		this.writeHead(response.statusCode, response.headers);
		response.pipe(this);
	    }.bind(res));
	}
    }
    else {
	res.end('nothing here!!');
    }
}).listen(3000);
