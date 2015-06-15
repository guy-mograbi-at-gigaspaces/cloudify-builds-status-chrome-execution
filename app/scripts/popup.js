'use strict';

angular.module('myapp', []);

angular.module('myapp').controller('TravisCtrl',['$http','$scope','$timeout','$log',function TravisCtrl($http, $scope/*, $timeout, $log*/) {

    try {
        /**
         * expecting the following data
         * {
         *      status: {
         *          data: [],
         *          builds: [],
         *          disabled: []
         *          updatedAt: Date
         *      }
         * }
         */

        chrome.runtime.onMessage.addListener(
            function (request/*, sender, sendResponse*/) {
                console.log('got message', request.status );
                if (request.status) {
                    $scope.page = request.status;
                    $scope.$apply();
                }
            }
        );
    }catch(e){}

    try{
        chrome.runtime.sendMessage({msg: 'update_please'});
    }catch(e){
        // mock data
        $scope.page = {'data':[{'params':{'event_type':'push'},'state':'finished','customText':'0s','buildsPage':0,'branch':'master','slug':'cloudify-cosmo/cloudify-js','travisBuildLink':'https://travis-ci.org/cloudify-cosmo/cloudify-js/builds/66642058'}],'builds':[{'params':{'event_type':'push'},'state':'finished','customText':'0s','buildsPage':0,'branch':'3.3m1','slug':'cloudify-cosmo/cloudify-cli','travisBuildLink':'https://travis-ci.org/cloudify-cosmo/cloudify-cli/builds/66775600'}],'disabled':[],'updatedAt':'06:35'};
    }
}]);


angular.module('myapp').directive('buildStatus', function(){
    return {
        restrict: 'A',
        scope: { data : '=' , state: '@buildStatus'},
        templateUrl: 'views/directives/buildStatus.html',
        link: function($scope){
            console.log('linking', $scope.data );
            $scope.displayName = function(){
                return $scope.data.slug.split('/')[1];
            };
        }
    };
});