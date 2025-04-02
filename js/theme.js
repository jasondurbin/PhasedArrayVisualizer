
window.addEventListener('load', (e) => {
    const ttg = document.querySelector('.theme-toggle');
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
    });
});
