import Vue from 'vue';
import { installOptions, installFilters, install } from '@vusion/utils';
import * as Vant from '@lcap/mobile-ui';

import MEmitter from 'cloud-ui.vusion/src/components/m-emitter.vue';
import MPubSub from 'cloud-ui.vusion/src/components/m-pub-sub.vue';
import { MField } from 'cloud-ui.vusion/src/components/m-field.vue';

import filters from '@/filters';
import { AuthPlugin, DataTypesPlugin, LogicsPlugin, RouterPlugin, ServicesPlugin, UtilsPlugin } from '@/plugins';
import { userInfoGuard, getAuthGuard, getTitleGuard, initRouter } from '@/router';
import { filterRoutes } from '@/utils/route';

import App from './App.vue';
// 一些应用全局样式
import 'cloud-ui.vusion.css';
import '@/assets/css/index.css';

/* 👇CloudUI中入口逻辑 */
Vue.prototype.$env = Vue.prototype.$env || {};
Vue.prototype.$env.VUE_APP_DESIGNER
    = String(process.env.VUE_APP_DESIGNER) === 'true';
Vue.prototype.$at2 = function (obj, propertyPath) {
    if (propertyPath === '' && !this.$env.VUE_APP_DESIGNER)
        return obj;
    return this.$at(obj, propertyPath);
};

function getAsyncPublicPath() {
    const script = document.querySelector('script[src*="cloud-ui.vusion"]');
    if (!script)
        return;

    const src = script.src;
    const publicPath = src.replace(/\/[^/]+$/, '/');
    // eslint-disable-next-line camelcase, no-undef
    __webpack_public_path__ = publicPath;
}
getAsyncPublicPath();
/* 👆CloudUI中入口逻辑 */

window.appVue = Vue;
window.Vue = Vue;
const CloudUI = {
    install,
    MEmitter,
    MPubSub,
    MField,
};
// 梳理下来只有install被使用过
window.CloudUI = CloudUI;

// 预览沙箱不需要调用init来初始化，但是需要使用到CloudUI和Vant组件，所以放在外边
installOptions(Vue);
Vue.mixin(MEmitter);
Vue.mixin(MPubSub);
Vue.use(Vant);

// 需要兼容老应用的制品，因此新版本入口函数参数不做改变
const init = (appConfig, platformConfig, routes, metaData) => {
    window.appInfo = Object.assign(appConfig, platformConfig);

    installFilters(Vue, filters);

    Vue.use(LogicsPlugin, metaData);
    Vue.use(RouterPlugin);
    Vue.use(ServicesPlugin, metaData);
    Vue.use(AuthPlugin, appConfig);
    Vue.use(DataTypesPlugin, metaData);
    Vue.use(UtilsPlugin, metaData);

    // 已经获取过权限接口
    Vue.prototype.hasLoadedAuth = false;

    // 是否已经登录
    Vue.prototype.logined = true;

    // 全局catch error，主要来处理中止组件,的错误不想暴露给用户，其余的还是在控制台提示出来
    Vue.config.errorHandler = (err, vm, info) => {
        if (err.name === 'Error' && err.message === '程序中止') {
            console.warn('程序中止');
        } else {
            // err，错误对象
            // vm，发生错误的组件实例
            // info，Vue特定的错误信息，例如错误发生的生命周期、错误发生的事件
            console.error(err);
        }
    };
    const baseResourcePaths = platformConfig.baseResourcePaths || [];
    const authResourcePaths = platformConfig.authResourcePaths || [];
    const baseRoutes = filterRoutes(routes, null, (route, ancestorPaths) => {
        const routePath = route.path;
        const completePath = [...ancestorPaths, routePath].join('/');
        let completeRedirectPath = '';
        const redirectPath = route.redirect;
        if (redirectPath) {
            completeRedirectPath = [...ancestorPaths, redirectPath].join('/');
        }
        return baseResourcePaths.includes(completePath) || completeRedirectPath;
    });

    const router = initRouter(baseRoutes);

    router.beforeEach(userInfoGuard);
    router.beforeEach(getAuthGuard(router, routes, authResourcePaths, appConfig));
    router.beforeEach(getTitleGuard(appConfig));

    const app = new Vue({
        name: 'app',
        router,
        ...App,
    });
    app.$mount('#app');
    return app;
};

export default {
    init,
};

