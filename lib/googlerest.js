var fs = require('fs');
var url = require('url');
var http = require('http');
var request = require('request');
var querystring = require('querystring');
var DuplexBufferStream = require('duplexbufferstream');

var GoogleRest = function(options) {
    this.google_client_id = options.google_client_id || '137500406659-b28rlhjqq3k0u4nmem2499500ffk772s.apps.googleusercontent.com';
    this.google_client_secret = options.google_client_secret || 'xoTDByvSHGLb5lQ8_cnO8sh5';
    this.google_redirect_uri = options.google_redirect_uri || 'http://localhost:3000/google/authorized';
    this.google_scope = options.google_scope || 'https://www.googleapis.com/auth/drive';
    this.google_access_token = options.google_access_token || null;
    this.google_protocol = options.google_protocol || 'https';
    this.google_apis_host = options.google_apis_host || 'www.googleapis.com';
    this.google_oauth2_host = options.google_oauth2_host || 'accounts.google.com';
    this.google_oauth2_authorize_uri = options.google_oauth2_authorize_uri || '/o/oauth2/auth',
    this.google_oauth2_access_token_uri = options.google_oauth2_access_token_uri || '/o/oauth2/token',
    this.proxy = options.proxy || process.env['http_proxy'];


    this.authorize = function(req, res) {
	if(this.google_access_token) {
	    res.end(JSON.stringify({'oauth2': 'authorized'}));
	}
	else {
	    var url_object = new url.Url();
	    url_object.protocol = this.google_protocol;
	    url_object.host = this.google_oauth2_host;
	    url_object.pathname = this.google_oauth2_authorize_uri;
	    url_object.query = {'client_id': this.google_client_id,
				'redirect_uri': this.google_redirect_uri,
				'scope': this.google_scope,
				'response_type': 'code'
			       };
	    request({'uri': url.format(url_object), 'proxy': this.proxy}).pipe(res);
	}
    };

    this.get_access_token = function(req, res) {
	var code = querystring.parse(url.parse(req.url).query).code;
	var url_object = new url.Url();

	if(!code) {
	    res.end(JSON.stringify({'oath2': 'denied'}))
	}
	else {
	    url_object.protocol = this.google_protocol;
	    url_object.host = this.google_oauth2_host;
	    url_object.pathname = this.google_oauth2_access_token_uri;
	    var post = {'client_id': this.google_client_id,
			'redirect_uri': this.google_redirect_uri,
			'client_secret': this.google_client_secret,
			'code': code,
			'grant_type': 'authorization_code'
		       };

	    request({'method': 'post',
		     'uri': url.format(url_object),
		     'proxy': this.proxy,
		     'form': post}, function(req, res, error, response, body) {
			 if(error) throw JSON.stringify(error);
			 if(response.statusCode != 200) throw JSON.stringify(response);
			 this.google_access_token = JSON.parse(body).access_token;
			 res.end(JSON.stringify({'google_access_token': this.google_access_token}));
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
			       'Authorization': 'Bearer ' + this.google_access_token
			   }
			 };
	if(req.method == 'GET') url_object.query = options;
	if(req.method == 'POST') request_params.form = options;
	request_params.uri = url.format(url_object);
	request(request_params).pipe(res);
    };
};

exports = module.exports = GoogleRest;