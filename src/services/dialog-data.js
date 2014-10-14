'use strict';
mod.factory('triDialogData', [
    '$log',
    'triDialogConfig',
    function ($log, dialogConfig) {

        var DialogData = function () {
            return angular.extend(this, {
                controller: null,
                controllerAs: null,
                dialogClass: '',
                topOffset: null,
                modal: false,
                namespace: dialogConfig.mainNamespace,
                templateUrl: null
            });
        };

        angular.extend(DialogData.prototype, {
            _updateDialogConfigData: function (config, data) {
                if (!config.templateUrl) {
                    // TODO: remove and add default template maybe
                    $log.error(new Error('triNgDialog.DialogData() - initialData must contain defined "templateUrl"'));
                }
                return angular.extend(this, config, {data: data});
            },

            destroy: function () {
                var key;
                for (key in this) {
                    if (this.hasOwnProperty(key)) {
                        delete this[key];
                    }
                }
            }
        });

        return function (config, data) {
            return new DialogData()._updateDialogConfigData(config, data);
        };
    }
]);