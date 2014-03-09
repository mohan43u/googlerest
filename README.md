### GoogleRest

A simple wrapper around google REST api

### Options

* `google_client_id` registered google app's client_id (default: 33813)
* `google_client_secret` registered google app's client_secret (default: vFFYBzQXLUvLLhpnAAOKSB6xnuBa50SneYs5M17GhVVanPzek8OknY54SCEE2UzC)
* `google_redirect_uri` redirect url registered with google app (default: http://localhost:3000/google/authorized)
* `google_access_token` google app's access_token (if null, user's will be redirected to google) (default: null)
* `google_protocol` protocol to use to connect to google (default: https)
* `google_host` hostname to use to connect to google (default: public-api.google.com)
* `google_oauth2_authorize_uri` Oauth2 authorize uri specified in google api (default: /oauth2/authorize)
* `google_oauth2_access_token_uri` Oauth2 access_token url specified in google api (default: /oauth2/token)
* `proxy` if behind firewall http_proxy value to use (default: taken from 'http_proxy' environment variable)

### Example

See example/googleresttest.js