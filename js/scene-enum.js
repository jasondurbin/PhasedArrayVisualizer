export class StateMachineQueue{
    constructor(progressElement, statusElement){
        this.progress = progressElement;
        this.status = statusElement;
        this.reset();
        this.channel = new MessageChannel();
        this.channel.port1.onmessage = () => {this.process_queue()};
        this.running = false;
    }
    add(text, func){
        this.queue.push({
            text: text,
            func: func,
            type: 'function',
        });
    }
    add_iterator(text, func){
        this.queue.push({
            text: text,
            func: func,
            type: 'iterator',
        })
    }
    dump(){
        this.queue.forEach((entry) => {
            console.log("---- " + entry['text']);
            console.log(entry['func']);
        });
    }
    next(){
        if (this.queue.length == 0) return null;
        return this.queue.shift();
    }
    reset(){
        this.queue = [];
        this.startingLength = 0;
        this._current = null;
    }
    start(){
        const prog = this.progress;
        this.startingLength = this.queue.length;
        this._current = null;
        prog.value = 0;
        prog.max = this.startingLength;
        if (!this.running) this.process_queue();
    }
    get length(){ return this.queue.length; }

    log(string){
        if (string !== undefined){
            console.log(string)
            this.status.innerHTML = string;
        }
    }
    process_queue(){
        const prog = this.progress;
        this.running = true;
        if (this._current === null){
            this._current = this.next();
            prog.value = prog.max - this.length;
            if (this._current === null){
                this.log("Complete");
                this.running = false;
                return;
            }
            this.log(this._current['text']);
        }
        else{
            let c = this._current;
            if (c['type'] == 'next'){
                let v = c['func'].next();
                if (v.done) {
                    this._current = null;
                    prog.max = this.startingLength;
                    prog.value = prog.max - this.length;
                }
                else{
                    this.log(v.value['text']);
                    prog.max = v.value['max'];
                    prog.value = v.value['progress'];
                }
            }
            else if (c['type'] == 'iterator'){
                this._current['type'] = 'next';
                this._current['func'] = c['func']();
            }
            else {
                c['func']();
                this._current = null;
            }
        }
        this.channel.port2.postMessage("");
    }
}
