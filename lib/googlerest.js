var fs = require('fs');
var url = require('url');
var http = require('http');
var request = require('request');
var DuplexBufferStream = require('duplexbufferstream');

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


    this.authorize = function(req, res) {
	var query = url.parse(req.url, true).query;
	var url_object = new url.Url();

	url_object.protocol = this.google_protocol;
	url_object.host = this.google_oauth2_host;
	url_object.pathname = this.google_oauth2_authorize_uri;
	url_object.query = {'client_id': this.google_client_id,
			    'redirect_uri': this.google_redirect_uri,
			    'scope': this.google_scope,
			    'response_type': 'code'
			   };

	for(var k in query) {
	    url_object.query[k] = query[k];
	}

	request({'uri': url.format(url_object), 'proxy': this.proxy}).pipe(res);
    };

    this.get_access_token = function(req, res) {
	var query = url.parse(req.url, true).query;
	var url_object = new url.Url();

	if(query.error) {
	    res.end(JSON.stringify({'oath2': query}))
	}
	else {
	    url_object.protocol = this.google_protocol;
	    url_object.host = this.google_oauth2_host;
	    url_object.pathname = this.google_oauth2_access_token_uri;
	    var post = {'client_id': this.google_client_id,
			'client_secret': this.google_client_secret,
			'redirect_uri': this.google_redirect_uri,
			'grant_type': 'authorization_code'
		       };

	    for(var k in query) {
		post[k] = query[k];
	    }

	    if(post.refresh_token) {
		delete post.redirect_uri;
		post.grant_type = 'refresh_token';
	    }

	    request({'method': 'post',
		     'uri': url.format(url_object),
		     'proxy': this.proxy,
		     'form': post}, function(req, res, error, response, body) {
			 if(error) throw JSON.stringify(error);
			 if(response.statusCode != 200) throw JSON.stringify(response);
			 var tokens = JSON.parse(body);
			 if(this.google_tokens) {
			     for(var k in tokens) {
				 this.google_tokens[k] = tokens[k];
			     }
			 }
			 else {
			     this.google_tokens = tokens;
			 }
			 res.end(JSON.stringify({'google_tokens': this.google_tokens}));
		     }.bind(this, req, res));
	}
    };

    this.call_google = function(req, res, pathname, options) {
	var url_object = new url.Url();
	var request_params = null;

	url_object.protocol = this.google_protocol;
	url_object.host = this.google_apis_host;
	url_object.pathname = pathname;
	request_params = { 'proxy': this.proxy,
			   'method': req.method,
			   'headers': {
			       'User-Agent': 'request.js',
			       'Authorization': 'Bearer ' + this.google_tokens.access_token
			   }
			 };
	if(req.method == 'GET') url_object.query = options;
	if(req.method == 'POST') request_params.form = options;
	request_params.uri = url.format(url_object);
	request(request_params).pipe(res);
    };
};

exports = module.exports = GoogleRest;
