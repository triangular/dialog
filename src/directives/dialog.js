'use strict';

mod.directive('triDialog', [
    '$http',
    '$animate',
    '$compile',
    '$controller',
    '$templateCache',
    'triDialogManager',
    'triDialogConfig',
    'triDialogUtilities',
    function ($http, $animate, $compile, $controller, $templateCache, dialogManager, dialogConfig, dialogUtilities) {

        var postLink = function (scope, element, attrs, dialogRootCtrl) {

            var dialog = dialogManager.dialogs[attrs.triDialog];

            var locals = {
                $data: dialog.data,
                $scope: scope
            };

            var init = function (innerLink, element, dialog) {
                var dialogCtrl;
                if (dialog.controller) {
                    dialogCtrl = $controller(dialog.controller, locals);
                    element.data('$ngControllerController', dialogCtrl);
                    element.children().data('$ngControllerController', dialogCtrl);
                    if (dialog.controllerAs) {
                        scope[dialog.controllerAs] = dialogCtrl;
                    }
                }
                innerLink(scope);
            };

            $http
                .get(dialog.templateUrl, {
                    cache: $templateCache
                })
                .success(function (response) {
                    element.html(response);
                    init($compile(element.contents()), element, dialog);
                    scope.$emit('$triNgDialogTemplateLoaded');
                })
                .error(function () {
                    // TODO... Finking what to do here :/
                    scope.$emit('$triNgDialogTemplateError');
                });

            scope.$emit('$triNgDialogTemplateRequested');

            scope.closeClick = function () {
                dialogRootCtrl.broadcast('close', dialog);
            };

            scope.$on(dialog.namespace + '.dialog.close', function (e, closedDialog) {
                if (closedDialog.label == dialog.label) {
                    $animate.leave(element, function () {
                        scope.$destroy();
                        dialog.destroy();
                        element = dialog = null;
                    });
                    dialogManager.unRegisterDialog(dialog.label);
                    dialogRootCtrl.broadcast('closing', closedDialog);
                }
            });
        };

        var compile = function (tElement, tAttrs) {
            var dialog = dialogManager.dialogs[tAttrs.triDialog];
            tElement
                .addClass(dialogConfig.dialogClass + ' ' + dialog.dialogClass)
                .css({
                    zIndex: dialogConfig.baseZindex + (dialog.label + 1) * 2,
                    top: dialogUtilities.getTopOffset(dialog.topOffset)
                });
            return postLink;
        };

        return {
            compile: compile,
            require: '^triDialogRoot',
            restrict: 'A',
            scope: true
        };
    }
]);