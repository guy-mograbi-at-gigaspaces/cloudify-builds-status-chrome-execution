'use strict';

//console.log = function(msg){
//    chrome.runtime.sendMessage({log: msg});
//};

//chrome.runtime.onInstalled.addListener(function (details) {
//    console.log('previousVersion', details.previousVersion);
//});


//$scope.data = repos.sort(function(x, y) {
//    return x.displayName.localeCompare(y.displayName);
//});


function loadStatus(repo, callback ) {
    console.log('making request to: ' + repo.travisApiLink);
    $.ajax(
        {
            url : repo.travisApiLink,
            success:function(response) {
                console.log('got response', response);
                processRepoResponse(repo, { data:  response });
                // missing feature - make refresh faster on repository that is currently running
                callback();
            },
            error: function(){
                console.log('failed loading', repo.name, arguments);
            }
        }
    );
}


/**
 *
 * @returns {string} timestamp
 */
function getCurrentTime() {
    var date = new Date();
    var options = {
        hour12: false
    };
    return date.toLocaleTimeString('en-us', options).substring(0, 5);
}

/**
 * @param {string} branchName
 * @return {boolean} iff branch is build branch
 * */
function isBuildBranch(branchName) {
    var regexp = new RegExp(/^\d*\.\d*.*/);
    return regexp.exec(branchName) !== null && branchName.lastIndexOf('build') === -1;
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
 * @param callback
 */

function restore_options( callback ) {
    try {
        // Use default value color = 'red' and likesColor = true.
        chrome.storage.sync.get(null, function (items) {
            callback(items);
        });
    }catch(e){
        //console.log('unable to restore',e);
        callback( { 'repositories' : [{'slug' : 'cloudify-cosmo/cloudify-cli'}, {'slug' : 'cloudify-cosmo/cloudify-js' }] } );
    }
}

/**
 * @description
 * once the configuration is loaded, we need to process it.
 * This function will initialize the data we display later.
 * @param repos
 * @returns {Array}
 */
function initRepos( repos ){
    return _.map(repos, function(repo) {
        var name = repo.slug;
        return {
            'name': name,
            'displayName': name.replace('cloudify-cosmo/', '').replace('nir0s/', ''),
            'travisBuildLink': '',
            'travisApiLink': 'https://api.travis-ci.org/repos/' + name + '/builds?event_type=push',
            'state': 'uninitialized',
            'customText': '0s',
            'buildsPage': 0,
            'branch': 'master'
        };
    });
}

/**
 * @description
 * will prepare the data for popup
 * @param repos
 * @returns {{data: *, builds: *, disabled: *, updatedAt: string}}
 */
function formatStatus( repos ){
    return {
        data: repos.filter(function(r) { return r.state !== 'not-running' && r.branch === 'master'; }),
        builds:repos.filter(function(r) { return r.state !== 'not-running' && isBuildBranch(r.branch); }),
        disabled: repos.filter(function(r) { return r.state === 'not-running'; }),
        updatedAt: getCurrentTime()

    };
}

/**
 * @description
 * sorts builds by started_at timestamp
 * @param builds array of builds
 * @returns {*|Array.<T>} sorted array of builds
 */
function sortBuilds( builds ){
    return builds.sort(function(x, y) {
        if (x.started_at === null) {
            return -1;
        } else if (y.started_at === null) {
            return 1;
        }
        var xStartedAt = new Date(x.started_at);
        var yStartedAt = new Date(y.started_at);
        if (xStartedAt < yStartedAt) {
            return 1;
        } else if (yStartedAt < xStartedAt) {
            return -1;
        }
        return 0;
    });
}

/**
 * @description
 * processes data for a single repository
 * @param repo the repository to process
 * @param response
 * @returns {*}
 */
function processRepoResponse(repo, response) {

    // get only relevant builds
    var builds = _.filter(response.data, function(build) { // get only builds from master/build branch, only those that were triggered by push and only those with some actual duration
        return (isBuildBranch(build.branch) || build.branch === 'master') && build.event_type === 'push' && !(build.state === 'finished' && build.duration === 0);
    });

    // sort builds
    builds = sortBuilds(builds);

    if (builds.length === 0) { // handle travis pagination
        if (response.data.length > 0 && repo.buildsPage < 10) {
            repo.buildsPage += 1;
            var lastNumber = response.data[response.data.length-1].number;
            var paramConcatIndex = repo.travisApiLink.lastIndexOf('&');
            if (paramConcatIndex !== -1) {
                repo.travisApiLink = repo.travisApiLink.substring(0, paramConcatIndex);
            }
            repo.travisApiLink += '&after_number=' + lastNumber;
            loadStatus(repo);
        }
        repo.state = 'not-running';
        return null;
    }


    var build = builds[0]; // get the latest build
    repo.branch = build.branch;
    repo.travisBuildLink = 'https://travis-ci.org/' + repo.name + '/builds/' + build.id;
    repo.state = build.state;
    if (build.state === 'created') {
        repo.customText = '0s';
    } else if (build.state === 'started') {
        var startedAt = new Date(build.started_at);
        var currentTime = new Date();
        repo.customText = Math.max(0, Math.round((currentTime.getTime() - startedAt.getTime()) / 1000)) + 's';
    } else if (build.state === 'finished' && build.result !== 0) {
        repo.state = 'failed';
    }
    return build;
}


/**
 * @description
 * updating label text to number of failed builds
 * @param repos
 */
function updateLabel( repos ){
    var value = _.filter(repos, function(r){ return r.state === 'failed'}).length;
    try{
        chrome.browserAction.setBadgeText({text: '' + value});
    }catch(e){ console.log('failed to update badge',e);}


    console.log('updating badge text to', value);
}

/**
 * @description
 * will dispatch update to view
 * @param update
 */
var lastUpdate = null;
function sendUpdate( update ){
    if ( update !== null ){
        lastUpdate = update;
    }else{
        update = lastUpdate;
    }
    try{
        chrome.runtime.sendMessage({status: update});
    }catch(e){}

    console.log('sent update',update);
}


chrome.runtime.onMessage.addListener(
    function (request/*, sender, sendResponse*/) {
        if ( request.msg === 'update_please'){
            sendUpdate(null);
        }
    }
);


function loadStatusAndRefresh(repos){
    return function(repo){
        loadStatus(repo, function(){
            updateLabel(repos);
            sendUpdate(formatStatus(repos));
        })
    }
}

/**
 * @description
 * This is the main function.
 * it will load configuration and get status for each repository
 *
 */
var options = null;
var repos = [];
function updateData(){
    console.log('updating data');
    // read configuration
    restore_options(function( _options ){
        if ( options === null || _options.version !== options.version ){
            options = _options;
            repos = initRepos( options.repositories );
        }

        _.each(repos, loadStatusAndRefresh(repos));
    });

    //chrome.browserAction.setBadgeText({text: '\'Bar'});
}



// set interval on main function
console.log('background loaded setting interval');
setInterval(updateData,30000);
updateData(); // initial run