var fs = require('fs');
var url = require('url');
var http = require('http');
var https = require('https');
var tunnel = require('tunnel');
var stream = require('stream');
var querystring = require('querystring');

var GoogleRest = function(options) {
    this.google_client_id = options.google_client_id || '137500406659-v4365ts5blt936179guq1qei9faf8e7f.apps.googleusercontent.com';
    this.google_client_secret = options.google_client_secret || 'g2__d6KZiznbqW4h8wa2frG2';
    this.google_redirect_uri = options.google_redirect_uri || 'http://127.0.0.1:3000/google/authorized';
    this.google_scope = options.google_scope || 'https://www.googleapis.com/auth/drive';
    this.google_tokens = options.google_tokens || null;
    this.google_protocol = options.google_protocol || 'https';
    this.google_apis_host = options.google_apis_host || 'www.googleapis.com';
    this.google_oauth2_host = options.google_oauth2_host || 'accounts.google.com';
    this.google_oauth2_authorize_uri = options.google_oauth2_authorize_uri || '/o/oauth2/auth',
    this.google_oauth2_access_token_uri = options.google_oauth2_access_token_uri || '/o/oauth2/token',
    this.proxy = options.proxy || process.env['http_proxy'];

    this.request = function(req, form, callback) {
	var gurl = url.parse(req.url, true);
	var headers = (req.headers ? req.headers : {});
	delete headers['host'];
	if(form) {
	    form = querystring.stringify(form);
	    headers['Content-Length'] = form.length;
	    headers['Content-Type'] = 'application/x-www-form-urlencoded';
	}
	if(this.proxy) {
	    var proxyinitfunc = null;
	    var proxyurl = url.parse(this.proxy, true);
	    proxyurl.protocol = proxyurl.protocol || 'http:';
	    if(proxyurl.protocol == 'https:' && gurl.protocol == 'https:') proxyinitfunc = tunnel.httpsOverhttps;
	    if(proxyurl.protocol == 'https:' && gurl.protocol == 'http:') proxyinitfunc = tunnel.httpOverhttps;
	    if(proxyurl.protocol == 'http:' && gurl.protocol == 'https:') proxyinitfunc = tunnel.httpsOverhttp;
	    if(proxyurl.protocol == 'http:' && gurl.protocol == 'http:') proxyinitfunc = tunnel.httpOverhttp;
	    var proxy = proxyinitfunc({
		proxy: {
		    host: proxyurl.hostname,
		    port: proxyurl.port
		}
	    });
	}
	var clientrequest = (gurl.protocol == 'https:' ? https : http).request({
	    'hostname': gurl.hostname,
	    'port': gurl.port,
	    'method': (req.method ?  req.method : (form ? 'POST' : 'GET')),
	    'path': gurl.path,
	    'headers': headers,
	    'agent': proxy
	});
	if(!(req instanceof stream.Readable)) {
	    if(form) clientrequest.write(form);
	    clientrequest.end();
	}
	else {
	    req.on('data', function(chunk){
		this.write(chunk);
	    }.bind(clientrequest));
	    req.on('end', function(form){
		if(form) this.write(form);
		this.end();
	    }.bind(clientrequest, form));
	}
	clientrequest.on('response', function(callback, clientresponse){
	    callback(clientresponse);
	}.bind(this, callback));
    };

    this.authorize = function(req, callback) {
	var gurl = url.parse(req.url, true);
	gurl.protocol = this.google_protocol;
	gurl.host = this.google_oauth2_host;
	gurl.pathname = this.google_oauth2_authorize_uri;
	var query = {'client_id': this.google_client_id,
		     'redirect_uri': this.google_redirect_uri,
		     'scope': this.google_scope,
		     'response_type': 'code'
		    };
	for(var k in gurl.query) {
	    query[k] = gurl.query[k];
	}
	gurl.query = query;
	delete gurl.search;
	req.url = url.format(gurl);
	req.method = 'GET';
	this.request(req, null, callback);
    };

    this.get_access_token = function(req, callback){
	var gurl = url.parse(req.url, true);

	if(gurl.query.error) {
	    callback(gurl.query);
	}
	else {
	    gurl.protocol = this.google_protocol;
	    gurl.host = this.google_oauth2_host;
	    gurl.pathname = this.google_oauth2_access_token_uri;
	    var form = {'client_id': this.google_client_id,
			'redirect_uri': this.google_redirect_uri,
			'client_secret': this.google_client_secret,
			'grant_type': 'authorization_code'
		       };
	    for(var k in gurl.query) {
		form[k] = gurl.query[k];
	    }
	    if(form.refresh_token) {
		delete form.redirect_uri;
		form.grant_type = 'refresh_token';
	    }
	    this.request({'url': url.format(gurl)}, form, callback);
	}
    };

    this.call_google = function(req, form, callback) {
	var gurl = url.parse(req.url, true);
	if(!gurl.host) {
	    req.headers['Authorization'] = 'Bearer ' + this.google_tokens.access_token;
	    gurl.protocol = gurl.protocol || this.google_protocol;
	    gurl.host = this.google_apis_host;
	}
	req.url = url.format(gurl);
	this.request(req, form, callback);
    };
};

exports = module.exports = GoogleRest;
