/*!
 * triAngular Dialog
 */

(function (mod) {
'use strict';

// Source: src/directives/dialog-mask.js
mod.directive('triDialogMask', [
    '$animate',
    'dialogConfig',
    'dialogManager',
    function ($animate, dialogConfig, dialogManager) {

        var postLink = function (scope, element, attrs, rootCtrl, $transclude) {
            var root = element.parent();
            var previousElement = null;
            var currentElement = null;

            var updateZIndex = function (mask) {
                mask.css('z-index', dialogConfig.baseZindex + dialogManager.dialogs.length * 2 - 1);
            };

            var update = function () {
                if (dialogManager.hasAny(rootCtrl.namespace)) {
                    if (currentElement) {
                        updateZIndex(currentElement);
                    } else {
                        currentElement = $transclude(function (clone) {
                            $animate.enter(clone, root);
                            updateZIndex(clone);
                            if (previousElement) {
                                previousElement.remove();
                                previousElement = null;
                            }
                        });
                    }
                } else if (currentElement) {
                    $animate.leave(currentElement, function () {
                        previousElement = null;
                    });
                    previousElement = currentElement;
                    currentElement = null;
                }
            };

            scope.$on(rootCtrl.namespace + '.dialog.open', update);
            scope.$on(rootCtrl.namespace + '.dialog.closing', update);

            $animate.leave(currentElement);
        };

        return {
            link: postLink,
            priority: 100,
            require: '^dialogRoot',
            restrict: 'A',
            terminal: true,
            transclude: 'element'
        };
    }
]);

mod.directive('triDialogMask', [
    'dialogManager',
    'dialogConfig',
    function (dialogManager, dialogConfig) {
        var preLink = function (scope, element, attrs, rootCtrl) {
            element.addClass(rootCtrl.maskClass + ' ' + dialogConfig.maskClass);
        };

        var postLink = function (scope, element, attrs, rootCtrl) {
            element.on('click', function () {
                var upperDialog = dialogManager.getUpperDialog();
                if (upperDialog && !upperDialog.modal) {
                    rootCtrl.broadcast('close', upperDialog);
                    scope.$digest();
                }
            });
        };

        return {
            link: {
                pre: preLink,
                post: postLink
            },
            priority: -100,
            require: '^dialogRoot',
            restrict: 'A'
        };
    }
]);




// Source: src/directives/dialog-root.js
mod.directive('dialogRoot', [
    '$compile',
    '$rootScope',
    '$document',
    '$animate',
    'dialogConfig',
    'dialogManager',
    function ($compile, $rootScope, $document, $animate, dialogConfig, dialogManager) {

        $document.on('keydown keypress', function (event) {
            // kind'a imperative, but we do not know if ng-app/$rootElement is on body/html or not
            var upperDialog;
            if (event.which === 27 && dialogManager.dialogs.length) {
                upperDialog = dialogManager.getUpperDialog();
                $rootScope.$broadcast(upperDialog.namespace + '.dialog.close', upperDialog);
                $rootScope.$digest();
            }
        });

        var controller = function ($scope, $attrs, dialogConfig) {
            this.namespace = $attrs.dialogRoot || dialogConfig.mainNamespace;
            return angular.extend(this, {
                maskClass: this.namespace + '-' + dialogConfig.maskClass,
                rootClass: this.namespace + '-' + dialogConfig.rootClass,

                broadcast: function (eType, eData) {
                    //noinspection JSPotentiallyInvalidUsageOfThis
                    $scope.$broadcast(this.namespace + '.dialog.' + eType, eData);
                },

                listen: function (eType, eFn) {
                    //noinspection JSPotentiallyInvalidUsageOfThis
                    $scope.$on(this.namespace + '.dialog.' + eType, eFn);
                }

            });
        };

        var postLink = function (scope, element, attrs, dialogRootCtrl) {
            dialogRootCtrl.listen('open', function (e, dialog) {
                var dialogElement = angular.element('<section dialog="' + dialog.label + '"></section>');
                $animate.enter(dialogElement, element.addClass(dialogRootCtrl.rootClass));
                $compile(dialogElement)(scope);
                (!scope.$$phase) && scope.$digest(); // because user can trigger dialog inside $apply
            });
            dialogRootCtrl.listen('closing', function () {
                !dialogManager.hasAny(dialogRootCtrl.namespace) && element.removeClass(dialogRootCtrl.rootClass);
            });
        };

        var template = function (tElement) {
            tElement.append('<div tri:dialog-mask></div>');
        };

        return {
            controller: ['$scope', '$attrs', 'dialogConfig', controller],
            link: postLink,
            require: 'dialogRoot',
            restrict: 'A',
            template: template
        };
    }
]);

// Source: src/directives/dialog.js
mod.directive('dialog', [
    '$http',
    '$animate',
    '$compile',
    '$controller',
    '$templateCache',
    'dialogManager',
    'dialogConfig',
    'dialogUtilities',
    function ($http, $animate, $compile, $controller, $templateCache, dialogManager, dialogConfig, dialogUtilities) {

        var preLink = function () {};

        var postLink = function (scope, element, attrs, dialogRootCtrl) {

            var dialog = dialogManager.dialogs[attrs.dialog];

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
            var dialog = dialogManager.dialogs[tAttrs.dialog];
            tElement
                .addClass(dialogConfig.dialogClass + ' ' + dialog.dialogClass)
                .css({
                    zIndex: dialogConfig.baseZindex + (dialog.label + 1) * 2,
                    top: dialogUtilities.getTopOffset(dialog.topOffset)
                });
            return {
                pre: preLink,
                post: postLink
            };
        };

        return {
            compile: compile,
            require: '^dialogRoot',
            restrict: 'A',
            scope: true
        };
    }
]);

// Source: src/services/dialog-config.js
mod.constant('dialogConfig', {
    baseZindex: 3000,
    rootClass: 'dialog-root',
    maskClass: 'dialog-mask',
    dialogClass: 'dialog',
    mainNamespace: 'main'
});

// Source: src/services/dialog-data.js
mod.factory('dialogData', [
    '$log',
    'dialogConfig',
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

// Source: src/services/dialog-manager.js
mod.provider('dialogManager', [
    'dialogConfig',
    function (dialogConfig) {

        var DialogManagerService = function ($root, dialogConfig, dialogData) {

            var DialogManager = function DialogManager() {
                return angular.extend(this, {
                    dialogs: []
                });
            };

            angular.extend(DialogManager.prototype, {

                hasAny: function (namespace) {
                    return this.dialogs.some(function (dialog) {
                        return dialog.namespace === namespace;
                    });
                },

                getUpperDialog: function () {
                    var count = this.dialogs.length;
                    return count > 0 && this.dialogs[count - 1];
                },

                registerDialog: function (dialog) {
                    dialog.label = this.dialogs.push(dialog) - 1;
                    return dialog;
                },

                unRegisterDialog: function (label) {
                    var dialog = this.dialogs[label];
                    if (dialog && dialog.label === label) {
                        this.dialogs.splice(label, 1);
                        return true;
                    }
                    return false;
                },

                triggerDialog: function (config, data) {
                    config = config || {};
                    $root.$emit(
                        (config.namespace || dialogConfig.mainNamespace) + '.dialog.open',
                        this.registerDialog(dialogData(config, data))
                    );
                    return this;
                }
            });

            return new DialogManager();
        };

        return {

            config: function (cfg) {
                angular.extend(dialogConfig, cfg);
                return this;
            },

            $get: ['$rootScope', 'dialogConfig', 'dialogData', DialogManagerService]
        };
    }
]);

// Source: src/services/dialog-utilities.js
mod.service('dialogUtilities', [
    function () {
        var docBody = document.body;
        var docElem = document.documentElement;
        var DialogUtilities = function () {};

        angular.extend(DialogUtilities.prototype, {

            getViewportSize: (function (viewportStyle) {
                if (viewportStyle.isW3C) {
                    return function () {
                        return {
                            width: window.innerWidth,
                            height: window.innerHeight
                        };
                    };
                } else if (viewportStyle.isIE) {
                    return function () {
                        return {
                            width: docElem.clientWidth,
                            height: docElem.clientHeight
                        };
                    };
                }
                return function () {
                    return {
                        width: docBody.clientWidth,
                        height: docBody.clientHeight
                    };
                };
            }({
                /* jshint -W041 */
                isW3C: (typeof window.innerWidth != 'undefined'),

                /* jshint -W041 */
                isIE: (typeof docElem != 'undefined' &&
                    typeof docElem.clientWidth != 'undefined' &&
                    docElem.clientWidth != 0)
            })),

            getTopScroll: function () {
                return docBody.scrollTop || docElem.scrollTop;
            },

            getTopOffset: function (topOffset) {
                var _vh = this.getViewportSize().height;
                var _ts = this.getTopScroll();
                var _parsed = parseInt(topOffset, 10);

                if (angular.isUndefined(topOffset)) {
                    return _ts + _vh / 5 + 'px';
                } else if (!isNaN(_parsed)) {
                    if (angular.isString(topOffset) && topOffset.charAt(topOffset.length - 1) === '%') {
                        return _ts + _vh * _parsed / 100 + 'px';
                    }
                    return _ts + _parsed + 'px';
                }
                return _ts + 'px';

            }
        });

        return new DialogUtilities();
    }
]);

})(angular.module('triNgDialog', ['ng', 'ngAnimate']));