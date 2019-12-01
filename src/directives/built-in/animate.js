const {directive} = require('../index');
const wait = require('../../utils/wait');

function animate(node, animationName, callback) {

    let computedStyle = window.getComputedStyle(node);
    node.classList.add('animated', animationName);

    if (computedStyle.display === 'inline') {
        node.style.display = 'inline-block';
    }

    function handleAnimationEnd() {
        node.classList.remove('animated', animationName);
        node.style.display = computedStyle.display;
        node.removeEventListener('animationend', handleAnimationEnd);
        if (typeof callback === 'function') callback()
    }

    node.addEventListener('animationend', handleAnimationEnd);
}

directive('animate', {

    onAppComponentCreate(instance) {
        Object.defineProperties(instance, {
            animate: {
                value: animate,
                enumerable: true
            },
            elementsWithAnimation: {
                value: [],
                writable: true
            }
        });
    },

    createAnimations(instance, $target, directiveValue) {
        if (directiveValue.enter) {
            wait(() => {
                return !$target.__animationIsRunning;
            }, () => {
                $target.__animationIsRunning = true;
                if($target.__animationOriginDisplay) {
                    $target.style.display = $target.__animationOriginDisplay;
                }
                instance.animate($target, directiveValue.enter, () => {
                    $target.__animationIsRunning = false;
                    $target.__animationEnterIsComplete = true;
                });
            });
            instance.elementsWithAnimation.push({$target, directiveValue});
        }
        if (directiveValue.leave) {
            instance.lockRemoveInstanceByCallback = (callerMethod, ...args) => {
                let animationsEnd = [];
                for (let i = 0; i < instance.elementsWithAnimation.length; i++) {
                    let elementObj = instance.elementsWithAnimation[i];

                    animationsEnd.push(
                        new Promise(resolve => {
                                wait(() => {
                                    return !elementObj.$target.__animationIsRunning;
                                }, () => {
                                    elementObj.$target.__animationIsRunning = true;
                                    instance.animate(elementObj.$target, elementObj.directiveValue.leave, () => {
                                        elementObj.$target.__animationOriginDisplay = elementObj.$target.style.display;
                                        elementObj.$target.style.display = 'none';
                                        elementObj.$target.__animationIsRunning = false;
                                        resolve();
                                    });
                                });
                            }
                        )
                    );
                }

                Promise.all(animationsEnd).then(() => {
                    instance.lockRemoveInstanceByCallback = null;
                    callerMethod.apply(instance, args);
                }, reason => {
                    throw new Error(reason);
                });
            }
        }
    },

    onComponentDOMElementCreate(instance, $target, directiveValue) {
        this.createAnimations(instance, $target, directiveValue)
    },

    onComponentMount(instance, directiveValue) {
        let $target = instance.getHTMLElement();
        if ($target.__animationOriginDisplay)
            this.createAnimations(instance, $target, directiveValue)

    }
});