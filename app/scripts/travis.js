'use strict';
/**
 *
 * @param {object} config
 * @param {string} config.token travis token for commercial version. giving a token will cause the endpoint to be travis-ci.com
 * @constructor
 */
function Travis( config ){
    if ( !config ){
        config = { token: null };
    }
    this.config = config;
}

/**
 *
 * @returns {string} endpoint either https://api.travis-ci.com or https://api.travis-ci.org
 */
Travis.prototype.apiRoot = function(){
    return this.config.token ? 'https://api.travis-ci.com' : 'https://api.travis-ci.org';
};

Travis.prototype.webRoot = function(){
    return this.config.token ? 'https://travis-ci.com' : 'https://travis-ci.org';
};
/**
 *
 * @param {object} repo the repository
 * @param {object} repo.params query params for builds
 * @param {string} [repo.params.event_type=push] the trigger for build
 * @param {string} repo.params.name name of repository
 * @param {string|number} repo.params.after_number for pagination
 */
Travis.prototype.builds = function( repo, callback, errorCallback ){
    var url = this.apiRoot() + '/repos/' + repo.slug + '/builds?' + $.param(repo.params);
    var headers = {};
    if ( repo.token ){
        headers.Authorization = 'token "' + repo.token + '"';
    }
    console.log('making request to: ' + url);

    $.ajax({ 'url' : url, headers: headers, success: callback , error: errorCallback});
};

Travis.prototype.getBuildLink = function( repo, build ){
    return this.webRoot() + '/' + repo.slug + '/builds/' + build.id;
};