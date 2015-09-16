'use strict';


function Background(){
    var me = this;
    this.config = new Config();
    this.repos = [];
    this.lastUpdate = null;

    try{
        chrome.runtime.onMessage.addListener(
            function (request/*, sender, sendResponse*/) {
                if ( request.msg === 'update_please'){
                    me.sendUpdate(null);
                }
            }
        );
    }catch(e){}
}

Background.prototype.loadStatus = function(repo, callback){
    var me = this;
    function success( response ){
        console.log('got response', response);
        me.processRepoResponse(repo, { data:  response });
        // missing feature - make refresh faster on repository that is currently running
        callback();
    }


    function error(){
        console.log('failed loading', repo.name, arguments);
    }

    new Travis(repo).builds(repo, success, error );

};


/**
 * @param {string} branchName
 * @return {boolean} iff branch is build branch
 * */
function isBuildBranch(branchName) {
    var regexp = new RegExp(/^\d*\.\d*.*/);
    return regexp.exec(branchName) !== null && branchName.lastIndexOf('build') === -1;
}


/**
 * @description
 * once the configuration is loaded, we need to process it.
 * This function will initialize the data we display later.
 * @param repos
 * @returns {Array}
 */
Background.prototype.initRepos = function( ){
    this.repos = _.map(this.config.options.repositories, function(repo) {

        return _.merge({
            'params' : { 'event_type' : 'push' },
            'displayName': function(){ return repo.slug.split('/')[1]; }, // remove owner
            'state': 'uninitialized',
            'customText': '0s',
            'buildsPage': 0,
            'branch': 'master'
        }, repo);
    });
};

/**
 * @description
 * will prepare the data for popup
 * @returns {{data: *, builds: *, disabled: *, updatedAt: string}}
 */
Background.prototype.formatStatus = function( ){
    return {
        data: this.repos.filter(function(r) { return r.state !== 'not-running' && r.branch === 'master'; }),
        builds: this.repos.filter(function(r) { return r.state !== 'not-running' && isBuildBranch(r.branch); }),
        disabled: this.repos.filter(function(r) { return r.state === 'not-running'; }),
        updatedAt: new Date().toLocaleTimeString('en-us', { hour12: false}).substring(0, 5)

    };
};

/**
 * @description
 * sorts builds by started_at timestamp
 * @param builds array of builds
 * @returns {*|Array.<T>} sorted array of builds
 */
Background.prototype.sortBuilds = function( builds ){
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
};


Background.prototype.getMoreBuilds = function( repo, response ){
    repo.buildsPage += 1;
    repo.params.after_number = response.data[response.data.length-1].number;
    this.loadStatus(repo);
};

Background.prototype.updateRepo = function(build, repo){

    repo.branch = build.branch;
    repo.travisBuildLink = new Travis( repo ).getBuildLink( repo, build );
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
};

/**
 * @description
 * processes data for a single repository
 * @param repo the repository to process
 * @param response
 * @returns {*}
 */
Background.prototype.processRepoResponse = function(repo, response) {

    // get only relevant builds
    var builds = _.filter(response.data, function(build) { // get only builds from master/build branch, only those that were triggered by push and only those with some actual duration
        return (isBuildBranch(build.branch) || build.branch === 'master') && build.event_type === 'push' && !(build.state === 'finished' && build.duration === 0);
    });

    // sort builds
    builds = this.sortBuilds(builds);

    if (builds.length === 0) { // handle travis pagination
        if (response.data.length > 0 && repo.buildsPage < 10) {
            this.getMoreBuilds(repo, response);
        }
        repo.state = 'not-running';
        return null;
    }
    return this.updateRepo(builds[0],repo);
};


/**
 * @description
 * updating label text to number of failed builds
 * @param repos
 */
Background.prototype.updateLabel = function( ){
    var value = _.filter(this.repos, function(r){ return r.state === 'failed'; }).length;
    try{
        chrome.browserAction.setBadgeText({text: '' + value});
    }catch(e){ console.log('failed to update badge',e);}
    console.log('updating badge text to', value);
};

/**
 * @description
 * will dispatch update to view
 * @param update
 */
Background.prototype.sendUpdate = function( update ){
    if ( update !== null ){
        this.lastUpdate = update;
    }else{
        update = this.lastUpdate;
    }

    try{
        localStorage.update = JSON.stringify({status:update});
    }catch(e){}

    try{
        if ( chrome.runtime ) {
            chrome.runtime.sendMessage({status: update});
        }else{

        }
    }catch(e){}

    console.log('sent update',update);
};

Background.prototype.loadStatusAndRefresh = function(){
    var me = this;
    return function(repo){
        console.log('loading ', repo.name );
        me.loadStatus(repo, function(){
            me.updateLabel();
            me.sendUpdate(me.formatStatus());
        });
    };
};


/**
 * @description
 * This is the main function.
 * it will load configuration and get status for each repository
 *
 */
Background.prototype.updateData = function(){
    console.log('updating data');
    var me = this;
    // read configuration
    this.config.restore(function( changed ){
        console.log('config restored', me.config.options);
        if ( changed ) {
            me.initRepos();
        }

        console.log('repos initialized');
        _.each(me.repos, me.loadStatusAndRefresh());
    });
};


Background.prototype.start = function(){
    var me = this;
    this.updateData();
    setInterval(function(){me.updateData(); },30000);
};

new Background().start();
