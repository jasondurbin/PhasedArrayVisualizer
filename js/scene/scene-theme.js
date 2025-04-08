export class SceneTheme{
    constructor(){
        const ttg = document.querySelector('.theme-toggle');
        const _callbacks = [];
        ttg.addEventListener('click', () => {
            if (ttg.innerHTML.includes('dark')) {
                document.documentElement.classList.remove('dark');
                document.documentElement.classList.remove('auto');
                document.documentElement.classList.add('light');
                ttg.innerHTML = 'light';
            }
            else if (ttg.innerHTML.includes('light')) {
                document.documentElement.classList.remove('dark');
                document.documentElement.classList.add('auto');
                document.documentElement.classList.remove('light');
                ttg.innerHTML = 'auto';
            }
            else {
                document.documentElement.classList.add('dark');
                document.documentElement.classList.remove('auto');
                document.documentElement.classList.remove('light');
                ttg.innerHTML = 'dark';
            }
            for (let i = 0; i < _callbacks.length; i++) _callbacks[i](ttg.innerHTML);
        });
        const _install = (cb) => {_callbacks.push(cb);}
        window.installThemeChanged = _install;
        this.installChanged = _install;
    }
}
