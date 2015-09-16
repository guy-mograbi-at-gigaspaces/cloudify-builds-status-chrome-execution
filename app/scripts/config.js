'use strict';

function Config( defaults ){
    this.options = defaults || {};
}

/**
 *
 * @description
 * reads configuration from chrome extension db.
 *
 *
 * returns the following structure:
 *
 * <pre>
 * { repositories : [ { slug: 'cloudify-cosmo/cloudify-cli } , ...  ] }
 * </pre>
 *
 *
 * @param callback - function( {boolean} changed )
 */
Config.prototype.restore = function( callback ) {
    var me = this;

    function getParameterByName(name) {
        name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
        var regex = new RegExp('[\\?&]' + name + '=([^&#]*)'),
            results = regex.exec(location.search);
        return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    }

    function success(_options){
        console.log('options loaded', _options, me.options );
        if ( !me.options.version || _options.version !== me.options.version ){
            me.options = _options;
            callback(true);
        }else{
            callback(false);
        }
    }

    try {
        // Use default value color = 'red' and likesColor = true.
        chrome.storage.sync.get(null, success);
    }catch(e){

        if ( !chrome || !chrome.storage){
            success(JSON.parse(localStorage.data));
            return;
        }
        //console.log('unable to restore',e);
        success( { 'repositories' : [
            {'slug' : 'cloudify-cosmo/cloudify-cli'},
            {'slug' : 'cloudify-cosmo/cloudify-js' },
            {'slug' : 'cloudify-cosmo/cloudify-ui' , 'token' : getParameterByName('token') }
        ] } );
    }
};