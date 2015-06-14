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
    }catch(e){}
}]);
