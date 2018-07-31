import {component} from '../../../../index'
import './cmp/hello/index'

component('app-ui', {
    module,
    props: {
        count: 599
    },
    template() {
        return `
            <div>
                <app-hello></app-hello> ${this.props.count}
                <button onclick="this.props.count++">Click me!!!</button>
            </div>
        `
    }
});