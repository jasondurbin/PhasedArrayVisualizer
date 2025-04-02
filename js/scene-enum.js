export class EntryPoints {
    static Initialization       = 0;
    static Reset                = 1;
    static Regen_Geometry       = 2;
    static Create_Coefficients  = 3;
    static Scale_Coefficients   = 4;
    static Draw_Phase           = 5;
    static Draw_Atten           = 6;
    static Reset_Farfield       = 7;
    static Calculate_Farfield   = 8;
    static Calculate_Farfield_Loop = 9;
    static Calculate_Directivity = 10;
    static Farfield_Colormap    = 11;
    static Draw_Farfield        = 12;
    static Complete             = 13;
    static Waiting              = 14;
    static Draw_Phase_2         = 20;
    static Draw_Atten_2         = 30;

    #_state = 0;
    constructor() {this.#_state = EntryPoints.Initialization;}
    next() {
        const s = this.#_state;
        if (s == EntryPoints.Waiting) return;
        else if (s == EntryPoints.Draw_Phase_2 || s == EntryPoints.Draw_Atten_2) this.#_state = EntryPoints.Waiting;
        else this.#_state++;
    }
    is(val) { return val == this.#_state; }
    get value() { return this.#_state; }
    set(val) { this.#_state = val; }
}
