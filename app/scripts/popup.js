'use strict';

console.log('\'Allo \'Allo! Popup');

try { // this code will not run outside the extension environment


    chrome.runtime.onMessage.addListener(
        function (request/*, sender, sendResponse*/) {
            console.log('got message');
            if (request.log) {
                console.log(request.log);
            }
        }
    );
    chrome.runtime.sendMessage({log: 'from popyup'});
}catch(e){}


angular.module('myapp', []);
//angular.module('myapp').controller('TravisBuilds', ['$scope','$http',function (/*$scope, $http*/) {
//
//    //$http.get('https://api.travis-ci.org/repositories.json?owner_name=cloudify-cosmo&active=true').then(function(result){
//    //    console.log('before filter', result.data.length);
//    //    result.data = _.sortByOrder(_.filter(result.data, function(item){ return item.last_build_id; }),['last_build_id'], [false]);
//    //    console.log('after filter', result.data.length);
//    //    console.log(result.data);
//    //    $scope.builds = result.data;
//    //});
//
//
//    //$scope.items = ['a', 'b', 'c'];
//}]);


function getCurrentTime() {
    var date = new Date();
    var options = {
        hour12: false
    };
    return date.toLocaleTimeString('en-us', options).substring(0, 5);
}



function restore_options( callback ) {
    try {
        // Use default value color = 'red' and likesColor = true.
        chrome.storage.sync.get(null, function (items) {
            callback(items);
        });
    }catch(e){
        console.log('unable to restore',e);
        callback( { 'repositories' : [{'slug' : 'cloudify-cosmo/cloudify-cli'}, {'slug' : 'cloudify-cosmo/cloudify-js' }] } );
    }
}




angular.module('myapp').controller('TravisCtrl',['$http','$scope','$timeout','$log',function TravisCtrl($http, $scope, $timeout, $log) {
    var repositories = [];
    //    'cloudify-cosmo/cloudify-manager',
    //    'cloudify-cosmo/cloudify-cli',
    //    'cloudify-cosmo/cloudify-dsl-parser',
    //    'cloudify-cosmo/cloudify-rest-client',
    //    'cloudify-cosmo/cloudify-diamond-plugin',
    //    'cloudify-cosmo/cloudify-docker-plugin',
    //    'cloudify-cosmo/cloudify-cloudstack-plugin',
    //    'cloudify-cosmo/cloudify-script-plugin',
    //    'cloudify-cosmo/cloudify-chef-plugin',
    //    'cloudify-cosmo/cloudify-puppet-plugin',
    //    'cloudify-cosmo/cloudify-openstack-plugin',
    //    'cloudify-cosmo/cloudify-plugins-common',
    //    'cloudify-cosmo/cloudify-fabric-plugin',
    //    'cloudify-cosmo/cloudify-amqp-influxdb',
    //    'cloudify-cosmo/cloudify-system-tests',
    //    'cloudify-cosmo/cloudify-plugin-template',
    //    'cloudify-cosmo/cloudify-agent-packager',
    //    'cloudify-cosmo/version-tool',
    //    'cloudify-cosmo/cloudify-nodecellar-example',
    //    'cloudify-cosmo/cloudify-manager-blueprints',
    //    'cloudify-cosmo/packman',
    //    'cloudify-cosmo/repex',
    //    'cloudify-cosmo/flask-securest'
    //];
    var repos = [];
    function initRepos(){
        repos = _.map(repositories, function(name) {
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

    function isBuildBranch(branchName) {
        var regexp = new RegExp(/^\d*\.\d*.*/);
        return regexp.exec(branchName) !== null && branchName.lastIndexOf('build') === -1;
    }
    function processRepoResponse(repo, response) {
        var builds = _.filter(response.data, function(build) { // get only builds from master/build branch, only those that were triggered by push and only those with some actual duration
            return (isBuildBranch(build.branch) || build.branch === 'master') && build.event_type === 'push' && !(build.state === 'finished' && build.duration === 0);
        });
        builds = builds.sort(function(x, y) {
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
        if (builds.length === 0) {
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
    // DEBUG
    // states = ['uninitialized', 'created', 'started', 'finished', 'failed', 'not-running'];
    // for (var i = 0; i < repos.length; i++) {
    //   var number = Math.floor(Math.random() * 100);
    //   repos[i].state = states[number % states.length];
    // }
    $scope.data = repos.sort(function(x, y) {
        return x.displayName.localeCompare(y.displayName);
    });
    $scope.builds = [];
    $scope.disabled = [];
    $scope.updatedAt = getCurrentTime();
    function loadStatus(repo) {
        $log.info('making request to: ' + repo.travisApiLink);
        var timeout = 60000;
        $http.get(repo.travisApiLink).then(function(response) {
            var build = processRepoResponse(repo, response);
            if (build) {
                $log.info('build: ' + JSON.stringify(build));
                if (build.state === 'started' || build.state === 'created') {
                    timeout = 10000;
                }
            }
            $scope.data = repos.filter(function(r) {
                return r.state !== 'not-running' && r.branch === 'master';
            });
            $scope.builds = repos.filter(function(r) {
                return r.state !== 'not-running' && isBuildBranch(r.branch);
            });
            $scope.disabled = repos.filter(function(r) {
                return r.state === 'not-running';
            });
            $scope.updatedAt = getCurrentTime();
            if (repo.state !== 'not-running') {
                $timeout(function() {
                    loadStatus(repo);
                }, timeout);
            }
        }, function(/*result*/) {
            $log.error('unable to get results for: ' + repo);
            $timeout(function() {
                loadStatus(repo);
            }, timeout);
        });
    }


    restore_options(function(options){

        console.log('these are options', options);
        repositories = _.pluck(options.repositories, 'slug' );
        initRepos();
        console.log('these are repositories', repositories);
        for ( var i = 0; i < repos.length; i ++) {
            loadStatus(repos[i]);
        }
    });

}]);
