import './style.css';

; /* Start:"a:4:{s:4:"full";s:64:"/local/templates/ipromo/js/jquery.contextMenu.js?167774124881130";s:6:"source";s:48:"/local/templates/ipromo/js/jquery.contextMenu.js";s:3:"min";s:0:"";s:3:"map";s:0:"";}"*/
/*!
 * jQuery contextMenu v@VERSION - Plugin for simple contextMenu handling
 *
 * Version: v@VERSION
 *
 * Authors: Björn Brala (SWIS.nl), Rodney Rehm, Addy Osmani (patches for FF)
 * Web: http://swisnl.github.io/jQuery-contextMenu/
 *
 * Copyright (c) 2011-@YEAR SWIS BV and contributors
 *
 * Licensed under
 *   MIT License http://www.opensource.org/licenses/mit-license
 *   GPL v3 http://opensource.org/licenses/GPL-3.0
 *
 * Date: @DATE
 */

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as anonymous module.
        define(['jquery'], factory);
    } else if (typeof exports === 'object') {
        // Node / CommonJS
        factory(require('jquery'));
    } else {
        // Browser globals.
        factory(jQuery);
    }
})(function ($) {

    'use strict';

    // TODO: -
    // ARIA stuff: menuitem, menuitemcheckbox und menuitemradio
    // create <menu> structure if $.support[htmlCommand || htmlMenuitem] and !opt.disableNative

    // determine html5 compatibility
    $.support.htmlMenuitem = ('HTMLMenuItemElement' in window);
    $.support.htmlCommand = ('HTMLCommandElement' in window);
    $.support.eventSelectstart = ('onselectstart' in document.documentElement);
    /* // should the need arise, test for css user-select
     $.support.cssUserSelect = (function(){
     var t = false,
     e = document.createElement('div');

     $.each('Moz|Webkit|Khtml|O|ms|Icab|'.split('|'), function(i, prefix) {
     var propCC = prefix + (prefix ? 'U' : 'u') + 'serSelect',
     prop = (prefix ? ('-' + prefix.toLowerCase() + '-') : '') + 'user-select';

     e.style.cssText = prop + ': text;';
     if (e.style[propCC] == 'text') {
     t = true;
     return false;
     }

     return true;
     });

     return t;
     })();
     */

    /* jshint ignore:start */
    if (!$.ui || !$.widget) {
        // duck punch $.cleanData like jQueryUI does to get that remove event
        $.cleanData = (function (orig) {
            return function (elems) {
                var events, elem, i;
                for (i = 0; elems[i] != null; i++) {
                    elem = elems[i];
                    try {
                        // Only trigger remove when necessary to save time
                        events = $._data(elem, 'events');
                        if (events && events.remove) {
                            $(elem).triggerHandler('remove');
                        }

                        // Http://bugs.jquery.com/ticket/8235
                    } catch (e) {}
                }
                orig(elems);
            };
        })($.cleanData);
    }
    /* jshint ignore:end */

    var // currently active contextMenu trigger
        $currentTrigger = null,
    // is contextMenu initialized with at least one menu?
        initialized = false,
    // window handle
        $win = $(window),
    // number of registered menus
        counter = 0,
    // mapping selector to namespace
        namespaces = {},
    // mapping namespace to options
        menus = {},
    // custom command type handlers
        types = {},
    // default values
        defaults = {
            // selector of contextMenu trigger
            selector: null,
            // where to append the menu to
            appendTo: null,
            // method to trigger context menu ["right", "left", "hover"]
            trigger: 'right',
            // hide menu when mouse leaves trigger / menu elements
            autoHide: false,
            // ms to wait before showing a hover-triggered context menu
            delay: 200,
            // flag denoting if a second trigger should simply move (true) or rebuild (false) an open menu
            // as long as the trigger happened on one of the trigger-element's child nodes
            reposition: true,

            // Default classname configuration to be able avoid conflicts in frameworks
            classNames : {

                hover: 'context-menu-hover', // Item hover
                disabled: 'context-menu-disabled', // Item disabled
                visible: 'context-menu-visible', // Item visible
                notSelectable: 'context-menu-not-selectable', // Item not selectable

                icon: 'context-menu-icon',
                iconEdit: 'context-menu-icon-edit',
                iconCut: 'context-menu-icon-cut',
                iconCopy: 'context-menu-icon-copy',
                iconPaste: 'context-menu-icon-paste',
                iconDelete: 'context-menu-icon-delete',
                iconAdd: 'context-menu-icon-add',
                iconQuit: 'context-menu-icon-quit'
            },

            // determine position to show menu at
            determinePosition: function ($menu) {
                // position to the lower middle of the trigger element
                if ($.ui && $.ui.position) {
                    // .position() is provided as a jQuery UI utility
                    // (...and it won't work on hidden elements)
                    $menu.css('display', 'block').position({
                        my: 'center top',
                        at: 'center bottom',
                        of: this,
                        offset: '0 5',
                        collision: 'fit'
                    }).css('display', 'none');
                } else {
                    // determine contextMenu position
                    var offset = this.offset();
                    offset.top += this.outerHeight();
                    offset.left += this.outerWidth() / 2 - $menu.outerWidth() / 2;
                    $menu.css(offset);
                }
            },
            // position menu
            position: function (opt, x, y) {
                var offset;
                // determine contextMenu position
                if (!x && !y) {
                    opt.determinePosition.call(this, opt.$menu);
                    return;
                } else if (x === 'maintain' && y === 'maintain') {
                    // x and y must not be changed (after re-show on command click)
                    offset = opt.$menu.position();
                } else {
                    // x and y are given (by mouse event)
                    offset = {top: y, left: x};
                }

                // correct offset if viewport demands it
                var bottom = $win.scrollTop() + $win.height(),
                    right = $win.scrollLeft() + $win.width(),
                    height = opt.$menu.outerHeight(),
                    width = opt.$menu.outerWidth();

                if (offset.top + height > bottom) {
                    offset.top -= height;
                }

                if (offset.top < 0) {
                    offset.top = 0;
                }

                if (offset.left + width > right) {
                    offset.left -= width;
                }

                if (offset.left < 0) {
                    offset.left = 0;
                }

                opt.$menu.css(offset);
            },
            // position the sub-menu
            positionSubmenu: function ($menu) {
                if ($.ui && $.ui.position) {
                    // .position() is provided as a jQuery UI utility
                    // (...and it won't work on hidden elements)
                    $menu.css('display', 'block').position({
                        my: 'left top',
                        at: 'right top',
                        of: this,
                        collision: 'flipfit fit'
                    }).css('display', '');
                } else {
                    // determine contextMenu position
                    var offset = {
                        top: 0,
                        left: this.outerWidth()
                    };
                    $menu.css(offset);
                }
            },
            // offset to add to zIndex
            zIndex: 1,
            // show hide animation settings
            animation: {
                duration: 50,
                show: 'slideDown',
                hide: 'slideUp'
            },
            // events
            events: {
                show: $.noop,
                hide: $.noop
            },
            // default callback
            callback: null,
            // list of contextMenu items
            items: {}
        },
    // mouse position for hover activation
        hoveract = {
            timer: null,
            pageX: null,
            pageY: null
        },
    // determine zIndex
        zindex = function ($t) {
            var zin = 0,
                $tt = $t;

            while (true) {
                zin = Math.max(zin, parseInt($tt.css('z-index'), 10) || 0);
                $tt = $tt.parent();
                if (!$tt || !$tt.length || 'html body'.indexOf($tt.prop('nodeName').toLowerCase()) > -1) {
                    break;
                }
            }
            return zin;
        },
    // event handlers
        handle = {
            // abort anything
            abortevent: function (e) {
                e.preventDefault();
                e.stopImmediatePropagation();
            },
            // contextmenu show dispatcher
            contextmenu: function (e) {
                var $this = $(this);

                // disable actual context-menu if we are using the right mouse button as the trigger
                if (e.data.trigger === 'right') {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                }

                // abort native-triggered events unless we're triggering on right click
                if ((e.data.trigger !== 'right' && e.data.trigger !== 'demand') && e.originalEvent) {
                    return;
                }

                // Let the current contextmenu decide if it should show or not based on its own trigger settings
                if (e.mouseButton !== undefined && e.data) {
                    if (!(e.data.trigger === 'left' && e.mouseButton === 0) && !(e.data.trigger === 'right' && e.mouseButton === 2)) {
                        // Mouse click is not valid.
                        return;
                    }
                }

                // abort event if menu is visible for this trigger
                if ($this.hasClass('context-menu-active')) {
                    return;
                }

                if (!$this.hasClass('context-menu-disabled')) {
                    // theoretically need to fire a show event at <menu>
                    // http://www.whatwg.org/specs/web-apps/current-work/multipage/interactive-elements.html#context-menus
                    // var evt = jQuery.Event("show", { data: data, pageX: e.pageX, pageY: e.pageY, relatedTarget: this });
                    // e.data.$menu.trigger(evt);

                    $currentTrigger = $this;
                    if (e.data.build) {
                        var built = e.data.build($currentTrigger, e);
                        // abort if build() returned false
                        if (built === false) {
                            return;
                        }

                        // dynamically build menu on invocation
                        e.data = $.extend(true, {}, defaults, e.data, built || {});

                        // abort if there are no items to display
                        if (!e.data.items || $.isEmptyObject(e.data.items)) {
                            // Note: jQuery captures and ignores errors from event handlers
                            if (window.console) {
                                (console.error || console.log).call(console, 'No items specified to show in contextMenu');
                            }

                            throw new Error('No Items specified');
                        }

                        // backreference for custom command type creation
                        e.data.$trigger = $currentTrigger;

                        op.create(e.data);
                    }
                    var showMenu = false;
                    for (var item in e.data.items) {
                        if (e.data.items.hasOwnProperty(item)) {
                            var visible;
                            if ($.isFunction(e.data.items[item].visible)) {
                                visible = e.data.items[item].visible.call($(e.currentTarget), item, e.data);
                            } else if (typeof item.visible !== 'undefined') {
                                visible = e.data.items[item].visible === true;
                            } else {
                                visible = true;
                            }
                            if (visible) {
                                showMenu = true;
                            }
                        }
                    }
                    if (showMenu) {
                        // show menu
                        op.show.call($this, e.data, e.pageX, e.pageY);
                    }
                }
            },
            // contextMenu left-click trigger
            click: function (e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                $(this).trigger($.Event('contextmenu', {data: e.data, pageX: e.pageX, pageY: e.pageY}));
            },
            // contextMenu right-click trigger
            mousedown: function (e) {
                // register mouse down
                var $this = $(this);

                // hide any previous menus
                if ($currentTrigger && $currentTrigger.length && !$currentTrigger.is($this)) {
                    $currentTrigger.data('contextMenu').$menu.trigger('contextmenu:hide');
                }

                // activate on right click
                if (e.button === 2) {
                    $currentTrigger = $this.data('contextMenuActive', true);
                }
            },
            // contextMenu right-click trigger
            mouseup: function (e) {
                // show menu
                var $this = $(this);
                if ($this.data('contextMenuActive') && $currentTrigger && $currentTrigger.length && $currentTrigger.is($this) && !$this.hasClass('context-menu-disabled')) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    $currentTrigger = $this;
                    $this.trigger($.Event('contextmenu', {data: e.data, pageX: e.pageX, pageY: e.pageY}));
                }

                $this.removeData('contextMenuActive');
            },
            // contextMenu hover trigger
            mouseenter: function (e) {
                var $this = $(this),
                    $related = $(e.relatedTarget),
                    $document = $(document);

                // abort if we're coming from a menu
                if ($related.is('.context-menu-list') || $related.closest('.context-menu-list').length) {
                    return;
                }

                // abort if a menu is shown
                if ($currentTrigger && $currentTrigger.length) {
                    return;
                }

                hoveract.pageX = e.pageX;
                hoveract.pageY = e.pageY;
                hoveract.data = e.data;
                $document.on('mousemove.contextMenuShow', handle.mousemove);
                hoveract.timer = setTimeout(function () {
                    hoveract.timer = null;
                    $document.off('mousemove.contextMenuShow');
                    $currentTrigger = $this;
                    $this.trigger($.Event('contextmenu', {
                        data: hoveract.data,
                        pageX: hoveract.pageX,
                        pageY: hoveract.pageY
                    }));
                }, e.data.delay);
            },
            // contextMenu hover trigger
            mousemove: function (e) {
                hoveract.pageX = e.pageX;
                hoveract.pageY = e.pageY;
            },
            // contextMenu hover trigger
            mouseleave: function (e) {
                // abort if we're leaving for a menu
                var $related = $(e.relatedTarget);
                if ($related.is('.context-menu-list') || $related.closest('.context-menu-list').length) {
                    return;
                }

                try {
                    clearTimeout(hoveract.timer);
                } catch (e) {
                }

                hoveract.timer = null;
            },
            // click on layer to hide contextMenu
            layerClick: function (e) {
                var $this = $(this),
                    root = $this.data('contextMenuRoot'),
                    button = e.button,
                    x = e.pageX,
                    y = e.pageY,
                    target,
                    offset;

                e.preventDefault();
                e.stopImmediatePropagation();

                setTimeout(function () {
                    var $window;
                    var triggerAction = ((root.trigger === 'left' && button === 0) || (root.trigger === 'right' && button === 2));

                    // find the element that would've been clicked, wasn't the layer in the way
                    if (document.elementFromPoint && root.$layer) {
                        root.$layer.hide();
                        target = document.elementFromPoint(x - $win.scrollLeft(), y - $win.scrollTop());
                        root.$layer.show();
                    }

                    if (root.reposition && triggerAction) {
                        if (document.elementFromPoint) {
                            if (root.$trigger.is(target) || root.$trigger.has(target).length) {
                                root.position.call(root.$trigger, root, x, y);
                                return;
                            }
                        } else {
                            offset = root.$trigger.offset();
                            $window = $(window);
                            // while this looks kinda awful, it's the best way to avoid
                            // unnecessarily calculating any positions
                            offset.top += $window.scrollTop();
                            if (offset.top <= e.pageY) {
                                offset.left += $window.scrollLeft();
                                if (offset.left <= e.pageX) {
                                    offset.bottom = offset.top + root.$trigger.outerHeight();
                                    if (offset.bottom >= e.pageY) {
                                        offset.right = offset.left + root.$trigger.outerWidth();
                                        if (offset.right >= e.pageX) {
                                            // reposition
                                            root.position.call(root.$trigger, root, x, y);
                                            return;
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if (target && triggerAction) {
                        root.$trigger.one('contextmenu:hidden', function () {
                            $(target).contextMenu({ x: x, y: y, button: button });
                        });
                    }

                    if (root != null && root.$menu != null) {
                        root.$menu.trigger('contextmenu:hide');
                    }
                }, 50);
            },
            // key handled :hover
            keyStop: function (e, opt) {
                if (!opt.isInput) {
                    e.preventDefault();
                }

                e.stopPropagation();
            },
            key: function (e) {

                var opt = {};

                // Only get the data from $currentTrigger if it exists
                if ($currentTrigger) {
                    opt = $currentTrigger.data('contextMenu') || {};
                }
                // If the trigger happen on a element that are above the contextmenu do this
                if (opt.zIndex === undefined) {
                    opt.zIndex = 0;
				}
                var targetZIndex = 0;
                var getZIndexOfTriggerTarget = function (target) {
					if (target.style.zIndex !== '') {
						targetZIndex = target.style.zIndex;
					} else {
						if (target.offsetParent !== null && target.offsetParent !== undefined) {
							getZIndexOfTriggerTarget(target.offsetParent);
						}
						else if (target.parentElement !== null && target.parentElement !== undefined) {
							getZIndexOfTriggerTarget(target.parentElement);
						}
					}
                };
                getZIndexOfTriggerTarget(e.target);
                // If targetZIndex is heigher then opt.zIndex dont progress any futher.
                // This is used to make sure that if you are using a dialog with a input / textarea / contenteditable div
                // and its above the contextmenu it wont steal keys events
                if (targetZIndex > opt.zIndex) {
                    return;
				}
                switch (e.keyCode) {
                    case 9:
                    case 38: // up
                        handle.keyStop(e, opt);
                        // if keyCode is [38 (up)] or [9 (tab) with shift]
                        if (opt.isInput) {
                            if (e.keyCode === 9 && e.shiftKey) {
                                e.preventDefault();
                                if(opt.$selected) {
                                    opt.$selected.find('input, textarea, select').blur();
                                }
                                opt.$menu.trigger('prevcommand');
                                return;
                            } else if (e.keyCode === 38 && opt.$selected.find('input, textarea, select').prop('type') === 'checkbox') {
                                // checkboxes don't capture this key
                                e.preventDefault();
                                return;
                            }
                        } else if (e.keyCode !== 9 || e.shiftKey) {
                            opt.$menu.trigger('prevcommand');
                            return;
                        }
                        break;
                    // omitting break;
                    // case 9: // tab - reached through omitted break;
                    case 40: // down
                        handle.keyStop(e, opt);
                        if (opt.isInput) {
                            if (e.keyCode === 9) {
                                e.preventDefault();
                                if(opt.$selected) {
                                    opt.$selected.find('input, textarea, select').blur();
                                }
                                opt.$menu.trigger('nextcommand');
                                return;
                            } else if (e.keyCode === 40 && opt.$selected.find('input, textarea, select').prop('type') === 'checkbox') {
                                // checkboxes don't capture this key
                                e.preventDefault();
                                return;
                            }
                        } else {
                            opt.$menu.trigger('nextcommand');
                            return;
                        }
                        break;

                    case 37: // left
                        handle.keyStop(e, opt);
                        if (opt.isInput || !opt.$selected || !opt.$selected.length) {
                            break;
                        }

                        if (!opt.$selected.parent().hasClass('context-menu-root')) {
                            var $parent = opt.$selected.parent().parent();
                            opt.$selected.trigger('contextmenu:blur');
                            opt.$selected = $parent;
                            return;
                        }
                        break;

                    case 39: // right
                        handle.keyStop(e, opt);
                        if (opt.isInput || !opt.$selected || !opt.$selected.length) {
                            break;
                        }

                        var itemdata = opt.$selected.data('contextMenu') || {};
                        if (itemdata.$menu && opt.$selected.hasClass('context-menu-submenu')) {
                            opt.$selected = null;
                            itemdata.$selected = null;
                            itemdata.$menu.trigger('nextcommand');
                            return;
                        }
                        break;

                    case 35: // end
                    case 36: // home
                        if (opt.$selected && opt.$selected.find('input, textarea, select').length) {
                            return;
                        } else {
                            (opt.$selected && opt.$selected.parent() || opt.$menu)
                                .children(':not(.' + opt.classNames.disabled + ', .' + opt.classNames.notSelectable + ')')[e.keyCode === 36 ? 'first' : 'last']()
                                .trigger('contextmenu:focus');
                            e.preventDefault();
                            return;
                        }
                        break;

                    case 13: // enter
                        handle.keyStop(e, opt);
                        if (opt.isInput) {
                            if (opt.$selected && !opt.$selected.is('textarea, select')) {
                                e.preventDefault();
                                return;
                            }
                            break;
                        }
                        if (typeof opt.$selected !== 'undefined' && opt.$selected !== null) {
                            opt.$selected.trigger('mouseup');
                        }
                        return;

                    case 32: // space
                    case 33: // page up
                    case 34: // page down
                        // prevent browser from scrolling down while menu is visible
                        handle.keyStop(e, opt);
                        return;

                    case 27: // esc
                        handle.keyStop(e, opt);
                        opt.$menu.trigger('contextmenu:hide');
                        return;

                    default: // 0-9, a-z
                        var k = (String.fromCharCode(e.keyCode)).toUpperCase();
                        if (opt.accesskeys && opt.accesskeys[k]) {
                            // according to the specs accesskeys must be invoked immediately
                            opt.accesskeys[k].$node.trigger(opt.accesskeys[k].$menu ? 'contextmenu:focus' : 'mouseup');
                            return;
                        }
                        break;
                }
                // pass event to selected item,
                // stop propagation to avoid endless recursion
                e.stopPropagation();
                if (typeof opt.$selected !== 'undefined' && opt.$selected !== null) {
                    opt.$selected.trigger(e);
                }
            },
            // select previous possible command in menu
            prevItem: function (e) {
                e.stopPropagation();
                var opt = $(this).data('contextMenu') || {};
                var root = $(this).data('contextMenuRoot') || {};

                // obtain currently selected menu
                if (opt.$selected) {
                    var $s = opt.$selected;
                    opt = opt.$selected.parent().data('contextMenu') || {};
                    opt.$selected = $s;
                }

                var $children = opt.$menu.children(),
                    $prev = !opt.$selected || !opt.$selected.prev().length ? $children.last() : opt.$selected.prev(),
                    $round = $prev;

                // skip disabled or hidden elements
                while ($prev.hasClass(root.classNames.disabled) || $prev.hasClass(root.classNames.notSelectable) || $prev.is(':hidden')) {
                    if ($prev.prev().length) {
                        $prev = $prev.prev();
                    } else {
                        $prev = $children.last();
                    }
                    if ($prev.is($round)) {
                        // break endless loop
                        return;
                    }
                }

                // leave current
                if (opt.$selected) {
                    handle.itemMouseleave.call(opt.$selected.get(0), e);
                }

                // activate next
                handle.itemMouseenter.call($prev.get(0), e);

                // focus input
                var $input = $prev.find('input, textarea, select');
                if ($input.length) {
                    $input.focus();
                }
            },
            // select next possible command in menu
            nextItem: function (e) {
                e.stopPropagation();
                var opt = $(this).data('contextMenu') || {};
                var root = $(this).data('contextMenuRoot') || {};

                // obtain currently selected menu
                if (opt.$selected) {
                    var $s = opt.$selected;
                    opt = opt.$selected.parent().data('contextMenu') || {};
                    opt.$selected = $s;
                }

                var $children = opt.$menu.children(),
                    $next = !opt.$selected || !opt.$selected.next().length ? $children.first() : opt.$selected.next(),
                    $round = $next;

                // skip disabled
                while ($next.hasClass(root.classNames.disabled) || $next.hasClass(root.classNames.notSelectable) || $next.is(':hidden')) {
                    if ($next.next().length) {
                        $next = $next.next();
                    } else {
                        $next = $children.first();
                    }
                    if ($next.is($round)) {
                        // break endless loop
                        return;
                    }
                }

                // leave current
                if (opt.$selected) {
                    handle.itemMouseleave.call(opt.$selected.get(0), e);
                }

                // activate next
                handle.itemMouseenter.call($next.get(0), e);

                // focus input
                var $input = $next.find('input, textarea, select');
                if ($input.length) {
                    $input.focus();
                }
            },
            // flag that we're inside an input so the key handler can act accordingly
            focusInput: function () {
                var $this = $(this).closest('.context-menu-item'),
                    data = $this.data(),
                    opt = data.contextMenu,
                    root = data.contextMenuRoot;

                root.$selected = opt.$selected = $this;
                root.isInput = opt.isInput = true;
            },
            // flag that we're inside an input so the key handler can act accordingly
            blurInput: function () {
                var $this = $(this).closest('.context-menu-item'),
                    data = $this.data(),
                    opt = data.contextMenu,
                    root = data.contextMenuRoot;

                root.isInput = opt.isInput = false;
            },
            // :hover on menu
            menuMouseenter: function () {
                var root = $(this).data().contextMenuRoot;
                root.hovering = true;
            },
            // :hover on menu
            menuMouseleave: function (e) {
                var root = $(this).data().contextMenuRoot;
                if (root.$layer && root.$layer.is(e.relatedTarget)) {
                    root.hovering = false;
                }
            },
            // :hover done manually so key handling is possible
            itemMouseenter: function (e) {
                var $this = $(this),
                    data = $this.data(),
                    opt = data.contextMenu,
                    root = data.contextMenuRoot;

                root.hovering = true;

                // abort if we're re-entering
                if (e && root.$layer && root.$layer.is(e.relatedTarget)) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                }

                // make sure only one item is selected
                (opt.$menu ? opt : root).$menu
                    .children('.' + root.classNames.hover).trigger('contextmenu:blur')
                    .children('.hover').trigger('contextmenu:blur');

                if ($this.hasClass(root.classNames.disabled) || $this.hasClass(root.classNames.notSelectable)) {
                    opt.$selected = null;
                    return;
                }

                $this.trigger('contextmenu:focus');
            },
            // :hover done manually so key handling is possible
            itemMouseleave: function (e) {
                var $this = $(this),
                    data = $this.data(),
                    opt = data.contextMenu,
                    root = data.contextMenuRoot;

                if (root !== opt && root.$layer && root.$layer.is(e.relatedTarget)) {
                    if (typeof root.$selected !== 'undefined' && root.$selected !== null) {
                        root.$selected.trigger('contextmenu:blur');
                    }
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    root.$selected = opt.$selected = opt.$node;
                    return;
                }

                $this.trigger('contextmenu:blur');
            },
            // contextMenu item click
            itemClick: function (e) {
                var $this = $(this),
                    data = $this.data(),
                    opt = data.contextMenu,
                    root = data.contextMenuRoot,
                    key = data.contextMenuKey,
                    callback;

                // abort if the key is unknown or disabled or is a menu
                if (!opt.items[key] || $this.is('.' + root.classNames.disabled + ', .context-menu-submenu, .context-menu-separator, .' + root.classNames.notSelectable)) {
                    return;
                }

                e.preventDefault();
                e.stopImmediatePropagation();

                if ($.isFunction(opt.callbacks[key]) && Object.prototype.hasOwnProperty.call(opt.callbacks, key)) {
                    // item-specific callback
                    callback = opt.callbacks[key];
                } else if ($.isFunction(root.callback)) {
                    // default callback
                    callback = root.callback;
                } else {
                    // no callback, no action
                    return;
                }

                // hide menu if callback doesn't stop that
                if (callback.call(root.$trigger, key, root) !== false) {
                    root.$menu.trigger('contextmenu:hide');
                } else if (root.$menu.parent().length) {
                    op.update.call(root.$trigger, root);
                }
            },
            // ignore click events on input elements
            inputClick: function (e) {
                e.stopImmediatePropagation();
            },
            // hide <menu>
            hideMenu: function (e, data) {
                var root = $(this).data('contextMenuRoot');
                op.hide.call(root.$trigger, root, data && data.force);
            },
            // focus <command>
            focusItem: function (e) {
                e.stopPropagation();
                var $this = $(this),
                    data = $this.data(),
                    opt = data.contextMenu,
                    root = data.contextMenuRoot;

                if ($this.hasClass(root.classNames.disabled) || $this.hasClass(root.classNames.notSelectable)) {
                    return;
                }

                $this
                    .addClass([root.classNames.hover, root.classNames.visible].join(' '))
                    // select other items and included items
                    .parent().find('.context-menu-item').not($this)
                    .removeClass(root.classNames.visible)
                    .filter('.' + root.classNames.hover)
                    .trigger('contextmenu:blur');

                // remember selected
                opt.$selected = root.$selected = $this;

                // position sub-menu - do after show so dumb $.ui.position can keep up
                if (opt.$node) {
                    root.positionSubmenu.call(opt.$node, opt.$menu);
                }
            },
            // blur <command>
            blurItem: function (e) {
                e.stopPropagation();
                var $this = $(this),
                    data = $this.data(),
                    opt = data.contextMenu,
                    root = data.contextMenuRoot;

                if (opt.autoHide) { // for tablets and touch screens this needs to remain
                    $this.removeClass(root.classNames.visible);
                }
                $this.removeClass(root.classNames.hover);
                opt.$selected = null;
            }
        },
    // operations
        op = {
            show: function (opt, x, y) {
                var $trigger = $(this),
                    css = {};

                // hide any open menus
                $('#context-menu-layer').trigger('mousedown');

                // backreference for callbacks
                opt.$trigger = $trigger;

                // show event
                if (opt.events.show.call($trigger, opt) === false) {
                    $currentTrigger = null;
                    return;
                }

                // create or update context menu
                op.update.call($trigger, opt);

                // position menu
                opt.position.call($trigger, opt, x, y);

                // make sure we're in front
                if (opt.zIndex) {
                  var additionalZValue = opt.zIndex;
                  // If opt.zIndex is a function, call the function to get the right zIndex.
                  if (typeof opt.zIndex === 'function') {
                      additionalZValue = opt.zIndex.call($trigger, opt);
                  }
                  css.zIndex = zindex($trigger) + additionalZValue;
                }

                // add layer
                op.layer.call(opt.$menu, opt, css.zIndex);

                // adjust sub-menu zIndexes
                opt.$menu.find('ul').css('zIndex', css.zIndex + 1);

                // position and show context menu
                opt.$menu.css(css)[opt.animation.show](opt.animation.duration, function () {
                    $trigger.trigger('contextmenu:visible');
                });
                // make options available and set state
                $trigger
                    .data('contextMenu', opt)
                    .addClass('context-menu-active');

                // register key handler
                $(document).off('keydown.contextMenu').on('keydown.contextMenu', handle.key);
                // register autoHide handler
                if (opt.autoHide) {
                    // mouse position handler
                    $(document).on('mousemove.contextMenuAutoHide', function (e) {
                        // need to capture the offset on mousemove,
                        // since the page might've been scrolled since activation
                        var pos = $trigger.offset();
                        pos.right = pos.left + $trigger.outerWidth();
                        pos.bottom = pos.top + $trigger.outerHeight();

                        if (opt.$layer && !opt.hovering && (!(e.pageX >= pos.left && e.pageX <= pos.right) || !(e.pageY >= pos.top && e.pageY <= pos.bottom))) {
                            /* Additional hover check after short time, you might just miss the edge of the menu */
                            setTimeout(function () {
                                if (!opt.hovering && opt.$menu != null) { opt.$menu.trigger('contextmenu:hide'); }
                            }, 50);
                        }
                    });
                }
            },
            hide: function (opt, force) {
                var $trigger = $(this);
                if (!opt) {
                    opt = $trigger.data('contextMenu') || {};
                }

                // hide event
                if (!force && opt.events && opt.events.hide.call($trigger, opt) === false) {
                    return;
                }

                // remove options and revert state
                $trigger
                    .removeData('contextMenu')
                    .removeClass('context-menu-active');

                if (opt.$layer) {
                    // keep layer for a bit so the contextmenu event can be aborted properly by opera
                    setTimeout((function ($layer) {
                        return function () {
                            $layer.remove();
                        };
                    })(opt.$layer), 10);

                    try {
                        delete opt.$layer;
                    } catch (e) {
                        opt.$layer = null;
                    }
                }

                // remove handle
                $currentTrigger = null;
                // remove selected
                opt.$menu.find('.' + opt.classNames.hover).trigger('contextmenu:blur');
                opt.$selected = null;
                // collapse all submenus
                opt.$menu.find('.' + opt.classNames.visible).removeClass(opt.classNames.visible);
                // unregister key and mouse handlers
                // $(document).off('.contextMenuAutoHide keydown.contextMenu'); // http://bugs.jquery.com/ticket/10705
                $(document).off('.contextMenuAutoHide').off('keydown.contextMenu');
                // hide menu
                if(opt.$menu){
                    opt.$menu[opt.animation.hide](opt.animation.duration, function () {
                        // tear down dynamically built menu after animation is completed.
                        if (opt.build) {
                            opt.$menu.remove();
                            $.each(opt, function (key) {
                                switch (key) {
                                    case 'ns':
                                    case 'selector':
                                    case 'build':
                                    case 'trigger':
                                        return true;

                                    default:
                                        opt[key] = undefined;
                                        try {
                                            delete opt[key];
                                        } catch (e) {
                                        }
                                        return true;
                                }
                            });
                        }

                        setTimeout(function () {
                            $trigger.trigger('contextmenu:hidden');
                        }, 10);
                    });
                }
            },
            create: function (opt, root) {
                if (root === undefined) {
                    root = opt;
                }
                // create contextMenu
                opt.$menu = $('<ul class="context-menu-list"></ul>').addClass(opt.className || '').data({
                    'contextMenu': opt,
                    'contextMenuRoot': root
                });

                $.each(['callbacks', 'commands', 'inputs'], function (i, k) {
                    opt[k] = {};
                    if (!root[k]) {
                        root[k] = {};
                    }
                });

                if(!root.accesskeys){
                    root.accesskeys = {};
                }

                function createNameNode(item) {
                    var $name = $('<span></span>');
                    if (item._accesskey) {
                        if (item._beforeAccesskey) {
                            $name.append(document.createTextNode(item._beforeAccesskey));
                        }
                        $('<span></span>')
                            .addClass('context-menu-accesskey')
                            .text(item._accesskey)
                            .appendTo($name);
                        if (item._afterAccesskey) {
                            $name.append(document.createTextNode(item._afterAccesskey));
                        }
                    } else {
                        if (item.isHtmlName) {
                            // restrict use with access keys
                            if (typeof item.accesskey !== 'undefined') {
                                throw new Error('accesskeys are not compatible with HTML names and cannot be used together in the same item');
                            }
                            $name.html(item.name);
                        } else {
                            $name.text(item.name);
                        }
                    }
                    return $name;
                }

                // create contextMenu items
                $.each(opt.items, function (key, item) {
                    var $t = $('<li class="context-menu-item"></li>').addClass(item.className || ''),
                        $label = null,
                        $input = null;

                    // iOS needs to see a click-event bound to an element to actually
                    // have the TouchEvents infrastructure trigger the click event
                    $t.on('click', $.noop);

                    // Make old school string seperator a real item so checks wont be
                    // akward later.
                    // And normalize 'cm_separator' into 'cm_seperator'.
                    if (typeof item === 'string' || item.type === 'cm_separator') {
                        item = { type : 'cm_seperator' };
                    }

                    item.$node = $t.data({
                        'contextMenu': opt,
                        'contextMenuRoot': root,
                        'contextMenuKey': key
                    });

                    // register accesskey
                    // NOTE: the accesskey attribute should be applicable to any element, but Safari5 and Chrome13 still can't do that
                    if (typeof item.accesskey !== 'undefined') {
                        var aks = splitAccesskey(item.accesskey);
                        for (var i = 0, ak; ak = aks[i]; i++) {
                            if (!root.accesskeys[ak]) {
                                root.accesskeys[ak] = item;
                                var matched = item.name.match(new RegExp('^(.*?)(' + ak + ')(.*)$', 'i'));
                                if (matched) {
                                    item._beforeAccesskey = matched[1];
                                    item._accesskey = matched[2];
                                    item._afterAccesskey = matched[3];
                                }
                                break;
                            }
                        }
                    }

                    if (item.type && types[item.type]) {
                        // run custom type handler
                        types[item.type].call($t, item, opt, root);
                        // register commands
                        $.each([opt, root], function (i, k) {
                            k.commands[key] = item;
                            // Overwrite only if undefined or the item is appended to the root. This so it
                            // doesn't overwrite callbacks of root elements if the name is the same.
                            if ($.isFunction(item.callback) && (k.callbacks[key] === undefined || opt.type === undefined)) {
                                k.callbacks[key] = item.callback;
                            }
                        });
                    } else {
                        // add label for input
                        if (item.type === 'cm_seperator') {
                            $t.addClass('context-menu-separator ' + root.classNames.notSelectable);
                        } else if (item.type === 'html') {
                            $t.addClass('context-menu-html ' + root.classNames.notSelectable);
                        } else if (item.type) {
                            $label = $('<label></label>').appendTo($t);
                            createNameNode(item).appendTo($label);

                            $t.addClass('context-menu-input');
                            opt.hasTypes = true;
                            $.each([opt, root], function (i, k) {
                                k.commands[key] = item;
                                k.inputs[key] = item;
                            });
                        } else if (item.items) {
                            item.type = 'sub';
                        }

                        switch (item.type) {
                            case 'cm_seperator':
                                break;

                            case 'text':
                                $input = $('<input type="text" value="1" name="" value="">')
                                    .attr('name', 'context-menu-input-' + key)
                                    .val(item.value || '')
                                    .appendTo($label);
                                break;

                            case 'textarea':
                                $input = $('<textarea name=""></textarea>')
                                    .attr('name', 'context-menu-input-' + key)
                                    .val(item.value || '')
                                    .appendTo($label);

                                if (item.height) {
                                    $input.height(item.height);
                                }
                                break;

                            case 'checkbox':
                                $input = $('<input type="checkbox" value="1" name="" value="">')
                                    .attr('name', 'context-menu-input-' + key)
                                    .val(item.value || '')
                                    .prop('checked', !!item.selected)
                                    .prependTo($label);
                                break;

                            case 'radio':
                                $input = $('<input type="radio" value="1" name="" value="">')
                                    .attr('name', 'context-menu-input-' + item.radio)
                                    .val(item.value || '')
                                    .prop('checked', !!item.selected)
                                    .prependTo($label);
                                break;

                            case 'select':
                                $input = $('<select name="">')
                                    .attr('name', 'context-menu-input-' + key)
                                    .appendTo($label);
                                if (item.options) {
                                    $.each(item.options, function (value, text) {
                                        $('<option></option>').val(value).text(text).appendTo($input);
                                    });
                                    $input.val(item.selected);
                                }
                                break;

                            case 'sub':
                                createNameNode(item).appendTo($t);

                                item.appendTo = item.$node;
                                op.create(item, root);
                                $t.data('contextMenu', item).addClass('context-menu-submenu');
                                item.callback = null;
                                break;

                            case 'html':
                                $(item.html).appendTo($t);
                                break;

                            default:
                                $.each([opt, root], function (i, k) {
                                    k.commands[key] = item;
                                    // Overwrite only if undefined or the item is appended to the root. This so it
                                    // doesn't overwrite callbacks of root elements if the name is the same.
                                    if ($.isFunction(item.callback) && (k.callbacks[key] === undefined || opt.type === undefined)) {
                                        k.callbacks[key] = item.callback;
                                    }
                                });
                                createNameNode(item).appendTo($t);
                                break;
                        }

                        // disable key listener in <input>
                        if (item.type && item.type !== 'sub' && item.type !== 'html' && item.type !== 'cm_seperator') {
                            $input
                                .on('focus', handle.focusInput)
                                .on('blur', handle.blurInput);

                            if (item.events) {
                                $input.on(item.events, opt);
                            }
                        }

                        // add icons
                        if (item.icon) {
                            if ($.isFunction(item.icon)) {
                                item._icon = item.icon.call(this, this, $t, key, item);
                            } else {
                                if ( typeof(item.icon) === 'string' && item.icon.substring(0,3) == 'fa-' ) {
                                    // to enable font awesome
                                    item._icon = root.classNames.icon + ' ' + root.classNames.icon + '--fa fa ' + item.icon;
                                } else {
                                    item._icon = root.classNames.icon + ' ' + root.classNames.icon + '-' + item.icon;
                                }
                            }
                            $t.addClass(item._icon);
                        }
                    }

                    // cache contained elements
                    item.$input = $input;
                    item.$label = $label;

                    // attach item to menu
                    $t.appendTo(opt.$menu);

                    // Disable text selection
                    if (!opt.hasTypes && $.support.eventSelectstart) {
                        // browsers support user-select: none,
                        // IE has a special event for text-selection
                        // browsers supporting neither will not be preventing text-selection
                        $t.on('selectstart.disableTextSelect', handle.abortevent);
                    }
                });
                // attach contextMenu to <body> (to bypass any possible overflow:hidden issues on parents of the trigger element)
                if (!opt.$node) {
                    opt.$menu.css('display', 'none').addClass('context-menu-root');
                }
                opt.$menu.appendTo(opt.appendTo || document.body);
            },
            resize: function ($menu, nested) {
                var domMenu;
                // determine widths of submenus, as CSS won't grow them automatically
                // position:absolute within position:absolute; min-width:100; max-width:200; results in width: 100;
                // kinda sucks hard...

                // determine width of absolutely positioned element
                $menu.css({position: 'absolute', display: 'block'});
                // don't apply yet, because that would break nested elements' widths
                $menu.data('width',
                    (domMenu = $menu.get(0)).getBoundingClientRect ?
                        Math.ceil(domMenu.getBoundingClientRect().width) :
                        $menu.outerWidth() + 1); // outerWidth() returns rounded pixels
                // reset styles so they allow nested elements to grow/shrink naturally
                $menu.css({
                    position: 'static',
                    minWidth: '0px',
                    maxWidth: '100000px'
                });
                // identify width of nested menus
                $menu.find('> li > ul').each(function () {
                    op.resize($(this), true);
                });
                // reset and apply changes in the end because nested
                // elements' widths wouldn't be calculatable otherwise
                if (!nested) {
                    $menu.find('ul').addBack().css({
                        position: '',
                        display: '',
                        minWidth: '',
                        maxWidth: ''
                    }).outerWidth(function () {
                        return $(this).data('width');
                    });
                }
            },
            update: function (opt, root) {
                var $trigger = this;
                if (root === undefined) {
                    root = opt;
                    op.resize(opt.$menu);
                }
                // re-check disabled for each item
                opt.$menu.children().each(function () {
                    var $item = $(this),
                        key = $item.data('contextMenuKey'),
                        item = opt.items[key],
                        disabled = ($.isFunction(item.disabled) && item.disabled.call($trigger, key, root)) || item.disabled === true,
                        visible;
                    if ($.isFunction(item.visible)) {
                        visible = item.visible.call($trigger, key, root);
                    } else if (typeof item.visible !== 'undefined') {
                        visible = item.visible === true;
                    } else {
                        visible = true;
                    }
                    $item[visible ? 'show' : 'hide']();

                    // dis- / enable item
                    $item[disabled ? 'addClass' : 'removeClass'](root.classNames.disabled);

                    if ($.isFunction(item.icon)) {
                        $item.removeClass(item._icon);
                        item._icon = item.icon.call(this, $trigger, $item, key, item);
                        $item.addClass(item._icon);
                    }

                    if (item.type) {
                        // dis- / enable input elements
                        $item.find('input, select, textarea').prop('disabled', disabled);

                        // update input states
                        switch (item.type) {
                            case 'text':
                            case 'textarea':
                                item.$input.val(item.value || '');
                                break;

                            case 'checkbox':
                            case 'radio':
                                item.$input.val(item.value || '').prop('checked', !!item.selected);
                                break;

                            case 'select':
                                item.$input.val(item.selected || '');
                                break;
                        }
                    }

                    if (item.$menu) {
                        // update sub-menu
                        op.update.call($trigger, item, root);
                    }
                });
            },
            layer: function (opt, zIndex) {
                // add transparent layer for click area
                // filter and background for Internet Explorer, Issue #23
                var $layer = opt.$layer = $('<div id="context-menu-layer" style="position:fixed; z-index:' + zIndex + '; top:0; left:0; opacity: 0; filter: alpha(opacity=0); background-color: #000;"></div>')
                    .css({height: $win.height(), width: $win.width(), display: 'block'})
                    .data('contextMenuRoot', opt)
                    .insertBefore(this)
                    .on('contextmenu', handle.abortevent)
                    .on('mousedown', handle.layerClick);

                // IE6 doesn't know position:fixed;
                if (document.body.style.maxWidth === undefined) { // IE6 doesn't support maxWidth
                    $layer.css({
                        'position': 'absolute',
                        'height': $(document).height()
                    });
                }

                return $layer;
            }
        };

    // split accesskey according to http://www.whatwg.org/specs/web-apps/current-work/multipage/editing.html#assigned-access-key
    function splitAccesskey(val) {
        var t = val.split(/\s+/),
            keys = [];

        for (var i = 0, k; k = t[i]; i++) {
            k = k.charAt(0).toUpperCase(); // first character only
            // theoretically non-accessible characters should be ignored, but different systems, different keyboard layouts, ... screw it.
            // a map to look up already used access keys would be nice
            keys.push(k);
        }

        return keys;
    }

// handle contextMenu triggers
    $.fn.contextMenu = function (operation) {
        var $t = this, $o = operation;
        if (this.length > 0) {  // this is not a build on demand menu
            if (operation === undefined) {
                this.first().trigger('contextmenu');
            } else if (operation.x !== undefined && operation.y !== undefined) {
                this.first().trigger($.Event('contextmenu', { pageX: operation.x, pageY: operation.y, mouseButton: operation.button }));
            } else if (operation === 'hide') {
                var $menu = this.first().data('contextMenu') ? this.first().data('contextMenu').$menu : null;
                if($menu){
                    $menu.trigger('contextmenu:hide');
                }
            } else if (operation === 'destroy') {
                $.contextMenu('destroy', {context: this});
            } else if ($.isPlainObject(operation)) {
                operation.context = this;
                $.contextMenu('create', operation);
            } else if (operation) {
                this.removeClass('context-menu-disabled');
            } else if (!operation) {
                this.addClass('context-menu-disabled');
            }
        } else {
            $.each(menus, function () {
                if (this.selector === $t.selector) {
                    $o.data = this;

                    $.extend($o.data, {trigger: 'demand'});
                }
            });

            handle.contextmenu.call($o.target, $o);
        }

        return this;
    };

    // manage contextMenu instances
    $.contextMenu = function (operation, options) {

        if (typeof operation !== 'string') {
            options = operation;
            operation = 'create';
        }

        if (typeof options === 'string') {
            options = {selector: options};
        } else if (options === undefined) {
            options = {};
        }

        // merge with default options
        var o = $.extend(true, {}, defaults, options || {});
        var $document = $(document);
        var $context = $document;
        var _hasContext = false;

        if (!o.context || !o.context.length) {
            o.context = document;
        } else {
            // you never know what they throw at you...
            $context = $(o.context).first();
            o.context = $context.get(0);
            _hasContext = !$(o.context).is(document);
        }

        switch (operation) {
            case 'create':
                // no selector no joy
                if (!o.selector) {
                    throw new Error('No selector specified');
                }
                // make sure internal classes are not bound to
                if (o.selector.match(/.context-menu-(list|item|input)($|\s)/)) {
                    throw new Error('Cannot bind to selector "' + o.selector + '" as it contains a reserved className');
                }
                if (!o.build && (!o.items || $.isEmptyObject(o.items))) {
                    throw new Error('No Items specified');
                }
                counter++;
                o.ns = '.contextMenu' + counter;
                if (!_hasContext) {
                    namespaces[o.selector] = o.ns;
                }
                menus[o.ns] = o;

                // default to right click
                if (!o.trigger) {
                    o.trigger = 'right';
                }

                if (!initialized) {
                    var itemClick = o.itemClickEvent === 'click' ? 'click.contextMenu' : 'mouseup.contextMenu';
                    var contextMenuItemObj = {
                            // 'mouseup.contextMenu': handle.itemClick,
                            // 'click.contextMenu': handle.itemClick,
                            'contextmenu:focus.contextMenu': handle.focusItem,
                            'contextmenu:blur.contextMenu': handle.blurItem,
                            'contextmenu.contextMenu': handle.abortevent,
                            'mouseenter.contextMenu': handle.itemMouseenter,
                            'mouseleave.contextMenu': handle.itemMouseleave
                        };
                    contextMenuItemObj[itemClick] = handle.itemClick;
                    // make sure item click is registered first
                    $document
                        .on({
                            'contextmenu:hide.contextMenu': handle.hideMenu,
                            'prevcommand.contextMenu': handle.prevItem,
                            'nextcommand.contextMenu': handle.nextItem,
                            'contextmenu.contextMenu': handle.abortevent,
                            'mouseenter.contextMenu': handle.menuMouseenter,
                            'mouseleave.contextMenu': handle.menuMouseleave
                        }, '.context-menu-list')
                        .on('mouseup.contextMenu', '.context-menu-input', handle.inputClick)
                        .on(contextMenuItemObj, '.context-menu-item');

                    initialized = true;
                }

                // engage native contextmenu event
                $context
                    .on('contextmenu' + o.ns, o.selector, o, handle.contextmenu);

                if (_hasContext) {
                    // add remove hook, just in case
                    $context.on('remove' + o.ns, function () {
                        $(this).contextMenu('destroy');
                    });
                }

                switch (o.trigger) {
                    case 'hover':
                        $context
                            .on('mouseenter' + o.ns, o.selector, o, handle.mouseenter)
                            .on('mouseleave' + o.ns, o.selector, o, handle.mouseleave);
                        break;

                    case 'left':
                        $context.on('click' + o.ns, o.selector, o, handle.click);
                        break;
                    /*
                     default:
                     // http://www.quirksmode.org/dom/events/contextmenu.html
                     $document
                     .on('mousedown' + o.ns, o.selector, o, handle.mousedown)
                     .on('mouseup' + o.ns, o.selector, o, handle.mouseup);
                     break;
                     */
                }

                // create menu
                if (!o.build) {
                    op.create(o);
                }
                break;

            case 'destroy':
                var $visibleMenu;
                if (_hasContext) {
                    // get proper options
                    var context = o.context;
                    $.each(menus, function (ns, o) {

                        // Is this menu equest to the context called from
                        if (!$(context).is(o.selector)) {
                            return true;
                        }

                        $visibleMenu = $('.context-menu-list').filter(':visible');
                        if ($visibleMenu.length && $visibleMenu.data().contextMenuRoot.$trigger.is($(o.context).find(o.selector))) {
                            $visibleMenu.trigger('contextmenu:hide', {force: true});
                        }

                        try {
                            if (menus[o.ns].$menu) {
                                menus[o.ns].$menu.remove();
                            }

                            delete menus[o.ns];
                        } catch (e) {
                            menus[o.ns] = null;
                        }

                        $(o.context).off(o.ns);

                        return true;
                    });
                } else if (!o.selector) {
                    $document.off('.contextMenu .contextMenuAutoHide');
                    $.each(menus, function (ns, o) {
                        $(o.context).off(o.ns);
                    });

                    namespaces = {};
                    menus = {};
                    counter = 0;
                    initialized = false;

                    $('#context-menu-layer, .context-menu-list').remove();
                } else if (namespaces[o.selector]) {
                    $visibleMenu = $('.context-menu-list').filter(':visible');
                    if ($visibleMenu.length && $visibleMenu.data().contextMenuRoot.$trigger.is(o.selector)) {
                        $visibleMenu.trigger('contextmenu:hide', {force: true});
                    }

                    try {
                        if (menus[namespaces[o.selector]].$menu) {
                            menus[namespaces[o.selector]].$menu.remove();
                        }

                        delete menus[namespaces[o.selector]];
                    } catch (e) {
                        menus[namespaces[o.selector]] = null;
                    }

                    $document.off(namespaces[o.selector]);
                }
                break;

            case 'html5':
                // if <command> or <menuitem> are not handled by the browser,
                // or options was a bool true,
                // initialize $.contextMenu for them
                if ((!$.support.htmlCommand && !$.support.htmlMenuitem) || (typeof options === 'boolean' && options)) {
                    $('menu[type="context"]').each(function () {
                        if (this.id) {
                            $.contextMenu({
                                selector: '[contextmenu=' + this.id + ']',
                                items: $.contextMenu.fromMenu(this)
                            });
                        }
                    }).css('display', 'none');
                }
                break;

            default:
                throw new Error('Unknown operation "' + operation + '"');
        }

        return this;
    };

// import values into <input> commands
    $.contextMenu.setInputValues = function (opt, data) {
        if (data === undefined) {
            data = {};
        }

        $.each(opt.inputs, function (key, item) {
            switch (item.type) {
                case 'text':
                case 'textarea':
                    item.value = data[key] || '';
                    break;

                case 'checkbox':
                    item.selected = data[key] ? true : false;
                    break;

                case 'radio':
                    item.selected = (data[item.radio] || '') === item.value;
                    break;

                case 'select':
                    item.selected = data[key] || '';
                    break;
            }
        });
    };

// export values from <input> commands
    $.contextMenu.getInputValues = function (opt, data) {
        if (data === undefined) {
            data = {};
        }

        $.each(opt.inputs, function (key, item) {
            switch (item.type) {
                case 'text':
                case 'textarea':
                case 'select':
                    data[key] = item.$input.val();
                    break;

                case 'checkbox':
                    data[key] = item.$input.prop('checked');
                    break;

                case 'radio':
                    if (item.$input.prop('checked')) {
                        data[item.radio] = item.value;
                    }
                    break;
            }
        });

        return data;
    };

// find <label for="xyz">
    function inputLabel(node) {
        return (node.id && $('label[for="' + node.id + '"]').val()) || node.name;
    }

// convert <menu> to items object
    function menuChildren(items, $children, counter) {
        if (!counter) {
            counter = 0;
        }

        $children.each(function () {
            var $node = $(this),
                node = this,
                nodeName = this.nodeName.toLowerCase(),
                label,
                item;

            // extract <label><input>
            if (nodeName === 'label' && $node.find('input, textarea, select').length) {
                label = $node.text();
                $node = $node.children().first();
                node = $node.get(0);
                nodeName = node.nodeName.toLowerCase();
            }

            /*
             * <menu> accepts flow-content as children. that means <embed>, <canvas> and such are valid menu items.
             * Not being the sadistic kind, $.contextMenu only accepts:
             * <command>, <menuitem>, <hr>, <span>, <p> <input [text, radio, checkbox]>, <textarea>, <select> and of course <menu>.
             * Everything else will be imported as an html node, which is not interfaced with contextMenu.
             */

            // http://www.whatwg.org/specs/web-apps/current-work/multipage/commands.html#concept-command
            switch (nodeName) {
                // http://www.whatwg.org/specs/web-apps/current-work/multipage/interactive-elements.html#the-menu-element
                case 'menu':
                    item = {name: $node.attr('label'), items: {}};
                    counter = menuChildren(item.items, $node.children(), counter);
                    break;

                // http://www.whatwg.org/specs/web-apps/current-work/multipage/commands.html#using-the-a-element-to-define-a-command
                case 'a':
                // http://www.whatwg.org/specs/web-apps/current-work/multipage/commands.html#using-the-button-element-to-define-a-command
                case 'button':
                    item = {
                        name: $node.text(),
                        disabled: !!$node.attr('disabled'),
                        callback: (function () {
                            return function () {
                                $node.click();
                            };
                        })()
                    };
                    break;

                // http://www.whatwg.org/specs/web-apps/current-work/multipage/commands.html#using-the-command-element-to-define-a-command

                case 'menuitem':
                case 'command':
                    switch ($node.attr('type')) {
                        case undefined:
                        case 'command':
                        case 'menuitem':
                            item = {
                                name: $node.attr('label'),
                                disabled: !!$node.attr('disabled'),
                                icon: $node.attr('icon'),
                                callback: (function () {
                                    return function () {
                                        $node.click();
                                    };
                                })()
                            };
                            break;

                        case 'checkbox':
                            item = {
                                type: 'checkbox',
                                disabled: !!$node.attr('disabled'),
                                name: $node.attr('label'),
                                selected: !!$node.attr('checked')
                            };
                            break;
                        case 'radio':
                            item = {
                                type: 'radio',
                                disabled: !!$node.attr('disabled'),
                                name: $node.attr('label'),
                                radio: $node.attr('radiogroup'),
                                value: $node.attr('id'),
                                selected: !!$node.attr('checked')
                            };
                            break;

                        default:
                            item = undefined;
                    }
                    break;

                case 'hr':
                    item = '-------';
                    break;

                case 'input':
                    switch ($node.attr('type')) {
                        case 'text':
                            item = {
                                type: 'text',
                                name: label || inputLabel(node),
                                disabled: !!$node.attr('disabled'),
                                value: $node.val()
                            };
                            break;

                        case 'checkbox':
                            item = {
                                type: 'checkbox',
                                name: label || inputLabel(node),
                                disabled: !!$node.attr('disabled'),
                                selected: !!$node.attr('checked')
                            };
                            break;

                        case 'radio':
                            item = {
                                type: 'radio',
                                name: label || inputLabel(node),
                                disabled: !!$node.attr('disabled'),
                                radio: !!$node.attr('name'),
                                value: $node.val(),
                                selected: !!$node.attr('checked')
                            };
                            break;

                        default:
                            item = undefined;
                            break;
                    }
                    break;

                case 'select':
                    item = {
                        type: 'select',
                        name: label || inputLabel(node),
                        disabled: !!$node.attr('disabled'),
                        selected: $node.val(),
                        options: {}
                    };
                    $node.children().each(function () {
                        item.options[this.value] = $(this).text();
                    });
                    break;

                case 'textarea':
                    item = {
                        type: 'textarea',
                        name: label || inputLabel(node),
                        disabled: !!$node.attr('disabled'),
                        value: $node.val()
                    };
                    break;

                case 'label':
                    break;

                default:
                    item = {type: 'html', html: $node.clone(true)};
                    break;
            }

            if (item) {
                counter++;
                items['key' + counter] = item;
            }
        });

        return counter;
    }

// convert html5 menu
    $.contextMenu.fromMenu = function (element) {
        var $this = $(element),
            items = {};

        menuChildren(items, $this.children());

        return items;
    };

// make defaults accessible
    $.contextMenu.defaults = defaults;
    $.contextMenu.types = types;
// export internal functions - undocumented, for hacking only!
    $.contextMenu.handle = handle;
    $.contextMenu.op = op;
    $.contextMenu.menus = menus;


});

/* End */
;
; /* Start:"a:4:{s:4:"full";s:64:"/local/templates/ipromo/js/dominion.cutting2.js?1677741248140835";s:6:"source";s:47:"/local/templates/ipromo/js/dominion.cutting2.js";s:3:"min";s:0:"";s:3:"map";s:0:"";}"*/
    
if (typeof DOMINION === 'undefined')
    var DOMINION = function() {};

/*function getParameterByName(name, url) {
        if (!url) url = window.location.href;
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
}*/
DOMINION.getRandomInt = function (min, max)
{
    return Math.ceil(Math.random() * (max - min + 1)) + min;
}

DOMINION.findHeightPopulate = function (obj_set, max_count_value, cut_line_width, plate_height)
{
    clear_set = [];
    for (i in obj_set) {
        if (obj_set[i].w == max_count_value || obj_set[i].h == max_count_value) {
            clear_set.push(obj_set[i]);
        }
    }
    var height = 0;
    var count = 0;
    
    for (i in clear_set) {
        var add_cut_line_width = ((count != 0) && (height != plate_height))? cut_line_width : 0;
        if ( clear_set[i].w == max_count_value)
            height += clear_set[i].h + add_cut_line_width;
        else if ( clear_set[i].h == max_count_value)
            height += clear_set[i].w + add_cut_line_width;
        count++;
    }

    return height;
}

DOMINION.findById = function(i, set) {
    var found_flag = false;
    for (index in set) {
        if (set[index].i == i) {
            found_flag = true;
            break;
        }
    }
    return found_flag;
}

DOMINION.populateCol = function (state, width_offset, height_offset, plate_width, plate_height, cut_line_width, prev_set_width, sub) {
    if (plate_width < 0 || plate_height < 0)
        return state;
    var objects = state.objects;
   // exit if set is empty;
    if (objects.length == 0)
        return state;

   // create init set of object with equal width or height
    var raw_sets = [];
    for (var i = 0; i < objects.length; i++) {
        var temp_set = [];
        temp_set.push(objects[i]);
        for (var j = i; j < objects.length; j++) {
            if (
                        objects[i].i !== objects[j].i
                    &&
                        (       objects[i].w == objects[j].w
                            ||  objects[i].h == objects[j].h
                            ||  objects[i].w == objects[j].h
                            ||  objects[i].h == objects[j].w
                        )
                ) {
                temp_set.push(objects[j]);
            }
        };
        raw_sets.push(temp_set);
    };
    // find equeal w or h value for excepting it from sum; 
    var raw_values = [];
    for (var i = 0; i < raw_sets.length; i++) {
        raw_values.push([]);
        for (var j = 0; j < raw_sets[i].length; j++) {
            raw_values[i].push(raw_sets[i][j].h);
            raw_values[i].push(raw_sets[i][j].w);
        }
    }
    // find count of exuals values for follow optimization
    var raw_counts = [];
    for (var i = 0; i < raw_values.length; i++) {
        var temp = {};
        raw_values[i].forEach(function(x) { temp[x] = (temp[x] || 0)+1; });
        raw_counts.push(temp);
    }
    
    var max_height_sets = [];
    for (i in raw_sets) {
        var max_count_value = Object.keys(raw_counts[i]).reduce(function(a, b){ return raw_counts[i][a] > raw_counts[i][b] ? a : b });
        // build array constains objects with max count width or height
        max_height_sets.push(DOMINION.findHeightPopulate(raw_sets[i], max_count_value, cut_line_width, plate_height ));
    }

    // find set that have height closest to plate height
    var closest_to_plate_height = max_height_sets.reduce(function (prev, curr) {
      return (Math.abs(curr - plate_height) < Math.abs(prev - plate_height) ? curr : prev);
    });

    // find set with closest heigt summ
    // TODO there is possibility of more that one optimal set
    var optimal_set = false;
    var optimal_set_index = false;
    for (i in max_height_sets) {
        if (max_height_sets[i] == closest_to_plate_height) {
            optimal_set = raw_sets[i];
            optimal_set_index = i;
            break;
        }
    }

    // get optimal set' height;
    if ( raw_counts[optimal_set_index]) {
    var max_count_optimal_set_value = Object.keys(raw_counts[optimal_set_index]).reduce(
            function(a, b){ 
                return raw_counts[optimal_set_index][a] > raw_counts[optimal_set_index][b] ? a : b 
            }
        );
    }
    else {
        return state;
    }
    // if one elem - trying to rotate 
    /*if ( optimal_set.length == 1) {
        console.log(optimal_set);
        var rotated_set_height = 0;
        for (i in optimal_set) {
            var set_elem_height = (optimal_set[i].optimal == optimal_set[i].w) ? optimal_set[i].w : optimal_set[i].h;
            rotated_set_height += set_elem_height;
            rotated_set_height += ((rotated_set_height + cut_line_width) !== plate_height) ? cut_line_width : 0;
        }
        if (rotated_set_height <= plate_height && rotated_set_height > set_height) {
            for (i in optimal_set) {
                var temp_w = optimal_set[i].h;
                var temp_h = optimal_set[i].w;
                var temp_optimal = max_count_optimal_set_value;
                optimal_set[i].w = temp_w;
                optimal_set[i].h = temp_h;
                max_count_optimal_set_value = (temp_optimal == optimal_set[i].h) ? optimal_set[i].w : optimal_set[i].h; 
            }
        }
    }*/

    // exit if not enough free height
    var add_cut_line_width = ((width_offset != 0) && ((parseInt(max_count_optimal_set_value) + parseInt(width_offset)) != plate_width))? cut_line_width : 0;
    
    if ( (parseInt(max_count_optimal_set_value) + parseInt(width_offset) + add_cut_line_width) > plate_width) {
        return state;
    }

    if ( prev_set_width < max_count_optimal_set_value && sub == true)
        return {
            sets: [],
            objects: objects
        };

    prev_set_width = max_count_optimal_set_value;

    var optimal_set_height = DOMINION.findHeightPopulate(optimal_set, max_count_optimal_set_value, cut_line_width, plate_height);

    // get set with optimal width or height from optimal set
    var clear_optimal_set = [];
    for (i in optimal_set) {
        if (optimal_set[i].w == max_count_optimal_set_value || optimal_set[i].h == max_count_optimal_set_value)
            clear_optimal_set.push(optimal_set[i]);
    }

    for (i in clear_optimal_set) {
            clear_optimal_set[i].optimal = parseInt(max_count_optimal_set_value);
    }

    // check max height of optimal set, if it above plate hight, trying to delete elements and find optimal to delete
    var clear_optimal_set_height = DOMINION.findHeightPopulate(clear_optimal_set, max_count_optimal_set_value, cut_line_width, plate_height);

    while (clear_optimal_set_height > plate_height) {
        var index_to_delete = false;
        var diff = [];
        // WARNING: deleting just one element may me not enough
        if (clear_optimal_set.length == 0)
            break;

        for (i in clear_optimal_set) {
            var temp = clear_optimal_set.slice();
            var temp_sum = 0;
            temp = temp.slice(i, 1);
            temp_sum = DOMINION.findHeightPopulate(temp, max_count_optimal_set_value, cut_line_width, plate_height);
            if ( temp_sum <= plate_height) {
                diff.push({i:clear_optimal_set[i].i, diff: plate_height - temp_sum});
            }
        }

        if (diff.length > 0) {
            diff_min_key = Object.keys(diff).reduce(function(a, b){ return diff[a].diff < diff[b].diff ? a : b });
            index_to_delete = diff[diff_min_key].i;

            clear_optimal_set_index_to_delete = false;
            for (i in clear_optimal_set) {
                if (clear_optimal_set[i].i == index_to_delete) {
                    clear_optimal_set_index_to_delete = i;
                    break;
                }
            }
            //add object to objects pool;
            //objects.push(clear_optimal_set[clear_optimal_set_index_to_delete]);
            clear_optimal_set.splice(clear_optimal_set_index_to_delete, 1);
            clear_optimal_set_height = DOMINION.findHeightPopulate(clear_optimal_set, max_count_optimal_set_value, cut_line_width, plate_height);
        }
        else {
            return {
                sets: [],
                objects: objects
            };
        }

        
    }

    clear_optimal_set_height = DOMINION.findHeightPopulate(clear_optimal_set, max_count_optimal_set_value, cut_line_width, plate_height);

    if (clear_optimal_set_height == 0)
            return {
                sets: [],
                objects: objects
            };

    if (clear_optimal_set.length == 0)
            return {
                sets: [],
                objects: objects
            };

    if ( clear_optimal_set.length == 1) {

        var add_cut_line_width = (width_offset !== 0) || (parseInt(width_offset) + parseInt(max_count_optimal_set_value)) !== plate_width ? cut_line_width : 0;
        var new_width_offset = parseInt(width_offset) + parseInt(max_count_optimal_set_value) + add_cut_line_width;
        
        //workaroud check set height 

        var one_set_width = max_count_optimal_set_value == clear_optimal_set[0].w ? clear_optimal_set[0].h : clear_optimal_set[0].w; 
        one_set_width += add_cut_line_width;
        if ( one_set_width > plate_height) {
            return {
                sets: [],
                objects: objects
            }
        }
        //delete used objects;
        var objects = objects.filter(function(a){ return !DOMINION.findById(a.i, clear_optimal_set) });
        state.objects = objects;

        // trying populate free space of set
        var sub_plate_width = max_count_optimal_set_value;
        var set_height = 0;


        /*for (i in clear_optimal_set) {
            var set_elem_height = (clear_optimal_set[i].optimal == clear_optimal_set[i].w) ? clear_optimal_set[i].h : clear_optimal_set[i].w;
            set_height += set_elem_height;
            set_height += ((set_height + cut_line_width) <= plate_height) ? cut_line_width : 0;
        }*/
        
        set_height =  DOMINION.findHeightPopulate(clear_optimal_set, max_count_optimal_set_value, cut_line_width, plate_height);

        // i dunno for what there is add_cut_line_width
        var sub_plate_height = plate_height - set_height - cut_line_width;
            var sub_state_init = {
                sets: [],
                objects: objects
            };
        if ((sub_plate_height < 0 && sub == true) || (sub_plate_width < 0 && sub == true)) {
            return {
                sets: [],
                objects: objects
            };
        }
        sub_height_offset = set_height;
        if ( sub_plate_width > 0 && sub_plate_height > 0) {
            var sub_state = DOMINION.populateCol(sub_state_init, 0, sub_height_offset, sub_plate_width, sub_plate_height, cut_line_width, prev_set_width, true);
            if ( sub_state.sets.length > 0) {

                sub_state.sets.sort(function(a, b){
                    var sum_a = 0;
                    var sum_b = 0;
                    for (i in a) {
                        if (a[i].w == a[i].optimal)
                            sum_a += a[i].h;
                        else
                            sum_a += a[i].w;
                    }
                    for (i in b) {
                        if (b[i].w == b[i].optimal)
                            sum_b += b[i].h;
                        else
                            sum_b += b[i].w;
                    }
                    return sum_b > sum_a;
                });

                for (i in sub_state.sets) {
                    for (j in sub_state.sets[i]) {
                        clear_optimal_set.push(sub_state.sets[i][j]);
                    }
                }

                //delete used objects;
                objects = objects.filter(function(a){ return !DOMINION.findById(a.i, clear_optimal_set) });
                state.objects = objects;

                if (state.objects.length == 0) {
                    state.sets.push(clear_optimal_set);
                    return state;
                }

            }

            else if (clear_optimal_set.length == 1) {
                    //rotate if rotated height < plate height

                    var rotated_set_height = 0;
                    for (i in clear_optimal_set) {
                        var set_elem_height = (clear_optimal_set[i].optimal == clear_optimal_set[i].w) ? clear_optimal_set[i].h : clear_optimal_set[i].w;
                        rotated_set_height += set_elem_height;
                        rotated_set_height += ((rotated_set_height + cut_line_width) !== plate_height) ? cut_line_width : 0;
                    }
                    if (rotated_set_height <= (plate_height-sub_height_offset) && rotated_set_height > set_height) {
                        for (i in clear_optimal_set) {
                            var temp_w = clear_optimal_set[i].h;
                            var temp_h = clear_optimal_set[i].w;
                            var temp_optimal = clear_optimal_set[i].optimal;
                            clear_optimal_set[i].w = temp_w;
                            clear_optimal_set[i].h = temp_h;
                            clear_optimal_set[i].optimal = (clear_optimal_set[i].optimal == clear_optimal_set[i].h) ? clear_optimal_set[i].w : clear_optimal_set[i].h; 
                            //clear_optimal_set[i].rotated = true;
                        }
                    }
            
            }

        }

        state.sets.push(clear_optimal_set);
        
        if (state.objects.length == 0)
                return state;

        // call recursive
        var add_cut_line_width = (width_offset !== 0) || (parseInt(width_offset) + parseInt(max_count_optimal_set_value)) !== plate_width ? cut_line_width : 0;
        var new_width_offset = parseInt(width_offset) + parseInt(max_count_optimal_set_value) + add_cut_line_width;
        console.log(clear_optimal_set);
        console.log(max_count_optimal_set_value);
        new_height_offset = height_offset;
        if ( sub == true) {
            new_width_offset = set_height + ((set_height + cut_line_width) < plate_height ? cut_line_width : 0);
        }

    return DOMINION.populateCol(state, new_width_offset, new_height_offset, plate_width, plate_height, cut_line_width, prev_set_width, sub);
    }

    // extra check total set height for state where after delete element that causes overflowing
    // height < (total height / 2) -> remove element from set and start new iteration
    // element for remove have min height or width in set
    // delete element only when set has more that on equal two element
    // why - it needs for populating area in any cases

    /*var clear_optimal_set_height_check_two = findHeightPopulate(clear_optimal_set, max_count_optimal_set_value, cut_line_width, plate_height);

    if ( clear_optimal_set_height_check_two < (plate_height/2) ) {
        object_to_remove_min_key = Object.keys(clear_optimal_set)
                                         .reduce(function(a, b){
                                                        var left = 0;
                                                        var right = 0;
                                                        if (clear_optimal_set[a].w == clear_optimal_set[a].optimal) {
                                                            left = clear_optimal_set[a].h;
                                                        }
                                                        else {
                                                            left = clear_optimal_set[a].w;
                                                        }

                                                        if (clear_optimal_set[b].w == clear_optimal_set[b].optimal) {
                                                            right = clear_optimal_set[b].h;
                                                        }
                                                        else {
                                                            right = clear_optimal_set[b].w;
                                                        }
                                                        return left < right ? a : b 
                                                });

        var objects = objects.filter(function(a){ return !findById(a.i, [clear_optimal_set[object_to_remove_min_key]]) });
        if (objects.length == 0)
            return state;
        var add_cut_line_width = (width_offset !== 0) || (parseInt(width_offset) + parseInt(max_count_optimal_set_value)) !== plate_width ? cut_line_width : 0;
        var new_width_offset = parseInt(width_offset) + parseInt(max_count_optimal_set_value) + add_cut_line_width;
        return populateCol(state, new_width_offset, plate_width, plate_height, cut_line_width);
    }*/

    // exit if set is empty;
    if (objects.length == 0) {
        state.sets.push(clear_optimal_set);
        return state;
    }

    

    // delete used objects from array
    var objects = objects.filter(function(a){ return !DOMINION.findById(a.i, clear_optimal_set) });

    state.objects = objects;
    // exit if set is empty;
    if (objects.length == 0) {
        state.sets.push(clear_optimal_set);
        return state;
    }

    // trying populate free space of set
    var sub_plate_width = max_count_optimal_set_value;
    var set_height = 0;


    /*for (i in clear_optimal_set) {
        var set_elem_height = (clear_optimal_set[i].optimal == clear_optimal_set[i].w) ? clear_optimal_set[i].h : clear_optimal_set[i].w;
        set_height += set_elem_height;
        set_height += ((set_height + cut_line_width) <= plate_height) ? cut_line_width : 0;
    }*/
    
    set_height = DOMINION.findHeightPopulate(clear_optimal_set, max_count_optimal_set_value, cut_line_width, plate_height);

    // i dunno for what there is add_cut_line_width
    var sub_plate_height = plate_height - set_height - cut_line_width;
        var sub_state_init = {
            sets: [],
            objects: objects
        };
    if ((sub_plate_height < 0 && sub == true) || (sub_plate_width < 0 && sub == true)) {
        return {
            sets: [],
            objects: objects
        };
    }
    sub_height_offset = set_height;
    if ( sub_plate_width > 0 && sub_plate_height > 0) {
        var sub_state = DOMINION.populateCol(sub_state_init, 0, sub_height_offset, sub_plate_width, sub_plate_height, cut_line_width, prev_set_width, true);
        if ( sub_state.sets.length > 0) {

            sub_state.sets.sort(function(a, b){
                var sum_a = 0;
                var sum_b = 0;
                for (i in a) {
                    if (a[i].w == a[i].optimal)
                        sum_a += a[i].h;
                    else
                        sum_a += a[i].w;
                }
                for (i in b) {
                    if (b[i].w == b[i].optimal)
                        sum_b += b[i].h;
                    else
                        sum_b += b[i].w;
                }
                return sum_b > sum_a;
            });

            for (i in sub_state.sets) {
                for (j in sub_state.sets[i]) {
                    clear_optimal_set.push(sub_state.sets[i][j]);
                }
            }

            //delete used objects;
            objects = objects.filter(function(a){ return !DOMINION.findById(a.i, clear_optimal_set) });
            state.objects = objects;

            if (state.objects.length == 0) {
                state.sets.push(clear_optimal_set);
                return state;
            }

        }

        else if (clear_optimal_set.length == 1) {
                //rotate if rotated height < plate height

                var rotated_set_height = 0;
                for (i in clear_optimal_set) {
                    var set_elem_height = (clear_optimal_set[i].optimal == clear_optimal_set[i].w) ? clear_optimal_set[i].h : clear_optimal_set[i].w;
                    rotated_set_height += set_elem_height;
                    rotated_set_height += ((rotated_set_height + cut_line_width) !== plate_height) ? cut_line_width : 0;
                }
                if (rotated_set_height <= (plate_height-sub_height_offset) && rotated_set_height > set_height) {
                    for (i in clear_optimal_set) {
                        var temp_w = clear_optimal_set[i].h;
                        var temp_h = clear_optimal_set[i].w;
                        var temp_optimal = clear_optimal_set[i].optimal;
                        clear_optimal_set[i].w = temp_w;
                        clear_optimal_set[i].h = temp_h;
                        clear_optimal_set[i].optimal = (clear_optimal_set[i].optimal == clear_optimal_set[i].h) ? clear_optimal_set[i].w : clear_optimal_set[i].h; 
                        //clear_optimal_set[i].rotated = true;
                    }
                }
        
        }

    }

    state.sets.push(clear_optimal_set);
    
    if (state.objects.length == 0)
            return state;

    // call recursive
    var add_cut_line_width = (width_offset !== 0) || (parseInt(width_offset) + parseInt(max_count_optimal_set_value)) !== plate_width ? cut_line_width : 0;
    var new_width_offset = parseInt(width_offset) + parseInt(max_count_optimal_set_value) + add_cut_line_width;
    console.log(clear_optimal_set);
    console.log(max_count_optimal_set_value);
    new_height_offset = height_offset;
    if ( sub == true) {
        new_width_offset = set_height + ((set_height + cut_line_width) < plate_height ? cut_line_width : 0);
    }

    return DOMINION.populateCol(state, new_width_offset, new_height_offset, plate_width, plate_height, cut_line_width, prev_set_width, sub);

}

/*DOMINION.powerset = function (a) {
    var res = [];
    var iteration_count = 0;
    for (var i = 0; i < Math.pow(2, a.length); i++) {
        var bin = (i).toString(2), set = [];
        bin = new Array((a.length-bin.length)+1).join("0")+bin;
        for (var j = 0; j < bin.length; j++) {
            if (bin[j] === "1") {
                set.push(a[j]);
            }
            iteration_count++;
        }
        res.push(set);
    }
    window.console.log('iteration_count');
    window.console.log(iteration_count);
    // remove empty set;
    var empty_exist = true;
    do {
        var empty_index = res.findIndex( function(r, index) {
            if ( r.length == 0 ) {
                return true;
            }
        });

        if ( empty_index != -1 ) {
            res.splice(empty_index, 1);
        }
        else {
            empty_exist = false;
        }

    } while ( empty_exist )
    
    return res;
}*/

/*DOMINION.powerset = function(ary) {
    var iteration_count = 0;
    var ps = [[]];
    for (var i=0; i < ary.length; i++) {
        for (var j = 0, len = ps.length; j < len; j++) {
            ps.push(ps[j].concat(ary[i]));
            iteration_count++;
        }
    }
    window.console.log('iteration_count');
    window.console.log(iteration_count);
    return ps;
}*/

/*DOMINION.powerset = function(xs) {
    return xs.reduceRight(function (a, x) {
        return a.concat(a.map(function (y) {
            return [x].concat(y);
        }));
    }, [[]]);
}*/

/*DOMINION.powerset = function(arr){
  if (arr.length === 1) return [arr];
  else {
    subarr = DOMINION.powerset(arr.slice(1));
    return subarr.concat(subarr.map(e => e.concat(arr[0])), [[arr[0]]]);
  }
}*/

/*DOMINION.findOptimalSet = function ( powerset, cut_line_width, plate_height) {
    var optimal_set = false;
    var rest_set_elements = false;
    
    //filter set by plate_height
    var powerset_filtered = powerset.filter(function(set){
        var set_height = set.reduce( function(previousValue, object, index, array) {
            return previousValue + parseInt(object.h) + parseInt(cut_line_width);
        }, 0);
        return ( set_height <= (plate_height + cut_line_width) );
    });
    
    powerset_filtered.forEach(function(set){
        var set_height = set.reduce( function(previousValue, object, index, array) {
            return previousValue + parseInt(object.h) + parseInt(cut_line_width);
        }, 0);
    
    });
    
    //filter by set height, first element will be optimal
    powerset_filtered.sort(function(a, b){
        var a_height = a.reduce( function(previousValue, object, index, array) {
                return previousValue + parseInt(object.h) + parseInt(cut_line_width);
            }, 0);
            
        var b_height = b.reduce( function(previousValue, object, index, array) {
                return previousValue + parseInt(object.h) + parseInt(cut_line_width);
            }, 0);
            
            
        return b_height - a_height;
    });

    optimal_set = powerset_filtered.shift();
    
    optimal_set.sort(function(a, b){
        return b.h - a.h;
    });
    
    return optimal_set;
}*/

DOMINION.findOptimalSet = function ( current_group, cut_line_width, plate_height) {

    var current_group_ = current_group.slice(0);
    var find_flag = false;
    var height_populate = 0;
    var optimal_set = [];

    current_group_.sort(function(a, b){
        return b.h - a.h;
    });

    
   
    while (find_flag == false) {
        if ( current_group_.length == 0) {
            find_flag = true;
        }
        else {
            var element = current_group_.shift();
            
            if ( (element.h + cut_line_width) < (plate_height + cut_line_width - height_populate) ) {
                optimal_set.push(element);
                height_populate += element.h + cut_line_width;
            }
            else if ( element.h == plate_height) {
                optimal_set.push(element);
                find_flag = true;
            }
            else if ( element.h > (plate_height + cut_line_width - height_populate) && current_group_.length == 0) {
                find_flag = true;
            }
        }
    }


    return optimal_set;
}

/*DOMINION.findPossibleSubSets = function (raw_groups, remaining_width, remaining_height, cut_line_width) {
    window.console.log('findPossibleSubSets ------------------------------ START');
    var objects = [];

    window.console.log('raw_groups2');
    window.console.log(raw_groups);

    raw_groups.forEach( function(raw_group) {
        raw_group.forEach( function(group_element) {

            window.console.log('group_element2');
            window.console.log(group_element);

            objects.push({
                w: group_element.w,
                h: group_element.h,
                num: group_element.num,
                optimal: group_element.optimal
            });
        });
    });

    window.console.log('objects2 length');
    window.console.log(objects.length);

    window.console.log('objects2');
    window.console.log(objects);

    var sizes = [];

    objects.forEach( function(object) {
        window.console.log('object2');
        window.console.log(object);

        var find_flag_w = sizes.findIndex( function(size) {
            return size.value == object.w;
        });

        var find_flag_h = sizes.findIndex( function(size) {
            return size.value == object.h;
        });

        if ( object.w != object.h ) {
            if ( find_flag_w == -1 ) {
                sizes.push( {value: object.w, count: 1} );
            }
            else {
                sizes[find_flag_w].count++;
            }

            if ( find_flag_h == -1 ) {
                sizes.push( {value: object.h, count: 1} );
            }
            else {
                sizes[find_flag_h].count++;
            }
        }
        else {
            if ( find_flag_w == -1 ) {
                sizes.push( {value: object.w, count: 1} );
            }
            else {
                sizes[find_flag_w].count++;
            }
        }

    });

    sizes.sort(function(a, b){
        return b.count - a.count;
    });

    window.console.log('sizes2');
    window.console.log(sizes);
    var groups = [];

    sizes.forEach( function(size) {
        var raw_group = [];

        window.console.log('size1');
        window.console.log(size);

        objects.forEach( function(object) {
            var arleady_added_flag = groups.findIndex( function(raw_group) {
                var element_find_flag = raw_group.findIndex( function(group_object) {
                    return group_object.num == object.num;
                });
                if (element_find_flag != -1)
                    return true;
            });

            window.console.log('object1');
            window.console.log(object);

            if ( (object.w == size.value || object.h == size.value) && arleady_added_flag == -1) {
                window.console.log('add1');
                var temp_object = {
                    num: object.num,
                    w: size.value,
                    h: (size.value == object.w ? object.h : object.w),
                    optimal: size.value
                };
                raw_group.push(temp_object);
            }
        });

        groups.push( raw_group );

    });
    
    
    // workaround for single item
    groups = groups.filter(function(raw_group, index) {
        if ( raw_group.length != 1 || ( raw_group.length == 1 && raw_group[0].h <= remaining_height) ) {
            return true;
        }
    });
    var raw_groups_with_big_elements = [];
    var num_to_delete = [];


    groups.forEach(function(raw_group, i_1, raw_groups_array) {
       raw_group.forEach(function(element, i_2, raw_group_array) {
            window.console.log('element');
            window.console.log(element);
    
            //find metrics that optimal by plate_height
            var populate_by_width =  parseInt(element.w) / parseInt(remaining_height);
            var populate_by_height =  parseInt(element.h) / parseInt(remaining_height);
            var populate_coefficient = Math.min(populate_by_width, populate_by_height);

            window.console.log('remaining_height sub' + remaining_height);
            window.console.log('populate_by_width sub' + (parseInt(element.w) / parseInt(remaining_height)));
            window.console.log('populate_by_height sub' + (parseInt(element.h) / parseInt(remaining_height)));
            
            window.console.log('populate_coefficient sub');
            window.console.log(populate_coefficient);

            var add_flag = false;
            if ( populate_coefficient == populate_by_width ) {
                var temp_object = {
                    num: element.num,
                    w: element.h,
                    h: element.w,
                    optimal: element.h
                };
                raw_groups_with_big_elements.push(temp_object);
                add_flag = true;
            }
            else if ( populate_coefficient == populate_by_height) {
                var temp_object = {
                    num: element.num,
                    w: element.w,
                    h: element.h,
                    optimal: element.w
                };
                raw_groups_with_big_elements.push(temp_object);
                add_flag = true;
            }
            if (add_flag)
                num_to_delete.push(parseInt(element.num));
            
       }); 
    });

    window.console.log('num_to_delete');
    window.console.log(num_to_delete);

    while ( num_to_delete.length > 0) {
        var num = num_to_delete.shift();
        for (i in groups) {
            for ( j in groups[i] ) {
                if ( parseInt(groups[i][j].num) == num ) {
                    groups[i].splice(j, 1);
                }
            }
        }
    }

    if ( raw_groups_with_big_elements.length > 0) {
        raw_groups_with_big_elements.forEach(function(rebase_objects) {
            groups.unshift([rebase_objects]);
        });
    }
    var dublicated_elements = [];

    groups.forEach(function(raw_group, index) {
        if ( groups[index+1] !== undefined ) {
            var other_groups = groups.slice(index+1, raw_groups.length);
            if ( other_groups.length > 0 ) {
                groups.forEach(function(element) {
                    var find_flag = other_groups.find( function(other_group) {
                        return other_group.find( function(other_element) {
                            return other_element.num == element.num;
                        });
                    });

                    var check_add = dublicated_elements.find( function(dublicated_element) {
                        return dublicated_element.num == element.num;
                    });

                    if ( find_flag && !check_add) {
                        dublicated_elements.push({
                            num: element.num,
                            w: element.w,
                            h: element.h,
                            optimal: element.optimal
                        });
                    }
                });
            }
        }
    });

    

    var raw_groups_temp = groups.slice(0);

    dublicated_elements.forEach( function(dublicated_element) {
        var raw_groups_indexes = [];
        groups.forEach( function(raw_group, raw_group_index) {
            var temp_index = raw_group.findIndex( function(element) {
                return element.num == dublicated_element.num;
            });

            if ( temp_index != -1) {
                raw_groups_indexes.push(raw_group_index);
            }

        });

        var temp_sets_height = [];
        raw_groups_indexes.forEach( function(index) {
            var temp_set_height = raw_groups[index].reduce( function(previousValue, object, index, array) {
                return previousValue + parseInt(object.h);
            }, 0);

            temp_sets_height.push({index: index, height: temp_set_height});
        });
        
        //sort heights
        temp_sets_height.sort(function(a, b){
            return b.height - a.height;
        });

        //delete dublicate object in sets with index > 0
        temp_sets_height = temp_sets_height.slice(1, temp_sets_height.length);

        temp_sets_height.forEach( function (set) {
            var index_to_remove = raw_groups[parseInt(set.index)].findIndex( function(element) {
                return element.num == dublicated_element.num;
            });

            if ( index_to_remove != -1 ) {
                groups[parseInt(set.index)].splice(index_to_remove, 1);
            }

        });

    });
    
    //delete empty groups
    var empty_exist = true;
    do {
        var empty_index = groups.findIndex( function(group, index) {
            if ( group.length == 0 ) {
                return true;
            }
        });

        if ( empty_index != -1 ) {
            groups.splice(empty_index, 1);
        }
        else {
            empty_exist = false;
        }

    } while ( empty_exist )
    window.console.log('groups before filter');
    window.console.log(groups.slice(0));

    window.console.log('remaining_width filter');
    window.console.log(remaining_width);

    window.console.log('remaining_height filter');
    window.console.log(remaining_height);

    groups = groups.filter(function(group){
        var group_height = group.reduce( function(previousValue, object, index, array) {
                return previousValue + parseInt(object.h) + parseInt(cut_line_width);
            }, 0);
 
              
        return     (remaining_height + cut_line_width) >= group_height
                && (remaining_width + cut_line_width) >= parseInt(group[0].w);
    });

    // sort by area;
    groups.sort(function(a, b){
        var a_area = a.reduce( function(previousValue, object, index, array) {
                return previousValue + parseInt(object.h * object.h);
            }, 0);
            
        var b_area = b.reduce( function(previousValue, object, index, array) {
                return previousValue + parseInt(object.h * object.h);
            }, 0);
            
            
        return b_area - a_area;
    });

    window.console.log('groups');
    window.console.log(groups);

    window.console.log('findPossibleSubSets ------------------------------ END');

    return groups;
}*/

DOMINION.findPossibleSubSets = function (raw_groups, remaining_width, remaining_height, cut_line_width) {
    window.console.log('findPossibleSubSets ------------------------------ START');
    var objects = [];
    var groups = [];
    window.console.log('raw_groups2');
    window.console.log(raw_groups);

    window.console.log('remaining_width');
    window.console.log(remaining_width);

    window.console.log('remaining_height');
    window.console.log(remaining_height);

    raw_groups.forEach( function(raw_group) {
        raw_group.forEach( function(group_element) {

            window.console.log('group_element2');
            window.console.log(group_element);

            objects.push({
                w: group_element.w,
                h: group_element.h,
                num: group_element.num,
                optimal: group_element.optimal
            });
        });
    });

    var possible_objects = [];

    objects.forEach( function(object) {
        if ( parseInt(object.w) <= parseInt(remaining_width) && parseInt(object.h) <= parseInt(remaining_height)) {
            possible_objects.push({
                w: object.w,
                h: object.h,
                num: object.num,
                optimal: object.w
            });
        }

        if ( parseInt(object.h) <= parseInt(remaining_width) && parseInt(object.w) <= parseInt(remaining_height)) {
            possible_objects.push({
                w: object.h,
                h: object.w,
                num: object.num,
                optimal: object.h
            });
        }
    });

    window.console.log('possible_objects');
    window.console.log(possible_objects);

    if ( possible_objects.length > 0 ) {
        var curr = possible_objects[0];
        var diff = Math.abs (remaining_height - curr.h);

        for (var val = 0; val < possible_objects.length; val++) {
            var newdiff = Math.abs (remaining_height - possible_objects[val].h);
            if (newdiff < diff) {
                diff = newdiff;
                curr = possible_objects[val];
               
            }
        }

         groups.push([curr]);
    }

    window.console.log('groups pop');
    window.console.log(groups);

    window.console.log('findPossibleSubSets ------------------------------ END');

    return groups;
}


DOMINION.populateCol2 = function (objects, plate_width, plate_height, cut_line_width, manual_elements_nums, populate_iteration_count, last_plate_max_element_number) {

    //sort by area;
    objects.sort(function(a, b){
        return (b.w * b.h) - (a.w * a.h);
    });

    //calculate sizes count;
    var sizes = [];

    objects.forEach( function(object) {
        var find_flag_w = sizes.findIndex( function(size) {
            return size.value == object.w;
        });

        var find_flag_h = sizes.findIndex( function(size) {
            return size.value == object.h;
        });

        if ( object.w != object.h ) {
            if ( find_flag_w == -1 ) {
                sizes.push( {value: object.w, count: 1} );
            }
            else {
                sizes[find_flag_w].count++;
            }

            if ( find_flag_h == -1 ) {
                sizes.push( {value: object.h, count: 1} );
            }
            else {
                sizes[find_flag_h].count++;
            }
        }
        else {
            if ( find_flag_w == -1 ) {
                sizes.push( {value: object.w, count: 1} );
            }
            else {
                sizes[find_flag_w].count++;
            }
        }

    });

    //sort by sizes count;
    sizes.sort(function(a, b){
        // extra check for value;
        /*if ( b.count == a.count ) {
            return a.value - b.value;
        }*/
        return b.count - a.count;
    });

    //find groups;
    var raw_groups = [];
    var groups_with_plate_size_elements_by_plate_height = [];
    var groups_with_plate_size_elements_by_plate_width = [];

    sizes.forEach( function(size) {
        var raw_group = [];

        objects.forEach( function(object) {
            var arleady_added_flag = raw_groups.findIndex( function(raw_group) {
                var element_find_flag = raw_group.findIndex( function(group_object) {
                    return group_object.num == object.num;
                });
                if (element_find_flag != -1)
                    return true;
            });

            
            var arleady_added_plate_size_flag_by_width = groups_with_plate_size_elements_by_plate_width.findIndex( function(plate_size_element) {
                if (plate_size_element.num == object.num)
                    return true;
            });

            var arleady_added_plate_size_flag_by_height = groups_with_plate_size_elements_by_plate_height.findIndex( function(plate_size_element) {
                if (plate_size_element.num == object.num)
                    return true;
            });
            
            var arleady_added_plate_size_flag = (arleady_added_plate_size_flag_by_width == -1 && arleady_added_plate_size_flag_by_height == -1) ? -1 : 0;

            if ( object.w == plate_height || object.h == plate_height || object.w == plate_width || object.h == plate_width) {
                if ( plate_width == plate_height && arleady_added_plate_size_flag == -1) {
                    if ( object.w == plate_height && object.h <= plate_width ) {
                        groups_with_plate_size_elements_by_plate_height.push({
                            num: object.num,
                            w: object.h,
                            h: object.w,
                            optimal: object.w
                        });
                    }
                    else if ( object.h == plate_height && object.w <= plate_width ) {
                        groups_with_plate_size_elements_by_plate_height.push({
                            num: object.num,
                            w: object.w,
                            h: object.h,
                            optimal: object.h
                        });
                    }
                }
                else if ( object.w == plate_width && object.w != object.h && object.h <= plate_height && arleady_added_plate_size_flag == -1) {
                    groups_with_plate_size_elements_by_plate_width.push({
                        num: object.num,
                        w: object.w,
                        h: object.h,
                        optimal: object.h
                    });
                }
                else if ( object.h == plate_width && object.w != object.h && object.w <= plate_height && arleady_added_plate_size_flag == -1) {
                    groups_with_plate_size_elements_by_plate_width.push({
                        num: object.num,
                        w: object.h,
                        h: object.w,
                        optimal: object.w
                    });
                }
                else if ( object.w == plate_height && object.w != object.h && object.h <= plate_width && arleady_added_plate_size_flag == -1) {
                    groups_with_plate_size_elements_by_plate_height.push({
                        num: object.num,
                        w: object.h,
                        h: object.w,
                        optimal: object.w
                    });
                }
                else if ( object.h == plate_height && object.w != object.h && object.w <= plate_width && arleady_added_plate_size_flag == -1) {
                    groups_with_plate_size_elements_by_plate_height.push({
                        num: object.num,
                        w: object.w,
                        h: object.h,
                        optimal: object.h
                    });
                }
                else if ( object.w == object.h && arleady_added_plate_size_flag == -1) {
                    window.console.log('object.w == object.h');
                    if ( object.w == plate_height && object.h <= plate_width) {
                        groups_with_plate_size_elements_by_plate_height.push({
                            num: object.num,
                            w: object.h,
                            h: object.w,
                            optimal: object.w
                        });
                    }
                    else if ( object.h == plate_height && object.w <= plate_width) {
                        groups_with_plate_size_elements_by_plate_height.push({
                            num: object.num,
                            w: object.w,
                            h: object.h,
                            optimal: object.h
                        });
                    }
                    else if ( object.w == plate_width && object.h <= plate_height) {
                        groups_with_plate_size_elements_by_plate_width.push({
                            num: object.num,
                            w: object.w,
                            h: object.h,
                            optimal: object.h
                        });
                    }
                    else if ( object.h == plate_width && object.w <= plate_height) {
                        groups_with_plate_size_elements_by_plate_width.push({
                            num: object.num,
                            w: object.h,
                            h: object.w,
                            optimal: object.w
                        });
                    }
                } 
            }
            else {
                if ( (object.w == size.value || object.h == size.value) && arleady_added_flag == -1) {
                    var temp_object = {
                        num: object.num,
                        w: size.value,
                        h: (size.value == object.w ? object.h : object.w),
                        optimal: size.value
                    };
                    raw_group.push(temp_object);
                }
            }
        });

        if (raw_group.length > 0)
            raw_groups.push( raw_group );

    });
    
    // workaround for single item
    /*raw_groups = raw_groups.filter(function(raw_group, index) {
        if ( raw_group.length != 1 || ( raw_group.length == 1 && raw_group[0].h <= plate_height) ) {
            return true;
        }
    });*/

    //check of group has metrics that equal or more half of plate height

    var raw_groups_with_big_elements = [];
    var num_to_delete = [];

    raw_groups.forEach(function(raw_group, i_1, raw_groups_array) {
       raw_group.forEach(function(element, i_2, raw_group_array) {
            if (   (parseFloat(element.w) >= parseFloat(plate_height/2)) 
                || (parseFloat(element.h) >= parseFloat(plate_height/2))
               ) 
            {
                //find metrics that optimal by plate_height
                var populate_by_width = element.w / plate_height;
                var populate_by_height = element.h / plate_height;
                var populate_by_width_flag = false;
                var populate_by_height_flag = false;

                if ( element.w == plate_height || element.h == plate_height || element.w == plate_width || element.h == plate_width) {
                    // do not add element with these conditiond, we do it with groups_with_plate_size_elements
                    populate_by_width_flag = false;
                    populate_by_height_flag = false;
                    /*if ( populate_by_width == 1 ) {
                        populate_by_width_flag = true;
                        populate_by_height_flag = false;
                    }

                    if ( populate_by_height == 1 ) {
                        populate_by_width_flag = false;
                        populate_by_height_flag = true;
                    }*/
                }
                else {
                    if ( populate_by_width >= populate_by_height && populate_by_width <= 1 && populate_by_height <= 1 ) {
                        populate_by_width_flag = true;
                        populate_by_height_flag = false;
                    }
                    else if ( populate_by_width <= 1 && populate_by_height > 1 ) {
                        populate_by_width_flag = true;
                        populate_by_height_flag = false;
                    }
                    else if ( populate_by_width > 1 && populate_by_height <= 1 ) {
                        populate_by_width_flag = false;
                        populate_by_height_flag = true;
                    }
                    else if ( populate_by_height <= 1 ) {
                        populate_by_width_flag = false;
                        populate_by_height_flag = true;
                    }
                }

                var add_flag = false;
                if ( populate_by_width_flag ) {
                    var new_width = element.h;
                    var new_height = element.w;
                    if ( new_width <= plate_width ) {
                        var temp_object = {
                            num: element.num,
                            w: new_width,
                            h: new_height,
                            optimal: element.h
                        };
                        raw_groups_with_big_elements.push(temp_object);
                        add_flag = true;
                    }
                }
                if ( populate_by_height_flag ) {
                    var new_width = element.w;
                    var new_height = element.h;
                    var temp_object = {
                        num: element.num,
                        w: new_width,
                        h: new_height,
                        optimal: element.w
                    };
                    raw_groups_with_big_elements.push(temp_object);
                    add_flag = true;
                    
                }
                if (add_flag)
                    num_to_delete.push(parseInt(element.num));
            }
       }); 
    });

    while ( num_to_delete.length > 0) {
        var num = num_to_delete.shift();
        for (i in raw_groups) {
            for ( j in raw_groups[i] ) {
                if ( parseInt(raw_groups[i][j].num) == num ) {
                    raw_groups[i].splice(j, 1);
                }
            }
        }
    }

    window.console.log('raw_groups clear');
    window.console.log(raw_groups.slice(0));

    window.console.log('um_to_delete.length EXIT');
    if ( raw_groups_with_big_elements.length > 0) {
        raw_groups_with_big_elements.forEach(function(rebase_objects) {
            raw_groups.unshift([rebase_objects]);
        });
    }

    window.console.log('raw_groups big');
    window.console.log(raw_groups.slice(0));

    // sort elements with plate sizes
    // if plate vertical - first set elements with metriks eq plate height
    // if plate horizontal - first set elements with metriks eq plate width
    var is_plate_vertical = ( (plate_height / plate_width) >= 1 ) ? true : false;

    if ( is_plate_vertical ) {
        // rotate elements in groups_with_plate_size_elements_by_plate_width
        // then add groups_with_plate_size_elements_by_plate_height and groups_with_plate_size_elements_by_plate_width
        if ( groups_with_plate_size_elements_by_plate_height.length > 0) {
            if ( groups_with_plate_size_elements_by_plate_width.length > 0) {
                var temp_group = [];
                groups_with_plate_size_elements_by_plate_width.forEach( function (element) {
                    temp_group.push({
                        num: element.num,
                        w: element.h,
                        h: element.w,
                        optimal: element.w
                    });
                });
                raw_groups.unshift(temp_group);
            }

            raw_groups.unshift(groups_with_plate_size_elements_by_plate_height);
        }
        else {
            if ( groups_with_plate_size_elements_by_plate_width.length > 0) {
                raw_groups.unshift(groups_with_plate_size_elements_by_plate_width);
            }
        }
    }
    else {
        // rotate elements in groups_with_plate_size_elements_by_plate_height
        // then add groups_with_plate_size_elements_by_plate_width and groups_with_plate_size_elements_by_plate_height
        var temp_group = [];
        if ( groups_with_plate_size_elements_by_plate_width.length > 0) {
            if ( groups_with_plate_size_elements_by_plate_height.length > 0) {
                groups_with_plate_size_elements_by_plate_height.forEach( function (element) {
                    temp_group.push({
                        num: element.num,
                        w: element.h,
                        h: element.w,
                        optimal: element.w
                    });
                });
                raw_groups.unshift(temp_group);
            }
        
            raw_groups.unshift(groups_with_plate_size_elements_by_plate_width);
        }
        else {
            if ( groups_with_plate_size_elements_by_plate_height.length > 0) {
                raw_groups.unshift(groups_with_plate_size_elements_by_plate_height);
            }
        }
    }

    var dublicated_elements = [];

    /*raw_groups.forEach(function(raw_group, index) {
        if ( raw_groups[index+1] !== undefined ) {
            var other_groups = raw_groups.slice(index+1, raw_groups.length);
            if ( other_groups.length > 0 ) {
                raw_group.forEach(function(element) {
                    var find_flag = other_groups.find( function(other_group) {
                        return other_group.find( function(other_element) {
                            return other_element.num == element.num;
                        });
                    });

                    var check_add = dublicated_elements.find( function(dublicated_element) {
                        return dublicated_element.num == element.num;
                    });

                    if ( find_flag && !check_add) {
                        dublicated_elements.push({
                            num: element.num,
                            w: element.w,
                            h: element.h,
                            optimal: element.optimal
                        });
                    }
                });
            }
        }
    });

    

    var raw_groups_temp = raw_groups.slice(0);

    dublicated_elements.forEach( function(dublicated_element) {
        var raw_groups_indexes = [];
        raw_groups.forEach( function(raw_group, raw_group_index) {
            var temp_index = raw_group.findIndex( function(element) {
                return element.num == dublicated_element.num;
            });

            if ( temp_index != -1) {
                raw_groups_indexes.push(raw_group_index);
            }

        });

        var temp_sets_height = [];
        raw_groups_indexes.forEach( function(index) {
            var temp_set_height = raw_groups[index].reduce( function(previousValue, object, index, array) {
                return previousValue + parseInt(object.h);
            }, 0);

            temp_sets_height.push({index: index, height: temp_set_height});
        });
        
        //sort heights
        temp_sets_height.sort(function(a, b){
            return b.height - a.height;
        });

        //delete dublicate object in sets with index > 0
        temp_sets_height = temp_sets_height.slice(1, temp_sets_height.length);

        temp_sets_height.forEach( function (set) {
            var index_to_remove = raw_groups[parseInt(set.index)].findIndex( function(element) {
                return element.num == dublicated_element.num;
            });

            if ( index_to_remove != -1 ) {
                raw_groups[parseInt(set.index)].splice(index_to_remove, 1);
            }

        });

    });*/
    
    //delete empty groups
    var empty_exist = true;
    do {
        var empty_index = raw_groups.findIndex( function(group, index) {
            if ( group.length == 0 ) {
                return true;
            }
        });

        if ( empty_index != -1 ) {
            raw_groups.splice(empty_index, 1);
        }
        else {
            empty_exist = false;
        }

    } while ( empty_exist )
    window.console.log('raw_groups 1');
    window.console.log(raw_groups.slice(0));

    // sort by area;
    /*raw_groups.sort(function(a, b){
        var a_area = a.reduce( function(previousValue, object, index, array) {
                return previousValue + parseInt(object.h * object.h);
            }, 0);
            
        var b_area = b.reduce( function(previousValue, object, index, array) {
                return previousValue + parseInt(object.h * object.h);
            }, 0);
            
            
        return b_area - a_area;
    });*/

    
    // sort by conditions;
    raw_groups.sort(function(a, b){
        var a_width = a[0].w;
        var b_width = b[0].w;

        var a_height = a.reduce( function(previousValue, object, index, array) {
                return previousValue + parseInt(object.h) + parseInt(cut_line_width);
            }, 0);
        var b_height = b.reduce( function(previousValue, object, index, array) {
                return previousValue + parseInt(object.h) + parseInt(cut_line_width);
            }, 0);  
        
        var a_area = a.reduce( function(previousValue, object, index, array) {
                return previousValue + parseInt(object.h * object.h);
            }, 0);
            
        var b_area = b.reduce( function(previousValue, object, index, array) {
                return previousValue + parseInt(object.h * object.h);
            }, 0);

        if ( (a_height + b_height) <= (plate_height + cut_line_width) ) {

            if ( a_width == b_width) {
                return 0;
            }

            if ( a_width > b_width) {
                return -1;
            }

            if ( a_width < b_width) {
                return 1;
            }
        }

        //default
        return b_area - a_area;
    });

    //sort big elements
    // important - raw group with big element always placed before raw grop without big element
    raw_groups.sort(function(a, b){
        var a_width = a[0].w;
        var b_width = b[0].w;

        var a_has_big_element = a.length == 1 && a[0].h >= plate_height / 2 ? true : false;
        var b_has_big_element = b.length == 1 && b[0].h >= plate_height / 2 ? true : false;
        if ( a_has_big_element && b_has_big_element ) {
            if ( a_width == b_width) {
                return 0;
            }

            if ( a_width > b_width) {
                return -1;
            }

            if ( a_width < b_width) {
                return 1;
            }
        }
        //default
        return 0;

    });

    raw_groups.forEach(function(raw_group, index) {
        raw_group.sort(function(a, b){
            return b.w - a.w
        })
    });

    // extra sort for plate sized elements based on plate oreintation
    raw_groups.sort(function(a, b){
        var a_height = a[0].h;
        var a_width = a[0].w;
        var b_height = b[0].h;
        var b_width = b[0].w;
        if ( is_plate_vertical ) {
            if ( a_height == plate_height && b_height == plate_height ) {
                return b_width - a_width;
            }
            else if ( a_height == plate_height) {
                return -1;
            }
            else if ( b_height == plate_height) {
                return 1;
            }
            else {
                return b_width - a_width;
            }
        }
        else {
            if ( a_width == plate_width && b_height == plate_width ) {
                return 0;
            }
            else if ( a_width == plate_width) {
                return -1;
            }
            else if ( b_width == plate_width) {
                return 1;
            }
            else {
                b_width - a_width;
            }
        }
    });
    // sort plate width sized element by height
    raw_groups.forEach(function(raw_group, index) {
        raw_group.sort(function(a, b){
            if ( a.w == plate_width && b.w == plate_width)
            return b.h - a.h;
        })
    });

    //calculate sets
    var plate_width_populate = 0;
    var plate_sets = [];
    var plate_populate = true;
    var raw_groups_length = raw_groups.length;
    var is_last_set = false;
    

    window.console.log('raw_groups 11');
    window.console.log(raw_groups.slice(0));

    do {
        var temp_set = [];
        var current_group = raw_groups.shift();

        // extra check if current group is last and it can be rotating if it needed
        if (    (plate_width_populate + (current_group[0].w + cut_line_width)) > (plate_width + cut_line_width) 
             && current_group.length == 1
             && current_group[0].w <= plate_height
             && (plate_width_populate + (current_group[0].h + cut_line_width)) <= (plate_width + cut_line_width)
           )
        {
            current_group[0] = {
                w: current_group[0].h,
                h: current_group[0].w,
                optimal: current_group[0].h,
                num: current_group[0].num
            };
            is_last_set = true;
        }

        if ( plate_width_populate == 0 && current_group[0].w == plate_width) {
            current_group[0] = {
                w: current_group[0].w,
                h: current_group[0].h,
                optimal: current_group[0].h,
                num: current_group[0].num
            };
            is_last_set = true;
        }

        if ( (plate_width_populate + (current_group[0].w + cut_line_width)) <= (plate_width + cut_line_width) ) {
            plate_width_populate = plate_width_populate + (current_group[0].w + cut_line_width);
            //sort current group by element height;
            raw_groups.sort(function(a, b){
                b.h - a.h;
            });
            
            var current_group_height = current_group.reduce( function(previousValue, object, index, array) {
                return previousValue + parseInt(object.h) + parseInt(cut_line_width);
            }, 0);
           
            window.console.log('current_group_height');
            window.console.log(current_group_height);

            if ( current_group_height <= (plate_height + cut_line_width) ) {
               temp_set = current_group.slice(0);
               window.console.log('temp_set');
               window.console.log(temp_set);
            }
            else {

                temp_set = DOMINION.findOptimalSet(current_group.slice(0), cut_line_width, plate_height);
                

                var temp_group = [];
                
                temp_group = current_group.filter( function(object) {
                    var find_flag = temp_set.find( function(temp_set_object) {
                        return temp_set_object.num == object.num;
                    });


                    if ( find_flag == undefined )
                        return true;
                    else
                        return false;
                });

                if ( temp_group.length > 0) {
                    raw_groups.unshift( temp_group );
                }
            
            }
            
            // find group that can populate remaining plate height
            window.console.log('is_last_set');
            window.console.log(is_last_set);

            window.console.log('raw_groups check');
            window.console.log(raw_groups.slice(0));

            if ( temp_set.length > 0) {
                var temp_set_width = temp_set[0].w;
                var possible_sub_sets = [];
                do {
                    var current_set_height = temp_set.reduce( function(previousValue, object, index, array) {
                        var add_cut_line = ( (previousValue + parseInt(object.h) + parseInt(cut_line_width)) <= plate_height ) ? parseInt(cut_line_width) : 0;
                        
                        return previousValue + parseInt(object.h) + add_cut_line;

                    }, 0);

                    var remaining_height = parseInt(plate_height) - parseInt(current_set_height);

                    if ( !is_last_set || temp_set.length > 0 ) {
                        //while
                        possible_sub_sets = DOMINION.findPossibleSubSets(raw_groups, temp_set_width, remaining_height, cut_line_width);
                        window.console.log('possible_sub_sets not last');
                        window.console.log(possible_sub_sets.slice(0))
                        
                        window.console.log('remaining_height');
                        window.console.log(remaining_height);

                        if ( possible_sub_sets.length > 0) {
                            // find sub set with max remaining height populate;
                            var sub_set = false;
                            possible_sub_sets.sort(function(a, b){
                                var a_area = a.reduce( function(previousValue, object, index, array) {
                                        return previousValue + parseInt(object.h) + parseInt(cut_line_width);
                                    }, 0);
                                    
                                var b_area = b.reduce( function(previousValue, object, index, array) {
                                        return previousValue + parseInt(object.h) + parseInt(cut_line_width);
                                    }, 0);
                                    
                                    
                                return a_area - b_area;
                            });
                            
                            sub_set = possible_sub_sets.shift();
                            sub_set.sort(function(a, b){
                                return b.h - a.h;
                            });
                            sub_set.forEach( function(object) {
                                temp_set.push(object);
                            });
                            
                            // delete sub set from groups
                            /*raw_groups = raw_groups.filter( function(group) {
                                return group != sub_set;
                            });*/
                            
                            

                            raw_groups.forEach( function(group, i) {
                                var delete_group_object = [];
                                group.forEach( function(group_object, j) {
                                    var find_flag = temp_set.findIndex( function(temp_set_object) {
                                        return temp_set_object.num == group_object.num;
                                    });
                                    
                                    if ( find_flag != -1 ) {
                                        delete_group_object.push(group_object);
                                    }

                                });

                                    
                                raw_groups[i] = raw_groups[i].filter( function(object) {
                                    var find_flag = delete_group_object.findIndex( function(temp_set_object) {
                                        return temp_set_object.num == object.num;
                                    });
                                    if ( find_flag == -1 ) 
                                        return true;
                                });
                            });

                            var empty_exist = true;
                            do {
                                var empty_index = raw_groups.findIndex( function(group, index) {
                                    if ( group.length == 0 ) {
                                        return true;
                                    }
                                });

                                if ( empty_index != -1 ) {
                                    raw_groups.splice(empty_index, 1);
                                }
                                else {
                                    empty_exist = false;
                                }

                            } while ( empty_exist );
                            
                        }
                        // extra check for next sun set
                        var temp_current_set_height = temp_set.reduce( function(previousValue, object, index, array) {
                            var add_cut_line = ( (previousValue + parseInt(object.h) + parseInt(cut_line_width)) <= plate_height ) ? parseInt(cut_line_width) : 0;
                            return previousValue + parseInt(object.h) + add_cut_line;

                        }, 0);
                        var temp_remaining_height = parseInt(plate_height) - parseInt(temp_current_set_height);
                        
                        window.console.log('temp_remaining_height');
                        window.console.log(temp_remaining_height);

                        possible_sub_sets = DOMINION.findPossibleSubSets(raw_groups, temp_set_width, temp_remaining_height, cut_line_width);

                        window.console.log('possible_sub_sets_check');
                        window.console.log(possible_sub_sets);
                    }
                    //last set
                    else if ( is_last_set && temp_set.length == 0 ) {
                        var last_set_remaining_width = (plate_width + cut_line_width) - plate_width_populate + (current_group[0].w + cut_line_width);
                        
                        //filter by rotated values;
                        possible_sub_sets = raw_groups.filter( function(group){
                            var group_width = group.reduce( function(previousValue, object, index, array) {
                                return previousValue + parseInt(object.h) + parseInt(cut_line_width);
                            }, 0);
                            if ( group_width <= last_set_remaining_width && (group[0].h + cut_line_width) <= remaining_height) {
                                return true;
                            }
                            else {
                                return false;
                            }
                        });
                        window.console.log('last_set_remaining_width');
                        window.console.log(last_set_remaining_width);
                        window.console.log('possible_sub_sets 0');
                        window.console.log(raw_groups.slice(0));
                         window.console.log(possible_sub_sets.slice(0));

                        if ( possible_sub_sets.length == 0 ) {
                            possible_sub_sets = DOMINION.findPossibleSubSets(raw_groups, temp_set_width, remaining_height, cut_line_width);
                        }

                        if ( possible_sub_sets.length > 0 ) {

                            // find sub set with max remaining height populate;
                            var sub_set = false;

                            possible_sub_sets.sort(function(a, b){
                                var a_height = a.reduce( function(previousValue, object, index, array) {
                                        return previousValue + parseInt(object.h) + parseInt(cut_line_width);
                                    }, 0);
                                    
                                var b_height = b.reduce( function(previousValue, object, index, array) {
                                        return previousValue + parseInt(object.h) + parseInt(cut_line_width);
                                    }, 0);
                                    
                                    
                                return b_height - a_height;
                            });
                            
                            window.console.log('possible_sub_sets 1');
                            window.console.log(possible_sub_sets.slice(0));
                            
                            sub_set = possible_sub_sets.shift();

                            sub_set.sort(function(a, b){
                                return b.h - a.h;
                            });

                            var rotated_sub_set_height = sub_set[0].w;
                            var last_set_sub_set = {
                                last_set_sub_set: true,
                                h: rotated_sub_set_height,
                                objects: [],
                                optimal: temp_set_width
                            };

                            var last_set_sub_set_f = last_set_sub_set;

                            var rotated_sub_set_height = 0;

                            sub_set.forEach( function(object) {
                                rotated_sub_set_height += object.h + cut_line_width;
                                last_set_sub_set.objects.push({
                                    num: object.num,
                                    h: object.w,
                                    w: object.h
                                });
                            });

                            last_set_sub_set.w = rotated_sub_set_height;

                            // check if rotated set height is not more that remaining height
                            rotated_last_set_subset_height = last_set_sub_set.objects.reduce( function(previousValue, object, index, array) {
                                        return previousValue + parseInt(object.h) + parseInt(cut_line_width);
                                    }, 0);
                            if ( remaining_height + cut_line_width >= rotated_last_set_subset_height) {
                                temp_set.push(last_set_sub_set);
                            }
                            else {
                                //rotate once again and check height
                                last_set_sub_set.objects = [];
                                sub_set.forEach( function(object) {
                                    rotated_sub_set_height += object.w + cut_line_width;
                                    last_set_sub_set.objects.push({
                                            num: object.num,
                                            h: object.h,
                                            w: object.w
                                    });
                                });
                                last_set_sub_set.w = rotated_sub_set_height;

                                rotated_last_set_subset_height = last_set_sub_set.objects.reduce( function(previousValue, object, index, array) {
                                        return previousValue + parseInt(object.h) + parseInt(cut_line_width);
                                    }, 0);
                                if ( remaining_height + cut_line_width >= rotated_last_set_subset_height) {
                                    temp_set.push(last_set_sub_set);
                                }
                            }
                            
                            // delete sub set from groups
                            raw_groups = raw_groups.filter( function(group) {
                                return group != sub_set;
                            });
                            
                        }

                    }
                    //sort not last set by width 
                    //sort not last set by width adn sub set heigth 
                    

                } while ( possible_sub_sets.length > 0);

                //add set to sets
                temp_set.sort(function(a, b){
                    return b.w - a.w;
                 });


                plate_sets.push( temp_set );
            }

            //check if current group is last stack
            var possible_next_stack = raw_groups.filter( function(group) {
                var group_width = group[0].w;
                var group_height = group.reduce( function(previousValue, object, index, array) {
                    return previousValue + parseInt(object.h) + parseInt(cut_line_width);
                }, 0);
                if ( (   ((plate_width_populate + group_width) <= (plate_width + cut_line_width) )
                        && (((plate_height + cut_line_width) / 2) < group_height)
                     )
                     ||
                     (
                            group.length == 1
                        &&  ( (    ((plate_width_populate + group_height) <= (plate_width) )
                                &&  (group_width <= plate_height )
                              )
                                ||
                              ( (plate_width_populate + group_width) <= plate_width 
                                &&  (group_height <= plate_height + cut_line_width )
                              )
                            )
                     )
                   )
                {
                    return true;
                }
            });
            


            if ( possible_next_stack.length > 0) {
                is_last_set = false;
            }
            else if ( possible_next_stack.length == 1) {
                if (       raw_groups[0].w + plate_width_populate > plate_width
                        && raw_groups[0].w <= plate_height
                   ) 
                {
                    raw_groups[0] = [{
                        w: raw_groups[0].h,
                        h: raw_groups[0].w,
                        num: raw_groups[0].w,
                        optimal: raw_groups[0].h
                    }];
                }
            }
            else if ( possible_next_stack.length == 0 && raw_groups_length > 1) {
                is_last_set = true;
            }
        }

        
        //check plate populate conditions
        if ( plate_width_populate <= (plate_width + cut_line_width) && raw_groups.length > 0) {
            plate_populate = true;
        } else {
            plate_populate = false;
        }
            
    } while ( plate_populate )
    window.console.log('plate_populate EXIT');

    var plate_sets_f = plate_sets.slice(0);
    window.console.log('plate_sets_f');
    window.console.log(plate_sets_f);
    //throw new Error("stop");
    var not_used_objects = [];
    var used_objects = [];

    plate_sets.forEach( function(set) {
        set.forEach( function(set_object) {
            if (set_object.last_set_sub_set != true) {
                used_objects.push(set_object);
            }
            else {
                set_object.objects.forEach( function(set_sub_object) {
                     used_objects.push(set_sub_object);
                })
            };
        });
    });

    not_used_objects = objects.filter( function(object) {
        var find_flag = used_objects.find( function(used_object) {
            return used_object.num == object.num;
            
        });

        if ( find_flag == undefined)
            return true;
    });
        
    //populate objects array from not used groups;


    //sort  sets by width;
    if ( plate_sets.length > 0 ) {
        for (var i = 0; i < plate_sets.length; i++) {
            plate_sets[i].sort( function(a,b) {
                var a_width = 0;
                var b_width = 0;
                
                if ( a.last_set_sub_set != true ) {
                    a_width = a.w;
                }
                else {
                    a_width = a.objects.reduce( function(sub_set_previousValue, sub_set_object, index, array) {
                        return  sub_set_previousValue + parseInt(sub_set_object.w);
                    }, 0);
                }

                if ( b.last_set_sub_set != true ) {
                    b_width = b.w;
                }
                else {
                    b_width = b.objects.reduce( function(sub_set_previousValue, sub_set_object, index, array) {
                        return  sub_set_previousValue + parseInt(sub_set_object.w);
                    }, 0);
                }
                window.console.log('aw ' + a_width);
                window.console.log('bw ' + b_width);
                return b_width - a_width;

            });

            // WORKAROUND FOR SUBSETS width and hight
            for (j in plate_sets[i]) {
                if ( plate_sets[i][j].objects !== undefined) {
                    var correct_width = plate_sets[i][j].objects.reduce( function(width, element) {
                        return width + parseInt(element.w) + cut_line_width;
                    }, 0);
                    //remove last cut line
                    correct_width = correct_width - cut_line_width;

                    var correct_height = plate_sets[i][j].objects[0].h;
                    //remove last cut line
                    plate_sets[i][j].w = correct_width;
                    plate_sets[i][j].h = correct_height;
                }
            }
        }
        

    };

    

    window.console.log('plate_sets after sort')
    window.console.log(plate_sets);
    //throw new Error('stop');
    //renum elements
    sets_min_numbers = []; 
    sets_max_numbers = [];
    plate_sets_element_count = plate_sets.reduce(function(previousValue, set, index, array) {
        var current_set_length = set.reduce(function(previousElementValue, element) {
                                        if ( element.objects === undefined) {
                                            return previousElementValue + 1;
                                        }
                                        else {
                                            return previousElementValue + element.objects.length;
                                        }
                                }, 0);

      return previousValue + current_set_length;
    }, 0);

    plate_sets.forEach( function(set) {
        var set_nums = set.map(function(o){
            if (o.num > 0) {
                return o.num;
            }
            else if (o.objects) {
                return Math.min.apply(Math, o.objects.map(function(so) {return so.num;}));
            }
        });
        sets_min_numbers.push( Math.min.apply(Math, set_nums) );
    });

    window.console.log('sets_min_numbers')
    window.console.log(sets_min_numbers);

    var new_num_arr = [];
    var num = Math.min.apply( Math, sets_min_numbers );
    // if min num = 2 it means that num = 1 has been deleted, so set start num to 1;
    num = (num == 2 && manual_elements_nums.indexOf(1) == -1 ) ? 1 : num;
    // if it first iteration and first elem is not on manual plate
    num = (populate_iteration_count == 1 && manual_elements_nums.indexOf(1) == -1 ) ? 1 : num;
    // if it not first iteration
    num = (populate_iteration_count > 1 && last_plate_max_element_number > 0 && manual_elements_nums.indexOf(last_plate_max_element_number) == -1 ) ? last_plate_max_element_number+1 : num;

    window.console.log('plate_sets');
    window.console.log(plate_sets);

    window.console.log(plate_sets_element_count);

    do {
        if ( manual_elements_nums.indexOf(num) == -1 ) {
            new_num_arr.push(num);
        }
        num++;
    } while ( new_num_arr.length < plate_sets_element_count);
    window.console.log('plate_sets_element_count EXIT');
    

    plate_sets.map(function(set) {
        set.map(function(element ) {
            if ( element.objects === undefined) {
                var new_num = new_num_arr.shift();
                element.num = new_num;
                return element;
            }
            else {
                element.objects.map(function(sub_element) {
                    var new_num = new_num_arr.shift();
                    sub_element.num = new_num;
                    return sub_element;
                });
                element.num = element.objects[0].num;
            }
        });
        return set;
    });


    plate_sets.forEach( function(set) {
        sets_max_numbers.push( Math.max.apply(Math,set.map(function(o){return o.num;})) );
    });

    var not_used_objects_num = Math.max.apply( Math, sets_max_numbers );
    not_used_objects_num++;

    while ( manual_elements_nums.indexOf(not_used_objects_num) != -1) {
        not_used_objects_num++;
    }

    not_used_objects.map( function(element) {
        element.num = not_used_objects_num;
        not_used_objects_num++;
        return element;
    });
    
    //create set for element list
    var list_sets = [];
    plate_sets.forEach( function(set) {
        var temp_set = [];
        set.forEach( function(object) {
            if ( object.last_set_sub_set != true) {
                temp_set.push(object);
            }
            else {
                object.objects.forEach( function(last_set_sub_set) {
                    temp_set.push(last_set_sub_set);
                });
            }

        });

        list_sets.push( temp_set );
    });

    window.console.log(plate_sets.slice(0));
    window.console.log(list_sets.slice(0));

    return {
        plate_sets: plate_sets,
        list_sets: list_sets,
        objects: not_used_objects
    };
}

DOMINION.init = function (grid_width, grid_height, input_objects, cut_line_size, manual_elements_nums, populate_iteration_count, last_plate_max_element_number) {
    var plate = {};
    plate.width  = parseInt(grid_width);
    plate.height = parseInt(grid_height);
    
    //plate.width  = 1500;
    //plate.height = 2000;
    

    //sort init objects by 'num'
    input_objects.sort(function(a, b){
        return parseInt(a.num) - parseInt(b.num);
    });
    
    // init state
    /*var state = {
        sets: [],
        objects: input_objects
    }*/

    /*var state = {
        sets: []
    };*/
    var state = {};

    var cut_line_width = cut_line_size;
    //state = DOMINION.populateCol(state, 0, 0, plate.width, plate.height, cut_line_width);

    /*input_objects = [
        {num:1, w:400, h:600},
        {num:2, w:400, h:500},
        {num:3, w:400, h:500},
        {num:4, w:600, h:800},
        {num:5, w:400, h:800},
        {num:6, w:400, h:800},
        {num:7, w:200, h:400},
        {num:8, w:200, h:300},
        {num:9, w:200, h:200}
    ];*/


    state_set = DOMINION.populateCol2(input_objects, plate.width, plate.height, cut_line_width, manual_elements_nums, populate_iteration_count, last_plate_max_element_number);
    state.sets = state_set.plate_sets;
    state.list_sets = state_set.list_sets;
    state.objects = state_set.objects;

    var result_sets_max_numbers = [];
    state.sets.forEach( function(set) {
        result_sets_max_numbers.push( Math.max.apply(Math,set.map(function(o){return o.num;})) );
    });

    state.last_plate_max_element_number = Math.max.apply( Math, result_sets_max_numbers );
    window.console.log('last_plate_max_element_number');
    window.console.log(last_plate_max_element_number);
    //sort sets by max height
    /*state.sets.sort(function(a, b){
        var sum_a = 0;
        var sum_b = 0;
        for (i in a) {
            if (a[i].w == a[i].optimal)
                sum_a += a[i].h;
            else
                sum_a += a[i].w;
            sum_a += cut_line_width;
        }
        for (i in b) {
            if (b[i].w == b[i].optimal)
                sum_b += b[i].h;
            else
                sum_b += b[i].w;
            sum_b += cut_line_width;
        }
        return sum_b - sum_a;
    });
    return state;*/
    return state;
}

DOMINION.drawObj = function(grid, param, obj, width_offset, height_offset, actual_cut_line_width, set_item_count, plate_height, selected_num) {

    var $item = $('<div class="grid-item grid-item-all-border ' + ((selected_num  == obj.num) ? 'checked' : '') + '" data-top="' + (height_offset * param.scale * param.zoom) +'" data-height="' + obj.h * param.scale * param.zoom + '" data-width="' + obj.w * param.scale * param.zoom + '" data-top="' + (height_offset * param.scale * param.zoom) +  '"><span>'+parseInt(obj.num)+'</span></div>');
    grid.append($item);

    var item_top = height_offset;
    if ( set_item_count != 0 ) {
        item_top += actual_cut_line_width;
    }

    $item.css({
        'position': 'absolute',
        'top': item_top,
        'left': width_offset,
        'width': Math.ceil(obj.w * param.scale * param.zoom),
        'height': Math.ceil(obj.h * param.scale * param.zoom),
        'z-index': 1
            });

    return {
            'h': item_top + Math.ceil(obj.h * param.scale * param.zoom),
            'w': width_offset + Math.ceil(obj.w * param.scale * param.zoom),
            'w_subset': Math.ceil(obj.w * param.scale * param.zoom)
            };
}

DOMINION.draw = function (grid, param, state) {
    //draw
    var width_offset = 0;
    var width_offset_px = 0;
    var last_offset = 0;
    var last_offset_px = 0;
    var states_sizes = [];
    var cut_line_width = param.cut_line_width;
    var plate = {};
    var total_cut_line_length = 0;
    var area_populate = 0;
    plate.width = param.grid_width;
    plate.height = param.grid_height;

    var last_set_index = state.sets.length-1;
    var sets_total_lenght = state.sets.length;
    var main_vertical_cut_line_offset = [];
    var main_vertical_cut_line_offset_mm = [];

    var $item = $('<div class="test-cut-line"></div>');
    grid.append($item);

    actual_cut_line_width = Math.ceil(cut_line_width * param.scale * param.zoom);


    for (i in state.sets) {
        var height_offset = 0;
        var height_offset_px = 0;
        var set_count = 0;
        var max_count_optimal_set_value = state.sets[i][0].optimal;
        var states_sizes_temp = []; 
        var prev_optimal = state.sets[i][0].optimal;
        var set_height = 0;

        for (j in state.sets[i]) {
            var rotated = false;
            var color = set_count % 2 ? 'blue' : 'green';
            if ( state.sets[i][j].w != max_count_optimal_set_value) {
                var max_count_optimal_set_value = state.sets[i][j].optimal;
                var rotated = false;

                var temp_w = state.sets[i][j].w;
                var temp_h = state.sets[i][j].h;

                state.sets[i][j].w = temp_h;
                state.sets[i][j].h = temp_w;
                state.sets[i][j].rotated = rotated;
            }

            if ( state.sets[i][j].w > prev_optimal) {
                var temp_w = state.sets[i][j].w;
                var temp_h = state.sets[i][j].h;
                rotated = true;
                state.sets[i][j].w = temp_h;
                state.sets[i][j].h = temp_w;
                state.sets[i][j].rotated = rotated;
                //state.sets[i][j].optimal = state.sets[i][j].h;

                
            }

            prev_optimal = state.sets[i][j].w;
            
            var add_cut_line_width = (set_count !== 0) ? cut_line_width : 0;    
            var height_offset_elem = height_offset + add_cut_line_width;
            var height_offset_elem_fix = height_offset_px;
            set_height += state.sets[i][j].h + add_cut_line_width;

            states_sizes_temp_data = DOMINION.drawObj(grid, param, state.sets[i][j], width_offset_px, height_offset_elem_fix, actual_cut_line_width, set_count, plate.height, param.selected_num);

            states_sizes_temp.push( states_sizes_temp_data );

            height_offset_px = states_sizes_temp_data.h;
            //right cut line in it sub element in set;
            if ( j != 0 && state.sets[i][0].w > state.sets[i][j].w) {
                var fix_actual_cut_line_width = actual_cut_line_width;

                //rework! not only for plate width but set right offset
                /*if ( (width_offset_px + Math.ceil(state.sets[i][j].w * param.scale * param.zoom)) > Math.ceil(plate.width * param.scale * param.zoom) ) {
                    fix_actual_cut_line_width = actual_cut_line_width - ((width_offset_px + Math.ceil(state.sets[i][j].w * param.scale * param.zoom) - Math.ceil(plate.width * param.scale * param.zoom));
                    if (fix_actual_cut_line_width <= 0 )
                        fix_actual_cut_line_width = 1;
                }*/
                var $item = $('<div class="cut-line">1</div>');
                grid.append($item);

                // draw bottom line if it not last and only set
                if ( (sets_total_lenght > 1 && last_set_index != i)  || sets_total_lenght == 1) {
                    $item.css({
                        'position': 'absolute',
                        'top': height_offset_elem_fix + fix_actual_cut_line_width,
                        'left': width_offset_px + Math.ceil(state.sets[i][j].w * param.scale * param.zoom),
                        'width': fix_actual_cut_line_width,
                        'height': Math.ceil(state.sets[i][j].h * param.scale * param.zoom),
                        'z-index': 1
                     });
                    total_cut_line_length += (state.sets[i][j].h);
                    area_populate += (state.sets[i][j].h * cut_line_width);
                }
            }

            area_populate += (state.sets[i][j].w * state.sets[i][j].h);
            
            //horizontal cut lines

            var line_x1 = width_offset_px;
            var line_x2 = max_count_optimal_set_value;
            var line_y = (height_offset_elem + state.sets[i][j].h);

            if ((line_y+cut_line_width) <= plate.height ) {
                
                var line_top = height_offset_elem_fix + Math.ceil(state.sets[i][j].h * param.scale * param.zoom);
                if ( j > 0 )
                    line_top += fix_actual_cut_line_width;
                var temp_plate_height = Math.ceil(plate.height * param.scale * param.zoom);
                // todo cut line height if free space lower that line_height;
                if (   (height_offset ) < plate.height 
                    && ((sets_total_lenght > 1 && last_set_index != i)  || sets_total_lenght == 1)
                    ) {
                    var $item = $('<div class="cut-line">2</div>');
                    grid.append($item);
                    $item.css({
                        'position': 'absolute',
                        'top': height_offset_px,
                        'left': line_x1,
                        'width': Math.ceil(state.sets[i][0].w * param.scale * param.zoom),//first eleemnt in set always has max width;
                        'height': actual_cut_line_width,
                        'z-index': 1
                            });
                    //
                    total_cut_line_length += (state.sets[i][0].w);
                    area_populate += (state.sets[i][0].w * cut_line_width);
                }
            }

            height_offset += max_count_optimal_set_value == state.sets[i][j].w ? state.sets[i][j].h : state.sets[i][j].w;
            height_offset += add_cut_line_width;
            set_count++;

            
        }

        // vertical cut lines
        var prev_set_height = set_height;
        if (width_offset != 0) {
            var line_x = width_offset_px - actual_cut_line_width;
            var line_x_mm = width_offset - cut_line_width;
            var line_y1 = 0;
            var line_y2 = plate.height;
            var $item = $('<div class="cut-line">3</div>');
            grid.append($item);

            $item.css({
                'position': 'absolute',
                'top': Math.ceil(line_y1 * param.scale * param.zoom),
                'left': line_x,
                'width': actual_cut_line_width,
                'height': Math.ceil(line_y2 * param.scale * param.zoom),
                'z-index': 1
            });
            main_vertical_cut_line_offset.push( line_x + actual_cut_line_width );
            main_vertical_cut_line_offset_mm.push( line_x_mm + cut_line_width );
            total_cut_line_length += (line_y2 - line_y1);
            area_populate += ((line_y2 - line_y1) * cut_line_width);
        
            var prev_sub_set_width = state.sets[i][0].w;
            var sub_set_height = 0;
            var count = 0;
            for (j in state.sets[i]) {
                count++;
                sub_set_height += state.sets[i][j].h + cut_line_width;
                if ( state.sets[i][j].w != state.sets[i][0].w) {
                    var line_x1 = width_offset + state.sets[i][j].w;
                    var line_x2 = state.sets[i][0].w - state.sets[i][j].w;
                    var line_y = sub_set_height - cut_line_width;
                }
                prev_sub_set_width =  state.sets[i][j].w;
                
            }
        }
        else {
           
            var prev_sub_set_width = state.sets[i][0].w;
            var sub_set_height = 0;
            var count = 0;
            for (j in state.sets[i]) {
                count++;

                sub_set_height += state.sets[i][j].h + cut_line_width;
                if ( state.sets[i][j].w != state.sets[i][0].w) {
                    var line_x1 = width_offset + state.sets[i][j].w;
                    var line_x2 = state.sets[i][0].w /*- state.sets[i][j].w*/;
                    var line_y = sub_set_height - cut_line_width;
                }
                prev_sub_set_width =  state.sets[i][j].w;
            }
            
                    
            
        }


        states_sizes.push(states_sizes_temp);

        var add_cut_line_width = (set_count !== 0) ? cut_line_width : 0;
        var add_cut_line_width_actual = (set_count !== 0) ? actual_cut_line_width : 0;

        width_offset += (state.sets[i][0].optimal + add_cut_line_width);
        width_offset_px += ( Math.ceil(state.sets[i][0].optimal * param.scale * param.zoom ) + add_cut_line_width_actual);
        //states_width.push(width_offset);
        last_offset = width_offset;
        last_offset_px = width_offset_px;
    }

    // vertical cut lines for last element 
    if ( last_offset <= plate.width && state.sets.length > 0) {
        //IF THERE IS ONLY ONE SET
        if ( state.sets.length == 1) {
            var line_x = last_offset - cut_line_width;
            var line_x_fix = last_offset_px - actual_cut_line_width;
            var line_y1 = 0;
            var line_y2 = plate.height;
            /*ctx.beginPath();
            ctx.moveTo(line_x,line_y1);
            ctx.lineTo(line_x,line_y2);
            ctx.lineWidth = cut_line_width;
            ctx.strokeStyle = 'purple';
            ctx.stroke();*/
            var $item = $('<div class="cut-line">4</div>');
            grid.append($item);
            var fix_actual_cut_line_width = actual_cut_line_width;

            if ( Math.ceil(line_x * param.scale * param.zoom) + actual_cut_line_width > Math.ceil(plate.width * param.scale * param.zoom) ) {
                fix_actual_cut_line_width = actual_cut_line_width - ((Math.ceil(line_x * param.scale * param.zoom) + actual_cut_line_width) - Math.ceil(plate.width * param.scale * param.zoom));
                if (fix_actual_cut_line_width <= 0 )
                    fix_actual_cut_line_width = 1;
            }

            $item.css({
                'position': 'absolute',
                'top': Math.ceil(line_y1 * param.scale * param.zoom),
                'left': line_x_fix,
                'width': fix_actual_cut_line_width,
                'height': Math.ceil(line_y2 * param.scale * param.zoom),
                'z-index': 1
            });

            total_cut_line_length += (line_y2 - line_y1);
            area_populate += ((line_y2 - line_y1) * cut_line_width);

        }
        // cut line for last set if it not only one
        else if (state.sets.length > 1) {
            window.console.log('plate.width');
            window.console.log(plate.width);
            var last_set_left = main_vertical_cut_line_offset[main_vertical_cut_line_offset.length-1];
            var last_set_left_mm = main_vertical_cut_line_offset_mm[main_vertical_cut_line_offset_mm.length-1];

            var last_set_cut_line_offset = 0;
            for (i in state.sets[state.sets.length-1]) {
                var line_x = last_offset - cut_line_width;
                var obj_h = Math.ceil(state.sets[state.sets.length-1][i].h * param.scale * param.zoom);
                var obj_w = Math.ceil(state.sets[state.sets.length-1][i].w * param.scale * param.zoom);
                var fix_actual_cut_line_width = actual_cut_line_width;

                if ( Math.ceil(line_x * param.scale * param.zoom) + actual_cut_line_width > Math.ceil(plate.width * param.scale * param.zoom) ) {
                    fix_actual_cut_line_width = actual_cut_line_width - ((Math.ceil(line_x * param.scale * param.zoom) + actual_cut_line_width) - Math.ceil(plate.width * param.scale * param.zoom));
                    if (fix_actual_cut_line_width <= 0 )
                        fix_actual_cut_line_width = 1;
                }

                $item = $('<div class="cut-line">5</div>');
                grid.append($item);

                $item.css({
                    'position': 'absolute',
                    'top': last_set_cut_line_offset,
                    'left': last_set_left + obj_w,
                    'width': fix_actual_cut_line_width,
                    'height': obj_h,
                    'z-index': 1
                });

                total_cut_line_length += (state.sets[state.sets.length-1][i].h);
                area_populate += ((state.sets[state.sets.length-1][i].h) * cut_line_width);

                last_set_cut_line_offset += obj_h;

                $item = $('<div class="cut-line">6</div>');
                grid.append($item);

                $item.css({
                    'position': 'absolute',
                    'top': last_set_cut_line_offset,
                    'left': last_set_left,
                    'width': Math.ceil(plate.width * param.scale * param.zoom) - last_set_left,
                    'height': actual_cut_line_width,
                    'z-index': 1
                });

                total_cut_line_length += (plate.width - last_set_left_mm);
                area_populate += ((plate.width - last_set_left_mm) * cut_line_width);
                

                last_set_cut_line_offset += actual_cut_line_width;
            }
        }
    }

    // horisontal line extension
    /*set_right_offset = states_sizes.reduce(function(sum, current) {
                              return sum + current.w;
                            }, 0);
    set_right_offset += cut_line_width;
    for ( i in state.sets.reverse()) {
        console.log(states_sizes[i]);
        var line_x1 = set_right_offset;
        var line_x2 = plate.width;
        var line_y = states_sizes[i].h;
        ctx.beginPath();
        ctx.moveTo(line_x1,line_y);
        ctx.lineTo(line_x2,line_y);
        ctx.lineWidth = cut_line_width;
        ctx.strokeStyle = 'yellow';
        ctx.stroke();
        console.log(set_right_offset);
        set_right_offset -= (states_sizes[i].w);
        
    }*/
    
    // besause of Math.ciel elements can overflow grid, so calculate new griw width and height
    var new_grid_width = null;
    var new_grid_height = null;
    var grid_width_px = Math.ceil(plate.width * param.scale * param.zoom);
    var grid_height_px = Math.ceil(plate.height * param.scale * param.zoom);

    var element_width_with_offset = [];
    var element_height_with_offset = [];
    if (states_sizes.length > 0) {
        for ( i in states_sizes) {
            for ( j in states_sizes[i])
                element_width_with_offset.push( states_sizes[i][j].w );
                element_height_with_offset.push( states_sizes[i][j].h );
        }
    }
    var max_element_width_with_offset = Math.max.apply(null, element_width_with_offset);
    var max_element_height_with_offset = Math.max.apply(null, element_height_with_offset);

    if ( max_element_width_with_offset > grid_width_px )
        new_grid_width = max_element_width_with_offset;

    if ( max_element_height_with_offset > grid_height_px )
        new_grid_height = max_element_height_with_offset;
        // fix main vertical cut line if new grid height exist

    grid.find('.cut-line').filter( function(n, line) {
        return $(line).height() == grid_height_px
    }).css('height', new_grid_height + 'px');
    

    return { total_cut_line_length: total_cut_line_length, 
             area_populate: area_populate, 
             actual_cut_line_width: actual_cut_line_width,
             new_grid_sizes: {w: new_grid_width, h: new_grid_height},
             state: state 
            };
}

DOMINION.draw2 = function (grid, param, state) {
    //draw
    var width_offset = 0;
    var width_offset_px = 0;
    var last_offset = 0;
    var last_offset_px = 0;
    var states_sizes = [];
    var cut_line_width = param.cut_line_width;
    var plate = {};
    var total_cut_line_length = 0;
    var area_populate = 0;

    var last_set_offset = 0;
    var last_set_offset_px = 0;

    plate.width = param.grid_width;
    plate.height = param.grid_height;

    var last_set_index = state.sets.length-1;
    var sets_total_lenght = state.sets.length;
    var main_vertical_cut_line_offset = [];
    var main_vertical_cut_line_offset_mm = [];
    var last_set_vertical_cut_lines_index = [];
    var last_set_vertical_cut_lines_left = [];
    var $item = $('<div class="test-cut-line"></div>');
    grid.append($item);

    actual_cut_line_width = Math.ceil(cut_line_width * param.scale * param.zoom);
    $('.test-cut-line').remove();

    for (i in state.sets) {
        var height_offset = 0;
        var height_offset_px = 0;
        var set_count = 0;
        var max_count_optimal_set_value = state.sets[i][0].optimal;
        var states_sizes_temp = []; 
        var prev_optimal = state.sets[i][0].optimal;
        var set_height = 0;

       
        // v1 -main vertical line after last set;
        var last_set_cut_lines_length_v1 = 0;
        // v2 - without last main vertical line, last horizontal line go to plate right border;
        var last_set_cut_lines_length_v2 = 0;

         //check if it last set
        var is_last_set = ( (i == last_set_index && sets_total_lenght > 1) || sets_total_lenght == 1 ) ? true: false;
        window.console.log('is_last_set');
        window.console.log(is_last_set);

        for (j in state.sets[i]) {

            prev_optimal = state.sets[i][j].w;
            
            var add_cut_line_width = (set_count !== 0) ? cut_line_width : 0;    
            var height_offset_elem = height_offset + add_cut_line_width;
            var height_offset_elem_fix = height_offset_px;
            set_height += state.sets[i][j].h + add_cut_line_width;

            
            if ( state.sets[i][j].last_set_sub_set != true) {
                states_sizes_temp_data = DOMINION.drawObj(grid, param, state.sets[i][j], width_offset_px, height_offset_elem_fix, actual_cut_line_width, set_count, plate.height, param.selected_num);
                
                area_populate += state.sets[i][j].w * state.sets[i][j].h;
                if ( is_last_set && states_sizes_temp_data.w < Math.ceil(plate.width * param.scale * param.zoom) ) {
                    /*var $item = $('<div class="cut-line"></div>');
                    grid.append($item);
                    $item.css({
                        'position': 'absolute',
                        'top': height_offset_elem_fix + (j != 0 ? actual_cut_line_width : 0),
                        'left': states_sizes_temp_data.w,
                        'width': actual_cut_line_width,
                        'height': Math.ceil(state.sets[i][j].h * param.scale * param.zoom),
                        'z-index': 1
                     });*/

                    //last_set_cut_lines_length_v1 += state.sets[i][j].h;
                    last_set_cut_lines_length_v2 += parseInt(state.sets[i][j].h);

                    total_cut_line_length += (state.sets[i][j].h);
                    area_populate += (state.sets[i][j].h * cut_line_width);
                }
            }
            else {
                // last set rotated sub set
                var last_set_subset_width_offset_px = width_offset_px;
                for (k in state.sets[i][j].objects) {
                    states_sizes_temp_data = DOMINION.drawObj(grid, param, state.sets[i][j].objects[k], last_set_subset_width_offset_px, height_offset_elem_fix, actual_cut_line_width, set_count, plate.height, param.selected_num);
                    last_set_subset_width_offset_px += states_sizes_temp_data.w_subset + actual_cut_line_width;

                    area_populate += state.sets[i][j].objects[k].w * state.sets[i][j].objects[k].h;
                    if ( is_last_set ) {
                        /*var $item = $('<div class="cut-line"></div>');
                        grid.append($item);
                        $item.css({
                            'position': 'absolute',
                            'top': height_offset_elem_fix + actual_cut_line_width,
                            'left':last_set_subset_width_offset_px - actual_cut_line_width,
                            'width': actual_cut_line_width,
                            'height': Math.ceil(state.sets[i][j].objects[k].h * param.scale * param.zoom),
                            'z-index': 1
                         });*/
                        
                        total_cut_line_length += (state.sets[i][j].objects[k].h);
                        if ( state.sets[i][j].objects[k].h < plate.height) {
                            last_set_cut_lines_length_v1 += parseInt(state.sets[i][j].objects[k].h);
                            last_set_cut_lines_length_v2 += parseInt(state.sets[i][j].objects[k].h);
                        }

                        area_populate += (state.sets[i][j].objects[k].h * cut_line_width);
                    }
                }
            }

            states_sizes_temp.push( states_sizes_temp_data );

            // cut line for last set element;
            if ( is_last_set && (states_sizes_temp_data.h + actual_cut_line_width) <= (Math.ceil(plate.height * param.scale * param.zoom))) {
                if (state.sets[i].length > 1 ) {
                    /*var $item = $('<div class="cut-line"></div>');
                    grid.append($item);
                    last_set_vertical_cut_lines_index.push( $item.index() );
                    last_set_vertical_cut_lines_left.push( width_offset_px );
                    $item.css({
                        'position': 'absolute',
                        'top': states_sizes_temp_data.h - Math.ceil(state.sets[i][j].w * param.scale * param.zoom),
                        'left': Math.ceil(state.sets[i][j].w * param.scale * param.zoom) ,
                        'width': actual_cut_line_width,
                        'height': Math.ceil(states_sizes_temp_data.h * param.scale * param.zoom),
                        'z-index': 1
                     });*/

                    //total_cut_line_length += (plate.width - width_offset);

                    if ( state.sets[i][j].h < plate.height ) {
                        last_set_cut_lines_length_v1 += parseInt(state.sets[i][j].w);
                        last_set_cut_lines_length_v2 += parseInt(plate.width) - parseInt(width_offset);
                    }

                    //area_populate += ( (plate.width - width_offset) * cut_line_width );
                }
            }


            height_offset_px = states_sizes_temp_data.h;
            //right cut line in it sub element in set;
            if ( j != 0 && state.sets[i][0].w > state.sets[i][j].w) {
                var fix_actual_cut_line_width = actual_cut_line_width;

                //rework! not only for plate width but set right offset
                /*if ( (width_offset_px + Math.ceil(state.sets[i][j].w * param.scale * param.zoom)) > Math.ceil(plate.width * param.scale * param.zoom) ) {
                    fix_actual_cut_line_width = actual_cut_line_width - ((width_offset_px + Math.ceil(state.sets[i][j].w * param.scale * param.zoom) - Math.ceil(plate.width * param.scale * param.zoom));
                    if (fix_actual_cut_line_width <= 0 )
                        fix_actual_cut_line_width = 1;
                }*/
               

                // draw bottom line if it not last and only set
                if ( ((sets_total_lenght > 1 && last_set_index != i)  || sets_total_lenght == 1 ) && state.sets[i][0].w !== plate.width) {
                     var $item = $('<div class="cut-line"></div>');
                     grid.append($item);
                     var add_fix_cut_line = (j>0 && i>0 && last_set_index != i) ? fix_actual_cut_line_width : 0;
                    $item.css({
                        'position': 'absolute',
                        'top': height_offset_elem_fix + fix_actual_cut_line_width,
                        'left': width_offset_px + Math.ceil(state.sets[i][j].w * param.scale * param.zoom),
                        'width': fix_actual_cut_line_width,
                        'height': Math.ceil(state.sets[i][j].h * param.scale * param.zoom),
                        'z-index': 1
                     });
                    total_cut_line_length += (state.sets[i][j].h);
                    
                    

                    area_populate += (state.sets[i][j].h * cut_line_width);
                }
            }

            
            //horizontal cut lines

            var line_x1 = width_offset_px;
            var line_x2 = max_count_optimal_set_value;
            var line_y = (height_offset_elem + state.sets[i][j].h);
            
            window.console.log('line_y !!!');
            window.console.log(line_y);

            if ((line_y) < plate.height + cut_line_width ) {
                
                var line_top = height_offset_elem_fix + Math.ceil(state.sets[i][j].h * param.scale * param.zoom);
                if ( j > 0 )
                    line_top += fix_actual_cut_line_width;
                var temp_plate_height = Math.ceil(plate.height * param.scale * param.zoom);

                window.console.log('height_offset !!!');
                window.console.log(height_offset_elem);

                // todo cut line height if free space lower that line_height;
                if (   (height_offset + parseInt(state.sets[i][j].h)) < parseInt(plate.height)
                    && ((sets_total_lenght > 1 && last_set_index != i)  || sets_total_lenght == 1)
                    ) {
                    if ( height_offset_px <= Math.ceil(plate.height * param.scale * param.zoom) ){
                        var $item = $('<div class="cut-line"></div>');
                        grid.append($item);
                        $item.css({
                            'position': 'absolute',
                            'top': height_offset_px,
                            'left': line_x1,
                            'width': Math.ceil(state.sets[i][0].w * param.scale * param.zoom),//first eleemnt in set always has max width;
                            'height': actual_cut_line_width,
                            'z-index': 1
                                });
                        //

                        total_cut_line_length += (state.sets[i][0].w);
                        area_populate += (state.sets[i][0].w * cut_line_width);
                    }
                }
            }

            //height_offset_px = states_sizes_temp_data.h;
            add_height_cut_line = ( height_offset + parseInt(state.sets[i][j].h) < parseInt(plate.height) ) ? cut_line_width : 0;
            height_offset = height_offset + parseInt(state.sets[i][j].h) + add_height_cut_line;
            set_count++;
        }


        // vertical cut lines
        var prev_set_height = set_height;
        if (width_offset != 0) {
            var line_x = width_offset_px - actual_cut_line_width;
            var line_x_mm = width_offset - cut_line_width;
            var line_y1 = 0;
            var line_y2 = plate.height;
            var $item = $('<div class="cut-line"></div>');
            grid.append($item);

            $item.css({
                'position': 'absolute',
                'top': Math.ceil(line_y1 * param.scale * param.zoom),
                'left': line_x,
                'width': actual_cut_line_width,
                'height': Math.ceil(line_y2 * param.scale * param.zoom),
                'z-index': 1
            });

            main_vertical_cut_line_offset.push( line_x + actual_cut_line_width );
            main_vertical_cut_line_offset_mm.push( line_x_mm + cut_line_width );
            total_cut_line_length += (line_y2 - line_y1);
            area_populate += ((line_y2 - line_y1) * cut_line_width);
        
            var prev_sub_set_width = state.sets[i][0].w;
            var sub_set_height = 0;
            var count = 0;
            for (j in state.sets[i]) {
                count++;
                sub_set_height += state.sets[i][j].h + cut_line_width;
                if ( state.sets[i][j].w != state.sets[i][0].w) {
                    var line_x1 = width_offset + state.sets[i][j].w;
                    var line_x2 = state.sets[i][0].w - state.sets[i][j].w;
                    var line_y = sub_set_height - cut_line_width;
                }
                prev_sub_set_width =  state.sets[i][j].w;
                
            }
        }
        else {
           
            var prev_sub_set_width = state.sets[i][0].w;
            var sub_set_height = 0;
            var count = 0;
            for (j in state.sets[i]) {
                count++;

                sub_set_height += state.sets[i][j].h + cut_line_width;
                if ( state.sets[i][j].w != state.sets[i][0].w) {
                    var line_x1 = width_offset + state.sets[i][j].w;
                    var line_x2 = state.sets[i][0].w /*- state.sets[i][j].w*/;
                    var line_y = sub_set_height - cut_line_width;
                }
                prev_sub_set_width =  state.sets[i][j].w;
            }
            
                    
            
        }


        states_sizes.push(states_sizes_temp);

        var add_cut_line_width = (set_count !== 0) ? cut_line_width : 0;
        var add_cut_line_width_actual = (set_count !== 0) ? actual_cut_line_width : 0;


        if ( is_last_set ) {
            last_set_offset = width_offset;
            last_set_offset_px = width_offset_px;
        };

        width_offset += (state.sets[i][0].w + add_cut_line_width);
        width_offset_px += ( Math.ceil(state.sets[i][0].w * param.scale * param.zoom ) + add_cut_line_width_actual);

        last_offset = width_offset;
        last_offset_px = width_offset_px;

    }


    // vertical cut lines for last element 
    if ( (last_offset <= plate.width || ( plate.width - last_offset < 0 && last_offset - plate.width < add_cut_line_width )) && state.sets.length > 0) {
        //IF THERE IS ONLY ONE SET
        if ( state.sets.length == 1) {
            var line_x = last_offset - cut_line_width;
            var line_x_fix = last_offset_px - actual_cut_line_width;
            var line_y1 = 0;
            var line_y2 = plate.height;
            /*ctx.beginPath();
            ctx.moveTo(line_x,line_y1);
            ctx.lineTo(line_x,line_y2);
            ctx.lineWidth = cut_line_width;
            ctx.strokeStyle = 'purple';
            ctx.stroke();*/
            var $item = $('<div class="cut-line"></div>');
            grid.append($item);
            var fix_actual_cut_line_width = actual_cut_line_width;

            if ( Math.ceil(line_x * param.scale * param.zoom) + actual_cut_line_width > Math.ceil(plate.width * param.scale * param.zoom) ) {
                fix_actual_cut_line_width = actual_cut_line_width - ((Math.ceil(line_x * param.scale * param.zoom) + actual_cut_line_width) - Math.ceil(plate.width * param.scale * param.zoom));
                if (fix_actual_cut_line_width <= 0 )
                    fix_actual_cut_line_width = 1;
            }

            $item.css({
                'position': 'absolute',
                'top': Math.ceil(line_y1 * param.scale * param.zoom),
                'left': line_x_fix,
                'width': actual_cut_line_width,
                'height': Math.ceil(line_y2 * param.scale * param.zoom),
                'z-index': 1
            });

            total_cut_line_length += (line_y2 - line_y1);
            area_populate += ((line_y2 - line_y1) * cut_line_width);

        }
        else {
            //calculate last set main cutr line for last_set_cut_lines_length_v1
            var check_last_set = state.sets[state.sets.length-1];
            if ( check_last_set.length > 0 )
                last_set_cut_lines_length_v1 += parseInt(plate.height);
        }
    }


    //choose way to draw last set cut lines
    var last_set_height_offset = 0;
    var last_set_height_offset_mm = 0;
    var last_set_count = 0;

    window.console.log('last_offset');
    window.console.log(last_offset);

    window.console.log('state.sets');
    window.console.log(state.sets);

    if ( last_set_offset <= plate.width && state.sets.length > 1) {
        // v1
        window.console.log('last_set_cut_lines_length_v1');
        window.console.log(last_set_cut_lines_length_v1);

        window.console.log('last_set_cut_lines_length_v2');
        window.console.log(last_set_cut_lines_length_v2);

        if ( last_set_cut_lines_length_v1 <= last_set_cut_lines_length_v2 || (state.sets[state.sets.length-1].length >= 1 && state.sets[state.sets.length-1][0].h >= plate.height /2) ) {
            window.console.log('DRAW v1 last cut line');
            var set_width = state.sets[state.sets.length-1][0].w;
            for ( i in state.sets[state.sets.length-1]) {
                var add_cut_line_width = (last_set_count !== 0) ? actual_cut_line_width : 0;    
                var height_offset_elem = last_set_height_offset + add_cut_line_width;

                var add_cut_line_width_mm = (last_set_count !== 0) ? cut_line_width : 0;  
                var height_offset_elem_mm = last_set_height_offset_mm + add_cut_line_width_mm;

                if ( state.sets[state.sets.length-1][i].last_set_sub_set != true) {
                    window.console.log(' !!!!! CHECK');
                    window.console.log('height_offset_elem_mm ' + height_offset_elem_mm);
                    window.console.log('elem ' +state.sets[state.sets.length-1][i].h );
                    window.console.log('plate h ' + plate.height );

                    if ( state.sets[state.sets.length-1][i].w && (height_offset_elem_mm + state.sets[state.sets.length-1][i].h) <= plate.height) {

                            var check_flag = grid.find('.cut-line').filter( function(n, line) {
                                                return     $(line).height() == actual_cut_line_width
                                                        && $(line).position().top == height_offset_elem + Math.ceil(state.sets[state.sets.length-1][i].h * param.scale * param.zoom)
                                                        && $(line).position().left == last_set_offset_px
                                                        && $(line).width() ==  Math.ceil(set_width * param.scale * param.zoom)
                                            }).length;

                            if (check_flag == 0 && (height_offset_elem_mm + state.sets[state.sets.length-1][i].h) < plate.height) {
                                var $item = $('<div class="cut-line"></div>');
                                grid.append($item);
                                $item.css({
                                    'position': 'absolute',
                                    'top': height_offset_elem + Math.ceil(state.sets[state.sets.length-1][i].h * param.scale * param.zoom),
                                    'left': last_set_offset_px,
                                    'width': Math.ceil(set_width * param.scale * param.zoom),
                                    'height': actual_cut_line_width,
                                    'z-index': 1
                                 });
                            }

                        if ( state.sets[state.sets.length-1][i].w < set_width) {
                            var $item = $('<div class="cut-line"></div>');
                            grid.append($item);
                            $item.css({
                                'position': 'absolute',
                                'top': height_offset_elem,
                                'left': last_set_offset_px + Math.ceil(state.sets[state.sets.length-1][i].w * param.scale * param.zoom),
                                'width': actual_cut_line_width,
                                'height': Math.ceil(state.sets[state.sets.length-1][i].h * param.scale * param.zoom) + actual_cut_line_width,
                                'z-index': 1
                             }); 
                        }
                    }
                }
                else {

                    var check_flag = grid.find('.cut-line').filter( function(n, line) {
                                                return     $(line).height() == actual_cut_line_width
                                                        && $(line).position().top == height_offset_elem + Math.ceil(state.sets[state.sets.length-1][i].h * param.scale * param.zoom)
                                                        && $(line).position().left == last_set_offset_px
                                                        && $(line).width() ==  Math.ceil(state.sets[state.sets.length-1][i].w * param.scale * param.zoom)
                                            }).length;

                    if (check_flag == 0) {
                        var $item = $('<div class="cut-line"></div>');
                        grid.append($item);
                        $item.css({
                            'position': 'absolute',
                            'top': height_offset_elem + Math.ceil(state.sets[state.sets.length-1][i].h * param.scale * param.zoom),
                            'left': last_set_offset_px,
                            'width': Math.ceil(state.sets[state.sets.length-1][0].w * param.scale * param.zoom),
                            'height': actual_cut_line_width,
                            'z-index': 1
                         });
                    }

                    var last_set_subset_width_offset_px = last_set_offset_px;
                    for (k in state.sets[state.sets.length-1][i].objects) {
                        last_set_subset_width_offset_px += (state.sets[state.sets.length-1][i].objects[k].h * param.scale * param.zoom) + actual_cut_line_width;

                        var $item = $('<div class="cut-line"></div>');
                        grid.append($item);
                        $item.css({
                            'position': 'absolute',
                            'top': height_offset_elem,
                            'left':last_set_subset_width_offset_px - actual_cut_line_width,
                            'width': actual_cut_line_width,
                            'height': Math.ceil(state.sets[state.sets.length-1][i].objects[k].h * param.scale * param.zoom),
                            'z-index': 1
                         });
                        
                    }
                }
                last_set_count++;
                last_set_height_offset = height_offset_elem + Math.ceil(state.sets[state.sets.length-1][i].h * param.scale * param.zoom); 
                last_set_height_offset_mm = height_offset_elem_mm + state.sets[state.sets.length-1][i].h;
                window.console.log('last_set_height_offset_mm');
                window.console.log(last_set_height_offset_mm);
            }
            //last main vertical
            var check_exist = grid.find('.cut-line').filter( function(i, line) {
                    var line_left = $(line).position().left;
                    var line_top = $(line).position().top;
                    var line_width = $(line).width();
                    var line_height = $(line).height();
                return    line_top == 0 
                       && line_width == actual_cut_line_width
                       && line_left == last_set_offset_px + Math.ceil( state.sets[state.sets.length-1][0].w * param.scale * param.zoom)
                       && line_height == Math.ceil(plate.height * param.scale * param.zoom)


            }).length;

            window.console.log('last_set_offset !!!');
             window.console.log(check_exist);
            window.console.log(last_set_offset);
            window.console.log( last_set_offset - cut_line_width + state.sets[state.sets.length-1][0].w );
            if (      check_exist == 0 
                && (       ((last_set_offset - cut_line_width + state.sets[state.sets.length-1][0].w) <= plate.width ) 
                        || (      (plate.width - (last_set_offset + state.sets[state.sets.length-1][0].w) <= cut_line_width ) 
                               && (plate.width - (last_set_offset + state.sets[state.sets.length-1][0].w) > 0 ) 
                            ) 
                    )
                && ( (last_set_offset + state.sets[state.sets.length-1][0].w) < plate.width)
               ) 
            {
                window.console.log('draw v1 last main vertical');
                var $item = $('<div class="cut-line"></div>');
                grid.append($item);
                $item.css({
                    'position': 'absolute',
                    'top': 0,
                    'left': last_set_offset_px + Math.ceil( state.sets[state.sets.length-1][0].w * param.scale * param.zoom),
                    'width': actual_cut_line_width,
                    'height': Math.ceil(plate.height * param.scale * param.zoom),
                    'z-index': 1
                 });
            }
        }
        //v2
        else {
            for ( i in state.sets[state.sets.length-1]) {
                var add_cut_line_width = (last_set_count !== 0) ? actual_cut_line_width : 0;    
                var height_offset_elem = last_set_height_offset + add_cut_line_width;
                if ( state.sets[state.sets.length-1][i].last_set_sub_set != true) {
                    if ( state.sets[state.sets.length-1][i].w 
                        &&
                         ( 
                          last_set_offset_px + actual_cut_line_width + Math.ceil(state.sets[state.sets.length-1][i].w * param.scale * param.zoom) <= Math.ceil(plate.width * param.scale * param.zoom)
                         )
                       ) 
                    {
                        var $item = $('<div class="cut-line"></div>');
                        grid.append($item);
                        $item.css({
                            'position': 'absolute',
                            'top': height_offset_elem,
                            'left': last_set_offset_px + Math.ceil(state.sets[state.sets.length-1][i].w * param.scale * param.zoom),
                            'width': actual_cut_line_width,
                            'height': Math.ceil(state.sets[state.sets.length-1][i].h * param.scale * param.zoom),
                            'z-index': 1
                         });
                    }
                }
                else {
                // last set rotated sub set
                    var last_set_subset_width_offset_px = last_set_offset_px;
                    for (k in state.sets[state.sets.length-1][i].objects) {
                        last_set_subset_width_offset_px += (state.sets[state.sets.length-1][i].objects[k].h * param.scale * param.zoom) + actual_cut_line_width;

                        var $item = $('<div class="cut-line"></div>');
                        grid.append($item);
                        $item.css({
                            'position': 'absolute',
                            'top': height_offset_elem,
                            'left':last_set_subset_width_offset_px - actual_cut_line_width,
                            'width': actual_cut_line_width,
                            'height': Math.ceil(state.sets[state.sets.length-1][i].objects[k].h * param.scale * param.zoom),
                            'z-index': 1
                         });
                        
                    }
                }

                if ( height_offset_elem +  Math.ceil(state.sets[state.sets.length-1][i].h * param.scale * param.zoom) <  Math.ceil(plate.height * param.scale * param.zoom)) {
                    var $item = $('<div class="cut-line"></div>');
                    grid.append($item);
                    last_set_vertical_cut_lines_index.push( $item.index() );
                    last_set_vertical_cut_lines_left.push( last_set_offset_px );
                    $item.css({
                        'position': 'absolute',
                        'top': height_offset_elem +  Math.ceil(state.sets[state.sets.length-1][i].h * param.scale * param.zoom),
                        'left': last_set_offset_px,
                        'width': Math.ceil(plate.width * param.scale * param.zoom) - last_set_offset_px,
                        'height': actual_cut_line_width,
                        'z-index': 1
                     });
                }
                last_set_count++;
                last_set_height_offset = height_offset_elem + Math.ceil(state.sets[state.sets.length-1][i].h * param.scale * param.zoom); 
            }
        }
    }

    //vertical cut lines if only one set and set width == plate.width
    if ( state.sets.length == 1 && state.sets[0][0].w == plate.width) {
        var only_one_set_height_offset_px = 0;
        for ( i in state.sets[0]) {
                //only one item on row
                if ( state.sets[0][i].objects === undefined) {
                    if ( (state.sets[0][i].w + cut_line_width) <= plate.width) {
                        var $item = $('<div class="cut-line"></div>');
                        grid.append($item);
                        $item.css({
                            'position': 'absolute',
                            'top': only_one_set_height_offset_px,
                            'left': Math.ceil(state.sets[0][i].w * param.scale * param.zoom) - actual_cut_line_width,
                            'width': actual_cut_line_width,
                            'height': Math.ceil(state.sets[0][i].h * param.scale * param.zoom),
                            'z-index': 1
                         });
                    }
                }
                else if ( state.sets[0][i].objects && state.sets[0][i].objects.length > 0)  {
                    var only_one_set_left_offset_px = 0;
                    var sub_sets_width = 0;
                    for (j in state.sets[0][i].objects) {
                        sub_sets_width += state.sets[0][i].objects[j].w + cut_line_width;
                        if ( sub_sets_width <= plate.width ) {
                            var $item = $('<div class="cut-line"></div>');
                            grid.append($item);
                            $item.css({
                                'position': 'absolute',
                                'top': only_one_set_height_offset_px,
                                'left': only_one_set_left_offset_px + Math.ceil(state.sets[0][i].objects[j].w * param.scale * param.zoom),
                                'width': actual_cut_line_width,
                                'height': Math.ceil(state.sets[0][i].objects[0].h * param.scale * param.zoom),
                                'z-index': 1
                             });
                            only_one_set_left_offset_px += Math.ceil(state.sets[0][i].objects[j].w * param.scale * param.zoom) + actual_cut_line_width;
                        }
                    }
                }
            
            only_one_set_height_offset_px += Math.ceil(state.sets[state.sets.length-1][i].h * param.scale * param.zoom) + actual_cut_line_width;
        }
    }

    // besause of Math.ciel elements can overflow grid, so calculate new griw width and height
    var new_grid_width = null;
    var new_grid_height = null;
    var grid_width_px = Math.ceil(plate.width * param.scale * param.zoom);
    var grid_height_px = Math.ceil(plate.height * param.scale * param.zoom);

    var element_width_with_offset = [];
    var element_height_with_offset = [];
    if (states_sizes.length > 0) {
        for ( i in states_sizes) {
            for ( j in states_sizes[i])
                element_width_with_offset.push( states_sizes[i][j].w );
                element_height_with_offset.push( states_sizes[i][j].h );
        }
    }
    var max_element_width_with_offset = Math.max.apply(null, element_width_with_offset);
    var max_element_height_with_offset = Math.max.apply(null, element_height_with_offset);

    if ( max_element_width_with_offset > grid_width_px )
        new_grid_width = max_element_width_with_offset;

    if ( max_element_height_with_offset > grid_height_px )
        new_grid_height = max_element_height_with_offset;
        // fix main vertical cut line if new grid height exist

    //check if there horizontal cut lines that overflow plate;
    /*var overflow_horizontal_cut_lines = grid.find('.cut-line').filter( function(n, line) {
            var line_height = $(line)[0].getBoundingClientRect().height;
            var line_top = $(line).position().top;
            return ( line_top + line_height ) > grid_height_px;
        });

    if ( overflow_horizontal_cut_lines.length > 0 ) {
        new_grid_height = Math.max.apply(null, overflow_horizontal_cut_lines.map( function(n, line){
            var line_height = $(line)[0].getBoundingClientRect().height;
            var line_top = $(line).position().top;
            return line_top + line_height;
        }));
    }*/


    //check if there vertical cut lines that overflow plate;
    /*var overflow_vertical_cut_lines = grid.find('.cut-line').filter( function(n, line) {
            var line_width = $(line)[0].getBoundingClientRect().width;
            var line_left = $(line).position().left;
            return ( line_left + line_width ) > grid_width_px;
        });

    if ( overflow_vertical_cut_lines.length > 0 ) {
        new_grid_width = Math.max.apply(null, overflow_vertical_cut_lines.map( function(n, line){
            var line_width = $(line)[0].getBoundingClientRect().width;
            var line_left = $(line).position().left;
            return line_left + line_width;
        }));
    }*/

    window.console.log('new_grid_height overflow_horizontal_cut_lines');
    window.console.log(new_grid_height);

    if ( new_grid_height != null ) {
        grid.find('.cut-line').filter( function(n, line) {
            return $(line).height() == grid_height_px
        }).css('height', new_grid_height + 'px');
    }

    window.console.log('last_set_vertical_cut_lines_index');
    window.console.log(last_set_vertical_cut_lines_index);
    if ( new_grid_width != null ) {
        grid.find('.cut-line').each( function() {
            var index = last_set_vertical_cut_lines_index.indexOf( $(this).index() );
            if (  index != -1 ) {
                window.console.log('left !!!!');
                window.console.log($(this).position().left);
                $( this ).css('width', (new_grid_width - last_set_vertical_cut_lines_left[index]) + 'px');
                }
        });
    }

    return { total_cut_line_length: total_cut_line_length, 
             area_populate: area_populate, 
             actual_cut_line_width: actual_cut_line_width,
             new_grid_sizes: {w: new_grid_width, h: new_grid_height},
             state: state
            };
}
/* End */
;
; /* Start:"a:4:{s:4:"full";s:72:"/local/templates/ipromo/js/dominion.cutting.equalparts.js?16777412485070";s:6:"source";s:57:"/local/templates/ipromo/js/dominion.cutting.equalparts.js";s:3:"min";s:0:"";s:3:"map";s:0:"";}"*/
if (typeof DOMINION === 'undefined')
    var DOMINION = function() {};

if (typeof DOMINION.equalparts === 'undefined')
    DOMINION.equalparts = {};

DOMINION.equalparts = {
	preview: {
		width: "360px",
		height: "240px",
		background_color: "#fdf3dc",
		line_color: "#828282"
	},
	checkInputVals: function (function_name, grid, cut_lines) {
		if (     typeof grid.width === 'undefined' 
		     ||  grid.width === null || grid.width <= 0 

		     ||  typeof grid.height === 'undefined' 
		     ||  grid.height === null || grid.height <= 0

		     ||  typeof grid.min_element_size === 'undefined' 
		     ||  grid.min_element_size === null || grid.min_element_size <= 0

		     ||  typeof grid.scale === 'undefined' 
		     ||  grid.scale === null || grid.scale < 0

		     ||  typeof grid.zoom === 'undefined' 
		     ||  grid.zoom === null || grid.zoom < 0

		     ||  typeof cut_lines.vertical_count === 'undefined' 
		     ||  cut_lines.vertical_count === null || cut_lines.vertical_count < 0

		     ||  typeof cut_lines.horizontal_count === 'undefined' 
		     ||  cut_lines.horizontal_count === null || cut_lines.horizontal_count < 0

		     ||  typeof cut_lines.size_mm === 'undefined' 
		     ||  cut_lines.size_mm === null || cut_lines.size_mm <= 0
		   ) 
		{
			throw new Error('equal parts cutting, function ' + function_name + ": wrong params");
		}

		return true;
	},
	calculateElementSize: function(side, grid, cut_lines) {
		var result = false;
		switch( side ) {
			case 'width':
				var vertical_pieces_count = cut_lines.vertical_count + 1; 
				var element_width =  Math.floor( ( grid.width - cut_lines.vertical_count * cut_lines.size_mm) / vertical_pieces_count );
				
				result = element_width >= grid.min_element_size && cut_lines.vertical_count >= 0 ? element_width : -1;

				break;
			case 'height':
				var horizontal_pieces_count = cut_lines.horizontal_count + 1; 
				var element_height =  Math.floor( ( grid.height - cut_lines.horizontal_count * cut_lines.size_mm) / horizontal_pieces_count );
				
				result = element_height >= grid.min_element_size && cut_lines.horizontal_count >= 0 ? element_height : -1;
				
				break;
			default:
				throw new Error('equal parts cutting, function ' + arguments.callee.name + ": wrong params");

		}
		return result;
	},
	calculateElementSizes: function (grid, cut_lines) {
		this.checkInputVals(arguments.callee.name, grid, cut_lines);

		var width = this.calculateElementSize('width', grid, cut_lines);
		var height = this.calculateElementSize('height', grid, cut_lines);
		
		var sizes = {
			width: width,
			height: height
		};

		return sizes;
	},
	drawPreview: function($target, grid, cut_lines) {
		//draw preview and return metriks data

		if ( !$target.length)
			throw new Error('equal parts cutting, function ' + arguments.callee.name + ": wrong jquery selector");
		if ( !$target.find('canvas#cutting-equals-preview').length ) {
			$canvas = $('<canvas id="cutting-equals-preview"></canvas>')
			$canvas.css({
				backgroundColor: this.preview.background_color,
				width: this.preview.width,
				height: this.preview.height
			});
			$target.prepend($canvas);
		}
		var canvas = document.getElementById("cutting-equals-preview");
		var ctx = canvas.getContext("2d");
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		var vertical_pieces_count = cut_lines.vertical_count + 1;
		var element_width_px =  Math.round( ( canvas.width - cut_lines.vertical_count ) / vertical_pieces_count );

		var horizontal_pieces_count = cut_lines.horizontal_count + 1; 
		var element_height_px =  Math.round( ( canvas.height - cut_lines.horizontal_count ) / horizontal_pieces_count );

		ctx.strokeStyle=this.preview.line_color;
		ctx.setLineDash([4, 5]);
		ctx.lineWidth=1;
		//draw vertical
		var dx = 0.5;
		for (var i = 0; i < cut_lines.vertical_count; i++) {
			dx += (element_width_px + 1); // +1 - cut line width 1px
			ctx.beginPath();
			ctx.moveTo(dx, 0);
			ctx.lineTo(dx, canvas.height);
			ctx.stroke();
		};

		//draw horizontal
		var dy = 0.5;
		for (var i = 0; i < cut_lines.horizontal_count; i++) {
			dy += (element_height_px + 1); // +1 - cut line width 1px
			ctx.beginPath();
			ctx.moveTo(0, dy);
			ctx.lineTo(canvas.width, dy);
			ctx.stroke();
		};
		
	},
	init: function(grid, cut_lines) {
		return this.calculateElementSizes(grid, cut_lines);
	}
};

var grid = {
	width: 1000,
	height: 1500,
	min_element_size: 100,
	scale: 1,
	zoom: 0
};

var cut_lines = {
	vertical_count: 2,
	horizontal_count: 2,
	size_mm: 5
};

/*$(document).ready(function() {
	window.console.log($('html'));
	var result = DOMINION.equalparts.init(grid, cut_lines);
	DOMINION.equalparts.drawPreview($('.cutting-equals-preview-wrapper'), grid, cut_lines);
});*/

/*$(document).ready(function () {
	var result = DOMINION.equalparts.init(grid, cut_lines);
	DOMINION.equalparts.drawPreview($('.cutting-equals-preview-wrapper'), grid, cut_lines, result);
	console.log('grid');
	console.log(grid);
	console.log('cut_lines');
	console.log(cut_lines);
	console.log('element');
	console.log(result);
});*/

/* End */
;
; /* Start:"a:4:{s:4:"full";s:52:"/local/templates/ipromo/js/grid2.js?1677741248194822";s:6:"source";s:35:"/local/templates/ipromo/js/grid2.js";s:3:"min";s:0:"";s:3:"map";s:0:"";}"*/
$(function(){

    $.fn.pop = function() {
        var top = this.get(-1);
        this.splice(this.length-1,1);
        return top;
    };

    $.fn.shift = function() {
        var bottom = this.get(0);
        this.splice(0,1);
        return bottom;
    };
    function checkUpdate(input) {
        var $parent = input.parents("#item-list .group"),
            $index = $parent.index("#item-list .group"),
            $gridItemWidth = $parent.find('[name="grid-item-width"]').val(),
            $gridItemHeight = $parent.find('[name="grid-item-height"]').val(),
            $gridWidth = parseInt($('[name="grid-width"]').val()),
            $gridHeight = parseInt($('[name="grid-height"]').val());
        var num = $parent.find('.num').text();
        
        var min_element_size = parseInt( $('#cutting-setting-min-element-size').val() );
        var width_is_only_digits = $gridItemWidth.match(/^[0-9]+$/) != null;
        var height_is_only_digits = $gridItemHeight.match(/^[0-9]+$/) != null;

        $('#cutting-element-values').data('changed_field', input.attr('name'));
        $('#cutting-element-values').data('new_width', $gridItemWidth);
        $('#cutting-element-values').data('new_height', $gridItemHeight);
        $('#cutting-element-values').data('focus', input.attr('name'));
        
        var render_param = {
            gridWidth: $gridWidth,
            gridHeight: $gridHeight,
            scale: $scale,
            zoom: $zoom,
            cut_line_width: $cut_line_width
        };
        if (!width_is_only_digits || $gridItemWidth < min_element_size || $gridItemWidth > $gridWidth) {
            $('#cutting-element-values').data('invalid_field', 'width');
            
        }

        if (!height_is_only_digits || $gridItemHeight < min_element_size || $gridItemHeight > $gridHeight) {
            $('#cutting-element-values').data('invalid_field', 'height');
        }

        $('#cutting-element-values').data('render_param', render_param);



        var is_field_invalid = false;

        if ( $gridItemWidth != '' && $gridItemHeight != '' && width_is_only_digits && height_is_only_digits) {
            var rotate = false;


            if ( 
                    (      $gridItemWidth > $gridWidth 
                        && $gridItemWidth <= $gridHeight
                        && $gridItemHeight <= $gridWidth)
                    ||
                    (      $gridItemHeight > $gridHeight 
                        && $gridItemHeight <= $gridWidth
                        && $gridItemWidth <= $gridHeight)
                ) 
            {
                rotate = true;
            }

            if ( 
                       ( $gridItemWidth > $gridWidth && $gridItemWidth > $gridHeight)
                   ||  ( $gridItemHeight > $gridHeight && $gridItemHeight > $gridWidth)
                   ||  ( $gridItemWidth > $gridWidth && $gridItemWidth <= $gridHeight && $gridItemHeight > $gridWidth)
                   ||  ( $gridItemHeight > $gridHeight && $gridItemHeight <= $gridWidth && $gridWidth > $gridHeight)
                   ||  ( $gridItemWidth < min_element_size || $gridItemHeight < min_element_size )
                    
                ) 
            {
                is_field_invalid = true;
            }

            if ( rotate ) {
                var temp_width = $gridItemWidth;
                var temp_height = $gridItemHeight;
                $gridItemWidth = temp_height;
                $gridItemHeight = temp_width;

                $parent.find('[name="grid-item-width"]').val($gridItemWidth);
                $parent.find('[name="grid-item-height"]').val($gridItemHeight);
            }
        }
        else if ( $gridItemWidth != '' && $gridItemHeight != '' && (!width_is_only_digits || !height_is_only_digits) ) {
            is_field_invalid = true;
        } 

        window.console.log('is_field_invalid');
        window.console.log(is_field_invalid);

        if ( is_field_invalid && $('#cutting-element-values').data('invalid_field') != undefined ) {

            if (width_is_only_digits && height_is_only_digits) {
                if ( $gridItemWidth < min_element_size || $gridItemHeight < min_element_size )
                    $('.cutting-modal-input-error-message').html('Введенный размер не может быть меньше ' + min_element_size + ' мм.');
                
                if ( $gridItemWidth > $gridWidth || $gridItemHeight > $gridHeight )
                    $('.cutting-modal-input-error-message').html('Создаваемый элемент <span>не умещается</span> на лист!');
            }
            else {
                $('.cutting-modal-input-error-message').html('Введенный размер не может быть меньше ' + min_element_size + ' мм.');
            }

            $("#cutting-modal-input").dialog('open');
        }
        else {
            updateElement(render_param, num);
        }

    }

    function checkAddNewPlate(input) {
        var $parent = input.parents(".list-params .group"),
            $gridWidth = $parent.find('[name="grid-width"]').val(),
            $gridHeight = $parent.find('[name="grid-height"]').val();

        $('#cutting-list-values').data('width', $gridWidth);
        $('#cutting-list-values').data('height', $gridHeight);

        var min_plate_width_size = parseInt( $('#cutting-setting-min-plate-width').val() );
        var max_plate_width_size = parseInt( $('#cutting-setting-max-plate-width').val() );

        var min_plate_height_size = parseInt( $('#cutting-setting-min-plate-height').val() );
        var max_plate_height_size = parseInt( $('#cutting-setting-max-plate-height').val() );

        var input_data = $('#cutting-list-values').data();

        var width_is_only_digits = $gridWidth.match(/^[0-9]+$/) != null;
        var height_is_only_digits = $gridHeight.match(/^[0-9]+$/) != null;


        var error_message = '';
        $('#cutting-list-values').data('invalid_field', undefined);

        if ( input.attr('name') == 'grid-width') {
            if (    !width_is_only_digits 
                 || $gridWidth < min_plate_width_size
                 || $gridWidth > max_plate_width_size
               )
            {
                error_message = '<p>Введенный размер ширины не может быть меньше ' + min_plate_width_size + 'мм и больше ' + max_plate_width_size + ' мм.</p>';
                $('#cutting-list-values').data('invalid_field', 'grid-width');
            }
            else {
                $('#cutting-list-values').data('invalid_field', undefined);
            }
        }

        if ( input.attr('name') == 'grid-height') {
            if (    !height_is_only_digits 
                 || $gridHeight < min_plate_height_size
                 || $gridHeight > max_plate_height_size
               )
            {
                error_message = '<p>Введенный размер высоты не может быть меньше ' + min_plate_height_size + 'мм и больше ' + max_plate_height_size + ' мм.</p>';
                $('#cutting-list-values').data('invalid_field', 'grid-height');
            }
            else {
                $('#cutting-list-values').data('invalid_field', undefined);
            }
        }

        if ( input.val() != '' ) {
            $('.cutting-modal-plate-input-error-message').append( error_message );

            if ( $('#cutting-list-values').data('invalid_field') !== undefined && input.attr('name') == $('#cutting-list-values').data('invalid_field'))
                $("#cutting-modal-plate-input").dialog('open');
            else {
                $('.cutting-modal-plate-input-error-message').empty();
                if ( input.attr('name') == 'grid-width') {
                    $('input[name="grid-height"]').focus();
                }
            }
        }
    }

    function checkAddNew(input) {
        var $gridItemWidth = $('[name="new-grid-item-width"]').val(),
        $gridItemHeight = $('[name="new-grid-item-height"]').val(),
        $gridWidth = parseInt($('[name="grid-width"]').val()),
        $gridHeight = parseInt($('[name="grid-height"]').val());
        $('#cutting-element-values').data('new_item', true);
        $('#cutting-element-values').data('old_width', $gridItemWidth);
        $('#cutting-element-values').data('old_height', $gridItemHeight);
        $('#cutting-element-values').data('invalid_field', false);
        $('#cutting-element-values').data('changed_field', input.attr('name'));

        var min_element_size = parseInt( $('#cutting-setting-min-element-size').val() );
        var width_is_only_digits = $gridItemWidth.match(/^[0-9]+$/) != null;
        var height_is_only_digits = $gridItemHeight.match(/^[0-9]+$/) != null;
        
        var render_param = {
            gridWidth: $gridWidth,
            gridHeight: $gridHeight,
            scale: $scale,
            zoom: $zoom,
            cut_line_width: $cut_line_width
        };

        if (input.attr('name') == 'new-grid-item-width') {

            if (!width_is_only_digits || $gridItemWidth < min_element_size || $gridItemWidth > $gridWidth) {
                $('#cutting-element-values').data('invalid_field', 'width');
            }
        }

        if (input.attr('name') == 'new-grid-item-height') {
            if (!height_is_only_digits || $gridItemHeight < min_element_size || $gridItemHeight > $gridHeight) {
                    $('#cutting-element-values').data('invalid_field', 'height');
            }
        }

        //extra check for possible rotate
        if ( $gridItemWidth != '' && $gridItemHeight == '' && width_is_only_digits) {
            if ( 
                   $gridItemWidth > $gridWidth 
                && $gridItemWidth <= $gridHeight 
                ) 
            {
                $('#cutting-element-values').data('invalid_field', false);
            };
        }

        if ( $gridItemHeight != '' && $gridItemWidth == '' && height_is_only_digits) {
            if ( 
                   $gridItemHeight > $gridHeight 
                && $gridItemHeight <= $gridWidth 
                ) 
            {
                $('#cutting-element-values').data('invalid_field', false);
            };
        }

        var is_field_invalid = false;

        if ( $gridItemWidth != '' && $gridItemHeight != '' && width_is_only_digits && height_is_only_digits) {
            var rotate = false;


            if ( 
                    (      $gridItemWidth > $gridWidth 
                        && $gridItemWidth <= $gridHeight
                        && $gridItemHeight <= $gridWidth)
                    ||
                    (      $gridItemHeight > $gridHeight 
                        && $gridItemHeight <= $gridWidth
                        && $gridItemWidth <= $gridHeight)
                ) 
            {
                rotate = true;
            }

            if ( rotate ) {
                var temp_width = $gridItemWidth;
                var temp_height = $gridItemHeight;
                $gridItemWidth = temp_height;
                $gridItemHeight = temp_width;
            }

            if ( 
                       ( $gridItemWidth > $gridWidth)
                   ||  ( $gridItemHeight > $gridHeight)
                   ||  ( $gridItemWidth < min_element_size || $gridItemHeight < min_element_size )
                    
                ) 
            {
                is_field_invalid = true;
            }

            
        }
        else if ( $gridItemWidth != '' && $gridItemHeight != '' && (!width_is_only_digits || !height_is_only_digits) ) {
            is_field_invalid = true;
        }


        $('#cutting-element-values').data('render_param', render_param);

        if ( input.val() != '' ) {
            if ( is_field_invalid || ( !rotate && $('#cutting-element-values').data('changed_field').indexOf( $('#cutting-element-values').data('invalid_field') ) != -1)) {
            
                 if (width_is_only_digits || height_is_only_digits) {
                    if ( $gridItemWidth < min_element_size || $gridItemHeight < min_element_size )
                        $('.cutting-modal-input-error-message').html('Введенный размер не может быть меньше ' + min_element_size + ' мм.');
                    
                    if ( $gridItemWidth > $gridWidth || $gridItemHeight > $gridHeight )
                        $('.cutting-modal-input-error-message').html('Создаваемый элемент <span>не умещается</span> на лист!');
                }
                else {
                    $('.cutting-modal-input-error-message').html('Введенный размер не может быть меньше ' + min_element_size + ' мм.');
                }

                $("#cutting-modal-input").dialog('open');
            }
            else if ( $gridItemWidth && $gridItemHeight ) {
                addNewElement($gridItemWidth, $gridItemHeight, $gridWidth, $gridHeight);
            }
            else {
                if ( $gridItemWidth ) {
                    $('input[name="new-grid-item-height"]').focus();
                }
            }
        }

    };

    function checkAddMany() {
        var $gridWidth = parseInt($('[name="grid-width"]').val()),
            $gridHeight = parseInt($('[name="grid-height"]').val());

        var width = $('#modal-add-many-width').val();
        var height = $('#modal-add-many-height').val();
        var num = $('#modal-add-many-quantity').val();

        var width_is_only_digits = width.match(/^[0-9]+$/) != null;
        var height_is_only_digits = height.match(/^[0-9]+$/) != null;
        var num_is_only_digits = num.match(/^[0-9]+$/) != null;

        var min_element_size = parseInt( $('#cutting-setting-min-element-size').val() );

        if (    width_is_only_digits
             && height_is_only_digits
             && num_is_only_digits
             && width >= min_element_size
             && height >= min_element_size
             && (width <= $gridWidth || (width > $gridWidth && width <= $gridHeight) )
             && (height <= $gridHeight || (height > $gridHeight && height <= $gridWidth) )
             && num > 0) 
        {
            $('#cutting-modal-add-many button').prop('disabled', false);
            return true;
        }
        else {
            if ( !$('#cutting-modal-add-many button').prop('disabled') )
                $('#cutting-modal-add-many button').prop('disabled', true);
            return false;
        }



    }
    function addManualPlate($gridWidth, $gridHeight) {
        if( $(".grid").length == 1){
            $(".grid").remove();
            $("#item-list").empty();
        }
            
        var $wrapperWidth = $('.grid-wrapper')[0].getBoundingClientRect().width;
            $wrapperHeight = $('.grid-wrapper')[0].getBoundingClientRect().height;
        if($gridWidth / $gridHeight > $wrapperWidth / $wrapperHeight){
            $scale = $wrapperWidth / $gridWidth;
        }
        else{
            $scale = $wrapperHeight / $gridHeight;
        }

        addGrid($gridWidth, $gridHeight, true);

        $('.disabled-block').removeClass("disabled-block");
        $('.grid-options .name, #new-grid-item').removeClass("hidden");
        
        $init_grid_width = $gridWidth;
        $init_grid_width = $gridHeight;
        $init_scale = $scale;
        $init_zoom = $zoom;
        $(".grid").css({"width": Math.ceil($gridWidth * $scale * $zoom), "height": Math.ceil($gridHeight * $scale * $zoom)});

        $('.box-grid .items-params .actions-wrapper').css('visibility', 'visible');
        $('.box-grid .items-params .actions-wrapper').width( $('#new-grid-item').width() );
    }

    function addPlate($gridWidth, $gridHeight) {
        if( $(".grid").length == 1){
            $(".grid").remove();
            $("#item-list").empty();
        }
            
        var $wrapperWidth = $('.grid-wrapper')[0].getBoundingClientRect().width;
            $wrapperHeight = $('.grid-wrapper')[0].getBoundingClientRect().height;
        if($gridWidth / $gridHeight > $wrapperWidth / $wrapperHeight){
            $scale = $wrapperWidth / $gridWidth;
        }
        else{
            $scale = $wrapperHeight / $gridHeight;
        }
        
        addGrid($gridWidth, $gridHeight);
        $('.disabled-block').removeClass("disabled-block");
        $('.grid-options .name, #new-grid-item').removeClass("hidden");
        
        $init_grid_width = $gridWidth;
        $init_grid_width = $gridHeight;
        $init_scale = $scale;
        $init_zoom = $zoom;
        $(".grid").css({"width": Math.ceil($gridWidth * $scale * $zoom), "height": Math.ceil($gridHeight * $scale * $zoom)});

        $('.box-grid .items-params .actions-wrapper').css('visibility', 'visible');
        $('.box-grid .items-params .actions-wrapper').width( $('#new-grid-item').width() );

        setTimeout(function(){
            $('input[name="new-grid-item-width"]').focus();
        }, 1);

        //$('input[name="grid-width"]').prop("disabled", true);
        //$('input[name="grid-height"]').prop("disabled", true);
        
    }

    function addNewElement($gridItemWidth, $gridItemHeight, $gridWidth, $gridHeight) {
        window.console.log('add new item');
        $('#new-grid-item').empty();

        $('#new-grid-item').append('<div class="group">\
                                <label>A:</label> <input type="text" class="form-control" name="new-grid-item-width" value="">\
                                <label>B:</label> <input type="text" class="form-control" name="new-grid-item-height" value="">\
                            </div>');
        $('#cutting-element-values').removeData();
        //when add first elem - set disablet to grid sizes
        if ( $('#item-list .groups .group').length == 0 ) {
            $('[name="grid-width"]').prop("disabled", true);
            $('[name="grid-height"]').prop("disabled", true);
        }

        $('[name="new-grid-item-width"]').val("");
        $('[name="new-grid-item-height"]').val("");

        if ( $("#item-list .list-title").length == 0 ) {
            $("#item-list").append('<div class="list-title open active"><span class="list-title-arrow"></span>Лист 1</div><div class="groups"></div>');
        }

        var added_listItem_count = false;
        if ( $('#item-list .groups .group').length > 0 ) {
             added_listItem_count = Math.max.apply(null, $('#item-list .groups .group').find('.num').map( function() { return $(this).text()})) + 1;
        }
        else {
            added_listItem_count = 1;
        }

        $listItem = '<div class="group"><span class="num">'+( added_listItem_count )+'</span>\
                    <label>A:</label> <input type="text" class="form-control" name="grid-item-width" value="'+$gridItemWidth+'"/>\
                    <label>B:</label> <input type="text" class="form-control" name="grid-item-height" value="'+$gridItemHeight+'"/>\
                    <a href="javascript:void(0)" class="remove icon-item-remove" title="Удалить элемент"></a></div>';
                        
        var groups_auto_cals = $('#item-list .groups').filter(function( index, group ) {
                                    return $(group).data('calculate') != 'manual';
                                });

        if ( groups_auto_cals.length > 0 ) {
            groups_auto_cals.last().append($listItem);
        }
        else {
            addGrid($gridWidth, $gridHeight);
            $('#item-list .groups').last().append($listItem);
        }

        var render_param = {
            gridWidth: $gridWidth,
            gridHeight: $gridHeight,
            scale: $scale,
            zoom: $zoom,
            cut_line_width: $cut_line_width
        };

        MainRender(render_param);
        setTimeout(function(){
            $('input[name="new-grid-item-width"]').focus();
        }, 1);

    }

    function updateElement(render_param, num) {
            MainRender(render_param); 

            $('.grid-item').filter( function(n, elem) {
                return $(elem).find('span').text() == num;
            }).first().addClass('checked');

            $('#item-list .group').removeClass('active');
            $('#item-list .group').filter( function(n, elem) {
                return $(elem).find('.num').text() == num;
            }).first().addClass('active');

            var active = $('#item-list .group.active');
            var new_width = active.find('input[name="grid-item-width"]').val();
            var new_height = active.find('input[name="grid-item-height"]').val();
            window.console.log(' UPDATE ');
            $('.grid-options .element input[name="grid-item-width"]').val(new_width);
            $('.grid-options .element input[name="grid-item-height"]').val(new_height);

    }

    var $scale = 0,
        $zoom = 1,
        $zoomStep = 0.1,
        $zoomMin = 0.4;
        $zoomMax = 3;
        $cut_line_width = 0;
        $init_grid_width = 0;
        $init_grid_height = 0;
        $init_scale = 0;
        $init_zoom = 1;
        $meter_cost = 0;
        $actual_cut_line_width = null;

    //get init settings
    $(document).ready(function () {
        $cut_line_width = parseInt( $('#cutting-setting-cut-line-width').val() );
        $meter_cost = parseFloat( $('#cutting-setting-meter-cost').val() );
    });

    $(document).ready(function () {
        
        $('input[name="grid-width"]').focus(); 
        $('.box-grid .grid-wrapper').width( $('.box-grid .grid-wrapper').width() );
        $("#cutting-modal-add-many").dialog({
                        autoOpen: false,
                        draggable: false,
                        modal: true,
                        resizable: false,
                        title: "Несколько одинаковых элементов",
                        closeText: "",
                        width: 356,
                        position: { my: "center", at: "center-10 center-100", of: ".box-grid .old-col-11" },
                        close: function( event, ui ) {
                            $("#modal-add-many-width").val('');
                            $("#modal-add-many-height").val('');
                            $("#modal-add-many-quantity").val('');
                        }
                    });

        $("#cutting-modal-mode-switch-enable").dialog({
                        autoOpen: false,
                        draggable: false,
                        modal: true,
                        resizable: false,
                        title: "Переключение режима",
                        closeText: "",
                        width: 356,
                        position: { my: "center", at: "center-10 center-100", of: ".box-grid .old-col-11" },
                    });
        $("#cutting-modal-mode-switch-disable").dialog({
                        autoOpen: false,
                        draggable: false,
                        modal: true,
                        resizable: false,
                        title: "Переключение режима",
                        closeText: "",
                        width: 356,
                        position: { my: "center", at: "center-10 center-100", of: ".box-grid .old-col-11" },
                    });

        $("#cutting-modal-delete").dialog({
                        autoOpen: false,
                        draggable: false,
                        modal: true,
                        resizable: false,
                        title: "Внимание",
                        closeText: "",
                        width: 433,
                        position: { my: "center", at: "center-10 center-100", of: ".box-grid .old-col-11" },
                        open: function( event, ui ) {
                            $('#cutting-modal-delete-num').text( $('#cutting-element-to-delete-index').val() );
                        }
                    });

        $("#cutting-modal-input").dialog({
                        autoOpen: false,
                        draggable: false,
                        modal: true,
                        resizable: false,
                        title: "Ошибка габаритов элемента",
                        closeText: "",
                        width: 433,
                        position: { my: "center", at: "center-10 center-100", of: ".box-grid .old-col-11" },
                    });

        $("#cutting-modal-plate-input").dialog({
                        autoOpen: false,
                        draggable: false,
                        modal: true,
                        resizable: false,
                        title: "Ошибка габаритов листа!",
                        closeText: "",
                        width: 433,
                        position: { my: "center", at: "center-10 center-100", of: ".box-grid .old-col-11" },
                    });

    });

    $.contextMenu({
            selector: '.grid-item', 
            callback: function(key, options) {
                if (key == 'delete') {
                    $('#cutting-element-to-delete-index').val( $(options.$trigger).find('span').text() );
                    
                    if ( $('#cutting-element-delete-confirmation').val() != 0) {
                        $('#cutting-modal-delete').dialog('open');
                    }
                    else {
                        if ( !$('#cutting-manual').is(":checked") ) {
                            // todo delete by num;
                            var num = parseInt($(options.$trigger).text() );
                            $('#item-list .groups .group').filter( function(n, group) {
                                return $(group).find('.num').text() == num;
                            }).remove();
                            
                            var $gridWidth = parseInt($('[name="grid-width"]').val());
                            var $gridHeight = parseInt($('[name="grid-height"]').val());
                            var render_param = {
                                gridWidth: $gridWidth,
                                gridHeight: $gridHeight,
                                scale: $scale,
                                zoom: $zoom,
                                cut_line_width: $cut_line_width
                            };

                            MainRender(render_param); 
                        }
                        else {
                            var num_to_delete = parseInt($(options.$trigger).text() );
                            $('#item-list .groups .group').filter( function(n, group) {
                                return parseInt($(group).find('.num').text()) == num_to_delete
                            }).remove();
                            var grid_index = $(options.$trigger).parent('.grid').index();
                            $(options.$trigger).remove();
    
                            redrawManualGrigAfterDrag( grid_index );
                        }
                    }
                }
                else if (key == 'rotate') {
                    var $elem = options.$trigger;
                    rotateItem($elem);
                }
            },
            items: {
                "delete": {
                    name: "Удалить", 
                    icon: function(opt, $itemElement, itemKey, item){
                        $itemElement.html('<span class="icon-item-remove content-menu-icon-item-remove" aria-hidden="true"></span><span class="context-menu-name-custom context-menu-name-custom-delete">Удалить</span>');

                        return 'context-menu-icon-updated';
                    }
                },
                "rotate": {
                    name: "Удалить", 
                    icon: function(opt, $itemElement, itemKey, item){
                        $itemElement.html('<span class="icon-rotate" aria-hidden="true"></span><span class="context-menu-name-custom context-menu-name-custom-rotate">Повернуть</span>');

                        return 'context-menu-icon-updated';
                    },
                    disabled: function(key, options) { 
                        var $elem = options.$trigger;
                        return !$('#cutting-manual').is(":checked") || !canRotate($elem);
                    }
                }
            }
        });

    $(document).keyup(function (event) {
        if (event.keyCode == 46) {
            
            if ($('#item-list .group.active').length == 1) {
                var is_focused = 0;
                $('.group').find('input').each( function(n, input) {
                    if ( $(input).is(':focus') )
                        is_focused++;
                });

                if ( is_focused > 0 )
                    return false;

                $('#cutting-element-to-delete-index').val( $('#item-list .group.active').find('.num').text() );
                
                if ( $('#cutting-element-delete-confirmation').val() != 0) {
                    $('#cutting-modal-delete').dialog('open');
                }
                else
                {
                   $('#item-list .group.active').remove();
                    var $gridWidth = parseInt($('[name="grid-width"]').val());
                    var $gridHeight = parseInt($('[name="grid-height"]').val());

                    var render_param = {
                            gridWidth: $gridWidth,
                            gridHeight: $gridHeight,
                            scale: $scale,
                            zoom: 1,
                            cut_line_width: $cut_line_width
                        };

                    MainRender(render_param); 
                }
            }
        }
    });

    //send data to backend for pdf generation purpose

    $(document).on("click", "#cutting-get-pdf", function(event) {
        event.preventDefault();

        // THINK reset zoom before???
        // get all grid visible
        var visible_grid_index = $('.grid-wrapper .grid').filter( function(n, grid) {
            return $(grid).css('display') == 'block';
        }).index();

        $('.grid-wrapper .grid').css('display', 'block');

        var data = {};
        data.plate = {
            w: parseInt( $('[name="grid-width"]').val() ),
            h: parseInt( $('[name="grid-height"]').val() )
        };

        data.summ = {
            list_count: parseInt( $('.grid-wrapper .grid').length ),
            total_cut_lenght: parseFloat( $('#total-cut-lenght').text() ),
            cutting_meter_remains: parseFloat ( $('#cutting-meter-remains').text() )
        };

        data.elements = [];
        data.manual_elements = [];
        $('#item-list .groups').each( function(n, group) {
            var list = [];
            $(group).find('.group').each( function(m, elem) {
                var elem_width = parseInt( $(elem).find('input[name="grid-item-width"]').val() );
                var elem_height = parseInt( $(elem).find('input[name="grid-item-height"]').val() );
                var elem_num = parseInt( $(elem).find('.num').text() );
                list.push({
                    w: elem_width,
                    h: elem_height,
                    num: elem_num
                });
            });
            data.elements.push(list);

            if ( $(this).data('calculate') == 'manual' ) {
                data.manual_elements.push(list);
            }
            
        });

        data.draw = [];

        $('.grid-wrapper .grid').each( function(n, grid) {

            var grid_data = {};

            grid_data.w_px = parseInt( $(grid).width() );
            grid_data.h_px = parseInt( $(grid).height() );
            grid_data.cut_line_px = $actual_cut_line_width;
            grid_data.objects = [];

            $(grid).find('.grid-item').each( function(m, item) {

                var item_y_px = parseInt( $(item).position().left );
                var item_x_px = parseInt( $(item).position().top );
                var item_width_px = parseInt( $(item).width() );
                var item_height_px = parseInt( $(item).height() );
                var item_num = parseInt( $(item).text() );

                grid_data.objects.push({
                    item_x_px: item_x_px,
                    item_y_px: item_y_px,
                    item_width_px: item_width_px,
                    item_height_px: item_height_px,
                    item_num: item_num
                });
            });


            grid_data.lines = [];

            $(grid).find('.cut-line').each( function(m, line) {

                var line_y_px = parseInt( $(line).position().left );
                var line_x_px = parseInt( $(line).position().top );
                var line_width_px = parseInt( $(line).width() );
                var line_height_px = parseInt( $(line).height() );

                grid_data.lines.push({
                    line_x_px: line_x_px,
                    line_y_px: line_y_px,
                    line_width_px: line_width_px,
                    line_height_px: line_height_px
                });
            });

            data.draw.push(grid_data);
        });

        // return visible
        $('.grid-wrapper .grid').css('display', 'none');
        $('.grid-wrapper .grid').eq(visible_grid_index).css('display', 'block');
        //ajax
        

        $.ajax({
            type: "POST",
            data: { type: 'get_cutting_pdf', data: JSON.stringify(data) },
            beforeSend: function() { 
              $("#cutting-get-pdf").prop('disabled', true);
              $("#cutting-get-pdf").html('<i class="icon-cutting-save-pdf-icon"></i> <span id="button-save-pdf-text">Обработка</span>');
              $("#cutting-get-pdf").width(119.875);
              
            },
            success:function(data){ 
              var data = $.parseJSON(data);
              if ( data.success )
                window.open( data.path,'_blank' );
              $("#cutting-get-pdf").prop('disabled', false);
              $("#cutting-get-pdf").html('<i class="icon-cutting-save-pdf-icon"></i> <span id="button-save-pdf-text">Сохранить в PDF</span>');
              $("#cutting-get-pdf").width(119.875);
              $("#button-save-pdf-text").css('padding-left', '2px');
            }
        });

    });

    $(document).on("click", "#cutting-manual", function(event) {
        event.preventDefault();
        if ( $(this).prop( "checked" ) ) {
            $('#cutting-modal-mode-switch-enable').dialog('open');
        }
        else {
            $('#cutting-modal-mode-switch-disable').dialog('open');
        }

    });

    $(document).on("click", "#cutting-modal-delete-without-confirmation", function(event) {
        
        if ( $(this).prop( "checked" ) ) {
            $('#cutting-element-delete-confirmation').val('0');
        }
        else {
            $('#cutting-element-delete-confirmation').val('1');
        }

    });

    $(document).on("click", "#cutting-modal-delete .cutting-modal-delete-yes", function(event) {
        event.preventDefault();

        var num = $('#cutting-element-to-delete-index').val();

        $(".grid-options .element").addClass("invisible");

        if ( !$('#cutting-manual').is(":checked") ) {
            $('#item-list .groups .group').filter( function(n, group) {
                return $(group).find('.num').text() == num;
            }).remove();
           
            $("#item-list .groups").each(function() {
                if ( $(this).children().length == 0)
                    $(this).remove();
            });

            var $gridWidth = parseInt($('[name="grid-width"]').val());
            var $gridHeight = parseInt($('[name="grid-height"]').val());
            var render_param = {
                gridWidth: $gridWidth,
                gridHeight: $gridHeight,
                scale: $scale,
                zoom: $zoom,
                cut_line_width: $cut_line_width
            };

            MainRender(render_param); 
        }
        else {
            $('#item-list .groups .group').filter( function(n, group) {
                return parseInt($(group).find('.num').text()) == num
            }).remove();
            $('.grid-item').filter( function(n, group) {
                return parseInt($(group).find('span').text()) == num
            }).remove();

            $("#item-list .groups").each(function() {
                if ( $(this).children().length == 0)
                    $(this).remove();
            });
            var grid_index = $('.grid').filter( function( n, grid) {
                return $(grid).css('display') == 'block';
            }).index();
            redrawManualGrigAfterDrag( grid_index );
            
        }
        $('#cutting-modal-delete').dialog('close');
    });

    $(document).on("click", "#cutting-modal-delete .cutting-modal-delete-no", function(event) {
        event.preventDefault();

        $('#cutting-modal-delete').dialog('close');
    });


    $(document).on("click", "#cutting-modal-mode-switch-enable .cutting-modal-manual-mode-yes", function(event) {
        event.preventDefault();
        $("#cutting-manual").prop( "checked", true );
        //
        var calculate = ( $("#cutting-manual").prop( "checked" ) ) ? 'manual' : 'auto';
        var grid_index = $('.grid-wrapper .grid').filter(function( index ) {
                             return $('.grid-wrapper .grid').eq(index).attr('style').indexOf("visibility: visible") != -1;
                          }).index();

       $('.grid-wrapper .grid').eq(grid_index).data('calculate', calculate);
       $(document).trigger( "dominion:calculate-toggle", grid_index);
       //
        $('#cutting-modal-mode-switch-enable').dialog('close');

         $('[name="new-grid-item-width"]').prop('disabled', 'disabled');
        $('[name="new-grid-item-height"]').prop('disabled', 'disabled');

        $('.actions .icon-cutting-add-many').hide();
    });

     $(document).on("click", "#cutting-modal-mode-switch-disable .cutting-modal-manual-mode-yes", function(event) {
        event.preventDefault();
        $("#cutting-manual").prop( "checked", false );
        //
        var calculate = ( $("#cutting-manual").prop( "checked" ) ) ? 'manual' : 'auto';
        var grid_index = $('.grid-wrapper .grid').filter(function( index ) {
                             return $('.grid-wrapper .grid').eq(index).attr('style').indexOf("visibility: visible") != -1;
                          }).index();

       $('.grid-wrapper .grid').eq(grid_index).data('calculate', calculate);
       $(document).trigger( "dominion:calculate-toggle", grid_index);
       //
        $('#cutting-modal-mode-switch-disable').dialog('close');

        var $gridWidth = parseInt($('[name="grid-width"]').val());
        var $gridHeight = parseInt($('[name="grid-height"]').val());

        var render_param = {
                gridWidth: $gridWidth,
                gridHeight: $gridHeight,
                scale: $scale,
                zoom: 1,
                cut_line_width: $cut_line_width
            };

        MainRender(render_param); 

        $('[name="new-grid-item-width"]').prop('disabled', '');
        $('[name="new-grid-item-height"]').prop('disabled', '');

        $('.actions .icon-cutting-add-many').show();

    });

    $(document).on("click", "#cutting-modal-mode-switch-disable .cutting-modal-manual-mode-no", function(event) {
        event.preventDefault();
        $('#cutting-modal-mode-switch-disable').dialog('close');
    });

    $(document).on("click", "#cutting-modal-mode-switch-enable .cutting-modal-manual-mode-no", function(event) {
        event.preventDefault();
        $('#cutting-modal-mode-switch-enable').dialog('close');
    });

    $(document).on("click", "#cutting-modal-plate-input .cutting-modal-input-correct", function(event) {
        event.preventDefault();
        event.stopPropagation();

        var input_data = $('#cutting-list-values').data();

        var min_plate_width_size = parseInt( $('#cutting-setting-min-plate-width').val() );
        var max_plate_width_size = parseInt( $('#cutting-setting-max-plate-width').val() );

        var min_plate_height_size = parseInt( $('#cutting-setting-min-plate-height').val() );
        var max_plate_height_size = parseInt( $('#cutting-setting-max-plate-height').val() );

        var width_is_only_digits = input_data.width.match(/^[0-9]+$/) != null;
        var height_is_only_digits = input_data.height.match(/^[0-9]+$/) != null;

        var error_message = '';

        var plate_width = input_data.width;
        var plate_height = input_data.height;
        if ( width_is_only_digits )
        {
            if ( input_data.new_width < min_plate_width_size )
                plate_width = min_plate_width_size;
            if ( input_data.new_width > max_plate_width_size )
                plate_width = max_plate_width_size;
        }
        else 
        {
            plate_width = max_plate_width_size;
        }

        if ( height_is_only_digits )
        {
            if ( input_data.new_height < min_plate_height_size )
                plate_height = min_plate_height_size;
            if ( input_data.new_height > max_plate_height_size )
                plate_height = max_plate_height_size;
        }
        else
        {
            plate_height = max_plate_height_size;
        }

        if ( input_data.invalid_field == 'grid-width') {
            $('input[name="grid-width"]').val(plate_width);
            setTimeout(function(){
                $('input[name="grid-height"]').focus();
            }, 1);
        }

        if ( input_data.invalid_field == 'grid-height') {
            $('input[name="grid-height"]').val(plate_height);
        }
        
        if (input_data.width != "" && input_data.height != "")
            addPlate(plate_width, plate_height);

        $('#cutting-list-values').removeData();
        $('#cutting-modal-plate-input').dialog('close');

    });

    $(document).on("click", "#cutting-modal-plate-input .cutting-modal-delete-cancel", function(event) {
        event.preventDefault();

        $('input[name="grid-width"]').val('');
        $('input[name="grid-height"]').val('');
        
        $('.grid-options').addClass("disabled-block");
        $('.grid-wrapper').addClass("disabled-block");
        $('.items-params').addClass("disabled-block");
        $('.box-params.result').addClass("disabled-block");
        $('.grid-controls').addClass("disabled-block");
        $('#item-list').empty();
        
        $('.grid-options .name, #new-grid-item').addClass("hidden");
        $('.grid').remove();

        $('#cutting-modal-plate-input').dialog('close');
        $('.cutting-modal-plate-input-error-message').empty();
        setTimeout(function(){
            $('input[name="grid-width"]').focus();
        }, 1);


    });


    $(document).on("click", "#cutting-modal-input .cutting-modal-input-correct", function(event) {
        event.preventDefault();

        var $gridWidth = parseInt($('[name="grid-width"]').val()),
            $gridHeight = parseInt($('[name="grid-height"]').val());

        var $gridItemWidth = $('#modal-add-many-width').val(),
            $gridItemHeight = $('#modal-add-many-height').val();

        var width_is_only_digits = $gridItemWidth.match(/^[0-9]+$/) != null;
        var height_is_only_digits = $gridItemHeight.match(/^[0-9]+$/) != null;

        var min_element_size = parseInt($('#cutting-setting-min-element-size').val());

        var input_data = $('#cutting-element-values').data();
        
        window.console.log('input_data');
        window.console.log(input_data);

        var set_focus_to_new_height = false;

        if ( input_data.add_many ) {
            
            if (input_data.add_many_field == 'modal-add-many-width') {
                if ( parseInt($gridItemWidth) < parseInt(min_element_size) || !width_is_only_digits) {
                    $gridItemWidth = min_element_size;
                    $('#' + input_data.add_many_field).val($gridItemWidth);

                } else {
                    if (       $gridItemHeight != ''
                            && parseInt($gridItemWidth) >= parseInt($gridWidth) 
                            && parseInt($gridItemHeight) == parseInt($gridWidth) 
                          ) 
                    {
                        $('#' + input_data.add_many_field).val($gridHeight);
                        $gridItemWidth = $gridHeight;
                    }
                    else if (
                                   $gridItemHeight != ''
                                && parseInt($gridItemWidth) > parseInt($gridWidth)  
                                && parseInt($gridItemHeight) <= parseInt($gridHeight)
                            ) 
                    {
                        $('#' + input_data.add_many_field).val($gridWidth);
                        $gridItemWidth = $gridWidth;
                    }
                    else if (       $gridItemHeight == ''
                            && parseInt($gridItemWidth) > parseInt($gridWidth) 
                          ) 
                    {
                        $('#' + input_data.add_many_field).val($gridWidth);
                        $gridItemWidth = $gridWidth;
                    }

                };

            }
            
            if (input_data.add_many_field == 'modal-add-many-height') {
                if (parseInt($gridItemHeight) < parseInt(min_element_size) || !height_is_only_digits) {
                    $gridItemHeight = min_element_size;
                    $('#' + input_data.add_many_field).val( $gridItemHeight );

                } else {
                    if (       $gridItemWidth != ''
                            && parseInt($gridItemHeight) >= parseInt($gridHeight)  
                            && parseInt($gridItemWidth) == parseInt($gridHeight)
                          ) 
                    {
                        $('#' + input_data.add_many_field).val($gridWidth);
                        $gridItemHeight = $gridWidth;
                    }
                    else if (
                                   $gridItemWidth != ''
                                && parseInt($gridItemHeight) > parseInt($gridHeight)  
                                && parseInt($gridItemWidth) <= parseInt($gridWidth)
                            ) 
                    {
                        $('#' + input_data.add_many_field).val($gridHeight);
                        $gridItemHeight = $gridHeight;
                    }
                    else if (       $gridItemWidth == ''
                            && parseInt($gridItemHeight) > parseInt($gridHeight) 
                          ) 
                    {
                        $('#' + input_data.add_many_field).val($gridHeight);
                        $gridItemHeight = $gridHeight;
                    }

                };

                
            }

            if (    width_is_only_digits
                 && height_is_only_digits
                 && $gridItemWidth >= min_element_size
                 && $gridItemHeight >= min_element_size
                 && (  
                       (    $gridItemWidth <= $gridWidth 
                         && $gridItemHeight <= $gridHeight
                       )
                       ||
                       (    $gridItemWidth <= $gridHeight 
                         && $gridItemHeight <= $gridWidth
                       )
                    )

                ) {
                
            }
            
        }
        else if ( input_data.new_item ) {
            var $gridItemWidth = $('[name="new-grid-item-width"]').val(),
                $gridItemHeight = $('[name="new-grid-item-height"]').val();

            var width_is_only_digits = $gridItemWidth.match(/^[0-9]+$/) != null;
            var height_is_only_digits = $gridItemHeight.match(/^[0-9]+$/) != null;

            if (input_data.changed_field == 'new-grid-item-width') {
                if ( parseInt($gridItemWidth) < parseInt(min_element_size) || !width_is_only_digits) {
                    $gridItemWidth = min_element_size;
                    $('[name="new-grid-item-width"]').val( $gridItemWidth );

                } else {
                    if (       $gridItemHeight != ''
                            && parseInt($gridItemWidth) >= parseInt($gridWidth) 
                            && parseInt($gridItemHeight) == parseInt($gridWidth) 
                          ) 
                    {
                        $('[name="new-grid-item-width"]').val( $gridHeight );
                        $gridItemWidth = $gridHeight;
                    }
                    else if (
                                   $gridItemHeight != ''
                                && parseInt($gridItemWidth) > parseInt($gridWidth)  
                                && parseInt($gridItemHeight) <= parseInt($gridHeight)
                            ) 
                    {
                        $('[name="new-grid-item-width"]').val( $gridWidth );
                        $gridItemWidth = $gridWidth;
                    }
                    else if (       $gridItemHeight == ''
                            && parseInt($gridItemWidth) > parseInt($gridWidth) 
                          ) 
                    {
                        $('[name="new-grid-item-width"]').val( $gridWidth );
                        $gridItemWidth = $gridWidth;
                    }

                };

                
                
                input_data.invalid_field = undefined;
                set_focus_to_new_height = true;
                
            }
            
            if (input_data.changed_field == 'new-grid-item-height') {
                if (parseInt($gridItemHeight) < parseInt(min_element_size) || !height_is_only_digits) {
                    $gridItemHeight = min_element_size;
                    $('[name="new-grid-item-height"]').val( $gridItemHeight );

                } else {
                    if (       $gridItemWidth != ''
                            && parseInt($gridItemHeight) >= parseInt($gridHeight)  
                            && parseInt($gridItemWidth) == parseInt($gridHeight)
                          ) 
                    {
                        $('[name="new-grid-item-height"]').val( $gridWidth );
                        $gridItemHeight = $gridWidth;
                    }
                    else if (
                                   $gridItemWidth != ''
                                && parseInt($gridItemHeight) > parseInt($gridHeight)  
                                && parseInt($gridItemWidth) <= parseInt($gridWidth)
                            ) 
                    {
                        $('[name="new-grid-item-height"]').val( $gridHeight );
                        $gridItemHeight = $gridHeight;
                    }
                    else if (       $gridItemWidth == ''
                            && parseInt($gridItemHeight) > parseInt($gridHeight) 
                          ) 
                    {
                        $('[name="new-grid-item-height"]').val( $gridHeight );
                        $gridItemHeight = $gridHeight;
                    }

                };

               

                input_data.invalid_field = undefined;
                
            }


            if (    $('[name="new-grid-item-width"]').val().match(/^[0-9]+$/) != null
                 && $('[name="new-grid-item-height"]').val().match(/^[0-9]+$/) != null
                 && $gridItemWidth >= min_element_size
                 && $gridItemHeight >= min_element_size
                 && (  
                       (    $gridItemWidth <= $gridWidth 
                         && $gridItemHeight <= $gridHeight
                       )
                       ||
                       (    $gridItemWidth <= $gridHeight 
                         && $gridItemHeight <= $gridWidth
                       )
                    )

                ) 
            {
                addNewElement($gridItemWidth, $gridItemHeight, $gridWidth, $gridHeight);

                
                $('#cutting-element-values').removeData();
            }
            
        }
        else {

            $group = $("#item-list .group").filter( function(n, elem) {
                return $(elem).find('.num').text() == input_data.num;
            });

            var $element_width = $group.find('input[name="grid-item-width"]');
            var $element_height = $group.find('input[name="grid-item-height"]');
            
            var $gridItemWidth = $element_width.val();
            var $gridItemHeight = $element_height.val();


            var width_is_only_digits =  $element_width.val().match(/^[0-9]+$/) != null;
            var height_is_only_digits = $element_height.val().match(/^[0-9]+$/) != null;
            if (input_data.changed_field == 'grid-item-width') {
                if ( parseInt($gridItemWidth) < parseInt(min_element_size) || !width_is_only_digits) {
                    $gridItemWidth = min_element_size;
                    $element_width.val( $gridItemWidth );

                } else {
                    if (       $gridItemHeight != ''
                            && parseInt($gridItemWidth) >= parseInt($gridWidth) 
                            && parseInt($gridItemHeight) == parseInt($gridWidth) 
                          ) 
                    {
                        $element_width.val( $gridHeight );
                        $gridItemWidth = $gridHeight;
                    }
                    else if (
                                   $gridItemHeight != ''
                                && parseInt($gridItemWidth) > parseInt($gridWidth)  
                                && parseInt($gridItemHeight) <= parseInt($gridHeight)
                            ) 
                    {
                        $element_width.val( $gridWidth );
                        $gridItemWidth = $gridWidth;
                    }
                    else if (       $gridItemHeight == ''
                            && parseInt($gridItemWidth) > parseInt($gridWidth) 
                          ) 
                    {
                        $element_width.val( $gridWidth );
                        $gridItemWidth = $gridWidth;
                    }

                };

                
                
                input_data.invalid_field = undefined;
                
            }
            
            if (input_data.changed_field == 'grid-item-height') {
                if (parseInt($gridItemHeight) < parseInt(min_element_size) || !height_is_only_digits) {
                    $gridItemHeight = min_element_size;
                    $element_height.val( $gridItemHeight );

                } else {
                    if (       $gridItemWidth != ''
                            && parseInt($gridItemHeight) >= parseInt($gridHeight)  
                            && parseInt($gridItemWidth) == parseInt($gridHeight)
                          ) 
                    {
                        $element_height.val( $gridWidth );
                        $gridItemHeight = $gridWidth;
                    }
                    else if (
                                   $gridItemWidth != ''
                                && parseInt($gridItemHeight) > parseInt($gridHeight)  
                                && parseInt($gridItemWidth) <= parseInt($gridWidth)
                            ) 
                    {
                        $element_height.val( $gridHeight );
                        $gridItemHeight = $gridHeight;
                    }
                    else if (       $gridItemWidth == ''
                            && parseInt($gridItemHeight) > parseInt($gridHeight) 
                          ) 
                    {
                        $element_height.val( $gridHeight );
                        $gridItemHeight = $gridHeight;
                    }

                };

               

                input_data.invalid_field = undefined;
                
            }

            if (    $element_width.val().match(/^[0-9]+$/) != null
                 && $element_height.val().match(/^[0-9]+$/) != null
                 && $gridItemWidth >= min_element_size
                 && $gridItemHeight >= min_element_size
                 && (  
                       (    $gridItemWidth <= $gridWidth 
                         && $gridItemHeight <= $gridHeight
                       )
                       ||
                       (    $gridItemWidth <= $gridHeight 
                         && $gridItemHeight <= $gridWidth
                       )
                    )

                ) {
                updateElement(input_data.render_param, input_data.num);

                $('#cutting-element-values').removeData();
            }
            
        }
        /*setTimeout(function(){
            $('[name="new-grid-item-width"]').focus();
        }, 1);*/
        $('#cutting-element-values').removeData();
        $('.cutting-modal-input-error-message').html('');
        $('#cutting-modal-input').dialog('close');

        // handle focus
        $('#cutting-element-values').data('action', 'correct');
        window.console.log( $('input[name="' + input_data.changed_field + '"').val() );
        switch (input_data.changed_field) {
            case 'new-grid-item-width':
            case 'new-grid-item-height':
                if ( set_focus_to_new_height )
                    setTimeout(function(){
                        $('input[name="new-grid-item-height"').focus();
                    }, 1); 
                break;
        }
        
    
        if ( input_data.add_many ) {
            if ( input_data.add_many_field == 'modal-add-many-width' ) {
                setTimeout(function(){
                    $('#modal-add-many-height').focus();
                }, 1);
            }

            if ( input_data.add_many_field == 'modal-add-many-height' ) {
                setTimeout(function(){
                    $('#modal-add-many-quantity').focus();
                }, 1);
            }

        }

    });

    $(document).on("click", "#cutting-modal-input .cutting-modal-delete-cancel", function(event) {
        event.preventDefault();

        var input_data = $('#cutting-element-values').data();
        if ( input_data.add_many ) {
            $('#' + input_data.add_many_field).val(input_data.add_many_old_value);
            setTimeout(function(){
                $('#' + input_data.add_many_field).focus();
            }, 1);  
        }
        else if ( input_data.new_item ) {
            if ( input_data.invalid_field == 'width') {
                $('[name="new-grid-item-width"]').val('');
                setTimeout(function(){
                    $('[name="new-grid-item-width"]').focus();
                }, 1);
            }
            if ( input_data.invalid_field == 'height') {
                $('[name="new-grid-item-height"]').val('');
                setTimeout(function(){
                    $('[name="new-grid-item-height"]').focus();
                }, 1);
            }
        }
        else {
            $group = $("#item-list .group").filter( function(n, elem) {
                return $(elem).find('.num').text() == input_data.num;
            });
            $group.find('input[name="grid-item-width"]').val( input_data.old_width );
            $group.find('input[name="grid-item-height"]').val( input_data.old_height );
            $('.grid-options .element input[name="grid-item-width"]').val( input_data.old_width ),
            $('.grid-options .element input[name="grid-item-height"]').val( input_data.old_height );
        }

        $('#cutting-element-values').removeData();
        $('.cutting-modal-input-error-message').html('');
        $('#cutting-modal-input').dialog('close');

        $('#cutting-element-values').data('action', 'cancel');
    });

    $( document ).on( "dominion:calculate-toggle", function( event, grid_index) {
        var list_name = $('.grid').eq(grid_index).data('name');
        var list_calculate = $('.grid').eq(grid_index).data('calculate');
        window.console.log('list_calculate');
        window.console.log(list_calculate);

        $( "#item-list .list-title" ).each(function() {
          if ($( this ).text() == 'Лист ' + (parseInt(grid_index) + 1)) {
            if ( list_calculate == 'auto') {
                $(this).removeClass('list-manual');
                $(this).attr('data-calculate', 'auto');
                $(this).data('calculate', 'auto');
                $(this).next().attr('data-calculate', 'auto');
                $(this).next().data('calculate', 'auto');
                $(this).next().find('input').prop('disabled', false);
            }
            else {
                $(this).addClass('list-manual');
                $(this).attr('data-calculate', 'manual');
                $(this).data('calculate', 'manual');
                $(this).next().attr('data-calculate', 'manual');
                $(this).next().data('calculate', 'manual');
                $(this).next().find('input').prop('disabled', true);
            }
            
          }

        if ( list_calculate != 'manual') {
            $('.grid').eq(grid_index).find('.grid-item').each(function(index, elem) {
                removeDraggy( $(elem) );
            });
        }
        else {
            $('.grid').eq(grid_index).find('.grid-item').each(function(index, elem) {
                addDraggy( $(elem) );
            });
        }

        });


    });

    $(document).on("click", ".grid-item", function(){
        var $index = parseInt($(this).find('span').text()),
            $group = $("#item-list .group").filter( function(n, elem) {
                return $(elem).find('.num').text() == $index;
            });
        resetSelected();
        $(".grid-options .element").removeClass("invisible");
        $(".grid-options .element .num").text($group.find(".num").text());
        $('.grid-options .element [name="grid-item-width"]').val($group.find('[name="grid-item-width"]').val());
        $('.grid-options .element [name="grid-item-height"]').val($group.find('[name="grid-item-height"]').val());
        
        $(this).addClass("checked");
        $group.addClass("active");

        //rotate button availability
        if ( !$('#cutting-manual').is(":checked") || !canRotate( $(this) ) ) {
            $(".grid-options .element .rotate").hide();
        }
        else {
            $(".grid-options .element .rotate").show();
        }
    });

    $(document).on("click", ".grid-options .element .rotate", function(event) {
        event.preventDefault();
        if ( $(".grid-item.checked").length == 1 )
            rotateItem( $(".grid-item.checked").first() );
    });
    
    $(document).on("click", ".icon-cutting-plus-icon", function(event) {
        event.preventDefault();

        $("#item-list .list-title").each( function(){
            $("#item-list .list-title").addClass("open");
        });

    });

    $(document).on("click", ".icon-cutting-minus-icon", function(event) {
        event.preventDefault();
        
        $("#item-list .list-title").each( function(){
            $("#item-list .list-title").removeClass("open");
        });

    });

    $(document).on("click", ".icon-cutting-add-many", function(event) {
        event.preventDefault();
        $("#cutting-modal-add-many button").prop('disabled', true);
        $("#cutting-modal-add-many").dialog('open');
    });

    $(document).on("focusin", "#cutting-modal-add-many #modal-add-many-width, #cutting-modal-add-many #modal-add-many-height, #cutting-modal-add-many #modal-add-many-quantity", function(event) {
        $('#cutting-element-values').data('new_item', false);
        $('#cutting-element-values').data('add_many', true);
        $('#cutting-element-values').data('add_many_field', $(this).attr('id'));
        $('#cutting-element-values').data('add_many_old_value', $(this).val());
    });

    $(document).on("keypress", '#cutting-modal-add-many #modal-add-many-quantity', function(e){
        if (e.which == 13 ) {
            $(this).blur();
            if ( checkAddMany() ) {
                $("#cutting-modal-add-many button").click();
            }
        }
    });

    $(document).on("focusout", "#cutting-modal-add-many #modal-add-many-quantity", function(event) {
        checkAddMany();
    });

    $(document).on("keypress", '#cutting-modal-add-many #modal-add-many-width, #cutting-modal-add-many #modal-add-many-height', function(e){
        if (e.which == 13) {
            if ( $(this).attr('id') == 'modal-add-many-width' && $(this).val() > 0)
                setTimeout(function(){
                    $('#modal-add-many-height').focus();
                }, 1);

            if ( $(this).attr('id') == 'modal-add-many-height' && $(this).val() > 0)
                setTimeout(function(){
                    $('#modal-add-many-quantity').focus();
                }, 1);
            //$(this).blur(); 
        }
    });

    $(document).on("blur", "#cutting-modal-add-many #modal-add-many-width, #cutting-modal-add-many #modal-add-many-height", function(event) {
        $('#cutting-element-values').data('add_many_value', $(this).val());
        var $gridWidth = parseInt($('[name="grid-width"]').val()),
            $gridHeight = parseInt($('[name="grid-height"]').val());

        var min_element_size = parseInt( $('#cutting-setting-min-element-size').val() );
        if ( $(this).attr('id') == 'modal-add-many-width' )
            var max_element_size = $gridWidth;

        if ( $(this).attr('id') == 'modal-add-many-height' )
            var max_element_size = $gridHeight;

        var val_is_only_digits = $(this).val().match(/^[0-9]+$/) != null;

        if (val_is_only_digits) {
            if ( $(this).val() < min_element_size )
                $('.cutting-modal-input-error-message').html('Введенный размер не может быть меньше ' + min_element_size + ' мм.');
            
            if ( $(this).val() > max_element_size )
                $('.cutting-modal-input-error-message').html('Создаваемый элемент <span>не умещается</span> на лист!');
        }
        else {
            $('.cutting-modal-input-error-message').html('Введенный размер не может быть меньше ' + min_element_size + ' мм.');
        }

        var $gridItemWidth = $('#modal-add-many-width').val();
        var $gridItemHeight = $('#modal-add-many-height').val();
        var width_is_only_digits = $gridItemWidth.match(/^[0-9]+$/) != null;
        var height_is_only_digits = $gridItemHeight.match(/^[0-9]+$/) != null;
        
        //extra check for possible rotate
        var show_error = true;
        
        if ( $(this).val() >= min_element_size ) {
            show_error = false;
        }
        else {
            show_error = true;
        }
        if ( $(this).val() >= min_element_size ) {
            if ( $gridItemWidth != '' && $gridItemHeight == '' && width_is_only_digits) {
                if (    $gridItemWidth <= $gridWidth 
                        ||
                        (   $gridItemWidth > $gridWidth 
                        && $gridItemWidth <= $gridHeight )
                    ) 
                {
                    show_error = false;
                }
                else {
                    show_error = true;
                }
            }

            if ( $gridItemHeight != '' && $gridItemWidth == '' && height_is_only_digits) {
                if ( 
                        $gridItemHeight <= $gridHeight 
                        ||
                        (   $gridItemHeight > $gridHeight 
                        && $gridItemHeight <= $gridWidth )
                    ) 
                {
                    show_error = false;
                }
                else {
                    show_error = true;
                }
            }

            if ( $gridItemWidth != '' && $gridItemHeight != '' && width_is_only_digits && height_is_only_digits) {
                var rotate = false;

                if ( 
                        (      $gridItemWidth > $gridWidth 
                            && $gridItemWidth <= $gridHeight
                            && $gridItemHeight <= $gridWidth)
                        ||
                        (      $gridItemHeight > $gridHeight 
                            && $gridItemHeight <= $gridWidth
                            && $gridItemWidth <= $gridHeight)

                    ) 
                {
                    rotate = true;
                    show_error = false;
                }
                else if ( $gridItemWidth <= $gridWidth && $gridItemHeight <= $gridHeight ){
                    show_error = false;
                }
                else {
                    show_error = true;
                }
                

                if ( rotate ) {
                    $('.cutting-modal-input-error-message').html('');
                    $('#modal-add-many-width').val($gridItemHeight);
                    $('#modal-add-many-height').val($gridItemWidth);
                }
            }
            else if ($gridItemWidth != '' && $gridItemHeight != '' && (width_is_only_digits || height_is_only_digits) ){
                show_error = true;
            }

        }

        if ( (show_error || !val_is_only_digits) && $(this).val() != '') {
            $('#cutting-modal-input').dialog('open');
        }
        else {
            checkAddMany();
        }
        
    });
    
    $(document).on("keyup", "#cutting-modal-add-many #modal-add-many-width, #cutting-modal-add-many #modal-add-many-height, #cutting-modal-add-many #modal-add-many-quantity", function(event) {
        checkAddMany();
    });


    $(document).on("click", "#cutting-modal-add-many button", function(event) {
        event.preventDefault();

        if ( !$('[name="grid-width"]').prop("disabled") )
            $('[name="grid-width"]').prop("disabled", true);
        if ( !$('[name="grid-height"]').prop("disabled") )
            $('[name="grid-height"]').prop("disabled", true);

        $(this).prop("disabled", true);

        var quantity = $('#modal-add-many-quantity').val();
        var elem_w = $('#modal-add-many-width').val();
        var elem_h = $('#modal-add-many-height').val();

        var added_listItem_count = false;
        if ( $('#item-list .groups .group').length > 0 ) {
             added_listItem_count = Math.max.apply(null, $('#item-list .groups .group').find('.num').map( function() { return $(this).text()})) + 1;
        }
        else {
            added_listItem_count = 1;
        }

        for (var i = 0; i < quantity; i++) {

            $listItem = '<div class="group"><span class="num">'+( added_listItem_count + i )+'</span>\
                        <label>A:</label> <input type="text" class="form-control" name="grid-item-width" value="'+elem_w+'"/>\
                        <label>B:</label> <input type="text" class="form-control" name="grid-item-height" value="'+elem_h+'"/>\
                        <a href="javascript:void(0)" class="remove icon-item-remove" title="Удалить элемент"></a></div>';
                            
             $('#item-list .groups').filter( ':last' ).append($listItem);
        }

        var $gridWidth = parseInt($('[name="grid-width"]').val());
        var $gridHeight = parseInt($('[name="grid-height"]').val());

        var render_param = {
                gridWidth: $gridWidth,
                gridHeight: $gridHeight,
                scale: $scale,
                zoom: 1,
                cut_line_width: $cut_line_width
            };

        MainRender(render_param); 

        $(this).prop("disabled", false);
        $("#cutting-modal-add-many").dialog('close');
    });
    
    $(document).on("focusin", '.list-params input', function(){
        var $parent = $(this).parents(".list-params .group"),
            $gridWidth = $parent.find('[name="grid-width"]').val(),
            $gridHeight = $parent.find('[name="grid-height"]').val();

            $('#cutting-list-values').removeData();
            $('#cutting-list-values').data('invalid_field', undefined);
            $('#cutting-list-values').data('old_width', $gridWidth);
            $('#cutting-list-values').data('old_height', $gridHeight);

    });

    $(document).on("keypress", '.list-params input', function(e){
        if (e.which == 13 ) {
            $(this).blur();
        }
    });

    $(document).on("blur", '.list-params input', function(e){
           checkAddNewPlate( $(this) );
    });

    $(document).on("keypress", '#new-grid-item input', function(e){
        if (e.which == 13 ) {;
            $(this).blur();
            if ( $(this).attr('name') == 'grid-width') {
                $('#cutting-list-values').data('new_width', $gridWidth);
            }
        }
    });

    $(document).on("blur", '#new-grid-item input', function(){
        checkAddNew( $(this) );
    });

    // handle focuses
    $(document).on("focus", '#new-grid-item input', function(){

        window.console.log( 'trigger focus' );
        window.console.log( $(this) );
    });

    $(document).on("focusout", '.list-params input', function(){
        window.console.log( 'focusout focus' );
        
    });

    $(document).on("change", ".list-params input", function(){
        var $gridWidth = $('[name="grid-width"]').val(),
            $gridHeight = $('[name="grid-height"]').val();

        if ( $(this).attr('name') == 'grid-width') {
            $('#cutting-list-values').data('new_width', $gridWidth);
        }
        if ( $(this).attr('name') == 'grid-height') {
            $('#cutting-list-values').data('new_height', $gridHeight);
        }

        var min_plate_width_size = parseInt( $('#cutting-setting-min-plate-width').val() );
        var max_plate_width_size = parseInt( $('#cutting-setting-max-plate-width').val() );

        var min_plate_height_size = parseInt( $('#cutting-setting-min-plate-height').val() );
        var max_plate_height_size = parseInt( $('#cutting-setting-max-plate-height').val() );

        var width_is_only_digits = $gridWidth.match(/^[0-9]+$/) != null;
        var height_is_only_digits = $gridHeight.match(/^[0-9]+$/) != null;

        var render_param = {
            gridWidth: $gridWidth,
            gridHeight: $gridHeight,
            scale: $scale,
            zoom: $zoom,
            cut_line_width: $cut_line_width
        };

        $('.cutting-modal-plate-input-error-message').empty();

        
        if (    !width_is_only_digits 
             || !height_is_only_digits
             || $gridWidth < min_plate_width_size
             || $gridHeight < min_plate_height_size
             || $gridWidth > max_plate_width_size
             || $gridHeight > max_plate_height_size

           )
        {
            // show modal on focus out;

        }
        else {
            addPlate($gridWidth, $gridHeight);
        }
        

    });

    /*$('input[name="grid-height"]').focusout(function() {
        $('input[name="new-grid-item-width"]').focus(); 
    });

    $('input[name="new-grid-item-height"]').focusout(function() {
        $('input[name="new-grid-item-width"]').focus(); 
    });*/

    $(document).on("click", "#item-list .list-title .list-title-arrow", function(event){
        event.stopPropagation();

        $(this).parent().toggleClass("open");

    });

    $(document).on("click", "#item-list .list-title", function(){
        //set zoom icon
        $('.icon-list.list').addClass('hidden');
        $('.icon-lists.lists').removeClass('hidden');

        var list_id = $("#item-list .list-title").index( this );
        var opened = $(this).hasClass("open");
        $(".grid-wrapper").removeClass("preview");

        if ( $('.grid').eq(list_id).data('calculate') == 'auto') {
            $('#cutting-manual').prop('checked', false);
        }
        else {
            $('#cutting-manual').prop('checked', true);
        }

        $zoom = 1;
        renderZoom();

        //$("#item-list .list-title").removeClass("active").removeClass("open");
        $("#item-list .list-title").eq(list_id).addClass("active");

        $("#item-list .list-title").filter(function (i, item) {
           return i != list_id;
        }).each(function() {
            $(this).removeClass("active");
        });


        /*if (!opened) {
            $("#item-list .list-title").eq(list_id).addClass("open");
        }
        else {
            $("#item-list .list-title").eq(list_id).removeClass("open");
        }*/

        $(".grid").css('visibility', 'hidden');
        $('.grid').eq(list_id).css('visibility', 'visible');


        $(".grid-options .name .num").text((list_id + 1)); 

        /*if(!self.hasClass("active")){
            resetSelected();
            $("#item-list .list-title").removeClass("active");
            self.addClass("active");
        }
        else{
            self.toggleClass("open");
        }*/

    });
    
    $(document).on("blur", '#item-list input', function(){
        var $parent = $(this).parents("#item-list .group"),
            $index = $parent.index("#item-list .group"),
            $gridItemWidth = parseInt($parent.find('[name="grid-item-width"]').val()),
            $gridItemHeight = parseInt($parent.find('[name="grid-item-height"]').val());

        var num = $parent.find('.num').text();

        $('#cutting-element-values').data('new_item', false);
        $('#cutting-element-values').data('old_width', $gridItemWidth);
        $('#cutting-element-values').data('old_height', $gridItemHeight);
        $('#cutting-element-values').data('num', num);

        $('.grid-item').removeClass('checked');
        $('.grid-item').filter( function(n, elem) {
            return $(elem).find('span').text() == num;
        }).first().addClass('checked');

        $('#item-list .group').removeClass('active');
        $('#item-list .group').filter( function(n, elem) {
            return $(elem).find('.num').text() == num;
        }).first().addClass('active');
    });

    $(document).on("keypress", '#item-list input', function(e){
        if (e.which == 13 ) {
            $(this).blur();
        }
    });

    $(document).on("blur", '#item-list input', function(){
        checkUpdate( $(this) );
    });
    
    $(document).on("keypress", '.grid-options .element input', function(e){
        var num = $('.grid-options .element .num').text();
        if (e.which == 13 ) {
            $(this).blur();
        }
    });


    $(document).on("blur", '.grid-options .element input', function(){
        var num = $('.grid-options .element .num').text();
        $('#item-list .group.active [name="'+$(this).attr("name")+'"]').val($(this).val())
        checkUpdate( $('#item-list .group.active [name="'+$(this).attr("name")+'"]') );
    });

    $(document).on("focusin", '.grid-options .element input', function(){
        var $gridItemWidth = $('.grid-options .element input[name="grid-item-width"]').val(),
            $gridItemHeight = $('.grid-options .element input[name="grid-item-height"]').val();

        var num = $('.grid-options .element .num').text();

        $('#cutting-element-values').data('new_item', false);
        $('#cutting-element-values').data('old_width', $gridItemWidth);
        $('#cutting-element-values').data('old_height', $gridItemHeight);
        $('#cutting-element-values').data('num', num);
    });

    $(document).on("change", '#item-list input', function(){
        var $parent = $(this).parents("#item-list .group"),
            $index = $parent.index("#item-list .group"),
            $gridItemWidth = $parent.find('[name="grid-item-width"]').val(),
            $gridItemHeight = $parent.find('[name="grid-item-height"]').val(),
            $gridWidth = parseInt($('[name="grid-width"]').val()),
            $gridHeight = parseInt($('[name="grid-height"]').val());
        var num = $parent.find('.num').text();

        $('#cutting-element-values').data('new_width', $gridItemWidth);
        $('#cutting-element-values').data('new_height', $gridItemHeight);

        var min_element_size = parseInt( $('#cutting-setting-min-element-size').val() );
        var width_is_only_digits = $gridItemWidth.match(/^[0-9]+$/) != null;
        var height_is_only_digits = $gridItemHeight.match(/^[0-9]+$/) != null;

        var render_param = {
            gridWidth: $gridWidth,
            gridHeight: $gridHeight,
            scale: $scale,
            zoom: $zoom,
            cut_line_width: $cut_line_width
        };

        if (    !width_is_only_digits 
             || !height_is_only_digits
             || $gridItemWidth < min_element_size
             || $gridItemHeight < min_element_size
             || $gridItemWidth > $gridWidth
             || $gridItemHeight > $gridHeight

           ) 
        {
            $('#cutting-element-values').data('render_param', render_param);
            //oped dialog
        }
        else 
        {
            //updateElement(render_param, num);
        }
        
    });

    $(document).on("click", "#item-list .remove", function() {

        var $parent = $(this).parents("#item-list .group"),
            $index = $parent.index(".group");
        var elem_num = $parent.find('.num').text();
        $('#cutting-element-to-delete-index').val( elem_num );
        if ( $('#cutting-element-delete-confirmation').val() != 0) {
            $('#cutting-modal-delete').dialog('open');
        }
        else {

            if($(this).parent().hasClass("active")){
                $(".grid-options .element").addClass("invisible");
            }
            $parent.remove();

            //repopulate object numers;
            var count = 1;
            $("#item-list .group").each(function() {
              $( this ).find( ".num" ).text(count);
              count++;
            });

            $("#item-list .groups").each(function() {
                if ( $(this).children().length == 0)
                    $(this).remove();
            });

            //redraw start
            var $gridWidth = parseInt($('[name="grid-width"]').val());
            var $gridHeight = parseInt($('[name="grid-height"]').val());

            var render_param = {
                    gridWidth: $gridWidth,
                    gridHeight: $gridHeight,
                    scale: $scale,
                    zoom: 1,
                    cut_line_width: $cut_line_width
                };

            MainRender(render_param); 

            //redraw end
        }
    });
    

    $(document).on("change", "#new-grid-item input", function(){

        $('#cutting-element-values').removeData();

        var $gridItemWidth = $('[name="new-grid-item-width"]').val(),
            $gridItemHeight = $('[name="new-grid-item-height"]').val(),
            $gridWidth = parseInt($('[name="grid-width"]').val()),
            $gridHeight = parseInt($('[name="grid-height"]').val());


        $('#cutting-element-values').data('new_item', true);
        $('#cutting-element-values').data('old_width', $gridItemWidth);
        $('#cutting-element-values').data('old_height', $gridItemHeight);

        var min_element_size = parseInt( $('#cutting-setting-min-element-size').val() );
        var width_is_only_digits = $gridItemWidth.match(/^[0-9]+$/) != null;
        var height_is_only_digits = $gridItemHeight.match(/^[0-9]+$/) != null;

        if (    !width_is_only_digits 
             || !height_is_only_digits
             || $gridItemWidth < min_element_size
             || $gridItemHeight < min_element_size
             || $gridItemWidth > $gridWidth
             || $gridItemHeight > $gridHeight

           ) 
        {
            //dialog open
        }
        else 
        {
            //addNewElement($gridItemWidth, $gridItemHeight, $gridWidth, $gridHeight);
        }
        


    });
    
    $(document).on("change", '.grid-options .element input', function(){
        var num = $('.grid-options .element .num').text();
        
        $('#item-list .group.active [name="'+$(this).attr("name")+'"]').val($(this).val()).change();

    });
    
    $(document).on("click", '.grid-options .rotate', function(e){
        var $gridItemWidth = parseInt($('#item-list .group.active [name="grid-item-width"]').val()),
            $gridItemHeight = parseInt($('#item-list .group.active [name="grid-item-height"]').val());
        e.preventDefault();
        
        $('#item-list .group.active [name="grid-item-width"]').val($gridItemHeight);
        $('#item-list .group.active [name="grid-item-height"]').val($gridItemWidth).change();
    });

    $(document).on("click", ".grid-options .zoom a", function(e){
        e.preventDefault();
        if($(this).hasClass("plus") && ($zoom*100 + $zoomStep*100) <= $zoomMax*100){
            $zoom = ($zoom*1 + $zoomStep).toFixed(1);
            renderZoom();
        }
        else if($(this).hasClass("minus") && ($zoom*100 - $zoomStep*100) >= $zoomMin*100){
            $zoom = ($zoom*1 - $zoomStep).toFixed(1);
            renderZoom();
        }
        else if($(this).hasClass("area") && ($zoom != 1)){
            $zoom = 1;
            renderZoom();
        }
    });
    
    $(document).on("click", ".grid-options .view a", function(e){
        e.preventDefault();
        $(".grid-options .view a").toggleClass("hidden");
        $(".grid-wrapper").toggleClass("preview");
        if($(this).hasClass("lists")){
            $zoom = $zoomMin;
            renderZoom();
            $(".grid").css('visibility', 'visible');
        }
        else if($(this).hasClass("list") && ($zoom != 1)){
            $zoom = 1;
            //$("#item-list .list-title.active").removeClass("active").click();
            $(".grid-wrapper .grid:not(:first)").css('visibility', 'hidden');
            renderZoom();
        }
    });
    
    function addDraggy(element){
        var $grid = element.parents(".grid");
        /*$grid.droppable({
            tolerance: 'fit'
        });*/

        element.draggable({
            actual_cut_line_width: $actual_cut_line_width,
            containment: $grid,
            scroll: false,
            snap: '.cut-line',
            snapMode: "outer",
            revert: 'invalid',
            /*snapTolerance: 0,*/
            start: function() {
                $grid.find('.grid-item').data('rotated', false);
                removeDragItemCutLines($grid, this);

            },
            drag: function(event, ui){
                /*var self_elem = this;
                var snapped = $(this).data('ui-draggable').snapElements;
                var snappedTo = $.map(snapped, function(element) {
                    return element.snapping ? element.item : null;
                });

                window.console.log( 'snappedTo' );
                window.console.log( snappedTo );
                snappedTo.forEach(function(snap_elem){
                    if (    
                            (      parseInt($(snap_elem).position().left) == parseInt($(self_elem).position().left) 
                                && parseInt($(snap_elem).width()) == parseInt($actual_cut_line_width) 
                            )
                          ||
                            (      parseInt($(snap_elem).position().left) + parseInt($(snap_elem).width()) == parseInt($(self_elem).position().left) 
                                && parseInt($(snap_elem).height()) == parseInt($actual_cut_line_width) 
                            )
                        ) 
                    {
                        window.console.log( 'FIX LEFT' );
                        ui.position = {'left': parseInt($(self_elem).position().left) + parseInt($actual_cut_line_width)};
                        return false;
                    }
                });*/

                var $params = getParams($grid, this),
                    $valid = checkCollision($params);
                $(this).draggable({revert: $valid});
                
                

            },
            stop: function(event, ui) {

                var $position = $(this).position();
                $(this).draggable({revert: 'invalid'});
                $(this).attr('data-top', Math.ceil($position.top / ($scale * $zoom)));
                $(this).attr('data-left', Math.ceil($position.left / ($scale * $zoom)));

                autoMoveAfterDrag($grid, this);
            }
        });

        /*element.droppable({
            greedy: true,
            tolerance: 'touch',
            drop: function(event,ui){
                ui.draggable.draggable('option','revert',true);
            }
        });

        $grid.find('.cut-line').droppable({
            greedy: true,
            tolerance: 'touch',
            drop: function(event,ui){
                ui.draggable.draggable('option','revert',true);
            }
        });*/
    }

    function removeDraggy(element){
        if ( element.is('.ui-draggable') )
            element.draggable("destroy");
    }

    function addGrid($gridWidth, $gridHeight, manual){
        var $grid = $('<div class="grid" data-scale="' + $scale + '" data-zoom="' + $zoom + '">\
                        <div class="grid-span grid-span-top"></div>\
                        <div class="grid-span grid-span-right"></div>\
                        <div class="grid-span grid-span-bottom"></div>\
                        <div class="grid-span grid-span-left"></div>\
                      </div>');
        
        if(!$gridWidth || !$gridHeight){
            $gridWidth = $('[name="grid-width"]').val();
            $gridHeight = $('[name="grid-height"]').val();
        }
        
        $('.grid-wrapper').append($grid);
        $grid.attr('data-name', "Лист " + ($grid.index(".grid") + 1));

        if ( manual === true) {
            $('#cutting-manual').prop('checked', true);
            $grid.attr('data-calculate', "manual");
        }
        else {
            $('#cutting-manual').prop('checked', false);
            $grid.attr('data-calculate', "auto");
        }


        $('#item-list .list-title').removeClass("active");
        $("#item-list").append('<div class="list-title open active"><span class="list-title-arrow"></span>Лист ' + ($grid.index() + 1) + '</div><div class="groups"></div>');
        $(".grid").css('visibility', 'hidden');
        $grid.css({"width": Math.ceil($gridWidth * $scale * $zoom), "height": Math.ceil($gridHeight * $scale * $zoom)}).css('visibility', 'visible');
        $(".grid-options .name .num").text(($grid.index() + 1));
        resetSelected();

        return $grid;
    }
    
    /*function addGridItem($gridItemWidth, $gridItemHeight, $position){
        var $listItem,
            $params = {},
            $index = 0,
            $item;
        
        if($(".grid-item").length)
            $index = $(".grid-item").length;

        $item = $('<div class="grid-item"><span>'+($index + 1)+'</span></div>');
        
        if(!$gridItemWidth || !$gridItemHeight){
            $gridItemWidth = $('[name="new-grid-item-width"]').val(),
            $gridItemHeight = $('[name="new-grid-item-height"]').val();
        }
        
        $('.grid:last-child').append($item);
        
        if($position){
            $item.css({
                'position': 'absolute',
                'top': $position.top * $scale * $zoom,
                'left': $position.left * $scale * $zoom,
                'width': $gridItemWidth * $scale * $zoom,
                'height': $gridItemHeight * $scale * $zoom,
                'z-index': 1
            });
            
            $item.attr('data-top', $position.top);
            $item.attr('data-left', $position.left);
            
            $listItem = '<div class="group"><span class="num">'+($index + 1)+'</span>\
                <label>Ш:</label> <input type="text" class="form-control" name="grid-item-width" value="'+$gridItemWidth+'"/>\
                <label>В:</label> <input type="text" class="form-control" name="grid-item-height" value="'+$gridItemHeight+'"/>\
                <a href="javascript:void(0)" class="remove icon-item-remove"></a></div>';
                
            $('#item-list .groups').filter( ':last' ).append($listItem);
            addDraggy($item);
            return true;
        }

        $item.css({
            'position': 'absolute',
            'top': 0,
            'left': 0,
            'width': $gridItemWidth * $scale * $zoom,
            'height': $gridItemHeight * $scale * $zoom,
            'z-index': 1
        });
    
        $params = {
            itemPosition: $item.position(),
            itemWidth: $item.outerWidth(),
            itemHeight: $item.outerHeight(),
            gridWidth: $(".grid:last-child").outerWidth(),
            gridHeight: $(".grid:last-child").outerHeight(),
            siblings: []
        };
        $item.siblings(".grid-item").each(function(e, elm){
            $params.siblings.push({
                sibPosition: $(elm).position(),
                sibWidth: $(elm).outerWidth(),
                sibHeight: $(elm).outerHeight()
            })
        });

    //loop: 
        for(var $y = 0; $y <= $params.gridHeight - $params.itemHeight; $y++){
            for(var $x = 0; $x <= $params.gridWidth - $params.itemWidth; $x++){
                $params.itemPosition = {
                    top: $y,
                    left: $x
                }
                if(checkCollision($params) == "valid"){
                    $item.animate({
                        'top': $y,
                        'left': $x
                    }, 500, function(){
                        $item.attr('data-top', Math.ceil($y / ($scale * $zoom)));
                        $item.attr('data-left', Math.ceil($x / ($scale * $zoom)));
                        
                        $('[name="new-grid-item-width"]').val("");
                        $('[name="new-grid-item-height"]').val("");
                        $listItem = '<div class="group"><span class="num">'+($index + 1)+'</span>\
                            <label>Ш:</label> <input type="text" class="form-control" name="grid-item-width" value="'+$gridItemWidth+'"/>\
                            <label>В:</label> <input type="text" class="form-control" name="grid-item-height" value="'+$gridItemHeight+'"/>\
                            <a href="javascript:void(0)" class="remove icon-item-remove"></a></div>';
                            
                        $('#item-list .groups').filter( ':last' ).append($listItem);
                    });
                    addDraggy($item);
                    return true;
                    //break loop;
                }
            }
        }
        $item.remove();
        return false;
    }*/

    function checkCollision(params){
        var valid = 'valid',
            connect = false,
            YGridconnect = false,
            XGridconnect = false,
            Yconnect = false,
            Xconnect = false,
            XColl = false,
            YColl = false,
            element_collicion = false;
        
       if(params.itemPosition.top < 0 || params.itemPosition.left < 0 || params.itemPosition.top + params.itemHeight > params.gridHeight || params.itemPosition.left + params.itemWidth > params.gridWidth){
            valid = 'invalid';
            return valid;
        }
        if(params.itemPosition.left == 0 || params.itemPosition.left + params.itemWidth == params.gridWidth){
            XGridconnect = true;
        }
        if(params.itemPosition.top == 0 || params.itemPosition.top + params.itemHeight == params.gridHeight){
            YGridconnect = true;
        }

        for(var $i = 0; $i < params.siblings.length; $i++){

            if (
               params.itemPosition.left < params.siblings[$i].sibPosition.left + params.siblings[$i].sibWidth &&
               params.itemPosition.left + params.itemWidth > params.siblings[$i].sibPosition.left &&
               params.itemPosition.top < params.siblings[$i].sibPosition.top + params.siblings[$i].sibHeight &&
               params.itemHeight + params.itemPosition.top > params.siblings[$i].sibPosition.top
            ) 
            {   


                valid = 'invalid';
                /*window.console.log('x1 ' + params.itemPosition.left + ' ' + (params.siblings[$i].sibPosition.left + params.siblings[$i].sibWidth));
                window.console.log('x2 ' + (params.itemPosition.left + params.itemWidth) + ' ' + params.siblings[$i].sibPosition.left);
                window.console.log('y1 ' + params.itemPosition.top + ' ' + ( params.siblings[$i].sibPosition.top + params.siblings[$i].sibHeight ));
                 window.console.log('y2 ' + (params.itemHeight + params.itemPosition.top) + ' ' + params.siblings[$i].sibPosition.top);
                window.console.log('detect!');
                window.console.log(params.siblings[$i]);
                 window.console.log( params );*/

                /*if((params.itemPosition.left + params.itemWidth == params.siblings[$i].sibPosition.left) || (params.itemPosition.left == params.siblings[$i].sibPosition.left + params.siblings[$i].sibWidth))
                Xconnect = true;
                if((params.itemPosition.top + params.itemHeight == params.siblings[$i].sibPosition.top) || (params.itemPosition.top == params.siblings[$i].sibPosition.top + params.siblings[$i].sibHeight))
                Yconnect = true;
                if ( Xconnect || Yconnect)
                    valid = 'valid';
                return valid;*/
                
                
            }

            /*if((params.itemPosition.left + params.itemWidth == params.siblings[$i].sibPosition.left) || (params.itemPosition.left == params.siblings[$i].sibPosition.left + params.siblings[$i].sibWidth))
                Xconnect = true;
            if((params.itemPosition.top + params.itemHeight == params.siblings[$i].sibPosition.top) || (params.itemPosition.top == params.siblings[$i].sibPosition.top + params.siblings[$i].sibHeight))
                Yconnect = true;*/
        }

        /*if( (((!Xconnect && !XGridconnect) || (!Yconnect && !YGridconnect)) || (!Xconnect && !Yconnect) && params.siblings.length))
            valid = 'invalid';*/
        window.console.log('collision: ' + valid);
        return valid;
    }

    function getParams(grid, item){
        var self_index = $(item).index();
        var params = {
                itemPosition: $(item).position(),
                itemWidth: $(item)[0].getBoundingClientRect().width,
                itemHeight: $(item)[0].getBoundingClientRect().height,
                gridWidth: $(grid)[0].getBoundingClientRect().width,
                gridHeight: $(grid)[0].getBoundingClientRect().height,
                siblings: []
            },
            valid = 'valid';
        $(item).siblings(".grid-item").each(function(n, sibling){
            params.siblings.push({
                sibPosition: $(sibling).position(),
                sibWidth: $(sibling)[0].getBoundingClientRect().width,
                sibHeight: $(sibling)[0].getBoundingClientRect().height,
            });
        });

        grid.find(".cut-line").each(function(n, line){
            params.siblings.push({
                sibPosition: $(line).position(),
                sibWidth: $(line)[0].getBoundingClientRect().width,
                sibHeight: $(line)[0].getBoundingClientRect().height,
            });
        });

        return params;
    }

    function MainRender(param) {
        //fix for delete last object 
        if ( $('#item-list .group').length == 0 ) {

            $('.grid').remove();
            $('#item-list .list-title').remove();

            addGrid(param.gridWidth, param.gridHeight);

            $('#total-grid-count').text( $('.grid-wrapper .grid').length );
            $('#total-cut-lenght').text(0);
            $('#cutting-meter-remains').text(0);
            $('#cutting-meter-cost').text($meter_cost);
            $('#cutting-cost').text( '0 ₽');

            return true;
        }
        else {

            var elements = [];
            var total_cut_lenght = 0;
            var total_area_populate = 0;
            var manual_elements_nums = [];
            $('#item-list .group').each(function( index ) {
                var i = parseInt($( this ).find('.num').text());
                if ( $(this).parent().data('calculate') != 'manual') {
                    
                    var w = parseInt($( this ).find('[name="grid-item-width"]').val());
                    var h = parseInt($( this ).find('[name="grid-item-height"]').val());
                    elements.push({w:w, h:h, num: i});
                }
                if ( $(this).parent().data('calculate') == 'manual') {
                    manual_elements_nums.push(i);
                }
            });

            //selected element;
            var active_group = $('#item-list .group.active');
            var selected_num = false;
            if ( active_group.length == 1) {
                selected_num = active_group.find('.num').text();
            }
            /*$('.grid').remove();
             $('#item-list .list-title').remove();
             $('#item-list .groups').remove();*/

            var list_object_count = 1;
            var total_auto_grid = $('.grid-wrapper .grid').filter(function( index, grid ) {
                             return $(grid).data('calculate') != 'manual';
                          });

            var total_groups = $('#item-list .groups').filter(function( index, grid ) {
                             return $(grid).data('calculate') != 'manual';
                          });
            

            window.console.log('elements !!!!');
            window.console.log(elements);

             window.console.log('manual_elements_nums !!!!');
            window.console.log(manual_elements_nums);

            var populate_iteration_count = 1;
            var last_plate_max_element_number = 0;
            while (elements.length != 0){
                window.console.log('param');
                window.console.log(param);
                var state = DOMINION.init(param.gridWidth, param.gridHeight, elements, param.cut_line_width, manual_elements_nums, populate_iteration_count, last_plate_max_element_number);
                last_plate_max_element_number = state.last_plate_max_element_number;
                populate_iteration_count++;
                var draw_param = {
                    scale: param.scale,
                    zoom: param.zoom,
                    cut_line_width: param.cut_line_width,
                    grid_width: param.gridWidth,
                    grid_height:  param.gridHeight,
                    selected_num: selected_num
                };

                if ( total_auto_grid.length == 0 && total_groups.length == 0 ) {
                    addGrid(param.gridWidth, param.gridHeight);
                    draw_grid = $('.grid').last();
                    groups = $('#item-list .groups').filter( ':last' );
                }

                if ( total_auto_grid.length > 0 ) {
                    draw_grid = $(total_auto_grid.shift());
                    draw_grid.find('.grid-item').remove();
                    draw_grid.find('.cut-line').remove();
                }

                if ( total_groups.length > 0 ) {
                    groups = $(total_groups.shift());
                    groups.empty();
                }
                
                var draw_data = DOMINION.draw2( draw_grid, draw_param, state);
                $actual_cut_line_width = draw_data.actual_cut_line_width;
    

                var list_elements = [];
                for (i in draw_data.state.list_sets) {
                    for (j in draw_data.state.list_sets[i]) {
                        list_elements.push( draw_data.state.list_sets[i][j] );
                    };
                };

                list_elements.sort( function(a, b) {
                    return parseInt(a.num) - parseInt(b.num);
                });
                for (i in list_elements){
                    $listItem = '<div class="group ' + ( (selected_num == list_elements[i].num) ? 'active':'' ) +'"><span class="num">'+(  list_elements[i].num )+'</span>\
                                <label>A:</label> <input type="text" class="form-control" name="grid-item-width" value="'+list_elements[i].w+'"/>\
                                <label>B:</label> <input type="text" class="form-control" name="grid-item-height" value="'+list_elements[i].h+'"/>\
                                <a href="javascript:void(0)" class="remove icon-item-remove" title="Удалить элемент"></a></div>';
                    groups.append($listItem);
                    list_object_count++;
                    
                }

                

                window.console.log(draw_data.new_grid_sizes.h);
                if (draw_data.new_grid_sizes.w != null)
                    draw_grid.css('width', draw_data.new_grid_sizes.w + 'px');
                if (draw_data.new_grid_sizes.h != null)
                    draw_grid.css('height', draw_data.new_grid_sizes.h + 'px');

                total_cut_lenght += draw_data.total_cut_line_length;
                total_area_populate += draw_data.area_populate;
                elements = state.objects;

                

            }

            //remove not pupulate auto grid and group;
            if ( total_auto_grid.length > 0 ) {
                while( total_auto_grid.length > 0) {
                    draw_grid = $(total_auto_grid.shift());
                    draw_grid.remove();
                    draw_grid.remove();
                }
            }

            if ( total_groups.length > 0 ) {
                while( total_groups.length > 0) {
                    groups = $(total_groups.shift());
                    groups.empty();
                }
            }

            $('#item-list .groups').filter(function( index, groups ) {
                    return $(groups).children().length == 0;
             }).remove();

            if ($('#item-list .list-title').length > 0 ) {
                $('#item-list .list-title').each(function() {
                    if ($(this).next('.groups').length == 0)
                        $(this).remove();
                });
            }

            // set new active if prev active was deleted;

            var flag_display_grid = $('.grid-wrapper .grid').filter( function() {
                return $(this).css('display') == 'block';
            }).length;

            if ( flag_display_grid == 0 ) {
                $('.grid-wrapper .grid').first().show();
                $('#item-list .list-title').first().addClass('active');
            };

            $('#cutting-meter-cost').text($meter_cost);

            if ( param.zoom > 0.4 )
                recalculateCutLinesMetrics();
        }
        return true;
    }

    function ManualListRender(param) {
        $('.grid-wrapper .grid').filter( function() {
            return $(this).data('calculate') == 'manual';
        }).each(function(n, elem) {
            var init_scale = $(elem).data('scale');
            var current_scale = param.scale;

            var init_zoom = $(elem).data('zoom');
            var current_zoom = param.zoom;

            //save init param
            if ( param.zoom != 1 ) {
                $(elem).find('.grid-item, .cut-line').each(function(n, item) {
                    if ( !$(item).data('init-setted') || $(item).data('init-setted') !== true ) {
                        $(item).data('init-top', parseInt($(item).position().top));
                        $(item).data('init-left', parseInt($(item).position().left));

                        $(item).data('init-width', parseInt($(item)[0].offsetWidth));
                        $(item).data('init-height', parseInt($(item)[0].offsetHeight));
                        $(item).data('init-setted', true);
                    }
                });
            }

            $(elem).find('.grid-item, .cut-line').each(function(n, item) {
                var new_top = 0;
                var new_left = 0;
                var new_width = 0;
                var new_height = 0;

                if ( param.zoom != 1 ) {
                    new_top = Math.ceil(parseInt($(item).data('init-top')) * $zoom);
                    new_left = Math.ceil(parseInt($(item).data('init-left')) * $zoom);
                    new_width = Math.ceil(parseInt($(item).data('init-width')) * $zoom);
                    new_height = Math.ceil(parseInt($(item).data('init-height')) * $zoom);

                    new_top = new_top > 0 ? new_top : 1;
                    new_left = new_left > 0 ? new_left : 1;
                    new_width = new_width > 0 ? new_width : 1;
                    new_height = new_height > 0 ? new_height : 1;
                }
                else {
                    new_top = parseInt($(item).data('init-top'));
                    new_left = parseInt($(item).data('init-left'));
                    new_width = parseInt($(item).data('init-width'));
                    new_height = parseInt($(item).data('init-height'));
                }

                $(item).css({
                    "top": new_top,
                    "left": new_left,
                    "width": new_width,
                    "height": new_height
                });

            });
            

            window.console.log(init_scale + ' ' + current_scale);
            window.console.log(init_zoom + ' ' + current_zoom);
        });
        
    }

    /*function doRender(params){
        // sort functions
        var sorting = {
            'none'  : function (a,b) { return  0 },
            'width' : function (a,b) { return a.w - b.w },
            'height': function (a,b) { return a.h - b.h },
            'area'  : function (a,b) { return a.w*a.h - b.w*b.h },
            'magic' : function (a,b) { return Math.max(a.w,a.h) - Math.max(b.w,b.h) }
        }

        var blocks = [];
        $('#item-list .group').each(function(n, elm){
            blocks[n] = { 
                w: parseInt($(elm).find('[name="grid-item-width"]').val()),
                h: parseInt($(elm).find('[name="grid-item-height"]').val()),
                n: n
            };
        });
        blocks.sort( sorting[ params.sort ] );
        blocks.reverse();
        $("#item-list").html("");
        $(".grid-wrapper").html("");
        
        packItems(params, blocks);
        renderIndex();
    }
    
    function packItems(params, blocks){
        var packer = new NETXUS.RectanglePacker( params.canvasWidth, params.canvasHeight ),
            errorBlocks = [],
            n = 0;
        addGrid(params.canvasWidth, params.canvasHeight);
        
        for (var i=0; i<blocks.length; i++) {
            // obtain the coordinates for the current block
            coords = packer.findCoords( blocks[i].w, blocks[i].h );
            if (coords) {
                addGridItem(blocks[i].w, blocks[i].h, {'left': coords.x, 'top': coords.y});
                //$('.grid .grid-item:eq('+blocks[i].n+')').animate({'left': coords.x, 'top': coords.y, 'position': 'absolute'});
            } else {
                errorBlocks[n++] = blocks[i];
                //$('.grid .grid-item:eq('+blocks[i].n+')').css({'display': 'none'});
            }
        }
        if(errorBlocks.length){
            packItems(params, errorBlocks);
        }
    }

    function renderIndex(){
        $(".grid-item").each(function(n, elm){
            $(elm).find("span").text(n+1);
        });
        $("#item-list .group").each(function(n, elm){
            $(elm).find(".num").text(n+1);
        });
    }
    */

    function resetSelected(){
        $(".grid-item").removeClass("checked");
        $("#item-list .group").removeClass("active");
        $(".grid-options .element").addClass("invisible");
    }
    
    function renderZoom(){
        var $gridWidth = $('[name="grid-width"]').val(),
            $gridHeight = $('[name="grid-height"]').val();
        $(".grid-options .scale").text(Math.round($zoom * 100) + "%");
        $(".grid").each(function(n, elm){
            $(elm).css({
                "width": Math.ceil($gridWidth * $scale * $zoom),
                "height": Math.ceil($gridHeight * $scale * $zoom)
            });
        });
        var render_param = {
            gridWidth: $gridWidth,
            gridHeight: $gridHeight,
            scale: $scale,
            zoom: $zoom,
            cut_line_width: $cut_line_width
        };

        MainRender(render_param);

        ManualListRender(render_param);
    }

    function redrawManualGrigAfterDrag(grid_index) {
        var a = performance.now();
        var gridHeight = $('.grid').eq(grid_index).height();
        var gridWidth = $('.grid').eq(grid_index).width();
        
        var vertical_main_lines = [];
        var horizontal_main_line_offset = [];
        var grid_cut_line_width = $actual_cut_line_width;

        var $grid = $('.grid').eq(grid_index);

        var cut_lines = [];
        $grid.find('.cut-line').each( function(n, line) {
            var line_height = $(line)[0].getBoundingClientRect().height;
            var line_width = $(line)[0].getBoundingClientRect().width;
            var line_top = $(line).position().top;
            var line_left = $(line).position().left;
            var line_index = $(line).index();
            var line = {
                left: line_left,
                top: line_top,
                width: line_width,
                height: line_height,
                index: line_index,
                jquery: $(line)
            };

            cut_lines.push(line);
        });

        var grid_items = [];
        $grid.find('.grid-item').each( function(n, elem) {
            var elem_height = $(elem)[0].getBoundingClientRect().height;
            var elem_width = $(elem)[0].getBoundingClientRect().width;
            var elem_top = $(elem).position().top;
            var elem_left = $(elem).position().left;
            var elem_index = $(elem).index();
            var elem = {
                left: elem_left,
                top: elem_top,
                width: elem_width,
                height: elem_height,
                index: elem_index
            };

            grid_items.push(elem);
        });

        if ( grid_items.length == 0) {
            $grid.find('.cut-line').remove();
            return true;
        }

         // if element below last main cut line exist - find elem with max left + width
        // draw new horisontal if there is only one set on plate

        var vertical_main_line_count = cut_lines.filter(function(line){
            line_width = line.width;
            line_height = line.height;
            return grid_cut_line_width == line_width && line_height == gridHeight;
        }).length;

        //check if main horizontal line next to any element exist, if not - draw
        // check on element in first row - they have max width;
        grid_items.filter(function(elem) {
            var item_top = elem.top;
            return item_top == 0;
        }).forEach(function( elem ) {
                var item_left = elem.left;
                var item_top = elem.top;
                var item_width = elem.width;
                var item_height = elem.height;

                // line on right
                var check_main_horizontal = cut_lines.filter(function(line){
                    line_left = line.left;
                    line_width = line.width;
                    line_height = line.height;
                    return (item_left+item_width) == line_left && line_height == gridHeight;
                }).length;

                if ( check_main_horizontal == 0 && vertical_main_line_count > 1) {

                    // check if line dosent exist
                    var check_exist = cut_lines.filter( function(line) {
                        return      line.height == gridHeight
                                 && line.width == grid_cut_line_width
                                 && line.left == (item_left+item_width)
                                 && line.top == 0
                    }).length;

                    if ( check_exist == 0) {
                        var $item = $('<div class="cut-line"></div>');
                        $('.grid').eq(grid_index).append($item);

                        $item.css({
                            'position': 'absolute',
                            'top': 0,
                            'left': item_left+item_width,
                            'width': grid_cut_line_width,
                            'height': gridHeight,
                            'z-index': 1
                        });
                        var cut_line_obj = {
                            left: item_left+item_width,
                            top: 0,
                            width: grid_cut_line_width,
                            height: gridHeight,
                            index: $item.index(),
                            jquery: $item
                        }
                        cut_lines.push(cut_line_obj);
                    }
                }
                //cut lines for first elem in last set
                /*else if ( check_main_horizontal == 0) {
                    var $item = $('<div class="cut-line"></div>');
                    $('.grid').eq(grid_index).append($item);

                    $item.css({
                        'position': 'absolute',
                        'top': item_top + item_height,
                        'left': item_left,
                        'width': gridWidth - item_left,
                        'height': grid_cut_line_width,
                        'z-index': 1
                    });

                    $item = $('<div class="cut-line"></div>');
                    $('.grid').eq(grid_index).append($item);

                    $item.css({
                        'position': 'absolute',
                        'top': item_top,
                        'left': item_left + item_width,
                        'width': grid_cut_line_width,
                        'height': item_height,
                        'z-index': 1
                    });
                }*/



        });


        cut_lines.forEach(function(line){
            line_left = line.left;
            line_width = line.width;
            line_height = line.height;
            line_width_rounded = line_width;

            if ( grid_cut_line_width == line_width_rounded && line_height == gridHeight) {
                vertical_main_lines.push( line );
                var left_summ = line_left + grid_cut_line_width;
                horizontal_main_line_offset.push( left_summ );
            }
        });

        //UPDATE
        // draw new horisotal if it needed
        var last_horizontal_main_line_offset = Math.max.apply(null, horizontal_main_line_offset);
        

        // find element that has max left + width
        var elements_over_last_main_line = grid_items.filter( function(elem) {
            var item_left = elem.left;
            var item_width = elem.width ;
            var item_left_summ = item_left + item_width;
            return ( item_left_summ > last_horizontal_main_line_offset );
        });

       

        

        if (elements_over_last_main_line.length > 0 && vertical_main_line_count > 1) {
            var items_offsets_below_line = [];
            elements_over_last_main_line.forEach( function(elem) {
                var item_left = elem.left;
                var item_width = elem.width;
                var item_summ = item_left + item_width;
                items_offsets_below_line.push(item_summ);
            });

            if ( Math.max.apply(null, items_offsets_below_line) <= gridHeight) {

                // check if line dosent exist
                var check_exist = cut_lines.filter( function(line) {
                    return      line.height == gridHeight
                             && line.width == grid_cut_line_width
                             && line.left == Math.max.apply(null, items_offsets_below_line)
                             && line.top == 0
                }).length;

                if ( check_exist == 0 ) {  
                    var $item = $('<div class="cut-line"></div>');
                    $('.grid').eq(grid_index).append($item);

                    $item.css({
                        'position': 'absolute',
                        'top': 0,
                        'left': Math.max.apply(null, items_offsets_below_line),
                        'width': grid_cut_line_width,
                        'height': gridHeight,
                        'z-index': 1
                    });

                    var cut_line_obj = {
                        left: Math.max.apply(null, items_offsets_below_line),
                        top: 0,
                        width: grid_cut_line_width,
                        height: gridHeight,
                        index: $item.index(),
                        jquery: $item
                    }
                    cut_lines.push(cut_line_obj);

                    vertical_main_lines.push( cut_line_obj );
                }
            }
        }

        //delete all non main vertical
        /*$('.grid').eq(grid_index).find('.cut-line').filter(function( n, line ) {
                             return vertical_main_lines.indexOf( $(line).index() ) == -1;
        }).remove();*/
        
        /*for (i in vertical_main_lines) {
            vertical_main_lines[i].jquery.remove();
            var index_to_delete = cut_lines.findIndex( function(line) {
                return line.index == vertical_main_lines[i].index;
            });
            if ( index_to_delete )
                cut_lines.splice(index_to_delete, 1);
        }*/

        //draw sets horizontal lines;

        var manual_sets = [];
        var sets_width = [];
        var vertical_main_lines_left_offsets = [];
        cut_lines.filter(function(line) {
                return line.width == grid_cut_line_width && line.height == gridHeight;
                                                 }).forEach(function(line){
            vertical_main_lines_left_offsets.push( line.left );
        });

        vertical_main_lines_left_offsets.sort(function(a, b) {
            return a - b;
        });

        // add grid right border as it cut line
        vertical_main_lines_left_offsets.push(gridWidth);

        var cut_line_width = $actual_cut_line_width;
        
        // set elem to top corner
        /*for (i in vertical_main_lines_left_offsets) {
            var line_offset = vertical_main_lines_left_offsets[i];
            var set_elements = [];

            grid_items.each(function( elem ) {
                var item_left = elem.left;
                var item_top = elem.top;
                var item_width = elem.width;
                var item_height = elem.height;
                var item_summ = item_left + item_width;
                var left_offset = 0;
                if ( i == 0 ) {
                    left_offset = 0;
                }
                else {
                    left_offset = vertical_main_lines_left_offsets[i-1] + cut_line_width;
                }

                if ( left_offset <= item_left && item_summ <= line_offset) {
                    set_elements.push( elem.index );
                }
                
            });

            set_elements.sort(function(a, b) {
                return  $('.grid').eq(grid_index).children().eq(a).position().top  - $('.grid').eq(grid_index).children().eq(b).position().top ;
            });
            
            var top_offset = 0;
            for (j in set_elements) {
                if ( $('.grid').eq(grid_index).children().eq(set_elements[j]).position().top == 0) {
                    top_offset += parseFloat($('.grid').eq(grid_index).children().eq(set_elements[j])[0].getBoundingClientRect().height) + cut_line_width;
                }
                else {
                    $('.grid').eq(grid_index).children().eq(set_elements[j]).css('top', top_offset + 'px');
                    $('.grid').eq(grid_index).children().eq(set_elements[j]).css('left', left_offset + 'px');
                    top_offset += parseFloat($('.grid').eq(grid_index).children().eq(set_elements[j])[0].getBoundingClientRect().height) + cut_line_width;
                }
            }
        }*/

        // set horizontal lines
        

        for (i in vertical_main_lines_left_offsets) {
            var line_offset = vertical_main_lines_left_offsets[i];

            var left_offset = 0;
            if ( i > 0 ) {
                left_offset = vertical_main_lines_left_offsets[i-1] + cut_line_width;
            }

            // remove exist lines that dosen have connections
            var cut_lines_to_delete = cut_lines.filter(function(line) {
                var line_left = line.left;
                var line_top = line.top;
                var line_width = line.width;
                var line_height = line.height;

                var connection_count = grid_items.filter(function(elem) {
                    var item_left = elem.left;
                    var item_top = elem.top;
                    var item_width = elem.width;
                    var item_height = elem.height;

                    return   (line_top == (item_top + item_height) || (line_top + cut_line_width) == item_top)
                           && line_height == cut_line_width
                           && line_left == item_left

                }).length;

                return connection_count == 0 && line_height == cut_line_width;
            });

            if ( cut_lines_to_delete.length > 0 ) {
                cut_lines_to_delete.forEach( function(line_to_delete) {
                    line_to_delete.jquery.remove();
                    var index_to_delete = cut_lines.findIndex( function(line) {
                        return line_to_delete.index == line.index;
                    });
                    if ( index_to_delete )
                        cut_lines.splice(index_to_delete, 1);

                });
            }
            

            grid_items.forEach(function( elem ) {
                var item_left = elem.left;
                var item_top = elem.top;
                var item_width = elem.width;
                var item_height = elem.height;
                var item_summ = item_left + item_width;

                

                if ( left_offset <= item_left && item_summ <= line_offset) {

                    // draw horizontal;
                   
                    var item_height_check = item_top + item_height + cut_line_width;
                    var sub_left_offset = left_offset;
                    
                   

                    if ( item_height_check <= gridHeight) {
                        // if it sub elem, find new left offest
                        if ( left_offset < item_left) {
                            var left_element = grid_items.filter(function( l_elem ) {
                                var l_item_left = l_elem.left;
                                var l_item_top = l_elem.top;
                                var l_item_width = l_elem.width;
                                var l_item_height = l_elem.height;

                                return l_item_top == item_top && (l_item_left + l_item_width + cut_line_width) == item_left;
                            });
                            
                            if ( left_element.length == 1) {
                                var l_item_left = left_element[0].left;
                                var l_item_width = left_element[0].width;


                                

                                sub_left_offset = l_item_left + l_item_width + cut_line_width;
                            }
                        }
                        
                        // check if line dosent exist
                        var check_exist = cut_lines.filter( function(line) {
                            return      line.height == cut_line_width
                                     && ( line.width + line.left == line_offset)
                                     && line.top == (item_top + item_height)
                        }).length;

                        if ( check_exist == 0 ) {  
                            var $item = $('<div class="cut-line"></div>');
                            $('.grid').eq(grid_index).append($item);
                            
                            $item.css({
                                'position': 'absolute',
                                'top': item_top + item_height,
                                'left': sub_left_offset,
                                'width': line_offset - sub_left_offset,
                                'height': cut_line_width,
                                'z-index': 1
                            });

                            var cut_line_obj = {
                                left: sub_left_offset,
                                top: item_top + item_height,
                                width: line_offset - sub_left_offset,
                                height: cut_line_width,
                                index: $item.index(),
                                jquery: $item
                            }
                            cut_lines.push(cut_line_obj);
                        }
                        
                    }
                }

                //remove subhorizontal and subvertical
                var sub_cut_lines_to_remove = cut_lines.filter(function(line) {
                    var line_left = line.left;
                    var line_top = line.top;
                    var line_width = line.width;
                    var line_height = line.height;

                    var connection_count = grid_items.filter(function(elem) {
                        var elem_left = elem.left;
                        var elem_top = elem.top;
                        var elem_width = elem.width;
                        var elem_height = elem.height;

                        return   (line_left == (elem_left + elem_width) || (line_left + cut_line_width) == elem_left)
                               && line_top <= elem_top
                               && (line_top + line_height) >= (elem_top + elem_height)
                               && line_width == cut_line_width

                    });

                   

                    return     (line_left + cut_line_width) == item_left
                            && line_width == cut_line_width
                            && line_top == item_top
                            && line_height != gridHeight
                            && connection_count.length == 1

                });

                //subvertical
                var sub_cut_veritcal_lines_to_remove = cut_lines.filter(function(line) {
                    var line_left = line.left;
                    var line_top = line.top;
                    var line_width = line.width;
                    var line_height = line.height;

                    var connection_count = grid_items.filter(function(elem) {
                        var elem_left = elem.left;
                        var elem_top = elem.top;
                        var elem_width = elem.width;
                        var elem_height = elem.height;

                        return   (line_left == (elem_left + elem_width) || (line_left - cut_line_width) == elem_left)
                               && line_top == elem_top
                               && (line_top + line_height) == (elem_top + elem_height)
                               && line_width == cut_line_width

                    });

                    return     line_width == cut_line_width
                            && line_height != gridHeight
                            && connection_count.length == 0

                });

                var sub_cut_lines_to_removes = [];
                if (sub_cut_lines_to_remove.length > 0 && sub_cut_veritcal_lines_to_remove.length > 0 ) {
                    sub_cut_lines_to_removes = sub_cut_lines_to_remove.concat(sub_cut_veritcal_lines_to_remove);
                }
                else if ( sub_cut_lines_to_remove.length > 0 ) {
                    sub_cut_lines_to_removes = sub_cut_lines_to_remove;
                }
                else if ( sub_cut_veritcal_lines_to_remove.length > 0 ) {
                    sub_cut_lines_to_removes = sub_cut_veritcal_lines_to_remove;
                }

                if ( sub_cut_lines_to_removes.length > 0) {
                    sub_cut_lines_to_removes.forEach( function(line_to_delete) {
                        line_to_delete.jquery.remove();
                        var index_to_delete = cut_lines.findIndex( function(line) {
                            return line_to_delete.index == line.index;
                        });
                        if ( index_to_delete )
                            cut_lines.splice(index_to_delete, 1);

                    });
                }
                
                // add left subvertical if it needed
                if ( item_left - cut_line_width > 0 && sub_left_offset < item_left) {
                    // check if line dosent exist
                    var check_exist = cut_lines.filter( function(line) {
                        return      line.height == (item_height)
                                 && line.width == cut_line_width
                                 && line.left == (item_left - cut_line_width)
                                 && line.top == item_top
                    }).length;

                    if ( check_exist == 0 ) { 
                        var $item = $('<div class="cut-line"></div>');
                        $('.grid').eq(grid_index).append($item);
                        $item.css({
                            'position': 'absolute',
                            'top': item_top,
                            'left': item_left - cut_line_width,
                            'width': cut_line_width,
                            'height': item_height,
                            'z-index': 1
                        });

                        var cut_line_obj = {
                            left: item_left - cut_line_width,
                            top: item_top,
                            width: cut_line_width,
                            height: item_height + cut_line_width,
                            index: $item.index(),
                            jquery: $item
                        }
                        cut_lines.push(cut_line_obj);
                    }
                }

                if ( sub_left_offset <= item_left && item_summ < line_offset && (sub_left_offset + item_width) == (item_left + item_width) ) {
                    // draw sub vertical;
                    // check if line dosent exist
                    
                    var check_exist = cut_lines.slice(0).filter( function(line) {
                        return      line.height >= item_height
                                 && line.width == cut_line_width
                                 && line.left == (sub_left_offset + item_width)
                                 && line.top <= item_top
                                 && (line.top + line.height) >= (item_top + item_height)
                    });

                    if ( check_exist.length == 0 ) { 
                        var $item = $('<div class="cut-line"></div>');
                        $('.grid').eq(grid_index).append($item);
                        $item.css({
                            'position': 'absolute',
                            'top': item_top,
                            'left': sub_left_offset + item_width,
                            'width': cut_line_width,
                            'height': item_height,
                            'z-index': 1
                        });

                        var cut_line_obj = {
                            left: sub_left_offset + item_width,
                            top: item_top,
                            width: cut_line_width,
                            height: item_height,
                            index: $item.index(),
                            iquery: $item
                        }
                        cut_lines.push(cut_line_obj);
                    }

                    // check if line dosent exist
                    var check_exist = cut_lines.filter( function(line) {
                        return      line.height >= item_height
                                 && line.width == cut_line_width
                                 && line.left == (sub_left_offset - cut_line_width)
                                 && line.top <= item_top
                                 && (line.top + line.height) >= (item_top + item_height)
                    }).length;

                    if ( check_exist == 0 && sub_left_offset != 0) { 
                        $item = $('<div class="cut-line"></div>');
                        $('.grid').eq(grid_index).append($item);
                        $item.css({
                            'position': 'absolute',
                            'top': item_top,
                            'left': sub_left_offset - cut_line_width,
                            'width': cut_line_width,
                            'height': item_height,
                            'z-index': 1
                        });

                        var cut_line_obj = {
                            left: sub_left_offset - cut_line_width,
                            top: item_top,
                            width: cut_line_width,
                            height: item_height,
                            index: $item.index(),
                            jquery: $item
                        }
                        cut_lines.push(cut_line_obj);
                    }
                }
                
            });
            
        }

        
        // remove main vertical lines that not related to any elem

        cut_lines.filter(function(line) {
                var line_left = line.left;
                var line_top = line.top;
                var line_width = line.width;
                var line_height = line.height;

                return line_width == cut_line_width && line_height == gridHeight;
        }).forEach( function(line) {

            var line_left = line.left;
            var line_top = line.top;
            var line_width = line.width;
            var line_height = line.height;

            // if any elem have not any connection to line then delete
            var element_count = grid_items.length;
            var related_count = 0;
            grid_items.forEach(function( elem ) {
                var item_left = elem.left;
                var item_top = elem.top;
                var item_width = elem.width;
                var item_height = elem.height;

                if (
                           item_left == (line_left + line_width)
                        || (item_left + item_width) == line_left
                   ) 
                {
                    related_count++;
                }
            });

            if ( related_count == 0 ) {
                line.jquery.remove();
                var index_to_delete = cut_lines.findIndex( function(line_) {
                        return line_.index == line.index;
                    });
                if ( index_to_delete )
                    cut_lines.splice(index_to_delete, 1);
            }
        });

         // remove  horizontal lines that not related to any elem

        cut_lines.filter(function(line) {
                var line_height = line.height;
                var line_width = line.width;

                return    line_height == cut_line_width;
        }).forEach( function(line) {

            var line_left = line.left;
            var line_top = line.top;
            var line_width = line.width;
            var line_height = line.height;

            // if any elem have not any connection to line then delete
            var element_count = grid_items.length;
            var related_count = 0;
            grid_items.forEach(function( elem ) {
                var item_left = elem.left;
                var item_top = elem.top;
                var item_width = elem.width;
                var item_height = elem.height;

                if (
                        
                                (       item_top >= (line_top + line_height)
                                    || 
                                        (item_top + item_height) <= line_top
                                )
                            &&
                                (       item_left <= line_left 
                                    ||
                                        (item_left + item_width) <= (line_left + line_width)
                                )
                        
                   ) 
                {
                    related_count++;
                }
            });

            if ( related_count == 0 ) {
                line.jquery.remove();
                var index_to_delete = cut_lines.findIndex( function(line_) {
                        return line_.index == line.index;
                    });
                if ( index_to_delete )
                    cut_lines.splice(index_to_delete, 1);
            }
        });

        // fix for situation when item below last main horizontal but not have top = 0;
        var last_horizontal_main_line_offset_arr = [];
        cut_lines.filter(function(line){
                    line_top = line.top;
                    line_height = line.height;
                    return line_top == 0 && line_height == gridHeight;
                }).forEach(function(line){
                    line_left = line.left;

                    last_horizontal_main_line_offset_arr.push( line_left);
                    
                });

        var last_horizontal_main_line_offset_fix_value = Math.max.apply(null, last_horizontal_main_line_offset_arr);
        var last_item_without_right_main_line = grid_items.filter(function(elem) {
            var item_top = elem.top;
            var item_left = elem.left;
            return item_top > 0 && item_left > last_horizontal_main_line_offset_fix_value;


        })
        
        if ( last_item_without_right_main_line.length > 0 && vertical_main_line_count > 1) {

            var max_width = [];

            last_item_without_right_main_line.forEach( function(elem) {
                var item_left = elem.left;
                var item_top = elem.top;
                var item_width = elem.width;
                var item_height = elem.height;

                max_width.push( item_left + item_width );

            });

            var max_width_offset = Math.max.apply(null, max_width);
            item_left = last_item_without_right_main_line.left;
            item_width = last_item_without_right_main_line[0].width;

            // check if line dosent exist
            var check_exist = cut_lines.filter( function(line) {
                return      line.height == gridHeight
                         && line.width == cut_line_width
                         && line.left == max_width_offset
                         && line.top == 0
            }).length;

            if ( check_exist == 0 ) { 
                var $item = $('<div class="cut-line"></div>');
                $grid.append($item);

                $item.css({
                    'position': 'absolute',
                    'top': 0,
                    'left': max_width_offset,
                    'width': cut_line_width,
                    'height': gridHeight,
                    'z-index': 1
                });

                var cut_line_obj = {
                    left: max_width_offset,
                    top: 0,
                    width: cut_line_width,
                    height: gridHeight,
                    index: $item.index(),
                    jquery: $item
                }
                cut_lines.push(cut_line_obj);
            }

            //fix bottom cut lines
            cut_lines_to_fix = cut_lines.filter(function(line){
                var line_left = line.left;
                var line_top = line.top;
                var line_width = line.width;
                var line_height = line.height;
                
                return line_left > last_horizontal_main_line_offset_fix_value && line_height == cut_line_width;
            });
            if ( cut_lines_to_fix.length > 0) {
                cut_lines_to_fix.forEach( function(line) {
                    line.jquery.css('width', (max_width_offset - last_horizontal_main_line_offset_fix_value) + 'px');
                });
            }
            
        }

        // remove  horizontal lines that not related to any elem
        if ( last_item_without_right_main_line.length == 0 ) {
            var cut_lines_to_delete = cut_lines.filter(function(line) {
                    var line_left = line.left;
                    var line_height = line.height;

                    return line_left > (last_horizontal_main_line_offset_fix_value + cut_line_width) && line_height == cut_line_width;
            });
            if ( cut_lines_to_delete.length > 0) {
                cut_lines_to_delete.forEach( function(line_to_delete) {
                    line_to_delete.jquery.remove();
                    var index_to_delete = cut_lines.findIndex( function(line) {
                        return line_to_delete.index == line.index;
                    });
                    if ( index_to_delete )
                        cut_lines.splice(index_to_delete,1);

                });
            };

        }

        

        //remove possible doubles of sub horizontal 

        var cut_lines_ = [];
        $grid.find('.cut-line').each( function(n, line) {
            var line_height = $(line)[0].getBoundingClientRect().height;
            var line_width = $(line)[0].getBoundingClientRect().width;
            var line_top = $(line).position().top;
            var line_left = $(line).position().left;
            var line_index = $(line).index();
            var line = {
                left: line_left,
                top: line_top,
                width: line_width,
                height: line_height,
                index: line_index,
                jquery: $(line)
            };

            cut_lines_.push(line);
        });

        var sub_horizontal_cut_lines = cut_lines_.filter(function(line) {
                var line_width = line.width;
                var line_height = line.height;

                return line_height < gridHeight && line_width == cut_line_width;
        });

        if ( sub_horizontal_cut_lines.length > 0 ) {
            var cut_lines_to_delete = sub_horizontal_cut_lines.filter(function(line) {
                var line_width = line.width;
                var line_height = line.height;
                var line_left = line.left;

                var find_index = cut_lines_.findIndex( function(line_) {
                    var line_width_ = line_.width;
                    var line_height_ = line_.height;
                    var line_left_ = line_.left;

                    return line_height_ == gridHeight && line_left_ == line_left && line_width_ == cut_line_width;
                });

                return find_index > 0;
            });

            if ( cut_lines_to_delete.length > 0) {
                cut_lines_to_delete.forEach( function(line_to_delete) {
                    line_to_delete.jquery.remove();
                    var index_to_delete = cut_lines_.findIndex( function(line) {
                        return line_to_delete.index == line.index;
                    });
                    if ( index_to_delete )
                        cut_lines_.splice(index_to_delete,1);

                });
            };
        }

        /*$('.grid').eq(grid_index).find('.cut-line').droppable({
            greedy: true,
            tolerance: 'touch',
            drop: function(event,ui){
                ui.draggable.draggable('option','revert',true);
            }
        });*/

        var b = performance.now();
        window.console.log('execution time ' + (b - a) + ' ms.');

        recalculateCutLinesMetrics();
        

    }

    function removeDragItemCutLines($grid, elem) {
        var grid_cut_line_width = $actual_cut_line_width;
        var elem_height = $(elem)[0].getBoundingClientRect().height;
        var elem_width = $(elem)[0].getBoundingClientRect().width
        var elem_top = $(elem).position().top;
        var elem_left = $(elem).position().left;
        var elem_index = $(elem).index();
       

        //find left and right verital lines;

        var closest_vertical_left = [];
        var closest_vertical_right = [];

        //find left or right vertical line if exist
        $grid.find('.cut-line').each( function(n, line) {
            var line_height = $(line)[0].getBoundingClientRect().height;
            var line_width = $(line)[0].getBoundingClientRect().width;
            var line_top = $(line).position().top;
            var line_left = $(line).position().left;

            var connection_count = $grid.find('.grid-item').filter(function(n, elem) {
                    var item_left = $(elem).position().left;
                    var item_top = $(elem).position().top;
                    var item_width = $(elem)[0].getBoundingClientRect().width;
                    var item_height = $(elem)[0].getBoundingClientRect().height;

                    return    ( (line_left + line_width) == item_left || (line_left) == (item_left + item_width))
                           && line_top <= item_top
                           && (line_top + line_height) >= (item_top + item_height)
                           && line_width == grid_cut_line_width
                           && elem_index != $(elem).index();

                }).length;

            if (   connection_count == 0 
                && line_top == elem_top 
                && line_height == elem_height
                && (    line_left == (elem_left + elem_width) 
                     || (line_left + grid_cut_line_width) == elem_left
                    )
                )
                $(line).remove();
        });

        var cut_lines = $grid.find('.cut-line');

        cut_lines.each( function(n, line) {

            var line_height = $(line)[0].getBoundingClientRect().height;
            var line_width = $(line)[0].getBoundingClientRect().width;
            var line_top = $(line).position().top;
            var line_left = $(line).position().left;
            
            // cut line can intersect element a little because some issue, so extra check for line cut line_left+width > elem_left
            if (  ( ((line_left + line_width) <= elem_left) || ( (line_left + line_width) > elem_left && (line_left < elem_left) ) )
                 && line_width == grid_cut_line_width
                 && line_height == $grid[0].getBoundingClientRect().height
               ) {
                closest_vertical_left.push(line);
            }
            //window.console.log(line_left + ' ' + (elem_left+elem_width));

            if (  ( line_left >= (elem_left+elem_width))
                 && line_width == grid_cut_line_width
                 && line_height == $grid[0].getBoundingClientRect().height
               ) {
                closest_vertical_right.push(line);
            }
            
        });

        //find closest left horisontal cut line
        var left_offset = 0;

        if (closest_vertical_left.length > 0) {
            left_offset = Math.max.apply(null, closest_vertical_left.map(function(line) {
                                    return $(line).position().left;
                                })
                           );
            left_offset += grid_cut_line_width;
        }

        //find closest right horisontal cut line
        var right_offset = $grid.outerWidth();

        if (closest_vertical_right.length > 0) {
             right_offset = Math.min.apply(null, closest_vertical_right.map(function(line) {
                                    return $(line).position().left;
                                })
                             );
        }

        //find cut lines inside set and closest to elem;

        var closest_horizontal_top = [];
        var closest_horizontal_bottom = [];

        cut_lines.each( function(n, line) {

            var line_height = $(line)[0].getBoundingClientRect().height;
            var line_width = $(line)[0].getBoundingClientRect().width;
            var line_top = $(line).position().top;
            var line_left = $(line).position().left;
            
            // cut line can intersect element a little because some issue
            if ( ( (line_top + line_height) == elem_top || ( (line_top + line_height) > elem_top && (line_top + line_height) < (elem_top + elem_height) ) )
                 && line_height == grid_cut_line_width
                 && (line_left >= left_offset)
                 && (line_left + line_width <= right_offset)
               ) {
                closest_horizontal_top.push(line);
            }

            if ( ( line_top == (elem_top + elem_height) || ( line_top < (elem_top + elem_height) && (line_top + line_height) > (elem_top + elem_height) ) )
                 && line_height == grid_cut_line_width
                 && (line_left >= left_offset)
                 && (line_left + line_width <= right_offset)
               ) {
                closest_horizontal_bottom.push(line);
            }
            
        });

        var closest_horizontal_top_offset = [];
        for (i in closest_horizontal_top) {
            closest_horizontal_top_offset.push($(closest_horizontal_top[i]).position().top);
        }
        var closest_horizontal_top_offset_value = Math.max.apply(null, closest_horizontal_top_offset);
        
        var closest_horizontal_top_elem = null;

        for (i in closest_horizontal_top) {
            if ( $(closest_horizontal_top[i]).position().top == closest_horizontal_top_offset_value) {
                closest_horizontal_top_elem = closest_horizontal_top[i];
                break;
            }
        }

        var closest_horizontal_bottom_offset = [];
        for (i in closest_horizontal_bottom) {
            closest_horizontal_bottom_offset.push($(closest_horizontal_bottom[i]).position().top);
        }
        var closest_horizontal_bottom_offset_value = Math.min.apply(null, closest_horizontal_bottom_offset);

        var closest_horizontal_bottom_elem = null;
        for (i in closest_horizontal_bottom) {
            if ( $(closest_horizontal_bottom[i]).position().top == closest_horizontal_bottom_offset_value) {
                closest_horizontal_bottom_elem = closest_horizontal_bottom[i];
                break;
            }
        }

        // need to know that closest horisontal have intersect with other elements in section


        if ( closest_horizontal_top_elem != null) {
            var top_border_element_found = false;
            $grid.find('.grid-item').filter( function(n, e) {
                return !$(e).hasClass('ui-draggable-dragging');
        }   ).each( function(n, other_elem) {
                var other_elem_height = $(other_elem)[0].getBoundingClientRect().height;
                var other_elem_width = $(other_elem)[0].getBoundingClientRect().width;
                var other_elem_top = $(other_elem).position().top;
                var other_elem_left = $(other_elem).position().left;

                if (       left_offset <= other_elem_left 
                        && (other_elem_left + elem_width <= right_offset)
                        && ( (other_elem_top + other_elem_height) == $(closest_horizontal_top_elem).position().top
                                ||
                            other_elem_top == ( $(closest_horizontal_top_elem).position().top  + grid_cut_line_width)
                            )
                   ) 
                {
                    top_border_element_found = true;
                }
               
            });

            if ( !top_border_element_found )
                $(closest_horizontal_top_elem).remove();
        }

        if ( closest_horizontal_bottom_elem != null ) {
            var bottom_border_element_found = false;
            $grid.find('.grid-item').filter( function(n, e) {
                return !$(e).hasClass('ui-draggable-dragging');
            }).each( function(n, other_elem) {
                var other_elem_height = $(other_elem)[0].getBoundingClientRect().height;
                var other_elem_width = $(other_elem)[0].getBoundingClientRect().width;
                var other_elem_top = $(other_elem).position().top;
                var other_elem_left = $(other_elem).position().left;

                if (       left_offset <= other_elem_left 
                        && (other_elem_left + elem_width <= right_offset)
                        && (  (other_elem_top == ( $(closest_horizontal_bottom_elem).position().top + grid_cut_line_width) )
                                ||
                              ( (other_elem_top + other_elem_height) == $(closest_horizontal_bottom_elem).position().top )
                            )
                   ) 
                {   
                    bottom_border_element_found = true;
                }
                
            });
            window.console.log('closest_horizontal_top_elem');
            window.console.log($(closest_horizontal_top_elem));

             window.console.log('closest_horizontal_bottom_elem');
             window.console.log($(closest_horizontal_bottom_elem));
            if ( !bottom_border_element_found && $(closest_horizontal_top_elem).index() != $(closest_horizontal_bottom_elem).index()

               )
                $(closest_horizontal_bottom_elem).remove();
        }
    
        /*$(closest_horizontal_top_elem).remove();
        $(closest_horizontal_bottom_elem).remove();*/
    }

    function autoMoveAfterDrag($grid, elem) {
        var params = getParams($grid, elem);
        var elem_top = $(elem).position().top;
        var elem_left = $(elem).position().left;

        //first more to top left
        //init
        var element_new_top = elem_top;
        var element_new_left = elem_left;
        params.itemPosition = {
            top: element_new_top,
            left: element_new_left
        };
        
        var can_move_top = true;
        do {
            var temp_params = params;
            temp_params.itemPosition.top = element_new_top;
            if (checkCollision(temp_params) == "valid") {
                params.itemPosition.top = temp_params.itemPosition.top;
                element_new_top -= 1;
            }
            else {
                can_move_top = false;
            }

        } while ( can_move_top );

        //workaround
        params.itemPosition.top += 1;

        var can_move_left = true;
        do {
            var temp_params = params;
            temp_params.itemPosition.left = element_new_left;

            if (checkCollision(temp_params) == "valid") {
                params.itemPosition.left = temp_params.itemPosition.left;
                element_new_left -= 1;
            }
            else {
                can_move_left = false;
            }

        } while ( can_move_left );
        
        //workaround
        params.itemPosition.left +=1;


        params.itemPosition.top = params.itemPosition.top == 1 ? params.itemPosition.top = 0 : params.itemPosition.top;
        params.itemPosition.left = params.itemPosition.left == 1? params.itemPosition.left = 0 : params.itemPosition.left;

        window.console.log('move after drag left ' + params.itemPosition.left);
        window.console.log('move after drag top ' + params.itemPosition.top);
        $(elem).animate({
                        'top': params.itemPosition.top,
                        'left': params.itemPosition.left
                    }, 
                    500,
                    function() {
                        //workaround
                        redrawManualGrigAfterDrag($grid.index());
                        }
                    );   
    }

    function canRotate($elem) {
        var $grid = $elem.parents(".grid").first();
        var gridWidth = $grid.width();
        var gridHeight = $grid.height();
        var left_offset = 0;
        var right_offset = 0;

        /*
         *  FIRST STEP FIND LEFT AND RIGHT OFFSETS 
         */

        if ( $elem.width() == $elem.height() ) {
            return false;
        }

        left_offset = $elem.position().left;

        // find right offset

        // find closest right main vertical cut line.

        var right_vertical_main_lines = $grid.find('.cut-line').filter( function(n, line) {
            return    $(line).height() == gridHeight
                   && $(line).position().left >= ( $elem.position().left + $elem.width() )
        });

        window.console.log('right_vertical_main_lines');
        window.console.log(right_vertical_main_lines);

        // add grid width as last vertical cut line
        var right_vertical_main_lines_offsets = [];
        if ( right_vertical_main_lines.length > 0) {
            right_vertical_main_lines_offsets = right_vertical_main_lines.map( 
                function( n, line ) {
                    return $(line).position().left;
                }
            );
        }

        right_vertical_main_lines_offsets.push(gridWidth);

        right_offset = Math.min.apply(null, right_vertical_main_lines_offsets);
        
        if ( ($elem.position().left + $elem.width()) == gridWidth)
            right_offset = gridWidth;

        var right_main_cut_line_offset = right_offset;

        // check if exist sub-element on right side, if they do - redefine right offset

        var sub_elements_on_right = $grid.find('.grid-item').filter( function(n, elem) {
            return    $(elem).index() != $elem.index()
                   && $(elem).position().left >= ($elem.position().left + $elem.width())
                   && ($(elem).position().left + $(elem).width()) <= right_offset
                   && $(elem).position().top <= $(elem).position().top
                   && ($(elem).position().top + $(elem).height()) <= ($elem.position().top + $elem.height());
        });

        if ( sub_elements_on_right.length > 0 ) {
            right_offset = Math.min.apply(null, sub_elements_on_right.map( 
                    function( n, elem ) {
                        return $(elem).position().left;
                    }
                )
            );
            right_offset -= $actual_cut_line_width;
        }
        
        // check if element in last set, if so redefine right offset
        // find closest main right cut line;
        var count_main_cut_line_on_right_side = $grid.find('.cut-line').filter( function(n, line) {
            return    $(line).height() == gridHeight
                   && $(line).position().left >= right_main_cut_line_offset
        }).length;

        var element_after_right_main_cut_line = $grid.find('.grid-item').filter( function(n, elem) {
            return    $(elem).position().left >= right_main_cut_line_offset
        }).length;

        // if it last set and elem dosent have elem on right
        if (     sub_elements_on_right.length == 0
             && (count_main_cut_line_on_right_side == 0)
             && element_after_right_main_cut_line == 0
            ) {
            right_offset = gridWidth;
        }

        window.console.log('right_offset');
        window.console.log(right_offset);

        // check if element can rotate within offsets
        // $elem.height is new $elem.width
        if ( ( $elem.position().left + $elem.height() ) > right_offset )
            return false;

        /*
         *  SECOND STEP FIND TOTAL SET HEIGHT AFTER ROTATION
         */

        // find elements in set below element

        var elements_below = $grid.find('.grid-item').filter( function(n, elem) {
            return    $(elem).index() != $elem.index()
                   && $(elem).position().left >= left_offset
                   && ($(elem).position().left + $(elem).width()) <= right_offset
                   && ($(elem).position().top + $(elem).height()) > ($elem.position().top + $elem.height());
        });

        var height_offset_after_rotate = 0;

        if ( $elem.width() > $elem.height() )
            height_offset_after_rotate = $elem.position().top + ( $elem.width() );
        if ( $elem.width() < $elem.height() )
            height_offset_after_rotate = $elem.position().top + ( $elem.height() );
        
        //find bottom most
        var max_height_offset = 0;
        if ( height_offset_after_rotate > 0 && elements_below.length > 0) {
            max_height_offset = Math.min.apply(null, elements_below.map( 
                    function( n, elem ) {
                        return $(elem).position().top + $(elem).height();
                    }
                )
            );
        }

        //check if new offsets for bottom most
        if ( (height_offset_after_rotate + max_height_offset) > gridHeight)
            return false;

        $elem.data('left_offset', left_offset);
        $elem.data('right_offset', right_offset);
        $elem.data('right_main_cut_line_offset', right_main_cut_line_offset);
        window.console.log('height_offset_after_rotate ' + height_offset_after_rotate);
        window.console.log('max_height_offset ' + max_height_offset);
        window.console.log('gridHeight ' + gridHeight);

        return true;
    }

    function rotateItem($elem) {
        var $grid = $elem.parents(".grid").first();
        var left_offset = $elem.data('left_offset');
        //var right_offset = $elem.data('right_offset');
        var right_offset = $elem.data('right_main_cut_line_offset');
        
        var rotate_offset = ( $elem.width() > $elem.height() ) ? $elem.width() - $elem.height() : 0;

        // remove main vertical cut line if it last set
        /*var main_cut_lines = false;

        if ( right_offset == $grid.width() ) {
            main_cut_lines = $grid.find('.cut-line').filter( function(n, line) {
                    return    $(line)[0].getBoundingClientRect().width == $actual_cut_line_width
                           && $(line)[0].getBoundingClientRect().height == $grid[0].getBoundingClientRect().height
            });

            //find max left offset
            max_left_offset = Math.max.apply(null, main_cut_lines.map( function(n, line) {
                return $(line).position().left;
            }));

            window.console.log('max_left_offset');
            window.console.log(max_left_offset);

            if ( max_left_offset >= ($elem.position().left + $elem[0].getBoundingClientRect().width) ) {
                main_cut_lines.each(function(n, line) {
                    if ( $(line).position().left == max_left_offset)
                        $(line).remove();
                });
            }
        }*/
        // remove right cut line
         $grid.find('.cut-line').filter( function(n, line) {
                    return    $(line)[0].getBoundingClientRect().width == $actual_cut_line_width
                           && $(line)[0].getBoundingClientRect().height == $elem[0].getBoundingClientRect().height
                           && $(line).position().top == $elem.position().top
                           && $(line).position().left == ( $elem.position().left + $elem[0].getBoundingClientRect().width)
            }).remove();

        //find element below including cut line
        if ( rotate_offset > 0 && $elem.data('rotated') != true ) {
            $grid.find('.grid-item')
                .filter( function(n, elem) {
                    return    $(elem).index() != $elem.index()
                           && $(elem).position().left >= left_offset
                           && ($(elem).position().left + $(elem).width()) <= right_offset
                           && ($(elem).position().top + $(elem).height()) > ($elem.position().top + $elem.height());
                })
                .each( function(n, elem) {
                    var temp_top = $(elem).position().top;
                    var new_top = temp_top + rotate_offset;
                    $(elem).css('top', new_top + 'px');
                });

                $grid.find('.cut-line')
                .filter( function(n, line) {
                    return    $(line).height() != $grid.height()
                           && $(line).position().left >= left_offset
                           && ($(line).position().left + $(line).width()) <= right_offset
                           && $(line).position().top > ($elem.position().top + $elem.height());
                })
                .each( function(n, line) {
                    var temp_top = $(line).position().top;
                    var new_top = temp_top + rotate_offset;
                    $(line).css('top', new_top + 'px');
                });
        }

        //before rotate - delete s

        //rotate item
        var elem_temp_width = $elem[0].getBoundingClientRect().width;
        var elem_temp_height = $elem[0].getBoundingClientRect().height;
        $elem.data('rotated', true);

        /*$elem.animate({
                        'width': elem_temp_height,
                        'height': elem_temp_width,
                    }, 
                    500,
                    function() {
                         autoMoveAfterDrag($grid, $elem[0]);
                        }
                    ); */ 
        
        $elem.css({
                        'width': elem_temp_height,
                        'height': elem_temp_width,
                    });

        // change values on list

        var elem_num = parseInt($elem.find('span').text());

        var $group = $('#item-list .group').filter( function(n, group) {
            
            var group_num = parseInt($(group).find('.num').text());
            return elem_num == group_num;

        }).first();

        var list_temp_w = $group.find('input[name="grid-item-width"]').first()[0].value;
        var list_temp_h = $group.find('input[name="grid-item-height"]').first()[0].value;

        $group.find('input[name="grid-item-width"]').first()[0].value = list_temp_h;
        $group.find('input[name="grid-item-height"]').first()[0].value = list_temp_w;

        $('.grid-options input[name="grid-item-width"]').first()[0].value = list_temp_h;
        $('.grid-options input[name="grid-item-height"]').first()[0].value = list_temp_w;

        // remove line that causes collision
        //bottom
        $grid.find('.cut-line').filter( function(n, line) {

            return    $(line)[0].getBoundingClientRect().height == $actual_cut_line_width
                   && $(line).position().top < ($elem.position().top + $elem[0].getBoundingClientRect().height)
                   && $(line).position().top > $elem.position().top
                   && $(line).position().left >= left_offset
                   && ($(line).position().left + $(line)[0].getBoundingClientRect().width) <= right_offset
                   && $(line).position().left ==  $elem.position().left;

        }).remove();
        //right
        $grid.find('.cut-line').filter( function(n, line) {
            return    $(line)[0].getBoundingClientRect().width == $actual_cut_line_width
                   && $(line)[0].getBoundingClientRect().height !== $grid[0].getBoundingClientRect().height
                   && $(line).position().top == $elem.position().top
                   && $(line).position().left > $elem.position().left
                   && $(line).position().left < ($elem.position().left + $elem[0].getBoundingClientRect().width)

        }).remove();

        //add new cut line if it needed
        var bottom_cut_line_for_rotated_elem = $grid.find('.cut-line').filter( function(n, line) {
            return    $(line)[0].getBoundingClientRect().height == $actual_cut_line_width
                   && $(line).position().top == ($elem.position().top + $elem[0].getBoundingClientRect().height)
                   && $(line).position().left == $elem.position().left;
        })

        window.console.log('bottom_cut_line_for_rotated_elem');
        window.console.log(bottom_cut_line_for_rotated_elem);

        if ( bottom_cut_line_for_rotated_elem.length == 0) {

            var right_main_cut_line_offset = $grid.width();

            var right_vertical_main_lines = $grid.find('.cut-line').filter( function(n, line) {
            return    $(line).height() == $grid.height()
                   && $(line).position().left >= ( $elem.position().left + $elem.width() )
            });

            if ( right_vertical_main_lines.length > 0) {
                right_main_cut_line_offset = Math.min.apply(null, right_vertical_main_lines.map( 
                        function( n, line ) {
                            return $(line).position().left;
                        }
                    )
                );
            }

            var $item = $('<div class="cut-line"></div>');
            $grid.append($item);
            var line_width = right_main_cut_line_offset - left_offset
            $item.css({
                'position': 'absolute',
                'top': $elem.position().top + $elem[0].getBoundingClientRect().height,
                'left': left_offset,
                'width': line_width,
                'height': $actual_cut_line_width,
                'z-index': 1
            });
        }

        var right_cut_line_for_rotated_elem = $grid.find('.cut-line').filter( function(n, line) {
            return    $(line)[0].getBoundingClientRect().width == $actual_cut_line_width
                   && $(line)[0].getBoundingClientRect().height != $grid[0].getBoundingClientRect().height
                   && $(line).position().left == ($elem.position().left + $elem[0].getBoundingClientRect().width)
                   && $(line).position().top == $elem.position().top;
        })

        if ( right_cut_line_for_rotated_elem.length == 0) {

            var right_main_cut_line_offset = $grid.width();

            var right_vertical_main_lines = $grid.find('.cut-line').filter( function(n, line) {
            return    $(line).height() == $grid.height()
                   && $(line).position().left >= ( $elem.position().left + $elem.width() )
            });

            if ( right_vertical_main_lines.length > 0) {
                var right_vertical_main_lines_arr = [];
                right_vertical_main_lines_arr = right_vertical_main_lines.map( 
                    function( n, line ) {
                        return $(line).position().left;
                    }
                );
                // add grid right offset as cut line offset
                right_vertical_main_lines_arr.push( $grid.width() );

                right_main_cut_line_offset = Math.min.apply(null, right_vertical_main_lines_arr);
            }

            var line_left = $elem.position().left + $elem[0].getBoundingClientRect().width;
            if ( right_main_cut_line_offset <= $grid.width() && line_left < right_main_cut_line_offset) {
                var $item = $('<div class="cut-line"></div>');
                $grid.append($item);
                $item.css({
                    'position': 'absolute',
                    'top': $elem.position().top,
                    'left': line_left,
                    'width': $actual_cut_line_width,
                    'height': $elem[0].getBoundingClientRect().height,
                    'z-index': 1
                });
            }
        }
        // remove horicontal cut line that does not belong to any element
        $grid.find('.cut-line').filter( function(n, line) {
            var line_top = $(line).position().top;
            var belong_count = 0;
            $grid.find('.grid-item').each( function(n, elem) {
                    var elem_top = $(elem).position().top;
                    var elem_height = $(elem)[0].getBoundingClientRect().height

                    if ( ( line_top == (elem_top+elem_height) || (line_top + $actual_cut_line_width) == elem_top) ) {
                        belong_count++;
                    }
                });


            return    $(line)[0].getBoundingClientRect().height == $actual_cut_line_width
                   && belong_count == 0

        }).remove();

        recalculateCutLinesMetrics();
        
        
    }

    function recalculateCutLinesMetrics() {
        var total_cut_line_length = 0;
        var populate_area = 0;
    
        $('.grid-wrapper .cut-line').each( function(n, line) {
            if ( $(line).width() == $actual_cut_line_width ) {
                length_mm = Math.round( $(line).height() / ($scale * $zoom) );
                
                total_cut_line_length += length_mm;
                populate_area  += (length_mm * $cut_line_width);
            }
            else if ( $(line).height() == $actual_cut_line_width ) {
                length_mm = Math.round( $(line).width() / ($scale * $zoom) );

                total_cut_line_length += length_mm;
                populate_area  += (length_mm * $cut_line_width);
            }
        });

        $('#item-list .group').each( function(n, item) {
            width_mm = parseInt( $(item).find('input[name="grid-item-width"]').val() );
            height_mm = parseInt( $(item).find('input[name="grid-item-height"]').val() );
            populate_area += (width_mm * height_mm);
        });

        var gridWidth = parseInt( $('[name="grid-width"]').val() ),
            gridHeight = parseInt( $('[name="grid-height"]').val() );
        var grids_areas = ( gridWidth * gridHeight ) * parseInt( $('.grid-wrapper .grid').length );
        
        $('#total-grid-count').text( $('.grid-wrapper .grid').length );
        $('#total-cut-lenght').text( (total_cut_line_length / 1000).toFixed(1) );
        $('#cutting-cost').text( (((total_cut_line_length / 1000).toFixed(1) * $meter_cost)).toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1 ') + ' ₽');

        // fix possible negative area remaing (bacause of rounding)
        var populate_diff = grids_areas - populate_area;
        populate_diff = populate_diff < 0 ? 0 : populate_diff;

        $('#cutting-meter-remains').text(  Math.floor( ( (populate_diff) / (1000*1000) ) *10 ) / 10 );

    }

    // START ADD EQUALS
    $(document).ready(function () {
        $("#cutting-modal-cutting-equals").dialog({
            autoOpen: false,
            draggable: false,
            modal: true,
            resizable: false,
            title: "Кратный раскрой листа",
            closeText: "",
            width: 420,
            position: { my: "center", at: "center-10 center-100", of: ".box-grid .old-col-11" },
            open: function( event, ui ) {
            }
        });


        //init and redraw previews
        function populateCuttingEqualsModal(grid, cut_lines, result) {
            $('.cutting-equals-preview-action-horizontal-value').val(cut_lines.horizontal_count);
            $('.cutting-equals-preview-action-vertical-value').val(cut_lines.vertical_count);
            if ( cut_lines.horizontal_count == 0) {
                $('.cutting-equals-preview-action-horizontal-minus').attr('disabled', 'disabled');
            }
            else {
                $('.cutting-equals-preview-action-horizontal-minus').removeAttr("disabled");
            }
            if ( cut_lines.vertical_count == 0) {
                $('.cutting-equals-preview-action-vertical-minus').attr('disabled', 'disabled');
            }
            else {
                $('.cutting-equals-preview-action-vertical-minus').removeAttr("disabled");
            }

            
            $('#cutting-equals-result-element-width').text( result.width);
            $('#cutting-equals-result-element-height').text( result.height);

            DOMINION.equalparts.drawPreview($('.cutting-equals-preview-wrapper'), grid, cut_lines, result);

            var elements_count = (cut_lines.vertical_count + 1) * (cut_lines.horizontal_count + 1);
            $('#cutting-equals-result-elements-count').text(elements_count);
        };

        // premaded inits
        $('.icon-cutting-equals').click( function(event) {
            event.preventDefault();

            var grid = {
                width: parseInt($('[name="grid-width"]').val()),
                height: parseInt($('[name="grid-height"]').val()),
                min_element_size: parseInt($('#cutting-setting-min-element-size').val()),
                scale: $scale,
                zoom: $zoom
            };

            var cut_lines = {
                vertical_count: parseInt($(this).data('cut-lines-vertical-count')),
                horizontal_count: parseInt($(this).data('cut-lines-horizontal-count')),
                size_mm: parseInt($('#cutting-setting-cut-line-width').val())
            };

            var result = DOMINION.equalparts.init(grid, cut_lines);

            console.log('grid');
            console.log(grid);
            console.log('cut_lines');
            console.log(cut_lines);
            console.log('element');
            console.log(result);

            populateCuttingEqualsModal(grid, cut_lines, result);

            $("#cutting-modal-cutting-equals").dialog('open');

        });
        
        // + and - buttons
        $('.cutting-equals-preview-action-vertical-plus').click( function(event) {
            event.preventDefault();
            var current_val = parseInt( $('.cutting-equals-preview-action-vertical-value').val() );
            $('.cutting-equals-preview-action-vertical-value').val(current_val + 1);

            var grid = {
                width: parseInt($('[name="grid-width"]').val()),
                height: parseInt($('[name="grid-height"]').val()),
                min_element_size: parseInt($('#cutting-setting-min-element-size').val()),
                scale: $scale,
                zoom: $zoom
            };

            var cut_lines = {
                vertical_count: parseInt( $('.cutting-equals-preview-action-vertical-value').val() ),
                horizontal_count: parseInt( $('.cutting-equals-preview-action-horizontal-value').val() ),
                size_mm: parseInt($('#cutting-setting-cut-line-width').val())
            };

            var result = DOMINION.equalparts.init(grid, cut_lines);
            
            //redraw
            populateCuttingEqualsModal(grid, cut_lines, result);

            //disable button if needed
            var check_cutlines = {
                vertical_count: cut_lines.vertical_count+1,
                horizontal_count : cut_lines.horizontal_count,
                size_mm: cut_lines.size_mm
            }
            var check_result = DOMINION.equalparts.calculateElementSize('width', grid, check_cutlines);
            if ( check_result == -1) {
                $(this).attr('disabled', 'disabled');
            }
            else {
                $(this).removeAttr("disabled");
            }

        });

        $('.cutting-equals-preview-action-vertical-minus').click( function(event) {
            event.preventDefault();
            var current_val = parseInt( $('.cutting-equals-preview-action-vertical-value').val() );
            $('.cutting-equals-preview-action-vertical-value').val(current_val - 1);

            var grid = {
                width: parseInt($('[name="grid-width"]').val()),
                height: parseInt($('[name="grid-height"]').val()),
                min_element_size: parseInt($('#cutting-setting-min-element-size').val()),
                scale: $scale,
                zoom: $zoom
            };

            var cut_lines = {
                vertical_count: parseInt( $('.cutting-equals-preview-action-vertical-value').val() ),
                horizontal_count: parseInt( $('.cutting-equals-preview-action-horizontal-value').val() ),
                size_mm: parseInt($('#cutting-setting-cut-line-width').val())
            };

            var result = DOMINION.equalparts.init(grid, cut_lines);
            
            //redraw
            $('.cutting-equals-preview-action-vertical-plus').removeAttr("disabled");
            populateCuttingEqualsModal(grid, cut_lines, result);

        });

        $('.cutting-equals-preview-action-horizontal-plus').click( function(event) {
            event.preventDefault();
            var current_val = parseInt( $('.cutting-equals-preview-action-horizontal-value').val() );
            $('.cutting-equals-preview-action-horizontal-value').val(current_val + 1);

            var grid = {
                width: parseInt($('[name="grid-width"]').val()),
                height: parseInt($('[name="grid-height"]').val()),
                min_element_size: parseInt($('#cutting-setting-min-element-size').val()),
                scale: $scale,
                zoom: $zoom
            };

            var cut_lines = {
                vertical_count: parseInt( $('.cutting-equals-preview-action-vertical-value').val() ),
                horizontal_count: parseInt( $('.cutting-equals-preview-action-horizontal-value').val() ),
                size_mm: parseInt($('#cutting-setting-cut-line-width').val())
            };

            var result = DOMINION.equalparts.init(grid, cut_lines);
            
            //redraw
            populateCuttingEqualsModal(grid, cut_lines, result);

            //disable button if needed
            var check_cutlines = {
                vertical_count: cut_lines.vertical_count,
                horizontal_count : cut_lines.horizontal_count+1,
                size_mm: cut_lines.size_mm
            }
            var check_result = DOMINION.equalparts.calculateElementSize('height', grid, check_cutlines);
            if ( check_result == -1) {
                $(this).attr('disabled', 'disabled');
            }
            else {
                $(this).removeAttr("disabled");
            }

        });

        $('.cutting-equals-preview-action-horizontal-minus').click( function(event) {
            event.preventDefault();
            var current_val = parseInt( $('.cutting-equals-preview-action-horizontal-value').val() );
            $('.cutting-equals-preview-action-horizontal-value').val(current_val - 1);

            var grid = {
                width: parseInt($('[name="grid-width"]').val()),
                height: parseInt($('[name="grid-height"]').val()),
                min_element_size: parseInt($('#cutting-setting-min-element-size').val()),
                scale: $scale,
                zoom: $zoom
            };

            var cut_lines = {
                vertical_count: parseInt( $('.cutting-equals-preview-action-vertical-value').val() ),
                horizontal_count: parseInt( $('.cutting-equals-preview-action-horizontal-value').val() ),
                size_mm: parseInt($('#cutting-setting-cut-line-width').val())
            };

            var result = DOMINION.equalparts.init(grid, cut_lines);
            
            //redraw
            $('.cutting-equals-preview-action-horizontal-plus').removeAttr("disabled");
            populateCuttingEqualsModal(grid, cut_lines, result);

        });

        //draw on plate
        $('#cutting-equals-apply').click( function(event) {
            event.preventDefault();

            var last_item_number = $('#item-list .group').length > 0 ? (parseInt($('#item-list .group').last().find('.num').text()) + 1) : 1;
            var list_count_to_add = parseInt($('#cutting-equals-plates-count').val());
            $gridWidth = parseInt($('[name="grid-width"]').val()),
            $gridHeight = parseInt($('[name="grid-height"]').val());

            var grid = {
                width: parseInt($('[name="grid-width"]').val()),
                height: parseInt($('[name="grid-height"]').val()),
                min_element_size: parseInt($('#cutting-setting-min-element-size').val()),
                scale: $scale,
                zoom: $zoom
            };

            var cut_lines = {
                vertical_count: parseInt($('.cutting-equals-preview-action-vertical-value').val()),
                horizontal_count: parseInt($('.cutting-equals-preview-action-horizontal-value').val()),
                size_mm: parseInt($('#cutting-setting-cut-line-width').val())
            };

            var result = DOMINION.equalparts.init(grid, cut_lines);
            var param = {
                scale: $scale,
                zoom: $zoom,

            };

            var obj = {
                w: result.width,
                h: result.height,
                num: last_item_number,
            };

            var $item = $('<div class="test-cut-line"></div>');
            $('.grid').last().append($item);
            actual_cut_line_width = Math.ceil(cut_lines.size_mm * param.scale * param.zoom);
            $('.test-cut-line').remove();

            for (var i = 0; i < list_count_to_add; i++) {
                if ( $('.grid').last().find('.grid-item').length != 0) {
                     addGrid($gridWidth, $gridHeight, true);
                }
                if ( $('.grid').length == 1 && $('.grid').last().find('.grid-item').length == 0) {
                    $('.grid').last().data('calculate', 'manual');
                } 

                 var current_list_num = $('.grid').last().index() + 1;
                 var groups = $('#item-list .groups').filter( ':last' );
                 var groups_last_num = $('#item-list .groups').filter( ':last' ).prev().text().replace('Лист ', '');

                if ( groups_last_num != current_list_num ) {
                     $('#item-list .list-title').removeClass("active");
                     $("#item-list").append('<div class="list-title open active"><span class="list-title-arrow"></span>Лист ' + current_list_num + '</div><div class="groups"></div>');
                     groups = $('#item-list .groups').filter( ':last' );
                }
                
                groups.data('calculate', 'manual');
                groups.prev().data('calculate', 'manual');
                groups.prev().addClass('list-manual');

                 var height_offset = 0;
                 for (var j = 0; j < cut_lines.horizontal_count + 1; j++) {
                    var width_offset = 0;

                    for (var k = 0; k < cut_lines.vertical_count + 1; k++) {
                        var draw_data = DOMINION.drawObj($('.grid').last(), param, obj, width_offset, height_offset, actual_cut_line_width, 0, false, 0);
                        
                        $listItem = '<div class="group"><span class="num">'+ obj.num +'</span>\
                                <label>A:</label> <input type="text" class="form-control" name="grid-item-width" value="'+obj.w+'" disabled/>\
                                <label>B:</label> <input type="text" class="form-control" name="grid-item-height" value="'+obj.h+'" disabled/>\
                                <a href="javascript:void(0)" class="remove icon-item-remove" title="Удалить элемент"></a></div>';
                        groups.append($listItem);

                        //horizontal cut line
                        if ( j < cut_lines.horizontal_count ) { 
                            var $item = $('<div class="cut-line"></div>');
                            $('.grid').last().append($item);
                            $item.css({
                                'position': 'absolute',
                                'top': height_offset + Math.ceil(obj.h * param.scale * param.zoom),
                                'left': width_offset,
                                'width': Math.ceil(obj.w * param.scale * param.zoom),
                                'height': actual_cut_line_width,
                                'z-index': 1
                             });
                        }

                        obj.num++;
                        width_offset = draw_data.w + actual_cut_line_width;

                    };
                    height_offset += (Math.ceil(obj.h * param.scale * param.zoom) + actual_cut_line_width);
                }

                //vertical main cut line
                var main_vertical_cut_line_left_offset = Math.ceil(obj.w * param.scale * param.zoom);

                for (var k = 0; k < cut_lines.vertical_count; k++) {
                    var $item = $('<div class="cut-line"></div>');
                    $('.grid').last().append($item);
                    $item.css({
                        'position': 'absolute',
                        'top': 0,
                        'left': main_vertical_cut_line_left_offset,
                        'width': actual_cut_line_width,
                        'height': Math.ceil(grid.height * param.scale * param.zoom),
                        'z-index': 1
                     });
                    main_vertical_cut_line_left_offset += Math.ceil(obj.w * param.scale * param.zoom) + actual_cut_line_width;
                }

            };

            $('#cutting-manual').prop('checked', true);
            $actual_cut_line_width = actual_cut_line_width;
            $meter_cost = parseFloat( $('#cutting-setting-meter-cost').val() );
            $('#cutting-meter-cost').text($meter_cost);

            recalculateCutLinesMetrics();

            $("#cutting-modal-cutting-equals").dialog('close');
        });

    });
    // END ADD EQUALS    

});
/* End */
;; /* /local/templates/ipromo/js/jquery.contextMenu.js?167774124881130*/
; /* /local/templates/ipromo/js/dominion.cutting2.js?1677741248140835*/
; /* /local/templates/ipromo/js/dominion.cutting.equalparts.js?16777412485070*/
; /* /local/templates/ipromo/js/grid2.js?1677741248194822*/
