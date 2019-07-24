const canDecode = require('../utils/can-decode');
const composeStyleInner = require('../utils/compose-style-inner');
const camelToDash = require('../utils/camel-to-dash');
const dashToCamel = require('../utils/dash-to-camel');
const castStringTo = require('../utils/cast-string-to');
const delay = require('../utils/delay');
const {INSTANCE, CMP_INSTANCE, ATTR, DIR_IS, REGEX} = require('../constants');
//const Spye = require('../utils/spye');

class DOMManipulation {

    $$afterNodeElementCreate($el, node, initial) {
        if (typeof $el.hasAttribute === 'function')
            if ((node.type.indexOf('-') !== -1
                || (typeof $el.hasAttribute === 'function' && $el.hasAttribute(ATTR.IS)))
                && !initial) {
                this._processing.push({node: $el, action: 'create'});
            }
    }

    // noinspection JSMethodCanBeStatic
    $$beforeNodeChange($parent, $oldElement, newNode, oldNode) {
        if (typeof newNode === 'string' && typeof oldNode === 'string' && $oldElement) {
            $oldElement.textContent = canDecode(newNode);
            if($parent.nodeName === 'SCRIPT') {
                // it could be heavy
                if ($parent.type === 'text/style' && $parent.dataset.id && $parent.dataset.owner) {
                    document.getElementById($parent.dataset.id).textContent = composeStyleInner($oldElement.textContent, $parent.dataset.ownerByData);
                }
            }
            return $oldElement;
        }
    };

    // noinspection JSMethodCanBeStatic
    $$afterNodeChange($newElement, $oldElement) {
        //Re-assign CMP INSTANCE to new element
        if ($oldElement[CMP_INSTANCE]) {
            $newElement[CMP_INSTANCE] = $oldElement[CMP_INSTANCE];
            $newElement[CMP_INSTANCE]._rootElement = $newElement;
            $newElement[CMP_INSTANCE]._rootElement.parentNode.dataset.uid = $oldElement[CMP_INSTANCE].internalId;
        }
    };

    // noinspection JSMethodCanBeStatic
    $$beforeNodeWalk($parent, index, attributesUpdated) {
        if ($parent.childNodes[index]) {
            const dynInstance = $parent.childNodes[index][INSTANCE];
            // Can update props of dynamic instances?
            if (dynInstance && attributesUpdated.length) {
                attributesUpdated.forEach(props => {
                    Object.keys(props).forEach(name => {
                        dynInstance.props[name] = props[name]
                    })
                });

                return true;
            }
        }

        return false;
    }

    $$afterNodeWalk() {

    }

    // noinspection JSMethodCanBeStatic
    $$beforeAttributeSet($target, name, value) {
        if (REGEX.IS_CUSTOM_TAG.test($target.nodeName) || $target[DIR_IS]) {
            name = camelToDash(name);
        }

        return [name, value];
    }

    $$afterAttributeCreate($target, name, value, nodeProps) {
        let bindValue;
        if (this._setBind($target, name, value)) {
            bindValue = this.props[value];
        }
        if (nodeProps)
            this._setRef($target, name, nodeProps[name]);
        return bindValue;
    }

    // noinspection JSMethodCanBeStatic
    $$afterAttributesCreate($target, bindValue) {
        if (typeof bindValue === 'undefined')
            return;

        delay(() => {
            let inputs;
            let input;
            if ($target.type === 'radio') {
                inputs = document.querySelectorAll(`input[name=${$target.name}][type=radio]`);
                for(let i = 0, len = inputs.length; i < len; i++) {
                    input = inputs[i];
                    input.checked = bindValue === input.value;
                }
            } else if ($target.type === 'checkbox') {
                if(typeof bindValue === 'object') {
                    inputs = document.querySelectorAll(`input[name=${$target.name}][type=checkbox]`);
                    for(let i = 0, len = inputs.length; i < len; i++) {
                        input = inputs[i];
                        input.checked = Array.from(bindValue).includes(input.value);
                    }
                } else
                    $target.checked = bindValue;
            } else {
                $target.value = bindValue;
            }
        });
    }

    $$afterAttributeUpdate($target, name, value) {
        if (this.updateChildrenProps && $target) {
            name = dashToCamel(name);
            const firstChild = $target.firstChild;
            if (firstChild && firstChild[CMP_INSTANCE] && Object.prototype.hasOwnProperty.call(firstChild[CMP_INSTANCE]._publicProps, name)) {
                firstChild[CMP_INSTANCE].props[name] = value;
            }
        }
    }

    _setRef($target, name, value) {
        if (!this.constructor._isRefAttribute(name)) return;
        this.ref[value] = $target
    }

    _setBind($target, name, value) {
        if (!this.constructor._isBindAttribute(name) || !this.constructor._canBind($target)) return;
        const cmp = this;
        if (typeof cmp.props[value] !== 'undefined') {

            let events = ['compositionstart', 'compositionend', 'input', 'change'];

            events.forEach(function (event) {
                $target.addEventListener(event, function (e) {
                    let _value;
                    if (this.type === 'checkbox') {
                        if(!this.defaultValue)
                            cmp.props[value] = this.checked;
                        else {
                            const inputs = document.querySelectorAll(`input[name=${this.name}][type=checkbox]:checked`);
                            _value = [...inputs].map(input => input.value);
                            cmp.props[value] = castStringTo(_value);
                        }
                    } else {
                        _value = this.value;
                        if (this.multiple) {
                            _value = [...this.options].filter(option => option.selected).map(option => option.value);
                        }
                        cmp.props[value] = castStringTo(_value);
                    }
                });
            });

            if (Object.prototype.hasOwnProperty.call(cmp._boundElements, value)) {
                cmp._boundElements[value].push($target);
            } else {
                cmp._boundElements[value] = [$target];
            }

            return true;
        }
    }

    static _isBindAttribute(name) {
        return name === ATTR.BIND;
    }

    static _isRefAttribute(name) {
        return name === ATTR.REF;
    }

    static _canBind($target) {
        return ['INPUT', 'TEXTAREA', 'SELECT'].indexOf($target.nodeName) !== -1
    }

}

module.exports = DOMManipulation;