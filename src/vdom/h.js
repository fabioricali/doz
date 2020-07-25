const {TAG} = require('../constants');
const mapper = require('./mapper');
const camelToDash = require('../utils/camel-to-dash');
//const eventsAttributes = require('../utils/events-attributes');
//const {scopedInner} = require('../component/helpers/style');
const {compile, Element} = require('../vdom/parser');
const tagText = TAG.TEXT_NODE_PLACE;
const tagIterate = TAG.ITERATE_NODE_PLACE;
const LESSER = '<';
const GREATER = '>';
let cacheTpl = Object.create(null);

//const regOpen = new RegExp(`<${tagText}>(\\s+)?<`, 'gi');
//const regClose = new RegExp(`>(\\s+)?<\/${tagText}>`, 'gi');
//const regStyle = /<style(?: scoped)?>((?:.|\n)*?)<\/style>/gi;
/**/

/**
 * This method add special tag to value placeholder
 * @param strings
 * @param value
 * @returns {*}
 */
module.exports = function (strings, ...value) {

    //hCache.get(strings, value);
    //console.log('val', value);

    // Why? cycling require :D
    //let Component = require('../component/Component');

    let tpl = strings[0];
    //et result2 = strings[0];
    let allowTag = false;
    let isInStyle = false;
    let thereIsStyle = false;
    let isBoundedToComponent = !!this._components;
    let compiled;

    let valueLength = value.length;
    for (let i = 0; i < valueLength; ++i) {
        let isComponentConstructor = false;
        //if (Array.isArray(value[i])) {
            /*let newValueString = '';
            for (let j = 0; j < value[i].length; j++) {
                let obj = value[i][j];
                if(typeof obj === 'object' && obj.constructor && obj.constructor === Element) {
                    newValueString += `<${tagIterate}>${mapper.set(obj)}</${tagIterate}>`;
                }
            }
            if (newValueString) {
                console.error('aaaaaaaaaaaaaaaa')
                value[i] = newValueString;
            }*/
        //}

        //if(value[i] !== null && typeof value[i] === 'object' && value[i].constructor && value[i].constructor === Element) {
            //value[i] = mapper.set(value[i]);
        //}

        let stringsI = strings[i];
        let stringLength = stringsI.length;
        for (let x = 0; x < stringLength; x++) {
            if (stringsI[x] === LESSER) {
                allowTag = false;
            } else if (stringsI[x] === GREATER) {
                allowTag = true;
            }
        }

        if (stringsI.indexOf('<style') > -1) {
            isInStyle = true;
            thereIsStyle = true;
        }

        if (stringsI.indexOf('</style') > -1) {
            isInStyle = false;
        }

        if(isInStyle) {
            allowTag = false;
            tpl = tpl
                .replace(/ scoped>/, ' data-scoped>');
            //result2 = result;
        }

        //
        let isInHandler = false;
        // Check if value is a function and is after an event attribute like onclick for example.
        if (typeof value[i] === 'function' || typeof value[i] === 'object') {
            //for (let x = 0; x < eventsAttributes.length; x++) {
                let r = stringsI.split(`=`);
                if (['"', "'", ''].indexOf(r[r.length - 1]) > -1) {
                    isInHandler = true;
                }
            //}
        }

        let attributeOriginalTagName;
        // if this function is bound to Doz component
        if (isBoundedToComponent && !isInStyle && !isInHandler) {

            // if before is to <
            if (value[i] && !Array.isArray(value[i]) && (typeof value[i] === 'function' || typeof value[i] === 'object') && strings[i].indexOf(LESSER) > -1) {
                isComponentConstructor = true;
                let cmp = value[i];
                let tagName = camelToDash(cmp.tag || cmp.name || 'obj');
                // Sanitize tag name
                tagName = tagName.replace(/_+/, '');
                // if is a single word, rename with double word
                if (tagName.indexOf('-') === -1) {
                    tagName = `${tagName}-${tagName}`;
                }

                let tagCmp = tagName + '-' + this.uId + '-' + (this._localComponentLastId++);

                if (this._componentsMap.has(value[i])) {
                    tagCmp = this._componentsMap.get(value[i]);
                } else {
                    this._componentsMap.set(value[i], tagCmp);
                }

                // add to local components
                if (this._components[tagCmp] === undefined) {
                    //attributeOriginalTagName = tagCmp;
                    this._components[tagCmp] = {
                        tag: tagName,
                        cfg: cmp
                    };
                }

                // add to local app components
                if (this.app._components[tagCmp] === undefined) {
                    //attributeOriginalTagName = tagCmp;
                    this.app._components[tagCmp] = {
                        tag: tagName,
                        cfg: cmp
                    };
                }

                attributeOriginalTagName = tagCmp;
                value[i] = tagName;
            }
        }

        if(allowTag) {
            //result += `<${tagText}>${value[i]}</${tagText}>${strings[i + 1]}`;
            if (Array.isArray(value[i]))
                tpl += `___{${i}}___${strings[i + 1]}`;
            else
                tpl += `<${tagText}>___{${i}}___</${tagText}>${strings[i + 1]}`;
        } else {
            // If is not component constructor then add to map.
            // Exclude string type and style also
            //if (!isInStyle && !isComponentConstructor && typeof value[i] !== 'string') {
                //value[i] = mapper.set(value[i]);
            //}
            if (attributeOriginalTagName) {
                //result += `${value[i]} data-attributeoriginaletagname="${attributeOriginalTagName}" ${strings[i + 1]}`;
                tpl += `___{${i}}___ data-attributeoriginaletagname="${attributeOriginalTagName}" ${strings[i + 1]}`;
            } else {
                //result += `${value[i]}${strings[i + 1]}`;
                tpl += `___{${i}}___${strings[i + 1]}`;
            }
        }
    }

    tpl = tpl.trim();
    if (!cacheTpl[tpl]) {
        //console.log('RESULT --->', result)
        //console.log('RESULT2 -->', result2, value)
        compiled = compile(tpl, value);
        //console.log('COMPILED', result)
        cacheTpl[tpl] = compiled;
    } else {
        compiled = cacheTpl[tpl];
        console.log(value)
    }


    return compiled;
};
