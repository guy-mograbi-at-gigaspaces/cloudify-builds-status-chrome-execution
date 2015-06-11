'use strict';

console.log('\'Allo \'Allo! Option');


angular.module('myoptions', []);

angular.module('myoptions').controller('MyOptionsCtrl',['$log', '$scope', '$timeout',function($log, $scope, $timeout){

    var controller = this;
    $log.info('loading my options ctrl');
    $log.info('chrome storage is', chrome.storage);

    controller.details = { repositories : []};
    // Saves options to chrome.storage
    function save_options() {
        try {
            $log.info('saving', controller.details);
            chrome.storage.sync.set(controller.details, function () {
                // Update status to let user know options were saved.
                controller.status = 'Options saved';
                $scope.$apply();
                $timeout(function () {
                    controller.status = '';
                }, 1000);
            });
        }catch(e){
            $log.error('unable to save',e);
        }
    }

    this.addRepository = function(){
        if ( !controller.details.repositories ){ // lazy upgrade model
            controller.details.repositories = [];
        }
        controller.details.repositories.push({});
    };

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
    function restore_options() {
        try {
            // Use default value color = 'red' and likesColor = true.
            chrome.storage.sync.get(null, function (items) {
                $log.info('items is', items);
                controller.details = items;
                $scope.$apply();
            });
        }catch(e){
            $log.error('unable to restore',e);
        }
    }

    controller.save = function( $event ){
        $log.info('saving!');
        try{
            $event.preventDefault();
        }catch(e){}
        save_options();

    };

    restore_options();
}]);