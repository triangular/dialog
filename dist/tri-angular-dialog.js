var tri;
(function (tri) {
    var dialog;
    (function (dialog) {
        'use strict';
        dialog.mod = angular.module('triNgDialog', [
            'ngAnimate'
        ]);
    })(dialog = tri.dialog || (tri.dialog = {}));
})(tri || (tri = {}));

var tri;
(function (tri) {
    var dialog;
    (function (dialog) {
        'use strict';
        dialog.mod.directive('triDialogMask', [
            '$animate',
            'triDialogConfig',
            'triDialogManager',
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
                            }
                            else {
                                currentElement = $transclude(function (clone) {
                                    $animate.enter(clone, root, element);
                                    updateZIndex(clone);
                                    if (previousElement) {
                                        previousElement.remove();
                                        previousElement = null;
                                    }
                                });
                            }
                        }
                        else if (currentElement) {
                            $animate.leave(currentElement, function () {
                                previousElement = null;
                            });
                            previousElement = currentElement;
                            currentElement = null;
                        }
                    };
                    scope.$on(rootCtrl.namespace + dialogConfig.eventCore + dialogConfig.eventOpen, update);
                    scope.$on(rootCtrl.namespace + dialogConfig.eventCore + dialogConfig.eventClosing, update);
                    $animate.leave(currentElement);
                };
                return {
                    link: postLink,
                    priority: 100,
                    require: '^triDialogRoot',
                    restrict: 'A',
                    terminal: true,
                    transclude: 'element'
                };
            }
        ]);
        dialog.mod.directive('triDialogMask', [
            'triDialogManager',
            'triDialogConfig',
            function (dialogManager, dialogConfig) {
                var preLink = function (scope, element, attrs, rootCtrl) {
                    element.addClass(rootCtrl.maskClass + ' ' + dialogConfig.maskClass);
                };
                var postLink = function (scope, element, attrs, rootCtrl) {
                    element.on('click', function () {
                        var upperDialog = dialogManager.getUpperDialog();
                        if (upperDialog && !upperDialog.modal) {
                            rootCtrl.broadcast(dialogConfig.eventClose, upperDialog);
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
                    require: '^triDialogRoot',
                    restrict: 'A'
                };
            }
        ]);
    })(dialog = tri.dialog || (tri.dialog = {}));
})(tri || (tri = {}));

var tri;
(function (tri) {
    var dialog;
    (function (dialog) {
        'use strict';
        dialog.mod.run([
            '$rootScope',
            '$document',
            'triDialogConfig',
            'triDialogManager',
            function ($rootScope, $document, dialogConfig, dialogManager) {
                // TODO: add some namespaces
                $document.on('keydown keypress', function (event) {
                    // kind'a imperative, but we do not know if ng-app/$rootElement is on body/html or not
                    var upperDialog;
                    if (event.which === 27 && dialogManager.dialogs.length) {
                        upperDialog = dialogManager.getUpperDialog();
                        if (!upperDialog.blockedDialog) {
                            $rootScope.$broadcast(upperDialog.namespace + dialogConfig.eventCore + dialogConfig.eventClose, upperDialog);
                            $rootScope.$digest();
                        }
                    }
                });
            }
        ]);
        dialog.mod.directive('triDialogRoot', [
            'triDialogConfig',
            'triDialogManager',
            function (dialogConfig, dialogManager) {
                var controller = function ($scope, $attrs, dialogConfig, dialogManager) {
                    this.namespace = $attrs.triDialogRoot || dialogConfig.mainNamespace;
                    dialogManager.registerRoot(this);
                    $scope.$on('$destroy', angular.bind(this, function () {
                        //noinspection JSPotentiallyInvalidUsageOfThis
                        dialogManager.unRegisterRoot(this);
                    }));
                    return angular.extend(this, {
                        maskClass: this.namespace + '-' + dialogConfig.maskClass,
                        rootClass: this.namespace + '-' + dialogConfig.rootClass,
                        dialogs: {},
                        broadcast: function (eType, eData) {
                            //noinspection JSPotentiallyInvalidUsageOfThis
                            $scope.$broadcast(this.namespace + dialogConfig.eventCore + eType, eData);
                        },
                        listen: function (eType, eFn) {
                            //noinspection JSPotentiallyInvalidUsageOfThis
                            $scope.$on(this.namespace + dialogConfig.eventCore + eType, eFn);
                        }
                    });
                };
                var postLink = function (scope, element, attrs, dialogRootCtrl) {
                    dialogRootCtrl.listen(dialogConfig.eventOpen, function () {
                        element.addClass(dialogRootCtrl.rootClass + ' ' + dialogConfig.rootClass);
                    });
                    dialogRootCtrl.listen(dialogConfig.eventClosing, function () {
                        if (!dialogManager.hasAny(dialogRootCtrl.namespace)) {
                            element.removeClass(dialogRootCtrl.rootClass + ' ' + dialogConfig.rootClass);
                        }
                    });
                };
                var template = function (tElement) {
                    tElement.append('<div tri:dialog-mask/><div tri:dialog/>');
                };
                return {
                    controller: ['$scope', '$attrs', 'triDialogConfig', 'triDialogManager', controller],
                    link: postLink,
                    require: 'triDialogRoot',
                    restrict: 'A',
                    template: template
                };
            }
        ]);
    })(dialog = tri.dialog || (tri.dialog = {}));
})(tri || (tri = {}));

var tri;
(function (tri) {
    var dialog;
    (function (dialog_1) {
        'use strict';
        triDialogManipulator.$inject =
            ['$animate', '$rootScope', '$controller', 'triDialogManager', 'triDialogConfig', 'triDialogUtilities'];
        function triDialogManipulator($animate, $rootScope, $controller, dialogManager, dialogConfig, dialogUtilities) {
            var postLink = function (scope, element, attrs, dialogRootCtrl, $transcludeFn) {
                dialogRootCtrl.listen(dialogConfig.eventOpen, function (e, dialog) {
                    var setController = function (clone, dialogScope) {
                        var dialogCtrl = $controller(dialog.controller, {
                            $dialog: dialog,
                            $data: dialog.data,
                            $scope: dialogScope
                        });
                        if (dialog.controllerAs) {
                            dialogScope[dialog.controllerAs] = dialogCtrl;
                        }
                        clone.data('$triDialogController', dialogCtrl);
                    };
                    var getCss = function () {
                        var css = {
                            zIndex: dialogConfig.baseZindex + (dialog.label + 1) * 2
                        };
                        if (dialogConfig.processTopOffset || dialog.topOffset != null) {
                            css.top = dialogUtilities.getTopOffset(dialog.topOffset);
                        }
                        return css;
                    };
                    $transcludeFn($rootScope.$new(), function (clone, dialogScope) {
                        if (dialog.controller) {
                            setController(clone, dialogScope);
                        }
                        else {
                            dialogScope.$dialog = dialog;
                        }
                        clone
                            .data('$triDialog', dialog)
                            .css(getCss())
                            .addClass(dialogConfig.dialogClass + ' ' + dialog.dialogClass);
                        dialogRootCtrl.dialogs[dialog.label] = clone;
                        $animate.enter(clone, element.parent(), element);
                    });
                });
                dialogRootCtrl.listen(dialogConfig.eventClose, function (e, closedDialog) {
                    var dialogElement = dialogRootCtrl.dialogs[closedDialog.label];
                    var dialogElementScope;
                    if (dialogElement && dialogElement.data('$triDialog') === closedDialog) {
                        dialogElementScope = dialogElement.scope();
                        $animate.leave(dialogElement, function () {
                            dialogElementScope.$destroy();
                            dialogElement.removeData().children().removeData();
                            closedDialog.destroy();
                            closedDialog = dialogElement = null;
                        });
                        delete dialogRootCtrl.dialogs[closedDialog.label];
                        dialogManager.unRegisterDialog(closedDialog.label);
                        dialogRootCtrl.broadcast(dialogConfig.eventClosing, closedDialog);
                    }
                });
            };
            return {
                link: postLink,
                require: '^triDialogRoot',
                restrict: 'A',
                scope: true,
                transclude: 'element',
                priority: 600
            };
        }
        triDialog.$inject = ['$log', '$http', '$compile', '$templateCache', 'triDialogConfig'];
        function triDialog($log, $http, $compile, $templateCache, dialogConfig) {
            var postLink = function (scope, element) {
                var dialog = element.data('$triDialog');
                var dialogCtrl = element.data('$triDialogController');
                $http
                    .get(dialog.templateUrl, {
                    cache: $templateCache
                })
                    .success(function (response) {
                    var innerLink;
                    element.html(response);
                    innerLink = $compile(element.contents());
                    if (dialogCtrl) {
                        element.children().data('$triDialogController', dialogCtrl);
                    }
                    innerLink(scope);
                    scope.$broadcast(dialogConfig.eventPrefix + dialogConfig.eventTemplate + dialogConfig.eventLoaded);
                })
                    .error(function () {
                    scope.$broadcast(dialogConfig.eventPrefix + dialogConfig.eventTemplate + dialogConfig.eventError);
                    $log.error(new Error('triDialog: could not load template!'));
                });
                scope.$broadcast(dialogConfig.eventPrefix + dialogConfig.eventTemplate + dialogConfig.eventRequested);
            };
            return {
                link: postLink,
                require: '^triDialogRoot',
                restrict: 'A'
            };
        }
        dialog_1.mod.directive('triDialog', triDialog);
        dialog_1.mod.directive('triDialog', triDialogManipulator);
    })(dialog = tri.dialog || (tri.dialog = {}));
})(tri || (tri = {}));

var tri;
(function (tri) {
    var dialog;
    (function (dialog) {
        'use strict';
        var triDialogConfig = {
            baseZindex: 3000,
            rootClass: 'dialog-root',
            maskClass: 'dialog-mask',
            dialogClass: 'dialog',
            mainNamespace: 'main',
            processTopOffset: false,
            eventCore: 'TriDialog',
            eventPrefix: 'triDialog',
            eventOpen: 'Open',
            eventClosing: 'Closing',
            eventClose: 'Close',
            eventLoaded: 'Loaded',
            eventError: 'Error',
            eventRequested: 'Requested',
            eventTemplate: 'Template'
        };
        dialog.mod.constant('triDialogConfig', triDialogConfig);
    })(dialog = tri.dialog || (tri.dialog = {}));
})(tri || (tri = {}));

var tri;
(function (tri) {
    var dialog;
    (function (dialog_1) {
        'use strict';
        var DialogManagerService = (function () {
            function DialogManagerService() {
                this.dialogs = [];
                this.roots = {};
            }
            DialogManagerService.prototype.hasAny = function (namespace) {
                return this.dialogs.some(function (dialog) { return dialog.namespace === namespace; });
            };
            DialogManagerService.prototype.getUpperDialog = function () {
                var count = this.dialogs.length;
                return count > 0 && this.dialogs[count - 1];
            };
            DialogManagerService.prototype.registerDialog = function (dialog) {
                dialog.label = this.dialogs.push(dialog) - 1;
                return dialog;
            };
            DialogManagerService.prototype.unRegisterDialog = function (label) {
                var dialog = this.dialogs[label];
                if (dialog && dialog.label === label) {
                    this.dialogs.splice(label, 1);
                    return true;
                }
                return false;
            };
            DialogManagerService.prototype.triggerDialog = function (dialog) {
                if (!this.roots.hasOwnProperty(dialog.namespace)) {
                    this.$_$log.error(new Error('TriDialog: rootCtrl ' + dialog.namespace + ' is not registered!'));
                    return this;
                }
                this.roots[dialog.namespace].broadcast(this.$_dialogConfig.eventOpen, this.registerDialog(dialog));
                return this;
            };
            DialogManagerService.prototype.closeDialog = function (dialog) {
                if (!this.roots.hasOwnProperty(dialog.namespace)) {
                    this.$_$log.error(new Error('TriDialog: rootCtrl ' + dialog.namespace + ' is not registered!'));
                    return this;
                }
                this.roots[dialog.namespace].broadcast(this.$_dialogConfig.eventClose, dialog);
                return this;
            };
            DialogManagerService.prototype.registerRoot = function (ctrl) {
                if (!ctrl.namespace) {
                    this.$_$log.error(new Error('TriDialog: rootCtrl has no namespace assigned!'));
                    return this;
                }
                if (this.roots.hasOwnProperty(ctrl.namespace)) {
                    this.$_$log.error(new Error('TriDialog: rootCtrl ' + ctrl.namespace + ' already registered!'));
                    return this;
                }
                this.roots[ctrl.namespace] = ctrl;
                return this;
            };
            DialogManagerService.prototype.unRegisterRoot = function (ctrl) {
                if (!this.roots.hasOwnProperty(ctrl.namespace)) {
                    this.$_$log.error(new Error('TriDialog: rootCtrl ' + ctrl.namespace + ' is not registered!'));
                    return this;
                }
                delete this.roots[ctrl.namespace];
                return this;
            };
            return DialogManagerService;
        })();
        dialog_1.mod.provider('triDialogManager', ['triDialogConfig', function (triDialogConfig) { return ({
                config: function (cfg) {
                    angular.extend(triDialogConfig, cfg);
                    return this;
                },
                $get: ['$log', 'triDialogConfig', function ($log, triDialogConfig) {
                        angular.extend(DialogManagerService.prototype, {
                            $_$log: $log,
                            $_dialogConfig: triDialogConfig
                        });
                        return new DialogManagerService();
                    }]
            }); }]);
    })(dialog = tri.dialog || (tri.dialog = {}));
})(tri || (tri = {}));

var tri;
(function (tri) {
    var dialog;
    (function (dialog) {
        'use strict';
        var docBody = document.body;
        var docElem = document.documentElement;
        /* tslint:disable:triple-equals */
        var viewportStyle = {
            isW3C: (typeof window.innerWidth != 'undefined'),
            isIE: (typeof docElem != 'undefined' && typeof docElem.clientWidth != 'undefined' && docElem.clientWidth != 0)
        };
        /* tslint:enable:triple-equals */
        var DialogUtilities = (function () {
            function DialogUtilities() {
            }
            DialogUtilities.prototype.getViewportSize = function () {
                if (viewportStyle.isW3C) {
                    return {
                        width: window.innerWidth,
                        height: window.innerHeight
                    };
                }
                if (viewportStyle.isIE) {
                    return {
                        width: docElem.clientWidth,
                        height: docElem.clientHeight
                    };
                }
                return {
                    width: docBody.clientWidth,
                    height: docBody.clientHeight
                };
            };
            DialogUtilities.prototype.getTopScroll = function () {
                return docBody.scrollTop || docElem.scrollTop;
            };
            DialogUtilities.prototype.getTopOffset = function (topOffset) {
                var _vh = this.getViewportSize().height;
                var _ts = this.getTopScroll();
                var _parsed = parseInt(topOffset, 10);
                if (topOffset == null) {
                    return _ts + _vh / 5 + 'px';
                }
                else if (!isNaN(_parsed)) {
                    if (angular.isString(topOffset) && topOffset.charAt(topOffset.length - 1) === '%') {
                        return _ts + _vh * _parsed / 100 + 'px';
                    }
                    return _ts + _parsed + 'px';
                }
                return _ts + 'px';
            };
            return DialogUtilities;
        })();
        dialog.mod.service('triDialogUtilities', DialogUtilities);
    })(dialog = tri.dialog || (tri.dialog = {}));
})(tri || (tri = {}));

var tri;
(function (tri) {
    var dialog;
    (function (dialog) {
        'use strict';
        var DialogData = (function () {
            function DialogData(config, data) {
                angular.extend(this, {
                    blockedDialog: false,
                    controller: null,
                    controllerAs: null,
                    dialogClass: '',
                    topOffset: null,
                    modal: false,
                    namespace: this.$_dialogConfig.mainNamespace,
                    templateUrl: null
                });
                if (!config.templateUrl) {
                    this.$_$log.error(new Error('triNgDialog.DialogData() - initialData must contain defined "templateUrl"'));
                }
                if (config.blockedDialog) {
                    this.modal = true;
                }
                angular.extend(this, config, { data: data });
            }
            DialogData.prototype.close = function () {
                this.$_dialogManager.closeDialog(this);
                return this;
            };
            DialogData.prototype.destroy = function () {
                var key;
                for (key in this) {
                    if (this.hasOwnProperty(key)) {
                        delete this[key];
                    }
                }
            };
            DialogData.prototype.trigger = function () {
                this.$_dialogManager.triggerDialog(this);
                return this;
            };
            return DialogData;
        })();
        dialog.mod.factory('triDialog', [
            '$log',
            'triDialogConfig',
            'triDialogManager',
            function ($log, dialogConfig, dialogManager) {
                angular.extend(DialogData.prototype, {
                    $_$log: $log,
                    $_dialogConfig: dialogConfig,
                    $_dialogManager: dialogManager
                });
                return function (config, data) { return new DialogData(config, data).trigger(); };
            }
        ]);
    })(dialog = tri.dialog || (tri.dialog = {}));
})(tri || (tri = {}));

//# sourceMappingURL=../dist/tri-angular-dialog.js.map